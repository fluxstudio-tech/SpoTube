const ytdl = require('@distube/ytdl-core');

module.exports = async function (fastify, opts) {

  fastify.get('/search', async (request, reply) => {
    const { q } = request.query;
    if (!q) return reply.status(400).send({ error: 'Search query "q" is required' });

    try {
      const ytSearch = require('yt-search');
      const searchRes = await ytSearch(q);

      if (!searchRes || !searchRes.videos) throw new Error("Arama sonucu yok");

      const tracks = searchRes.videos.slice(0, 15).map(item => ({
        id: item.videoId,
        title: item.title,
        artist: item.author.name,
        thumbnail: item.thumbnail
      }));

      return { tracks };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'YouTube arama basarisiz oldu veya limit asildi.' });
    }
  });

  fastify.get('/playlist', async (request, reply) => {
    const { id } = request.query;
    if (!id) return reply.status(400).send({ error: 'Playlist ID "id" is required' });

    try {
      const ytSearch = require('yt-search');
      const listRes = await ytSearch({ listId: id });

      if (!listRes || !listRes.videos) throw new Error("Müzik listesi bulunamadı veya gizli.");

      const tracks = listRes.videos.map(item => {
        const vidId = item.videoId;
        if (!vidId) return null;

        return {
          id: vidId,
          title: item.title,
          artist: item.author.name,
          thumbnail: item.thumbnail
        };
      }).filter(Boolean);

      return { tracks };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch YouTube playlist' });
    }
  });

  fastify.get('/download', async (request, reply) => {
    const { id, format } = request.query;

    if (!id) return reply.status(400).send({ error: 'Video ID required' });

    try {
      const videoUrl = `https://www.youtube.com/watch?v=${id}`;
      const info = await ytdl.getBasicInfo(videoUrl);
      const safeTitle = info.videoDetails.title.replace(/[^\w\s.-]/gi, '');

      if (format === 'mp4') {
        reply.header('Content-Disposition', `attachment; filename="SpoTube_${safeTitle}.mp4"`);
        reply.header('Content-Type', 'video/mp4');
        return reply.send(ytdl(videoUrl, { format: 'mp4', quality: 'highest' }));
      } else {
        reply.header('Content-Disposition', `attachment; filename="SpoTube_${safeTitle}.mp3"`);
        reply.header('Content-Type', 'audio/mpeg');
        return reply.send(ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' }));
      }
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to process download stream' });
    }
  });
};
