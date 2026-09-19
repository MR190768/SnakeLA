import { GameState, MoveResponse, Coord } from '../types/battlesnake';
import { calculateVoronoi } from './voronoi';
import { isOutOfBounds, isBodyCollision } from './collision';

/**
 * Creates a simulated game state for one step in the future,
 * assuming only 'you' moves to the targetCoord.
 * This is a simplified simulation for Voronoi calculation.
 */
const simulateMyMove = (gameState: GameState, targetCoord: Coord): GameState => {
  // Shallow clone board and snakes to avoid expensive JSON serialization
  const nextSnakes = gameState.board.snakes.map(s => {
    if (s.id === gameState.you.id) {
      return {
        ...s,
        head: targetCoord,
        body: [targetCoord, ...s.body.slice(0, s.body.length - 1)]
      };
    }
    return s; // Other snakes are just referenced
  });

  const nextYou = nextSnakes.find(s => s.id === gameState.you.id)!;

  return {
    ...gameState,
    you: nextYou,
    board: {
      ...gameState.board,
      snakes: nextSnakes
    }
  };
};

/**
 * Evaluates the 4 possible moves using Voronoi Area Control and returns the best scores.
 */
export const evaluateMovesVoronoi = (gameState: GameState): Record<string, number> => {
  const myHead = gameState.you.head;
  const { width, height, snakes } = gameState.board;
  
  const moveCoords: Record<string, Coord> = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y }
  };

  const scores: Record<string, number> = { up: -10000, down: -10000, left: -10000, right: -10000 };

  for (const dir of Object.keys(moveCoords)) {
    const targetCoord = moveCoords[dir];

    // Fast fail for death
    if (isOutOfBounds(targetCoord, width, height) || isBodyCollision(targetCoord, snakes)) {
      scores[dir] = -Infinity;
      continue;
    }

    // Never calculate Voronoi territory for squares contested by equal or larger snakes
    const isLethalContest = snakes.some(s => 
      s.id !== gameState.you.id &&
      s.length >= gameState.you.length &&
      Math.abs(targetCoord.x - s.head.x) + Math.abs(targetCoord.y - s.head.y) === 1
    );

    if (isLethalContest) {
      scores[dir] = -1000;
      continue;
    }

    // Simulate move
    const simulatedState = simulateMyMove(gameState, targetCoord);
    
    // Calculate Voronoi
    const voronoiResult = calculateVoronoi(simulatedState);
    const myControl = voronoiResult[gameState.you.id] || 0;
    
    scores[dir] = myControl;
  }

  return scores;
};
