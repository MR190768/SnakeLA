import { GameState, Coord, Battlesnake } from '../types/battlesnake';

export const isOutOfBounds = (coord: Coord, boardWidth: number, boardHeight: number): boolean => {
  return coord.x < 0 || coord.x >= boardWidth || coord.y < 0 || coord.y >= boardHeight;
};

export const isBodyCollision = (coord: Coord, snakes: Battlesnake[]): boolean => {
  for (const snake of snakes) {
    for (let i = 0; i < snake.body.length - 1; i++) {
      if (coord.x === snake.body[i].x && coord.y === snake.body[i].y) return true;
    }
    const tail = snake.body[snake.body.length - 1];
    if (coord.x === tail.x && coord.y === tail.y && snake.health === 100) return true;
  }
  return false;
};
