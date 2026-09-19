import { GameState, Coord } from '../types/battlesnake';

export const calculateFreeSpace = (startCoord: Coord, gameState: GameState, maxDepth: number = 100): number => {
  const { board } = gameState;
  const visited = new Set<string>();
  const queue: { coord: Coord; dist: number }[] = [{ coord: startCoord, dist: 1 }];
  visited.add(`${startCoord.x},${startCoord.y}`);
  
  let freeSpace = 0;
  
  // Mapeamos en qué turno futuro se liberará cada casilla ocupada por un cuerpo.
  const obstacleMap = new Map<string, number>();
  
  for (const snake of board.snakes) {
    const isFed = snake.health === 100;
    // Si la serpiente acaba de comer, su cola tardará 1 turno extra en moverse
    const lengthModifier = isFed ? 1 : 0;
    
    for (let i = 0; i < snake.body.length; i++) {
      const part = snake.body[i];
      const key = `${part.x},${part.y}`;
      // El tiempo que tarda en liberarse es la distancia desde la cola
      const turnsUntilFree = snake.body.length - i - 1 + lengthModifier;
      
      // Si la serpiente está enrollada sobre sí misma, guardamos el tiempo de liberación más tardío
      const currentVal = obstacleMap.get(key) || 0;
      obstacleMap.set(key, Math.max(currentVal, turnsUntilFree));
    }
  }

  // Si la celda inicial ya está bloqueada y no se liberará de inmediato, abortamos
  const startObstacleTime = obstacleMap.get(`${startCoord.x},${startCoord.y}`);
  if (startObstacleTime !== undefined && startObstacleTime > 1) {
    return 0;
  }

  while (queue.length > 0 && freeSpace < maxDepth) {
    const current = queue.shift()!;
    freeSpace++;
    
    const directions: Coord[] = [
      { x: current.coord.x, y: current.coord.y + 1 }, { x: current.coord.x, y: current.coord.y - 1 },
      { x: current.coord.x - 1, y: current.coord.y }, { x: current.coord.x + 1, y: current.coord.y }
    ];
    
    for (const dir of directions) {
      const key = `${dir.x},${dir.y}`;
      
      if (dir.x >= 0 && dir.x < board.width && dir.y >= 0 && dir.y < board.height && !visited.has(key)) {
        const clearTime = obstacleMap.get(key);
        // Si no hay obstáculo, o si el obstáculo ya habrá desaparecido cuando lleguemos a esa casilla
        if (clearTime === undefined || clearTime <= current.dist) {
          visited.add(key);
          queue.push({ coord: dir, dist: current.dist + 1 });
        }
      }
    }
  }
  return freeSpace;
};
