export const config = {
  WEIGHT_FREE_SPACE: parseFloat(process.env.WEIGHT_FREE_SPACE || '10.0'),
  WEIGHT_FOOD_DISTANCE: parseFloat(process.env.WEIGHT_FOOD_DISTANCE || '5.0'),
  WEIGHT_HEAD_ATTACK: parseFloat(process.env.WEIGHT_HEAD_ATTACK || '50.0'),
  WEIGHT_HEAD_AVOIDANCE: parseFloat(process.env.WEIGHT_HEAD_AVOIDANCE || '-15000.0'),
  WEIGHT_TAIL_CHASE: parseFloat(process.env.WEIGHT_TAIL_CHASE || '25.0'),
  WEIGHT_CENTER_CONTROL: parseFloat(process.env.WEIGHT_CENTER_CONTROL || '1.0'),
  WEIGHT_EDGE_AVOIDANCE: parseFloat(process.env.WEIGHT_EDGE_AVOIDANCE || '15.0'),
  HEALTH_CRITICAL_THRESHOLD: parseInt(process.env.HEALTH_CRITICAL_THRESHOLD || '35', 10),
  HEALTH_SAFE_THRESHOLD: parseInt(process.env.HEALTH_SAFE_THRESHOLD || '70', 10)
};
