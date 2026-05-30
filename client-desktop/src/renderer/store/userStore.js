import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      favorites: [],
      playlists: [],
      
      setUser: (user, token) => set({ user, token }),
      
      logout: () => set({ user: null, token: null, favorites: [], playlists: [] }),
      
      setFavorites: (favorites) => set({ favorites }),
      
      setPlaylists: (playlists) => set({ playlists }),
      
      addFavorite: (track) => set((state) => ({ favorites: [...state.favorites, { track }] })),
      
      removeFavorite: (trackId) => set((state) => ({ 
        favorites: state.favorites.filter((f) => f.track.sourceId !== trackId && f.track.id !== trackId) 
      })),

      addPlaylist: (playlist) => set((state) => ({ playlists: [playlist, ...state.playlists] })),
      
      removePlaylist: (id) => set((state) => ({ playlists: state.playlists.filter(p => p.id !== id) }))
    }),
    {
      name: 'spotube_user_storage',
    }
  )
);
