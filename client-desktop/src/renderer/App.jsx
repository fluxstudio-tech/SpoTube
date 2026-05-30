import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Home, Search as SearchIcon, Library, DownloadCloud, UploadCloud, Play, Pause, SkipForward, SkipBack, MonitorPlay, Headphones, Volume2, Shuffle, Repeat, History as HistoryIcon, X, Heart, ListMusic, User as UserIcon, LogOut, Plus } from 'lucide-react';
import { usePlayerStore } from './store/playerStore';
import { useUserStore } from './store/userStore';
import { LoginRegister } from './components/LoginRegister';
import './index.css';

const App = () => {
  const { currentTrack, queue, isPlaying, isVideoMode, playTrack, togglePlay, toggleVideoMode, setQueue, playNextInQueue, playPrevInQueue, isShuffle, isRepeat, toggleShuffle, toggleRepeat } = usePlayerStore();
  const { user, token, logout, favorites, playlists, setFavorites, setPlaylists, addFavorite, removeFavorite } = useUserStore();
  
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [downloadFolder, setDownloadFolder] = useState(localStorage.getItem('auralvault_download_folder') || null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('auralvault_search_history');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isImportingSpotify, setIsImportingSpotify] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [homeData, setHomeData] = useState(null);
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    if (user && token) {
      fetchFavorites();
      fetchPlaylists();
      fetchHomeData();
    }
  }, [user, token]);

  const fetchHomeData = async () => {
    try {
      const res = await fetch('http://localhost:3000/spotify/home-data');
      if (res.ok) {
        const data = await res.json();
        setHomeData(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch('http://localhost:3000/favorites', { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites);
      }
    } catch (e) { console.error(e); }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('http://localhost:3000/playlists', { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists);
      }
    } catch (e) { console.error(e); }
  };

  const submitCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setIsCreatingPlaylist(false);
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/playlists', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newPlaylistName })
      });
      if (res.ok) {
        fetchPlaylists();
        setNewPlaylistName('');
        setIsCreatingPlaylist(false);
      }
    } catch (e) { console.error(e); }
  };

  const submitImportSpotify = async () => {
    if(!spotifyUrl.trim()) {
      setIsImportingSpotify(false);
      return;
    }
    const query = spotifyUrl.trim();
    setSpotifyUrl('');
    setIsImportingSpotify(false);
    
    setLoading(true);
    try {
      let url = null;
      if (query.includes('open.spotify.com/playlist') || query.includes('spotify:playlist')) {
         url = `http://localhost:3000/spotify/playlist?url=${encodeURIComponent(query)}`;
      } else if (query.includes('&list=') || query.includes('?list=')) {
         const urlObj = new URL(query);
         const listId = urlObj.searchParams.get('list');
         if (listId) url = `http://localhost:3000/youtube/playlist?id=${listId}`;
      } else {
         alert('Geçerli bir YouTube veya Spotify Playlist linki giriniz.');
         setLoading(false);
         return;
      }


      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.tracks || data.tracks.length === 0) {
         throw new Error(data.error || 'Playlist boş veya bulunamadı.');
      }

      const playlistName = data.name || "İçe Aktarılan Liste";


      const createRes = await fetch('http://localhost:3000/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: playlistName })
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error('Liste oluşturulamadı');


      const bulkRes = await fetch(`http://localhost:3000/playlists/${createData.playlist.id}/bulk-add`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ tracks: data.tracks })
      });
      
      if (!bulkRes.ok) throw new Error('Şarkılar listeye eklenemedi');

      fetchPlaylists();
      alert(`✅ Başarıyla eklendi: ${playlistName} (${data.tracks.length} şarkı)`);
      
    } catch (err) {
      console.error(err);
      alert(`❌ İçe aktarma hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylist = async (id) => {
    setActiveTab('playlist');
    setActivePlaylistId(id);
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/playlists/${id}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) {
        const data = await res.json();
        const mappedQueue = data.playlist.items.map(item => ({
          id: item.track.sourceId,
          title: item.track.title,
          artist: item.track.artist,
          thumbnail: item.track.thumbnail || ''
        }));
        setQueue(mappedQueue);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleLoadFeaturedPlaylist = async (url) => {
    setLoading(true);
    setActiveTab('home');
    try {
      const res = await fetch(`http://localhost:3000/spotify/playlist?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          setQueue(data.tracks);
          playTrack(data.tracks[0]);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleFavoriteTrack = async (e, trackParam = null) => {
    if (e) e.stopPropagation();
    const track = trackParam || currentTrack;
    if (!track || !token) return;

    try {
      const res = await fetch('http://localhost:3000/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ track })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isFavorite) {
          addFavorite(track);
        } else {
          removeFavorite(track.id);
        }
      }
    } catch (e) { console.error(e); }
  };
  
  const isHearted = (trackId) => favorites.some(f => f.track.id === trackId || f.track.sourceId === trackId);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const time = await ytPlayerRef.current.getCurrentTime();
          setCurrentTime(time);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (ytPlayerRef.current) ytPlayerRef.current.seekTo(time);
  };

  const handleVolume = (e) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(vol);
  };

  useEffect(() => {
    if (ytPlayerRef.current && currentTrack?._forcedUpdate) {
        ytPlayerRef.current.seekTo(0);
        ytPlayerRef.current.playVideo();
    }
  }, [currentTrack?._forcedUpdate]);

  useEffect(() => {
    if (ytPlayerRef.current) {
      isPlaying ? ytPlayerRef.current.playVideo() : ytPlayerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  const executeSearch = async (query) => {
    if (!query) return;
    setLoading(true);
    setActiveTab('search');
    setSearchInput(query);
    setIsSearchFocused(false);
    
    setSearchHistory(prev => {
       const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 8);
       localStorage.setItem('auralvault_search_history', JSON.stringify(newHistory));
       return newHistory;
    });

    try {
      let url = `http://localhost:3000/youtube/search?q=${encodeURIComponent(query)}`;
      
      if (query.includes('open.spotify.com/playlist') || query.includes('spotify:playlist')) {
         url = `http://localhost:3000/spotify/playlist?url=${encodeURIComponent(query)}`;
      } else if (query.includes('&list=') || query.includes('?list=')) {
         const urlObj = new URL(query);
         const listId = urlObj.searchParams.get('list');
         if (listId) url = `http://localhost:3000/youtube/playlist?id=${listId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.tracks) setQueue(data.tracks);
      else alert(data.error || 'No results found!');
    } catch (err) {
      console.error("Failed to fetch tracks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      executeSearch(searchInput.trim());
    }
  };

  const downloadTrack = async (format) => {
    if (!currentTrack) return alert("Lütfen önce indirmek istediğiniz bir şarkıyı oynatın!");
    if (!window.electronAPI) return alert("Hata: Electron API bulunamadı. Lütfen masaüstü uygulamasını yeniden başlatın.");
    
    let folder = downloadFolder;
    if (!folder) {
       const selected = await window.electronAPI.selectFolder();
       if (selected) {
          folder = selected;
          setDownloadFolder(selected);
          localStorage.setItem('auralvault_download_folder', selected);
       } else return;
    }

    setIsDownloading(true);
    try {
      const res = await window.electronAPI.downloadMedia({
          id: currentTrack.id,
          title: currentTrack.title,
          format: format
      }, folder, format);
      
      if (res && res.success) {
         alert(`✅ Başarıyla indirildi!\nKonum: ${res.filePath}`);
      } else {
         alert(`❌ İndirme Başarısız: ${res.error}`);
      }
    } catch (err) {
      alert(`❌ Kritik Hata: ${err.message || 'Bağlantı koptu'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const youtubeOpts = {
    height: '100%',
    width: '100%',
    playerVars: { 
      autoplay: 1, 
      controls: 0, 
      disablekb: 1, 
      origin: 'http://localhost:5173',
      modestbranding: 1,
      rel: 0,
      fs: 0,
      iv_load_policy: 3
    },
  };

  return (
    <div className="flex h-screen bg-[#030914] text-white flex-col font-sans overflow-hidden relative">
      {!user && <LoginRegister />}
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-teal-500/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
      
      <div className="flex flex-1 overflow-hidden z-10 relative">
        <aside className="w-64 bg-white/[0.02] backdrop-blur-3xl border-r border-white/5 p-6 flex flex-col gap-6 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          <h1 className="text-3xl font-extrabold font-logo text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 tracking-tighter drop-shadow-md cursor-default pointer-events-none">
            AuralVault <span className="text-[10px] text-cyan-300 align-top uppercase tracking-widest bg-cyan-500/20 text-white px-2 py-0.5 rounded-full border border-cyan-500/20 ml-1">Premium</span>
          </h1>
          
          {user && (
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
              <UserIcon className="w-8 h-8 p-1.5 bg-cyan-500 text-black rounded-full" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{user.username}</p>
                <p className="text-[10px] text-gray-400 truncate">Premium</p>
              </div>
              <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
            </div>
          )}

          <nav className="flex flex-col gap-4 font-medium text-gray-400">
            <a onClick={() => setActiveTab('home')} className={`flex items-center gap-3 transition-colors cursor-pointer group ${activeTab === 'home' ? 'text-white font-bold' : 'hover:text-white'}`}>
              <Home className={`w-5 h-5 transition-colors ${activeTab === 'home' ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`} /> Home
            </a>
            <a onClick={() => { setActiveTab('search'); document.getElementById('search-input')?.focus(); }} className={`flex items-center gap-3 transition-colors cursor-pointer group ${activeTab === 'search' ? 'text-white font-bold' : 'hover:text-white'}`}>
              <SearchIcon className={`w-5 h-5 transition-colors ${activeTab === 'search' ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`} /> Search
            </a>
            <a onClick={() => {
                setActiveTab('favorites');
                setQueue(favorites.map(f => ({
                  id: f.track.sourceId, title: f.track.title, artist: f.track.artist, thumbnail: f.track.thumbnail || ''
                })));
              }} className={`flex items-center gap-3 transition-colors cursor-pointer group ${activeTab === 'favorites' ? 'text-white font-bold' : 'hover:text-white'}`}>
              <Heart className={`w-5 h-5 transition-colors ${activeTab === 'favorites' ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`} /> Seçtiklerin
            </a>
            <a onClick={() => setActiveTab('library')} className={`flex items-center gap-3 transition-colors cursor-pointer group ${activeTab === 'library' ? 'text-white font-bold' : 'hover:text-white'}`}>
              <Library className={`w-5 h-5 transition-colors ${activeTab === 'library' ? 'text-cyan-400' : 'group-hover:text-cyan-400'}`} /> Library
            </a>
          </nav>

          <hr className="border-white/10" />
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scroll flex flex-col gap-3">
             <div className="flex items-center justify-between text-gray-500 mb-1">
               <h2 className="text-[10px] font-bold tracking-widest uppercase">Playlists</h2>
               <div className="flex gap-2">
                 <button onClick={() => setIsImportingSpotify(!isImportingSpotify)} title="Spotify'dan İçe Aktar" className="hover:text-cyan-400 transition-colors">
                   <DownloadCloud className="w-4 h-4" />
                 </button>
                 <button onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)} title="Yeni Liste Oluştur" className="hover:text-white transition-colors">
                   <Plus className="w-4 h-4" />
                 </button>
               </div>
             </div>
             {isImportingSpotify && (
               <div className="flex items-center gap-2 mb-2 w-full overflow-hidden">
                 <input 
                   type="text" 
                   value={spotifyUrl} 
                   onChange={(e) => setSpotifyUrl(e.target.value)} 
                   placeholder="Spotify Playlist URL..." 
                   className="bg-white/10 text-white text-[10px] px-2 py-1.5 rounded-lg outline-none flex-1 min-w-0 border border-white/5 focus:border-cyan-500/50"
                   onKeyDown={(e) => e.key === 'Enter' && submitImportSpotify()}
                   autoFocus
                 />
                 <button onClick={submitImportSpotify} className="text-cyan-400 hover:text-white flex-shrink-0 text-[10px] font-bold px-2 py-1.5 bg-white/5 border border-white/5 rounded-lg">Bul</button>
               </div>
             )}
             {isCreatingPlaylist && (
               <div className="flex items-center gap-2 mb-2 w-full overflow-hidden">
                 <input 
                   type="text" 
                   value={newPlaylistName} 
                   onChange={(e) => setNewPlaylistName(e.target.value)} 
                   placeholder="Liste adı..." 
                   className="bg-white/10 text-white text-[10px] px-2 py-1.5 rounded-lg outline-none flex-1 min-w-0 border border-white/5 focus:border-cyan-500/50"
                   onKeyDown={(e) => e.key === 'Enter' && submitCreatePlaylist()}
                   autoFocus
                 />
                 <button onClick={submitCreatePlaylist} className="text-cyan-400 hover:text-white flex-shrink-0 text-[10px] font-bold px-2 py-1.5 bg-white/5 border border-white/5 rounded-lg">Ekle</button>
               </div>
             )}
             {playlists.map(pl => (
                <a key={pl.id} onClick={() => loadPlaylist(pl.id)} className={`flex items-center gap-3 transition-colors cursor-pointer group text-sm truncate ${activePlaylistId === pl.id && activeTab === 'playlist' ? 'text-cyan-400 font-bold' : 'text-gray-400 hover:text-white'}`}>
                  <ListMusic className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{pl.name}</span>
                </a>
             ))}
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <h2 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mb-1">Downloads Engine</h2>
            <button onClick={() => downloadTrack('mp3')} disabled={isDownloading} className={`w-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-start gap-3 shadow-lg group ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isDownloading ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : <DownloadCloud className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />}
              {isDownloading ? 'İndiriliyor...' : 'MP3 İndir'}
            </button>
            <button onClick={() => downloadTrack('mp4')} disabled={isDownloading} className={`w-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-start gap-3 shadow-lg group ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isDownloading ? <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : <DownloadCloud className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />}
              {isDownloading ? 'İndiriliyor...' : 'Video İndir'}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-10 py-8 relative flex flex-col">
          {!isVideoMode && (
          <header className="flex justify-between items-center mb-12 sticky top-0 z-30 bg-[#030914]/40 backdrop-blur-2xl p-4 rounded-3xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
            <div className="relative">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-5 py-3 rounded-full w-[450px] shadow-inner focus-within:bg-white/10 focus-within:border-cyan-500/50 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all duration-300 z-50">
                <SearchIcon className="w-5 h-5 text-gray-400" />
                <input 
                  id="search-input"
                  type="text" 
                  placeholder="Şarkı ara, YouTube / Spotify URL'si yapıştır..."
                  className="bg-transparent outline-none w-full text-sm font-medium placeholder-gray-500"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  autoComplete="off"
                />
              </div>

              {isSearchFocused && searchHistory.length > 0 && (
                <div className="absolute top-[115%] left-0 w-full bg-[#061224]/95 border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-2 z-40 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                  {searchHistory.filter(s => s.toLowerCase().includes(searchInput.toLowerCase())).slice(0, 6).map((historyItem, idx) => (
                    <div key={idx} className="flex justify-between items-center group/item hover:bg-white/10 px-4 py-3 rounded-xl cursor-pointer transition-colors">
                      <div className="flex items-center gap-3 flex-1" onClick={() => executeSearch(historyItem)}>
                         <HistoryIcon className="w-4 h-4 text-gray-400" />
                         <span className="text-sm text-gray-200 font-medium truncate w-[300px]">{historyItem}</span>
                      </div>
                      <button onClick={(e) => {
                         e.stopPropagation();
                         setSearchHistory(prev => {
                           const newH = prev.filter(p => p !== historyItem);
                           localStorage.setItem('auralvault_search_history', JSON.stringify(newH));
                           return newH;
                         });
                      }} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-all">
                         <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 shadow-lg backdrop-blur-md">
              <Headphones className={`w-5 h-5 ${!isVideoMode ? 'text-cyan-400' : 'text-gray-500'}`} />
              <button onClick={toggleVideoMode} className="w-12 h-6 bg-[#030914]/50 rounded-full relative transition-colors border border-white/10 shadow-inner">
                <div className="w-5 h-5 bg-white rounded-full absolute top-[1px] transition-all shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ transform: isVideoMode ? 'translateX(26px)' : 'translateX(2px)' }} />
              </button>
              <MonitorPlay className={`w-5 h-5 ${isVideoMode ? 'text-blue-400' : 'text-gray-500'}`} />
            </div>
          </header>
          )}

          {isVideoMode && (
             <header className="flex justify-between items-center mb-6 z-30 sticky top-0">
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-2.5 rounded-full backdrop-blur-md shadow-lg">
                  <MonitorPlay className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-bold text-white tracking-widest uppercase">AuralVault Video Engine</span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 shadow-lg backdrop-blur-md">
                  <Headphones className="w-5 h-5 text-gray-500" />
                  <button onClick={toggleVideoMode} className="w-12 h-6 bg-[#030914]/50 rounded-full relative transition-colors border border-white/10 shadow-inner">
                    <div className="w-5 h-5 bg-white rounded-full absolute top-[1px] transition-all shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ transform: 'translateX(26px)' }} />
                  </button>
                  <MonitorPlay className="w-5 h-5 text-blue-400" />
                </div>
             </header>
          )}

          {!isVideoMode && (
          <section className="relative z-10 w-full max-w-6xl mx-auto">
            {activeTab === 'library' ? (
               <div className="bg-white/5 border border-white/10 rounded-3xl p-16 flex flex-col items-center justify-center text-center backdrop-blur-xl shadow-2xl mt-10">
                  <Library className="w-20 h-20 text-cyan-400 mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                  <h2 className="text-3xl font-extrabold text-white mb-4">Your Offline Library</h2>
                  <p className="text-gray-400 font-medium text-lg max-w-md">Çevrimdışı mod yakında! MP3 klasöründen dosyaları doğrudan burada görebileceksiniz.</p>
               </div>
            ) : activeTab === 'home' ? (
               <div className="flex flex-col gap-12 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {currentTrack && (
                    <div className="flex flex-col gap-6">
                       <h3 className="text-xl font-bold text-cyan-400 border-l-4 border-cyan-500 pl-4">Şu An Çalıyor</h3>
                       <div onClick={() => setActiveTab('search')} className="bg-gradient-to-r from-cyan-900/40 to-[#030914]/80 border border-cyan-500/30 p-4 rounded-3xl flex items-center gap-6 cursor-pointer hover:border-cyan-500/60 transition-all group">
                          <img src={currentTrack.thumbnail} className="w-24 h-24 rounded-2xl object-cover shadow-2xl group-hover:scale-105 transition-transform" />
                          <div className="flex-1">
                             <h4 className="text-2xl font-bold text-white mb-1">{currentTrack.title}</h4>
                             <p className="text-gray-400 mb-3">{currentTrack.artist}</p>
                             <div className="flex gap-2">
                                <span className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2 py-1 rounded-full border border-cyan-500/20 uppercase font-black tracking-widest">Canlı Dinle</span>
                                <span className="bg-white/5 text-gray-400 text-[10px] px-2 py-1 rounded-full border border-white/10 uppercase font-black tracking-widest">Kuyrukta {queue.length} Parça</span>
                             </div>
                          </div>
                          <div className="mr-6">
                             <div className="w-14 h-14 rounded-full bg-cyan-400 flex items-center justify-center text-black shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-all">
                                <Pause className="w-7 h-7" fill="currentColor" />
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

                  {homeData ? (
                    <>
                      <HomeSection title="Haftalık Keşif & Trendler" items={homeData.trending} onCardClick={handleLoadFeaturedPlaylist} />
                      <HomeSection title="Yeni Çıkalar" items={homeData.newReleases} onCardClick={handleLoadFeaturedPlaylist} />
                      <HomeSection title="Tarzına Göre Keşfet" items={homeData.categories} onCardClick={handleLoadFeaturedPlaylist} isGrid />
                      <HomeSection title="Gece Yarısı Mixleri" items={homeData.forYou} onCardClick={handleLoadFeaturedPlaylist} />
                    </>
                  ) : (
                    <div className="flex flex-col gap-10">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex flex-col gap-4">
                            <div className="h-7 w-40 bg-white/5 rounded-lg animate-pulse" />
                            <div className="flex gap-6 overflow-hidden">
                               {[1,2,3,4].map(j => <div key={j} className="min-w-[220px] h-[300px] bg-white/5 rounded-2xl animate-pulse" />)}
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            ) : (
               <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                    {activeTab === 'search' ? "Arama Sonuçları" : activeTab === 'favorites' ? "Seçtiklerin" : activeTab === 'playlist' ? "Oynatma Listesi" : "Kuyruğun"}
                  </h2>
                </div>
                
                {loading && (
                   <div className="flex items-center justify-center p-10">
                     <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                   </div>
                )}
            
                <div className="flex flex-col gap-3">
                   {queue.map((track, i) => (
                     <div key={track.id + i} onClick={() => playTrack(track)} className={`bg-white/[0.02] border border-white/5 hover:bg-cyan-900/20 hover:border-cyan-500/30 backdrop-blur-md transition-all duration-300 p-3 rounded-2xl flex items-center gap-5 cursor-pointer overflow-hidden group shadow-lg hover:shadow-2xl hover:shadow-black/50 ${currentTrack?.id === track.id ? 'bg-gradient-to-r from-cyan-900/40 to-[#030914]/80 border-l-4 border-l-cyan-400 border-t-white/10 border-r-white/10 border-b-white/10 scale-[1.02] shadow-[0_4px_20px_rgba(6,182,212,0.15)]' : ''}`}>
                       <div className="relative">
                          <img src={track.thumbnail} alt="thumb" className="w-14 h-14 object-cover bg-[#030914] rounded-xl shadow-md group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-[#030914]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                             <Play className="w-6 h-6 text-white" fill="white" />
                          </div>
                       </div>
                       <div className="flex flex-col flex-1 min-w-0">
                         <span className={`font-semibold text-lg truncate ${currentTrack?.id === track.id ? 'text-cyan-400' : 'text-white'}`}>{track.title}</span>
                         <span className="text-sm text-gray-400 truncate">{track.artist}</span>
                       </div>
                       <button onClick={(e) => toggleFavoriteTrack(e, track)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full mr-2">
                          <Heart className="w-5 h-5 text-cyan-400" fill={isHearted(track.id) ? "currentColor" : "none"} />
                       </button>
                       {currentTrack?.id === track.id && (
                         <div className="mr-6 flex gap-1">
                           <span className="w-1 bg-cyan-500 h-4 animate-pulse"></span>
                           <span className="w-1 bg-cyan-500 h-6 animate-pulse delay-75"></span>
                           <span className="w-1 bg-cyan-500 h-3 animate-pulse delay-150"></span>
                         </div>
                       )}
                     </div>
                   ))}
                   {queue.length === 0 && !loading && activeTab !== 'home' && (
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                        <SearchIcon className="w-12 h-12 text-gray-600 mb-4" />
                        <p className="text-gray-400 font-medium text-lg">Liste boş.</p>
                        <p className="text-gray-500 text-sm">Şarkı adı, YouTube veya Spotify URL'si yapıştırarak arama yap.</p>
                     </div>
                   )}
                </div>
              </>
            )}
          </section>
          )}

          {currentTrack && (
            <div className={`relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVideoMode ? 'flex-1 opacity-100 scale-100' : 'h-0 opacity-0 scale-95 pointer-events-none absolute'}`}>
               <YouTube 
                 videoId={currentTrack.id} 
                 opts={youtubeOpts} 
                 onReady={(e) => { 
                   ytPlayerRef.current = e.target;
                   e.target.setVolume(volume);
                   if (isPlaying) e.target.playVideo(); 
                 }} 
                 onStateChange={(e) => { 
                   if (e.target.getDuration) setDuration(e.target.getDuration());
                   if (e.data === 0) playNextInQueue(); 
                 }}
                 className="w-full h-full bg-[#030914] pointer-events-none"
                 iframeClassName="w-full h-full pointer-events-none"
               />
               
               {isVideoMode && (
                 <>
                   <div className="absolute top-6 right-6 bg-[#030914]/40 backdrop-blur-lg px-4 py-2 rounded-full border border-white/10 flex items-center gap-3 pointer-events-none shadow-2xl">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
                      <span className="text-xs font-black text-white tracking-widest uppercase opacity-90 drop-shadow-md">AuralVault Premium</span>
                   </div>
                   <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
                 </>
               )}
            </div>
          )}

        </main>
      </div>

      <footer className="h-28 bg-[#061224]/90 backdrop-blur-3xl border-t border-white/10 flex items-center justify-between px-8 z-50 relative pb-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5 w-1/3 relative z-10">
          {currentTrack ? (
            <>
              <img src={currentTrack.thumbnail} className="w-16 h-16 bg-[#030914] rounded-xl shadow-2xl object-cover border border-white/5" />
              <div className="overflow-hidden flex flex-col gap-1 pr-2">
                <h4 className="text-base font-bold text-white hover:underline cursor-pointer truncate w-56 leading-tight">{currentTrack.title}</h4>
                <p className="text-xs text-gray-400 hover:underline cursor-pointer truncate w-56">{currentTrack.artist}</p>
              </div>
              <button onClick={(e) => toggleFavoriteTrack(e)} className="ml-2 hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-cyan-400" fill={isHearted(currentTrack.id) ? "currentColor" : "none"} />
              </button>
            </>
          ) : (
             <div className="text-sm text-gray-600 font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">Queue empty...</div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center w-1/3 gap-3 relative z-10">
          <div className="flex items-center gap-7">
            <button onClick={toggleShuffle} className={`transition-colors focus:outline-none ${isShuffle ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}><Shuffle className="w-5 h-5" /></button>
            <button onClick={playPrevInQueue} className="text-gray-300 hover:text-white transition-colors focus:outline-none"><SkipBack className="w-6 h-6" fill="currentColor" /></button>
            <button onClick={currentTrack ? togglePlay : () => {}} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-cyan-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              {isPlaying && currentTrack ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-1" fill="currentColor" />}
            </button>
            <button onClick={playNextInQueue} className="text-gray-300 hover:text-white transition-colors focus:outline-none"><SkipForward className="w-6 h-6" fill="currentColor" /></button>
            <button onClick={toggleRepeat} className={`transition-colors focus:outline-none ${isRepeat ? 'text-cyan-400 font-bold' : 'text-gray-500 hover:text-white'}`}><Repeat className="w-5 h-5" /></button>
          </div>
          <div className="w-full max-w-md flex items-center gap-3">
             <span className="text-xs text-gray-400 w-8 text-right font-medium">{Math.floor(currentTime/60)}:{(Math.floor(currentTime%60)).toString().padStart(2, '0')}</span>
             <div className="h-2 bg-white/10 rounded-full overflow-visible relative flex-1 flex items-center group">
               <div className="absolute left-0 h-2 bg-white group-hover:bg-cyan-500 transition-colors rounded-full" style={{ width: `${duration ? (currentTime/duration)*100 : 0}%` }}></div>
               <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 hover:cursor-pointer z-10" />
             </div>
             <span className="text-xs text-gray-400 w-8 font-medium">{Math.floor(duration/60)}:{(Math.floor(duration%60)).toString().padStart(2, '0')}</span>
          </div>
        </div>

        <div className="w-1/3 flex justify-end items-center gap-4 text-gray-400 relative z-10">
           <div className="flex items-center gap-3 w-32 border border-white/10 bg-white/5 px-3 py-2 rounded-full relative group hover:bg-white/10 transition-colors">
             <Volume2 className="w-4 h-4 text-gray-300" />
             <div className="h-1.5 bg-white/20 rounded-full flex-1 relative flex items-center">
               <div className="absolute left-0 h-1.5 bg-white group-hover:bg-cyan-500 transition-colors rounded-full" style={{ width: `${volume}%` }}></div>
               <input type="range" min="0" max="100" value={volume} onChange={handleVolume} className="absolute inset-0 w-full h-full opacity-0 hover:cursor-pointer z-10" />
             </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

const HomeSection = ({ title, items, onCardClick, isGrid = false }) => (
  <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-bold text-white/90 border-l-4 border-cyan-500 pl-4">{title}</h3>
      <button className="text-xs font-bold text-gray-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">Tümünü Gör</button>
    </div>
    <div className={isGrid ? "grid grid-cols-3 gap-6" : "flex gap-6 overflow-x-auto pb-4 custom-scroll snap-x"}>
      {items.map(item => (
        <div 
          key={item.id} 
          onClick={() => onCardClick(item.url)} 
          className={`flex-shrink-0 cursor-pointer group snap-start transition-all duration-500 ${isGrid ? 'w-full' : 'w-[200px]'}`}
        >
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-xl group-hover:shadow-cyan-500/10 group-hover:scale-[1.02] transition-all">
            <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
               <div className="w-12 h-12 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <Play className="w-6 h-6 ml-1" fill="currentColor" />
               </div>
            </div>
          </div>
          <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{item.name}</h4>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
        </div>
      ))}
    </div>
  </div>
);

export default App;
