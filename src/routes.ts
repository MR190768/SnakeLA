import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { GameState, InfoResponse } from './types';
import { move } from './logic/brain';

export default async function (fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const info: InfoResponse = {
      apiversion: '1',
      author: 'senior-engineer',
      color: '#00FF66',
      head: 'smart-caterpillar',
      tail: 'bolt',
      version: '1.0.0'
    };
    return info;
  });

  fastify.post('/start', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    return reply.status(200).send();
  });

  fastify.post('/move', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    try {
      const gameState = request.body;
      const moveResponse = move(gameState);
      return reply.status(200).send(moveResponse);
    } catch (err) {
      request.log.error(err);
      // Fail-safe default
      return reply.status(200).send({ move: 'up' });
    }
  });

  fastify.post('/end', async (request: FastifyRequest<{ Body: GameState }>, reply: FastifyReply) => {
    return reply.status(200).send();
  });
}
