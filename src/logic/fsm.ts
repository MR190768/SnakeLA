import { GameState, StateType } from '../types/battlesnake';
import { config } from '../config/weights';

export const determineState = (gameState: GameState): StateType => {
  const { you, board } = gameState;
  const aliveEnemies = board.snakes.filter(s => s.id !== you.id);
  
  if (aliveEnemies.length === 1) {
    return 'DUEL_1V1';
  }

  const avgEnemyLength = aliveEnemies.length > 0 
    ? aliveEnemies.reduce((acc, curr) => acc + curr.length, 0) / aliveEnemies.length 
    : 0;

  const maxEnemyLength = aliveEnemies.length > 0 
    ? Math.max(...aliveEnemies.map(s => s.length)) 
    : 0;

  if (you.health < config.HEALTH_CRITICAL_THRESHOLD || (you.health < 60 && you.length <= avgEnemyLength)) {
    return 'SEARCH_FOOD';
  }

  if (you.length > maxEnemyLength && you.health > config.HEALTH_SAFE_THRESHOLD) {
    return 'AGGRESSIVE';
  }

  return 'DEFENSIVE';
};
