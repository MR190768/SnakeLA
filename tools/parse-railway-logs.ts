import * as fs from 'fs';
import * as path from 'path';

// Usage: ts-node parse-railway-logs.ts logs.txt
const logFile = process.argv[2];
const dataDir = path.join(__dirname, '../data');

if (!logFile || !fs.existsSync(logFile)) {
  console.error("Please provide a valid log file path.");
  process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');
const metrics: any[] = [];

for (const line of lines) {
  if (line.includes('BATTLESNAKE_GAME_METRIC')) {
    try {
      const jsonStart = line.indexOf('{');
      const data = JSON.parse(line.substring(jsonStart));
      metrics.push(data);
    } catch (e) {
      // Ignore parse errors on malformed lines
    }
  }
}

const outPath = path.join(dataDir, 'training_metrics.jsonl');
fs.mkdirSync(dataDir, { recursive: true });

const output = metrics.map(m => JSON.stringify(m)).join('\n');
fs.writeFileSync(outPath, output);
console.log(`Parsed ${metrics.length} metrics. Saved to ${outPath}`);
