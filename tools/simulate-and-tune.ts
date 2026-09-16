import * as fs from 'fs';
import * as path from 'path';

let metricsFile = path.join(__dirname, '../data/telemetry_logs.jsonl');
if (!fs.existsSync(metricsFile)) {
  metricsFile = path.join(__dirname, '../data/training_metrics.jsonl');
}

if (!fs.existsSync(metricsFile)) {
  console.error("No training data found. Run arena or log parser first.");
  process.exit(1);
}

const lines = fs.readFileSync(metricsFile, 'utf-8').split('\n').filter(Boolean);
const metrics = lines.map(l => JSON.parse(l));

const losses = metrics.filter(m => !m.won);
console.log(`Found ${metrics.length} total games, ${losses.length} losses.`);

const reasons = losses.reduce((acc, curr) => {
  acc[curr.deathReason] = (acc[curr.deathReason] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log("Death Reasons Analysis:", reasons);

// Simple auto-tuning simulation (Grid Search concept)
console.log("\n--- Starting Calibration ---");

// Modern tuned weights
const newWeights = {
  WEIGHT_FREE_SPACE: 12.0,
  WEIGHT_FOOD_DISTANCE: 6.0,
  WEIGHT_HEAD_AVOIDANCE: -15000.0,
  WEIGHT_HEAD_ATTACK: 150.0,
  WEIGHT_EDGE_AVOIDANCE: 12.0,
  WEIGHT_TAIL_CHASE: 25.0
};

if (reasons['TRAPPED'] > (losses.length * 0.2)) {
  console.log("High trapping rate detected. Increasing edge avoidance and free space weight.");
  newWeights.WEIGHT_FREE_SPACE = 20.0;
  newWeights.WEIGHT_EDGE_AVOIDANCE = 25.0;
  newWeights.WEIGHT_TAIL_CHASE = 35.0;
}

if ((reasons['HEAD_TO_HEAD_LOST'] || 0) > (losses.length * 0.2)) {
  console.log("High head-to-head loss rate. Enforcing strict head avoidance.");
  newWeights.WEIGHT_HEAD_AVOIDANCE = -20000.0;
}

const envContent = Object.entries(newWeights)
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, '../.env.optimized'), envContent);
console.log("Saved optimized weights to .env.optimized");
console.log("You can apply these using: railway variables --set KEY=VALUE");
