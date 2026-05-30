import { create } from 'zustand'

export const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isVideoMode: false,
  volume: 100,
  isShuffle: false,
  isRepeat: false,

  playTrack: (track) => set({ currentTrack: track, isPlaying: true }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  toggleVideoMode: () => set((state) => ({ isVideoMode: !state.isVideoMode })),

  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),

  setQueue: (tracks) => set({ queue: tracks }),

  playNextInQueue: () => {
    const { queue, currentTrack, isShuffle, isRepeat } = get();
    if (queue.length === 0) return;

    if (isRepeat && currentTrack) {
      return set({ currentTrack: { ...currentTrack, _forcedUpdate: Date.now() }, isPlaying: true });
    }

    if (isShuffle) {
      let filtered = queue.filter(t => currentTrack ? t.id !== currentTrack.id : true);
      if (filtered.length === 0) filtered = queue;
      const randomTrack = filtered[Math.floor(Math.random() * filtered.length)];
      return set({ currentTrack: randomTrack, isPlaying: true });
    }

    if (!currentTrack) {
      return set({ currentTrack: queue[0], isPlaying: true });
    }

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1) {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) nextIndex = 0;
      set({ currentTrack: queue[nextIndex], isPlaying: true });
    }
  },

  playPrevInQueue: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      set({ currentTrack: queue[currentIndex - 1], isPlaying: true });
    } else {
      set({ currentTrack: queue[queue.length - 1], isPlaying: true });
    }
  }
}))
