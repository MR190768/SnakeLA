import { GameState, MoveResponse, Coord, TurnMetric } from '../types/battlesnake';
import { isOutOfBounds, isBodyCollision } from './collision';
import { calculateFreeSpace } from './floodFill';
import { getFeasibleFoodScore } from './pathfinding';
import { evaluateMovesVoronoi } from './minimax';
import { determineState } from './fsm';
import { config } from '../config/weights';

export const activeGames: Record<string, TurnMetric[]> = {};

export const move = (gameState: GameState): MoveResponse => {
  const startTime = Date.now();
  const TIME_LIMIT_MS = 320;
  
  const state = determineState(gameState);
  const myHead = gameState.you.head;
  const { width, height, snakes } = gameState.board;
  
  const moveCoords: Record<string, Coord> = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y }
  };
  
  const scores: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };
  let bestMoves: string[] = [];
  let maxScore = -Infinity;
  let moveSpace: Record<string, number> = { up: 0, down: 0, left: 0, right: 0 };
  
  const voronoiScores = evaluateMovesVoronoi(gameState);
  
  for (const dir of Object.keys(moveCoords)) {
    const targetCoord = moveCoords[dir];
    
    // Hard constraints
    if (isOutOfBounds(targetCoord, width, height) || isBodyCollision(targetCoord, snakes)) {
      scores[dir] = -Infinity;
      continue;
    }

    const freeSpace = calculateFreeSpace(targetCoord, gameState, gameState.you.length * 2);
    moveSpace[dir] = freeSpace;

    if (freeSpace < gameState.you.length && freeSpace < gameState.you.length * 2) {
      // Extremely bad unless forced
      scores[dir] -= 10000;
    }

    let score = 0;
    
    // Feature: Free space (Absolute Survival)
    score += freeSpace * config.WEIGHT_FREE_SPACE;
    
    // Feature: Voronoi Control (Relative Area Control)
    const vScore = voronoiScores[dir] !== -Infinity ? voronoiScores[dir] : 0;
    
    // Voronoi gets heavy weighting as it predicts territory
    // If we have very little Voronoi space compared to our length, it's a huge penalty
    if (vScore < gameState.you.length && snakes.length > 1) {
       score -= 5000;
    } else {
       score += vScore * 10.0; // Dynamic config could be used here
    }

    let dynamicCenterControl = config.WEIGHT_CENTER_CONTROL;
    let dynamicEdgeAvoidance = config.WEIGHT_EDGE_AVOIDANCE;
    let dynamicHeadAttack = config.WEIGHT_HEAD_ATTACK;

    // Personality changes depending on number of active players (state)
    if (state === 'SURVIVAL_4P') {
      dynamicCenterControl = 0.5;  // Stay mobile, never get cornered against walls
      dynamicEdgeAvoidance = 12.0; // Walls are deathtraps in 4P
    } else if (state === 'TACTICAL_3P') {
      dynamicCenterControl = 1.0;
      dynamicEdgeAvoidance = 14.0;
    } else if (state === 'DOMINATING') {
      dynamicCenterControl = 2.5;  // Dominate the center
      dynamicHeadAttack = 150.0;   // Aggressively hunt smaller snakes
      dynamicEdgeAvoidance = 15.0;
    } else if (state === 'LONE_SNAKE') {
      dynamicCenterControl = 0;
      dynamicEdgeAvoidance = 10.0;
    }

    // Feature: Center control & Edge Avoidance
    const centerDist = Math.abs(targetCoord.x - width / 2) + Math.abs(targetCoord.y - height / 2);
    score -= centerDist * dynamicCenterControl;
    
    const isEdge = targetCoord.x === 0 || targetCoord.x === width - 1 || targetCoord.y === 0 || targetCoord.y === height - 1;
    if (isEdge && state !== 'SEARCH_FOOD_URGENT') {
      score -= dynamicEdgeAvoidance;
    }

    // Feature: Tail Chasing (Safe recycling of space)
    const myTail = gameState.you.body[gameState.you.body.length - 1];
    const distToTail = Math.abs(targetCoord.x - myTail.x) + Math.abs(targetCoord.y - myTail.y);
    if (distToTail === 1 && gameState.you.health < 100) {
      score += config.WEIGHT_TAIL_CHASE; 
    }
    
    // Feature: Smart Food Collection
    const feasibleFoodScore = getFeasibleFoodScore(targetCoord, gameState);
    score += feasibleFoodScore * (state === 'SEARCH_FOOD_URGENT' ? 3.5 : 2.0);

    // Feature: Heads (Sharp Combat & Survival)
    let canAttack = false;
    let headHazard = false;

    for (const snake of snakes) {
      if (snake.id === gameState.you.id) continue;
      const distToHead = Math.abs(targetCoord.x - snake.head.x) + Math.abs(targetCoord.y - snake.head.y);

      if (distToHead === 1) {
        // Immediate contestable square
        if (snake.length >= gameState.you.length) {
          headHazard = true;
          score += config.WEIGHT_HEAD_AVOIDANCE; // -15000 fatal collision risk
        } else {
          canAttack = true;
        }
      }
    }

    // Only attack smaller head if no bigger snake threatens that square
    if (canAttack && !headHazard) {
      score += dynamicHeadAttack;
    }

    scores[dir] += score;
    
    if (scores[dir] > maxScore) {
      maxScore = scores[dir];
      bestMoves = [dir];
    } else if (scores[dir] === maxScore && scores[dir] !== -Infinity) {
      bestMoves.push(dir);
    }
    
    // Timeout guard
    if (Date.now() - startTime > TIME_LIMIT_MS - 30) {
      break;
    }
  }
  
  // Tie-breaking: choose the move with maximum free space and Voronoi territory
  let chosenMove = bestMoves.length > 0 ? bestMoves[0] : 'up';
  if (bestMoves.length > 1) {
    let maxSpace = -Infinity;
    for (const m of bestMoves) {
      const combinedSpace = (moveSpace[m] || 0) + (voronoiScores[m] !== -Infinity ? voronoiScores[m] : 0);
      if (combinedSpace > maxSpace) {
        maxSpace = combinedSpace;
        chosenMove = m;
      }
    }
  }
  
  // Save telemetry
  if (!activeGames[gameState.game.id]) activeGames[gameState.game.id] = [];
  activeGames[gameState.game.id].push({
    turn: gameState.turn,
    health: gameState.you.health,
    length: gameState.you.length,
    state,
    chosenMove,
    scores,
    computeMs: Date.now() - startTime,
    freeSpace: moveSpace[chosenMove]
  });
  
  return { move: chosenMove as MoveResponse['move'], shout: `State: ${state}` };
};
