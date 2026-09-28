import { create } from 'zustand';
import { Track, PlaybackState, ContinueSession } from '../types';
import { playerService } from '../services/playback/PlayerService';
import { StorageService } from '../services/storage/db';

interface PlaybackStore extends PlaybackState {
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Modes
  toggleRepeat: () => void;
  toggleShuffle: () => void;

  // Session
  continueSession: ContinueSession | null;
  setContinueSession: (session: ContinueSession | null) => void;

  // Global methods
  playTrack: (track: Track, resumePosition?: number) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  seekRelative: (seconds: number) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.85,
  isMuted: false,
  isLoading: false,
  error: null,
  
  isVideoOpen: false,
  repeatMode: 'all',
  isShuffled: false,
  isQueueOpen: false,
  isNowPlayingOpen: false,
  isShortcutsOpen: false,

  continueSession: null,

  setCurrentTrack: (track) => set({ currentTrack: track, error: null }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  
  setVolume: (volume) => {
    set({ volume });
    playerService.setVolume(volume);
    StorageService.savePreference('volume', volume);
  },
  
  toggleMute: () => {
    const { isMuted } = get();
    set({ isMuted: !isMuted });
    playerService.setMuted(!isMuted);
    StorageService.savePreference('isMuted', !isMuted);
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  toggleRepeat: () => {
    const modes: ('all' | 'one' | 'off')[] = ['all', 'one', 'off'];
    const current = get().repeatMode;
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    set({ repeatMode: next });
    StorageService.savePreference('repeatMode', next);
  },

  toggleShuffle: () => {
    const next = !get().isShuffled;
    set({ isShuffled: next });
    StorageService.savePreference('isShuffled', next);
  },

  setContinueSession: (session) => set({ continueSession: session }),

  playTrack: async (track, resumePosition = 0) => {
    const isVideo = track.type === 'video';
    set({ currentTrack: track, isVideoOpen: isVideo ? true : get().isVideoOpen, error: null });
    
    // We update session here
    const session: ContinueSession = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverArt: track.coverArt,
      position: resumePosition,
      duration: track.duration || 0,
      timestamp: Date.now(),
    };
    get().setContinueSession(session);
    StorageService.saveContinueSession(session);

    await playerService.loadTrack(track, true, resumePosition);
  },

  togglePlay: () => {
    playerService.togglePlay();
  },

  seek: (seconds) => {
    playerService.seek(seconds);
  },

  seekRelative: (seconds) => {
    playerService.seekRelative(seconds);
  }
}));
