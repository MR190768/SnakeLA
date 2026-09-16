import { GameState, StateType } from '../types/battlesnake';
import { config } from '../config/weights';

export const determineState = (gameState: GameState): StateType => {
  const { you, board } = gameState;
  const aliveEnemies = board.snakes.filter(s => s.id !== you.id);
  
  const avgEnemyLength = aliveEnemies.length > 0 
    ? aliveEnemies.reduce((acc, curr) => acc + curr.length, 0) / aliveEnemies.length 
    : 0;

  const maxEnemyLength = aliveEnemies.length > 0 
    ? Math.max(...aliveEnemies.map(s => s.length)) 
    : 0;

  // Starvation/Emergency state or early vulnerable growth requirement
  if (you.health < config.HEALTH_CRITICAL_THRESHOLD || 
      (you.health < 70 && you.length <= avgEnemyLength) ||
      (you.length <= 4 && you.health < 80)) {
    return 'SEARCH_FOOD_URGENT';
  }

  // Dominating state (we are the biggest and healthy)
  if (aliveEnemies.length > 0 && you.length > maxEnemyLength && you.health > config.HEALTH_SAFE_THRESHOLD) {
    return 'DOMINATING';
  }

  // Base personalities based on active player count
  if (aliveEnemies.length === 0) {
    return 'LONE_SNAKE'; // 1 player left
  } else if (aliveEnemies.length === 1) {
    return 'DUEL_1V1';   // 2 players
  } else if (aliveEnemies.length === 2) {
    return 'TACTICAL_3P'; // 3 players
  } else {
    return 'SURVIVAL_4P'; // 4 or more players
  }
};
