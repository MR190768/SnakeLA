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
    let isDangerousTrap = false;

    for (const snake of board.snakes) {
      if (snake.id === you.id) continue;
      
      const enemyDist = Math.abs(snake.head.x - food.x) + Math.abs(snake.head.y - food.y);

      // A food is an immediate lethal trap only if a bigger/equal enemy is closer and adjacent
      if (enemyDist < myDist && snake.length >= you.length) {
        isFeasible = false;
        if (enemyDist <= 1) {
          isDangerousTrap = true;
        }
      }
    }

    // Distance gradient: closer food is always attractive
    let score = Math.max(0, (15 - myDist) * 14);

    if (myDist === 0) {
      score += 1000; // High bonus for immediate consumption (eating the food right now)
    } else if (myDist <= 2) {
      score += 150; // High bonus for nearby food
    }

    if (isDangerousTrap && you.health > 30) {
      // Avoid immediate trap if we still have health to look elsewhere
      score = 0;
    } else if (!isFeasible) {
      // Enemy is slightly closer, but if we are low on health, still pursue!
      score = you.health < 45 ? score * 0.7 : score * 0.25;
    }

    if (score > bestScore) bestScore = score;
  }

  return bestScore;
};
