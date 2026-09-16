import { GameState, Coord } from '../types/battlesnake';

export const calculateFreeSpace = (startCoord: Coord, gameState: GameState, maxDepth: number = 100): number => {
  const { board } = gameState;
  const visited = new Set<string>();
  const queue: Coord[] = [startCoord];
  visited.add(`${startCoord.x},${startCoord.y}`);
  
  let freeSpace = 0;
  const obstacleSet = new Set<string>();
  
  for (const snake of board.snakes) {
    const limit = snake.health === 100 ? snake.body.length : snake.body.length - 1;
    for (let i = 0; i < limit; i++) obstacleSet.add(`${snake.body[i].x},${snake.body[i].y}`);
  }

  if (obstacleSet.has(`${startCoord.x},${startCoord.y}`)) return 0;

  while (queue.length > 0 && freeSpace < maxDepth) {
    const current = queue.shift()!;
    freeSpace++;
    const directions: Coord[] = [
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
      { x: current.x - 1, y: current.y }, { x: current.x + 1, y: current.y }
    ];
    for (const dir of directions) {
      const key = `${dir.x},${dir.y}`;
      if (!visited.has(key) && dir.x >= 0 && dir.x < board.width && dir.y >= 0 && dir.y < board.height && !obstacleSet.has(key)) {
        visited.add(key);
        queue.push(dir);
      }
    }
  }
  return freeSpace;
};
