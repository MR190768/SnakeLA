import { GameState, Coord } from '../types/battlesnake';

export const findNearestFoodDistance = (startCoord: Coord, gameState: GameState): number => {
  const { board } = gameState;
  if (board.food.length === 0) return Infinity;
  
  const obstacleSet = new Set<string>();
  for (const snake of board.snakes) {
    const limit = snake.health === 100 ? snake.body.length : snake.body.length - 1;
    for (let i = 0; i < limit; i++) obstacleSet.add(`${snake.body[i].x},${snake.body[i].y}`);
  }

  const visited = new Set<string>();
  const queue: { coord: Coord; dist: number }[] = [{ coord: startCoord, dist: 0 }];
  visited.add(`${startCoord.x},${startCoord.y}`);
  const foodSet = new Set(board.food.map(f => `${f.x},${f.y}`));

  while (queue.length > 0) {
    const { coord, dist } = queue.shift()!;
    if (foodSet.has(`${coord.x},${coord.y}`)) return dist;
    if (dist > 30) return Infinity;

    const directions = [
      { x: coord.x, y: coord.y + 1 }, { x: coord.x, y: coord.y - 1 },
      { x: coord.x - 1, y: coord.y }, { x: coord.x + 1, y: coord.y }
    ];
    for (const dir of directions) {
      const key = `${dir.x},${dir.y}`;
      if (!visited.has(key) && dir.x >= 0 && dir.x < board.width && dir.y >= 0 && dir.y < board.height && !obstacleSet.has(key)) {
        visited.add(key);
        queue.push({ coord: dir, dist: dist + 1 });
      }
    }
  }
  return Infinity;
};

export const getFeasibleFoodScore = (startCoord: Coord, gameState: GameState): number => {
  const { board, you } = gameState;
  if (board.food.length === 0) return 0;
  
  let bestScore = 0;

  for (const food of board.food) {
    // Manhattan distance is faster for multiple heuristics
    const myDist = Math.abs(startCoord.x - food.x) + Math.abs(startCoord.y - food.y);
    
    if (myDist > 20) continue;

    let isFeasible = true;
    let minEnemyDist = Infinity;

    for (const snake of board.snakes) {
      if (snake.id === you.id) continue;
      
      const enemyDist = Math.abs(snake.head.x - food.x) + Math.abs(snake.head.y - food.y);
      if (enemyDist < minEnemyDist) {
        minEnemyDist = enemyDist;
      }

      // If an enemy can reach it before or at the same time, and is bigger/equal, it's a trap
      if (enemyDist <= myDist && snake.length >= you.length) {
        isFeasible = false;
        break;
      }
    }

    if (isFeasible) {
      // Score based on proximity. Close food gives a large bonus.
      let score = 100 / (myDist + 1);
      if (myDist <= 3) {
        score += 200; // Massive bonus for nearby feasible food
      }
      if (score > bestScore) bestScore = score;
    } else {
      // Small consideration for unfeasible food just in case
      let fallbackScore = 5 / (myDist + 1);
      if (fallbackScore > bestScore) bestScore = fallbackScore;
    }
  }

  return bestScore;
};
