const z = require('zod');

const toggleFavoriteSchema = z.object({
  track: z.object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    duration: z.number().default(0),
    thumbnail: z.string().optional()
  })
});

module.exports = async function (fastify, opts) {
  const { prisma } = fastify;

  fastify.addHook('preValidation', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.get('/', async (request, reply) => {
    const userId = request.user.id;
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        track: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { favorites };
  });

  fastify.post('/toggle', async (request, reply) => {
    const userId = request.user.id;
    const { track } = toggleFavoriteSchema.parse(request.body);

    let dbTrack = await prisma.track.findFirst({ where: { sourceId: track.id, source: 'YOUTUBE' } });
    if (!dbTrack) {
      dbTrack = await prisma.track.create({
        data: {
          title: track.title,
          artist: track.artist,
          duration: track.duration || 0,
          source: 'YOUTUBE',
          sourceId: track.id,
          thumbnail: track.thumbnail
        }
      });
    }

    const existingFav = await prisma.favorite.findUnique({
      where: { userId_trackId: { userId, trackId: dbTrack.id } }
    });

    if (existingFav) {
      await prisma.favorite.delete({
        where: { userId_trackId: { userId, trackId: dbTrack.id } }
      });
      return reply.send({ message: 'Removed from favorites', isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: { userId, trackId: dbTrack.id }
      });
      return reply.send({ message: 'Added to favorites', isFavorite: true });
    }
  });
};
