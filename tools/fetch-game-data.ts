import * as fs from 'fs';
import * as path from 'path';

const gameId = process.argv[2];
if (!gameId) {
  console.error("Usage: npm run fetch-replay -- <gameId>");
  process.exit(1);
}

const dataDir = path.join(__dirname, '../data/replays');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

async function fetchReplay() {
  console.log(`Fetching game ${gameId}...`);
  try {
    const res = await fetch(`https://engine.battlesnake.com/games/${gameId}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    fs.writeFileSync(path.join(dataDir, `${gameId}.json`), JSON.stringify(data, null, 2));
    console.log(`Saved to data/replays/${gameId}.json`);
  } catch (e) {
    console.error("Error fetching replay:", e);
  }
}

fetchReplay();
