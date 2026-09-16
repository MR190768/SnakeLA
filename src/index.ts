import Fastify from 'fastify';
import server from './server';

const fastify = Fastify({ logger: process.env.NODE_ENV !== 'production' });
fastify.register(server);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8080', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Battlesnake FSM server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
