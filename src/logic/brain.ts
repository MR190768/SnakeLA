import { GameState, MoveResponse, Coord, TurnMetric } from '../types/battlesnake';
import { isOutOfBounds, isBodyCollision } from './collision';
import { calculateFreeSpace } from './floodFill';
import { getFeasibleFoodScore } from './pathfinding';
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
    
    // Feature: Free space
    score += freeSpace * config.WEIGHT_FREE_SPACE;
    
    let dynamicCenterControl = config.WEIGHT_CENTER_CONTROL;
    let dynamicEdgeAvoidance = config.WEIGHT_EDGE_AVOIDANCE;
    let dynamicHeadAttack = config.WEIGHT_HEAD_ATTACK;

    // Personality changes depending on number of active players (state)
    if (state === 'SURVIVAL_4P') {
      dynamicCenterControl = -2.0; // Avoid center, too chaotic
      dynamicEdgeAvoidance = 2.0;  // Hugging walls is safer
    } else if (state === 'TACTICAL_3P') {
      dynamicCenterControl = 0.5;
      dynamicEdgeAvoidance = 8.0;
    } else if (state === 'DOMINATING') {
      dynamicCenterControl = 3.0; // Control center
      dynamicHeadAttack = 15.0;   // Highly aggressive
    } else if (state === 'LONE_SNAKE') {
      dynamicCenterControl = 0;   // Just fill space efficiently
      dynamicEdgeAvoidance = 5.0;
    }

    // Feature: Center control & Edge Avoidance
    const centerDist = Math.abs(targetCoord.x - width / 2) + Math.abs(targetCoord.y - height / 2);
    score -= centerDist * dynamicCenterControl;
    
    const isEdge = targetCoord.x === 0 || targetCoord.x === width - 1 || targetCoord.y === 0 || targetCoord.y === height - 1;
    if (isEdge && state !== 'SEARCH_FOOD_URGENT') {
      score -= dynamicEdgeAvoidance;
    }

    // Feature: Tail Chasing (Movimiento 100% seguro)
    const myTail = gameState.you.body[gameState.you.body.length - 1];
    const distToTail = Math.abs(targetCoord.x - myTail.x) + Math.abs(targetCoord.y - myTail.y);
    if (distToTail === 1 && gameState.you.health < 100) {
      score += config.WEIGHT_TAIL_CHASE; 
    }
    
    // Feature: Smart Food Collection (Feasible & Proximity)
    const feasibleFoodScore = getFeasibleFoodScore(targetCoord, gameState);
    
    if (state === 'SEARCH_FOOD_URGENT') {
       score += feasibleFoodScore * 2.0; // Desperate, prioritize food over everything
    } else if (state === 'SURVIVAL_4P') {
       if (feasibleFoodScore > 50) score += feasibleFoodScore; // Only take very safe/close food
    } else {
       score += feasibleFoodScore; // Natural opportunistic collection
    }

    // Feature: Heads
    for (const snake of snakes) {
      if (snake.id === gameState.you.id) continue;
      const distToHead = Math.abs(targetCoord.x - snake.head.x) + Math.abs(targetCoord.y - snake.head.y);
      if (distToHead === 1) { // Adjacent
        if (snake.length >= gameState.you.length) {
          score += config.WEIGHT_HEAD_AVOIDANCE; // Heavy penalty
        } else if (state === 'DOMINATING' || state === 'DUEL_1V1') {
          score += dynamicHeadAttack; // Reward for eating smaller snakes
        }
      }
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
  
  const chosenMove = bestMoves.length > 0 ? bestMoves[0] : 'up';
  
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
