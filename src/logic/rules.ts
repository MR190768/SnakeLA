import { GameState, Coord, Battlesnake } from '../types';

export const isOutOfBounds = (coord: Coord, boardWidth: number, boardHeight: number): boolean => {
  return coord.x < 0 || coord.x >= boardWidth || coord.y < 0 || coord.y >= boardHeight;
};

export const isCollision = (coord: Coord, snakes: Battlesnake[]): boolean => {
  for (const snake of snakes) {
    for (let i = 0; i < snake.body.length - 1; i++) {
      if (coord.x === snake.body[i].x && coord.y === snake.body[i].y) {
        return true;
      }
    }
    const tail = snake.body[snake.body.length - 1];
    if (coord.x === tail.x && coord.y === tail.y) {
      if (snake.health === 100) return true; // Just ate, tail won't move
    }
  }
  return false;
};

export const getHeadToHeadThreats = (coord: Coord, snakes: Battlesnake[], ourSnake: Battlesnake): boolean => {
  for (const snake of snakes) {
    if (snake.id === ourSnake.id) continue;
    
    const isAdjacentToEnemyHead = (
      (Math.abs(coord.x - snake.head.x) === 1 && coord.y === snake.head.y) ||
      (Math.abs(coord.y - snake.head.y) === 1 && coord.x === snake.head.x)
    );
    
    if (isAdjacentToEnemyHead) {
      if (snake.length >= ourSnake.length) {
        return true;
      }
    }
  }
  return false;
};
