const fastify = require('fastify')({ logger: true });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

fastify.decorate('prisma', prisma);
fastify.decorate('redis', redis);

fastify.register(require('@fastify/helmet'), { global: true });

fastify.register(require('@fastify/cors'), {
  origin: (origin, cb) => {
    const allowed = ['http://localhost:3000', 'http://localhost:5173'];
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
});

fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  redis: redis
});

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'super_secret_startup_key'
});

const { firewallMiddleware } = require('./security/firewall');
fastify.addHook('onRequest', firewallMiddleware);

fastify.setErrorHandler(function (error, request, reply) {
  if (error instanceof require('zod').ZodError) {
    reply.status(400).send({ error: 'Validation Error', details: error.errors });
  } else {
    request.log.error(error);
    reply.status(500).send({ error: 'Internal Server Error' });
  }
});

fastify.register(require('./auth/authHandler'), { prefix: '/auth' });
fastify.register(require('./youtube/youtubeHandler'), { prefix: '/youtube' });
fastify.register(require('./playlists/playlistHandler'), { prefix: '/playlists' });
fastify.register(require('./favorites/favoriteHandler'), { prefix: '/favorites' });
fastify.register(require('./spotify/spotifyHandler'), { prefix: '/spotify' });

fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', timestamp: new Date() };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

