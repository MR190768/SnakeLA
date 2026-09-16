import { GameState, Coord, Battlesnake } from '../types/battlesnake';

export interface VoronoiResult {
  [snakeId: string]: number; // Map of snake ID to number of controlled cells
}

/**
 * Calculates the Voronoi partition of the board.
 * Returns how many cells each snake controls.
 */
export const calculateVoronoi = (gameState: GameState): VoronoiResult => {
  const { board } = gameState;
  const width = board.width;
  const height = board.height;

  // Initialize grid tracking: { ownerId, distance }
  const grid: { ownerId: string | null; distance: number }[][] = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => ({ ownerId: null, distance: Infinity }))
  );

  // Mark all snake bodies as obstacles (distance = -1)
  for (const snake of board.snakes) {
    const limit = snake.health === 100 ? snake.body.length : snake.body.length - 1;
    for (let i = 0; i < limit; i++) {
      const part = snake.body[i];
      if (part.x >= 0 && part.x < width && part.y >= 0 && part.y < height) {
        grid[part.x][part.y] = { ownerId: 'obstacle', distance: -1 };
      }
    }
  }

  // Queue for BFS: { x, y, snakeId, distance }
  const queue: { x: number; y: number; snakeId: string; distance: number }[] = [];

  // Add all snake heads to the queue
  for (const snake of board.snakes) {
    queue.push({ x: snake.head.x, y: snake.head.y, snakeId: snake.id, distance: 0 });
    if (snake.head.x >= 0 && snake.head.x < width && snake.head.y >= 0 && snake.head.y < height) {
       grid[snake.head.x][snake.head.y] = { ownerId: snake.id, distance: 0 };
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const { x, y, snakeId, distance } = current;

    const neighbors = [
      { nx: x, ny: y + 1 },
      { nx: x, ny: y - 1 },
      { nx: x - 1, ny: y },
      { nx: x + 1, ny: y }
    ];

    for (const { nx, ny } of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const cell = grid[nx][ny];

        // If unvisited, claim it
        if (cell.distance === Infinity) {
          grid[nx][ny] = { ownerId: snakeId, distance: distance + 1 };
          queue.push({ x: nx, y: ny, snakeId: snakeId, distance: distance + 1 });
        } 
        // If visited at the SAME distance by another snake, handle conflict
        else if (cell.distance === distance + 1 && cell.ownerId !== snakeId && cell.ownerId !== 'obstacle' && cell.ownerId !== 'neutral') {
          const currentOwner = board.snakes.find(s => s.id === cell.ownerId);
          const challenger = board.snakes.find(s => s.id === snakeId);
          
          if (currentOwner && challenger) {
            if (challenger.length > currentOwner.length) {
              grid[nx][ny].ownerId = snakeId;
            } else if (challenger.length === currentOwner.length) {
              grid[nx][ny].ownerId = 'neutral';
            }
          }
        }
      }
    }
  }

  // Tally the results
  const result: VoronoiResult = {};
  for (const snake of board.snakes) {
    result[snake.id] = 0;
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const owner = grid[x][y].ownerId;
      if (owner && owner !== 'obstacle' && owner !== 'neutral') {
        if (result[owner] !== undefined) {
          result[owner]++;
        }
      }
    }
  }

  return result;
};
