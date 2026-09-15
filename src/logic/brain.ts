import { GameState, MoveResponse, Coord } from '../types';
import { isOutOfBounds, isCollision, getHeadToHeadThreats } from './rules';
import { calculateFreeSpace } from './floodFill';
import { findNearestFoodDistance } from './pathfinding';

export const move = (gameState: GameState): MoveResponse => {
  const startTime = Date.now();
  const TIME_LIMIT_MS = 350;
  
  const possibleMoves: { [key: string]: boolean } = {
    up: true, down: true, left: true, right: true
  };
  
  const myHead = gameState.you.head;
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;
  
  const moveCoords: { [key: string]: Coord } = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y }
  };
  
  for (const move of Object.keys(possibleMoves)) {
    const targetCoord = moveCoords[move];
    if (isOutOfBounds(targetCoord, boardWidth, boardHeight)) {
      possibleMoves[move] = false;
      continue;
    }
    if (isCollision(targetCoord, gameState.board.snakes)) {
      possibleMoves[move] = false;
      continue;
    }
  }

  let maxSpace = -1;
  let bestMoves: string[] = [];
  const safeMoves = Object.keys(possibleMoves).filter(m => possibleMoves[m]);
  
  for (const move of safeMoves) {
    if (Date.now() - startTime > TIME_LIMIT_MS - 50) break; // Guard timeout

    const targetCoord = moveCoords[move];
    const isThreatened = getHeadToHeadThreats(targetCoord, gameState.board.snakes, gameState.you);
    
    let space = 0;
    if (!isThreatened) {
       space = calculateFreeSpace(targetCoord, gameState, gameState.you.length * 2);
    } else {
       space = -1; // Heavy penalty for moving into larger snake's head radius
    }
    
    if (space > maxSpace) {
      maxSpace = space;
      bestMoves = [move];
    } else if (space === maxSpace) {
      bestMoves.push(move);
    }
  }
  
  if (bestMoves.length === 0) {
    const aliveMoves = Object.keys(possibleMoves).filter(m => possibleMoves[m]);
    if (aliveMoves.length > 0) bestMoves = aliveMoves;
    else return { move: 'up', shout: 'Farewell!' };
  }
  
  if (Date.now() - startTime > TIME_LIMIT_MS - 30) {
    return { move: bestMoves[0] as MoveResponse['move'] };
  }

  let finalMove = bestMoves[0];
  
  // Health / Food priority
  if (gameState.you.health < 35 && bestMoves.length > 1) {
    let minFoodDistance = Infinity;
    for (const move of bestMoves) {
      const dist = findNearestFoodDistance(moveCoords[move], gameState);
      if (dist < minFoodDistance) {
        minFoodDistance = dist;
        finalMove = move;
      }
    }
  } else if (bestMoves.length > 1) {
    // Board control (Central positioning)
    const center = { x: boardWidth / 2, y: boardHeight / 2 };
    let minCenterDist = Infinity;
    for (const move of bestMoves) {
      const coord = moveCoords[move];
      const dist = Math.abs(coord.x - center.x) + Math.abs(coord.y - center.y);
      if (dist < minCenterDist) {
        minCenterDist = dist;
        finalMove = move;
      }
    }
  }
  
  return { 
    move: finalMove as MoveResponse['move'], 
    shout: `Lat: ${Date.now() - startTime}ms` 
  };
};
