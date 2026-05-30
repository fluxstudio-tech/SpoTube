const z = require('zod');
const fetch = require('node-fetch');
const spotify = require('spotify-url-info')(fetch);
const ytSearch = require('yt-search');

module.exports = async function (fastify, opts) {

  fastify.get('/playlist', async (request, reply) => {
    const { url } = request.query;
    if (!url) return reply.status(400).send({ error: 'Spotify playlist URL is required' });

    try {
      const playlistData = await spotify.getData(url);
      const tracksData = await spotify.getTracks(url);

      if (!tracksData || tracksData.length === 0) {
        throw new Error(`Spotify listesi bos veya gizli.`);
      }

      const items = tracksData.slice(0, 20);

      const trackPromises = items.map(async (item, i) => {
        const trackName = item.name;
        let artistName = '';

        if (item.artists && Array.isArray(item.artists)) {
          artistName = item.artists.map(a => a.name).join(' ');
        } else if (item.artist) {
          artistName = item.artist;
        }

        if (!trackName) return null;

        const query = `${trackName} ${artistName}`.trim();

        try {
          const searchRes = await ytSearch(query);
          if (searchRes && searchRes.videos && searchRes.videos.length > 0) {
            const ytItem = searchRes.videos[0];
            return {
              id: ytItem.videoId,
              title: ytItem.title,
              artist: ytItem.author.name,
              thumbnail: ytItem.thumbnail
            };
          }
        } catch (err) {
          console.error(`[Spotify] Error searching track [${i}]: ${query} ->`, err.message);
        }
        return null;
      });

      const results = await Promise.all(trackPromises);
      const youtubeTracks = results.filter(Boolean);

      return {
        name: playlistData.name || 'Spotify Playlist',
        coverUrl: playlistData.coverArt?.sources?.[0]?.url || '',
        tracks: youtubeTracks
      };
    } catch (error) {
      request.log.error(error);
      const errorMsg = error.message || 'Bilinmeyen Hata.';
      return reply.status(500).send({ error: `Spotify Aktarim: ${errorMsg}` });
    }
  });

  fastify.get('/home-data', async (request, reply) => {
    const curation = {
      trending: [
        { id: '1', name: "Top 50 Global", url: "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF" },
        { id: '2', name: "Hot Hits Türkiye", url: "https://open.spotify.com/playlist/37i9dQZF1DX1O9IdY37IBy" }
      ],
      newReleases: [
        { id: '3', name: "New Music Friday TR", url: "https://open.spotify.com/playlist/37i9dQZF1DX4Y9U676ST9z" },
        { id: '4', name: "En Yeni Çıkanlar", url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" }
      ],
      categories: [
        { id: '5', name: "Türkçe Rap", url: "https://open.spotify.com/playlist/37i9dQZF1DX8f6LHxM97Xv" },
        { id: '6', name: "Türkçe Slow", url: "https://open.spotify.com/playlist/37i9dQZF1DXa87uV8pD9F8" },
        { id: '7', name: "Hip Hop Mix", url: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd" }
      ],
      forYou: [
        { id: '8', name: "Gece Modu", url: "https://open.spotify.com/playlist/37i9dQZF1DXdbX9v76Q860" },
        { id: '9', name: "Odaklanma", url: "https://open.spotify.com/playlist/37i9dQZF1DXc3y9H2O6Xm8" }
      ]
    };

    const fetchMetadata = async (item) => {
      try {
        const data = await spotify.getData(item.url);
        return {
          ...item,
          cover: data.coverArt?.sources?.[0]?.url || '',
          description: data.description || ''
        };
      } catch (err) {
        return { ...item, cover: '', description: '' };
      }
    };

    const results = {};
    const keys = Object.keys(curation);

    const allPromises = keys.flatMap(key =>
      curation[key].map(async (item) => {
        const metadata = await fetchMetadata(item);
        return { key, metadata };
      })
    );

    const allResults = await Promise.all(allPromises);

    keys.forEach(key => results[key] = []);
    allResults.forEach(res => {
      results[res.key].push(res.metadata);
    });

    return results;
  });

};
