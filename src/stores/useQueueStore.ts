import { create } from 'zustand';
import { Track, QueueItem } from '../types';
import { StorageService } from '../services/storage/db';
import { usePlaybackStore } from './usePlaybackStore';

interface QueueStore {
  queue: QueueItem[];
  setQueue: (queue: QueueItem[]) => void;
  addToQueue: (track: Track) => void;
  addMultipleToQueue: (tracks: Track[]) => void;
  removeFromQueue: (queueId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  
  // Playback integration
  playNextInQueue: () => void;
  playQueueItem: (queueId: string) => void;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  queue: [],
  setQueue: (queue) => {
    set({ queue });
    StorageService.savePreference('saved_queue', queue.map(q => q.track.id));
  },
  
  addToQueue: (track) => {
    const newItem: QueueItem = {
      queueId: `${track.id}-${Math.random().toString(36).substring(2, 6)}`,
      track,
    };
    const newQueue = [...get().queue, newItem];
    get().setQueue(newQueue);
  },

  addMultipleToQueue: (tracks) => {
    const newItems: QueueItem[] = tracks.map((t) => ({
      queueId: `${t.id}-${Math.random().toString(36).substring(2, 6)}`,
      track: t,
    }));
    const newQueue = [...get().queue, ...newItems];
    get().setQueue(newQueue);
  },

  removeFromQueue: (queueId) => {
    const newQueue = get().queue.filter((q) => q.queueId !== queueId);
    get().setQueue(newQueue);
  },

  clearQueue: () => {
    get().setQueue([]);
  },

  reorderQueue: (startIndex, endIndex) => {
    const result = Array.from(get().queue);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    get().setQueue(result);
  },

  playNextInQueue: () => {
    const queue = get().queue;
    if (queue.length > 0) {
      const nextItem = queue[0];
      const newQueue = queue.slice(1);
      get().setQueue(newQueue);
      usePlaybackStore.getState().playTrack(nextItem.track);
    }
  },

  playQueueItem: (queueId) => {
    const queue = get().queue;
    const index = queue.findIndex((q) => q.queueId === queueId);
    if (index !== -1) {
      const item = queue[index];
      const newQueue = queue.filter((_, i) => i !== index);
      get().setQueue(newQueue);
      usePlaybackStore.getState().playTrack(item.track);
    }
  }
}));
