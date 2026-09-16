import { GameState, MoveResponse, Coord, TurnMetric } from '../types/battlesnake';
import { isOutOfBounds, isBodyCollision } from './collision';
import { calculateFreeSpace } from './floodFill';
import { findNearestFoodDistance } from './pathfinding';
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
    
    // Feature: Center control
    const centerDist = Math.abs(targetCoord.x - width / 2) + Math.abs(targetCoord.y - height / 2);
    score -= centerDist * config.WEIGHT_CENTER_CONTROL;
    
    // Feature: Food
    if (state === 'SEARCH_FOOD' || state === 'DUEL_1V1') {
       const foodDist = findNearestFoodDistance(targetCoord, gameState);
       if (foodDist !== Infinity) {
         score -= foodDist * config.WEIGHT_FOOD_DISTANCE;
       }
    }

    // Feature: Heads
    for (const snake of snakes) {
      if (snake.id === gameState.you.id) continue;
      const distToHead = Math.abs(targetCoord.x - snake.head.x) + Math.abs(targetCoord.y - snake.head.y);
      if (distToHead === 1) { // Adjacent
        if (snake.length >= gameState.you.length) {
          score += config.WEIGHT_HEAD_AVOIDANCE; // Heavy penalty
        } else if (state === 'AGGRESSIVE') {
          score += config.WEIGHT_HEAD_ATTACK; // Reward
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
