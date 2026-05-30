const z = require('zod');

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false)
});

const addTrackSchema = z.object({
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
    const playlists = await prisma.playlist.findMany({
      where: { ownerId: userId },
      include: {
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { playlists };
  });

  fastify.post('/', async (request, reply) => {
    const userId = request.user.id;
    const data = createPlaylistSchema.parse(request.body);

    const playlist = await prisma.playlist.create({
      data: {
        ...data,
        ownerId: userId
      }
    });

    return reply.status(201).send({ playlist });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params;
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        items: {
          include: { track: true },
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!playlist) return reply.status(404).send({ error: 'Playlist not found' });
    if (!playlist.isPublic && playlist.ownerId !== request.user.id) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return { playlist };
  });

  fastify.post('/:id/add', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    const { track } = addTrackSchema.parse(request.body);

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.ownerId !== userId) {
      return reply.status(403).send({ error: 'Playlist not found or access denied' });
    }

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

    const existingItem = await prisma.playlistItem.findUnique({
      where: { playlistId_trackId: { playlistId: id, trackId: dbTrack.id } }
    });

    if (existingItem) {
      return reply.status(400).send({ error: 'Track already in playlist' });
    }

    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId: id },
      orderBy: { position: 'desc' }
    });
    const position = lastItem ? lastItem.position + 1 : 0;

    const added = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        trackId: dbTrack.id,
        position
      }
    });

    return reply.status(201).send({ message: 'Track added to playlist', item: added });
  });

  const bulkAddSchema = z.object({
    tracks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      artist: z.string(),
      duration: z.number().default(0),
      thumbnail: z.string().optional()
    }))
  });

  fastify.post('/:id/bulk-add', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;
    const { tracks } = bulkAddSchema.parse(request.body);

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.ownerId !== userId) {
      return reply.status(403).send({ error: 'Playlist not found or access denied' });
    }

    const lastItem = await prisma.playlistItem.findFirst({
      where: { playlistId: id },
      orderBy: { position: 'desc' }
    });
    let startPosition = lastItem ? lastItem.position + 1 : 0;

    let addedCount = 0;
    for (const track of tracks) {
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

      const existingItem = await prisma.playlistItem.findUnique({
        where: { playlistId_trackId: { playlistId: id, trackId: dbTrack.id } }
      });

      if (!existingItem) {
        await prisma.playlistItem.create({
          data: {
            playlistId: id,
            trackId: dbTrack.id,
            position: startPosition++
          }
        });
        addedCount++;
      }
    }

    return reply.status(201).send({ message: `Successfully added ${addedCount} tracks` });
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params;
    const userId = request.user.id;

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.ownerId !== userId) {
      return reply.status(403).send({ error: 'Playlist not found or access denied' });
    }

    await prisma.playlist.delete({ where: { id } });
    return { message: 'Playlist deleted successfully' };
  });
};
