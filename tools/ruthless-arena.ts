import { GameState, Battlesnake, Coord, MoveResponse } from '../src/types/battlesnake';
import { move as userMove, activeGames } from '../src/logic/brain';
import { isOutOfBounds, isBodyCollision } from '../src/logic/collision';
import { calculateFreeSpace } from '../src/logic/floodFill';
import * as fs from 'fs';
import * as path from 'path';

// --- Ruthless Adversary: Nemesis (Antigravity Predator) ---
function nemesisMove(gameState: GameState): MoveResponse {
  const myHead = gameState.you.head;
  const { width, height, snakes, food } = gameState.board;
  const directions = [
    { dir: 'up', coord: { x: myHead.x, y: myHead.y + 1 } },
    { dir: 'down', coord: { x: myHead.x, y: myHead.y - 1 } },
    { dir: 'left', coord: { x: myHead.x - 1, y: myHead.y } },
    { dir: 'right', coord: { x: myHead.x + 1, y: myHead.y } }
  ];

  let bestMove = 'up';
  let bestScore = -Infinity;

  // Find user snake if alive
  const userSnake = snakes.find(s => s.name === 'UserSnake');

  for (const { dir, coord } of directions) {
    if (isOutOfBounds(coord, width, height) || isBodyCollision(coord, snakes)) {
      continue;
    }

    // Space check
    const free = calculateFreeSpace(coord, gameState, gameState.you.length * 2);
    if (free < gameState.you.length) continue;

    let score = free * 2.0;

    // Center preference
    const distToCenter = Math.abs(coord.x - width / 2) + Math.abs(coord.y - height / 2);
    score -= distToCenter * 1.5;

    // Ruthless Head Hunting: If we are larger than UserSnake, pursue its head aggressively!
    if (userSnake && userSnake.id !== gameState.you.id) {
      const distToUser = Math.abs(coord.x - userSnake.head.x) + Math.abs(coord.y - userSnake.head.y);
      if (gameState.you.length > userSnake.length) {
        // Attack! Cut off user!
        score += (20 - distToUser) * 15;
      } else {
        // Avoid user head collision
        if (distToUser <= 1) score -= 1000;
      }
    }

    // Head-to-head collision awareness with other snakes
    for (const other of snakes) {
      if (other.id === gameState.you.id) continue;
      const d = Math.abs(coord.x - other.head.x) + Math.abs(coord.y - other.head.y);
      if (d === 1) {
        if (other.length >= gameState.you.length) {
          score -= 5000; // Never risk losing head-to-head
        } else {
          score += 500; // Devour smaller head!
        }
      }
    }

    // Aggressively hunt nearest food to outgrow everyone
    if (food.length > 0) {
      let nearestFoodDist = Infinity;
      for (const f of food) {
        const fd = Math.abs(coord.x - f.x) + Math.abs(coord.y - f.y);
        if (fd < nearestFoodDist) nearestFoodDist = fd;
      }
      score += (20 - nearestFoodDist) * 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  }

  return { move: bestMove as any };
}

// --- Official 11x11 Battlesnake Simulator Engine ---
interface GameResult {
  gameIndex: number;
  winner: string;
  userSurvivedTurns: number;
  userFinalLength: number;
  userDeathReason: string;
}

function runSingleMatch(gameIndex: number): GameResult {
  const gameId = `local-arena-${gameIndex}-${Date.now()}`;
  const width = 11;
  const height = 11;

  // Initial standard spawn positions for 4 snakes
  const startPositions: Coord[] = [
    { x: 1, y: 1 },
    { x: 1, y: 9 },
    { x: 9, y: 1 },
    { x: 9, y: 9 }
  ];

  let snakes: Battlesnake[] = [
    {
      id: 'user-snake-id',
      name: 'UserSnake',
      health: 100,
      body: [startPositions[0], startPositions[0], startPositions[0]],
      head: startPositions[0],
      length: 3,
      latency: '0',
      shout: '',
      squad: '',
      customizations: { color: '#FF0000', head: 'evil', tail: 'nr-booster' }
    },
    {
      id: 'nemesis-1',
      name: 'Nemesis_Alpha',
      health: 100,
      body: [startPositions[1], startPositions[1], startPositions[1]],
      head: startPositions[1],
      length: 3,
      latency: '0',
      shout: '',
      squad: '',
      customizations: { color: '#00FF00', head: 'shades', tail: 'bolt' }
    },
    {
      id: 'nemesis-2',
      name: 'Nemesis_Beta',
      health: 100,
      body: [startPositions[2], startPositions[2], startPositions[2]],
      head: startPositions[2],
      length: 3,
      latency: '0',
      shout: '',
      squad: '',
      customizations: { color: '#0000FF', head: 'fang', tail: 'hook' }
    },
    {
      id: 'nemesis-3',
      name: 'Nemesis_Gamma',
      health: 100,
      body: [startPositions[3], startPositions[3], startPositions[3]],
      head: startPositions[3],
      length: 3,
      latency: '0',
      shout: '',
      squad: '',
      customizations: { color: '#FFFF00', head: 'skull', tail: 'curled' }
    }
  ];

  let food: Coord[] = [
    { x: 5, y: 5 }, // Center food
    { x: 2, y: 5 },
    { x: 8, y: 5 },
    { x: 5, y: 2 },
    { x: 5, y: 8 }
  ];

  let turn = 0;
  let userDeathReason = 'SURVIVED';
  let userSurvivedTurns = 0;
  let userFinalLength = 3;

  activeGames[gameId] = [];

  while (turn < 350) {
    const aliveSnakes = snakes.filter(s => s.health > 0);
    const userAlive = aliveSnakes.some(s => s.id === 'user-snake-id');

    if (userAlive) {
      userSurvivedTurns = turn;
      const u = aliveSnakes.find(s => s.id === 'user-snake-id')!;
      userFinalLength = u.length;
    }

    if (aliveSnakes.length <= 1) {
      break;
    }

    // Step 1: Query moves
    const plannedMoves: { snakeId: string; targetCoord: Coord; moveDir: string }[] = [];

    for (const snake of aliveSnakes) {
      const state: GameState = {
        game: { id: gameId, ruleset: { name: 'standard', version: 'v1', settings: {} }, map: 'standard', source: 'local', timeout: 500 },
        turn,
        board: { height, width, food: [...food], hazards: [], snakes: aliveSnakes },
        you: snake
      };

      let m: MoveResponse;
      if (snake.id === 'user-snake-id') {
        try {
          m = userMove(state);
        } catch (e) {
          m = { move: 'up' };
        }
      } else {
        m = nemesisMove(state);
      }

      let dx = 0, dy = 0;
      if (m.move === 'up') dy = 1;
      else if (m.move === 'down') dy = -1;
      else if (m.move === 'left') dx = -1;
      else if (m.move === 'right') dx = 1;

      const targetCoord = { x: snake.head.x + dx, y: snake.head.y + dy };
      plannedMoves.push({ snakeId: snake.id, targetCoord, moveDir: m.move });
    }

    // Step 2: Apply moves & update bodies
    const deadSnakeIds = new Set<string>();
    const ateFoodSnakeIds = new Set<string>();

    for (const pm of plannedMoves) {
      const snake = snakes.find(s => s.id === pm.snakeId)!;
      const target = pm.targetCoord;

      // Decrement health
      snake.health -= 1;
      if (snake.health <= 0) {
        deadSnakeIds.add(snake.id);
        if (snake.id === 'user-snake-id') userDeathReason = 'STARVATION';
        continue;
      }

      // Check wall collision
      if (target.x < 0 || target.x >= width || target.y < 0 || target.y >= height) {
        deadSnakeIds.add(snake.id);
        if (snake.id === 'user-snake-id') userDeathReason = 'WALL_COLLISION';
        continue;
      }

      // Check food eating
      const foodIndex = food.findIndex(f => f.x === target.x && f.y === target.y);
      const ateFood = foodIndex !== -1;

      // Update body
      snake.head = target;
      snake.body.unshift(target);

      if (ateFood) {
        snake.health = 100;
        snake.length += 1;
        ateFoodSnakeIds.add(snake.id);
        food.splice(foodIndex, 1);
      } else {
        snake.body.pop();
      }
    }

    // Step 3: Check Body Collisions
    for (const pm of plannedMoves) {
      if (deadSnakeIds.has(pm.snakeId)) continue;
      const snake = snakes.find(s => s.id === pm.snakeId)!;

      for (const other of aliveSnakes) {
        // Exclude the other snake's newly moved head
        const bodyToCheck = other.id === snake.id ? other.body.slice(1) : other.body.slice(1);
        if (bodyToCheck.some(b => b.x === snake.head.x && b.y === snake.head.y)) {
          deadSnakeIds.add(snake.id);
          if (snake.id === 'user-snake-id') userDeathReason = 'BODY_COLLISION';
          break;
        }
      }
    }

    // Step 4: Check Head-to-Head Collisions
    for (let i = 0; i < plannedMoves.length; i++) {
      const s1 = snakes.find(s => s.id === plannedMoves[i].snakeId)!;
      if (deadSnakeIds.has(s1.id)) continue;

      for (let j = i + 1; j < plannedMoves.length; j++) {
        const s2 = snakes.find(s => s.id === plannedMoves[j].snakeId)!;
        if (deadSnakeIds.has(s2.id)) continue;

        if (s1.head.x === s2.head.x && s1.head.y === s2.head.y) {
          // Head to head!
          if (s1.length > s2.length) {
            deadSnakeIds.add(s2.id);
            if (s2.id === 'user-snake-id') userDeathReason = 'HEAD_TO_HEAD_LOST';
          } else if (s2.length > s1.length) {
            deadSnakeIds.add(s1.id);
            if (s1.id === 'user-snake-id') userDeathReason = 'HEAD_TO_HEAD_LOST';
          } else {
            // Tie -> both die!
            deadSnakeIds.add(s1.id);
            deadSnakeIds.add(s2.id);
            if (s1.id === 'user-snake-id' || s2.id === 'user-snake-id') {
              userDeathReason = 'HEAD_TO_HEAD_TIED';
            }
          }
        }
      }
    }

    // Mark dead snakes
    for (const deadId of deadSnakeIds) {
      const deadSnake = snakes.find(s => s.id === deadId)!;
      deadSnake.health = 0;
    }

    // Spawn replacement food if food is low
    while (food.length < 2) {
      const rx = Math.floor(Math.random() * width);
      const ry = Math.floor(Math.random() * height);
      const occupied = snakes.some(s => s.health > 0 && s.body.some(b => b.x === rx && b.y === ry));
      if (!occupied && !food.some(f => f.x === rx && f.y === ry)) {
        food.push({ x: rx, y: ry });
      }
    }

    turn++;
  }

  const remaining = snakes.filter(s => s.health > 0);
  const winner = remaining.length === 1 ? remaining[0].name : (remaining.length > 1 ? 'DRAW_TIMEOUT' : 'ALL_DEAD');

  if (winner === 'UserSnake') {
    userDeathReason = 'SURVIVED';
  } else if (userDeathReason === 'SURVIVED') {
    userDeathReason = 'UNKNOWN_ELIMINATION';
  }

  // Save Telemetry
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const telemetryLog = {
    tag: 'BATTLESNAKE_GAME_METRIC',
    gameId,
    won: winner === 'UserSnake',
    turns: userSurvivedTurns,
    finalLength: userFinalLength,
    deathReason: userDeathReason,
    winner,
    history: activeGames[gameId] || []
  };

  fs.appendFileSync(path.join(dataDir, 'telemetry_logs.jsonl'), JSON.stringify(telemetryLog) + '\n');
  delete activeGames[gameId];

  return {
    gameIndex,
    winner,
    userSurvivedTurns,
    userFinalLength,
    userDeathReason
  };
}

// --- Run 10 Ruthless Matches ---
console.log('=====================================================');
console.log('⚔️  RUTHLESS 4-SNAKE ARENA: 10 MATCH BATTLE ROYALE  ⚔️');
console.log('   UserSnake vs 3 Ruthless Antigravity Nemesis Bots   ');
console.log('=====================================================\n');

const results: GameResult[] = [];

for (let i = 1; i <= 10; i++) {
  const res = runSingleMatch(i);
  results.push(res);
  const icon = res.winner === 'UserSnake' ? '🏆 WON' : '💀 LOST';
  console.log(`[Game ${i.toString().padStart(2, '0')}] ${icon} | Winner: ${res.winner.padEnd(14)} | Survived: ${res.userSurvivedTurns.toString().padStart(3)} turns | Final Length: ${res.userFinalLength.toString().padStart(2)} | Death Reason: ${res.userDeathReason}`);
}

const wins = results.filter(r => r.winner === 'UserSnake').length;
const deathTally = results.reduce((acc, curr) => {
  if (curr.winner !== 'UserSnake') {
    acc[curr.userDeathReason] = (acc[curr.userDeathReason] || 0) + 1;
  }
  return acc;
}, {} as Record<string, number>);

console.log('\n=====================================================');
console.log(`📊 FINAL RESULTS: ${wins}/10 WINS (${wins * 10}%)`);
console.log('💀 Death Breakdown:', JSON.stringify(deathTally));
console.log('=====================================================');
