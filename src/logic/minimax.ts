import { GameState, MoveResponse, Coord } from '../types/battlesnake';
import { calculateVoronoi } from './voronoi';
import { isOutOfBounds, isBodyCollision } from './collision';

/**
 * Creates a simulated game state for one step in the future,
 * assuming only 'you' moves to the targetCoord.
 * This is a simplified simulation for Voronoi calculation.
 */
const simulateMyMove = (gameState: GameState, targetCoord: Coord): GameState => {
  const nextState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  // Move 'you'
  nextState.you.head = targetCoord;
  nextState.you.body.unshift(targetCoord);
  nextState.you.body.pop(); // Assume no food eaten for simplicity of space control

  // Update in board
  const myIndex = nextState.board.snakes.findIndex(s => s.id === nextState.you.id);
  if (myIndex !== -1) {
    nextState.board.snakes[myIndex] = nextState.you;
  }

  return nextState;
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
