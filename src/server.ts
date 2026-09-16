import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GameState, InfoResponse } from './types/battlesnake';
import { move, activeGames } from './logic/brain';
import * as fs from 'fs';
import * as path from 'path';

export default async function (fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const info: InfoResponse = { apiversion: '1', author: 'gerson', color: '#FF0000', head: 'evil', tail: 'nr-booster', version: '2.0.0' };
    return info;
  });

  fastify.post('/start', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    const { game } = request.body;
    activeGames[game.id] = [];
    return reply.status(200).send();
  });

  fastify.post('/move', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    try {
      const response = move(request.body);
      return reply.status(200).send(response);
    } catch (err) {
      request.log.error(err);
      return reply.status(200).send({ move: 'up' });
    }
  });

  fastify.post('/end', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    const { game, board, you, turn } = request.body;
    
    const won = board.snakes.some(s => s.id === you.id);
    let deathReason = won ? 'SURVIVED' : 'UNKNOWN';
    
    if (!won && activeGames[game.id]) {
      const lastMetric = activeGames[game.id][activeGames[game.id].length - 1];
      if (lastMetric) {
        if (lastMetric.health === 1) deathReason = 'STARVATION';
        else if (lastMetric.freeSpace === 0) deathReason = 'TRAPPED';
        // Simplified heuristic for other deaths
      }
    }

    const gameData = {
      tag: "BATTLESNAKE_GAME_METRIC",
      gameId: game.id,
      won,
      turns: turn,
      finalLength: you.length,
      deathReason,
      history: activeGames[game.id] || []
    };

    console.log(JSON.stringify(gameData));

    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(dataDir, 'telemetry_logs.jsonl'),
        JSON.stringify(gameData) + '\n'
      );
    } catch (err) {
      request.log.error(err as Error, 'Failed to write telemetry data');
    }

    delete activeGames[game.id];
    return reply.status(200).send();
  });
}
