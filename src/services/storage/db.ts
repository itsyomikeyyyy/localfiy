import { Track, ContinueSession } from '../../types';

const DB_NAME = 'localify_db';
const DB_VERSION = 2; // Incremented for Iteration 2
const HANDLE_STORE = 'handles';
const TRACKS_STORE = 'tracks_cache';
const PREFS_STORE = 'preferences';
const STATS_STORE = 'track_stats'; // For play counts, favorites, lastPlayed
const SESSION_STORE = 'playback_session'; // For continue listening

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE);
      }
      if (!db.objectStoreNames.contains(PREFS_STORE)) {
        db.createObjectStore(PREFS_STORE);
      }
      if (!db.objectStoreNames.contains(STATS_STORE)) {
        db.createObjectStore(STATS_STORE);
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredHandleData {
  handle: FileSystemDirectoryHandle;
  folderName: string;
  savedAt: number;
}

export interface TrackStats {
  trackId: string;
  isFavorite: boolean;
  playCount: number;
  lastPlayed: number | null;
  dateAdded: number;
}

export interface SerializedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: string;
  trackNumber?: number;
  coverArt?: string;
  fileName: string;
  relativePath: string;
  parentFolder: string;
  format: string;
  type: 'audio' | 'video';
  size: number;
  lastModified: number;
  duration: number | null;
  dateAdded: number;
  lastPlayed: number | null;
  playCount: number;
  isFavorite: boolean;
}

export const StorageService = {
  async saveDirectoryHandle(handle: FileSystemDirectoryHandle, folderName: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(HANDLE_STORE, 'readwrite');
      const store = tx.objectStore(HANDLE_STORE);
      const data: StoredHandleData = {
        handle,
        folderName,
        savedAt: Date.now(),
      };
      store.put(data, 'current_folder');
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('Could not store directory handle to IndexedDB:', err);
    }
  },

  async getStoredDirectoryHandle(): Promise<StoredHandleData | null> {
    try {
      const db = await openDB();
      const tx = db.transaction(HANDLE_STORE, 'readonly');
      const store = tx.objectStore(HANDLE_STORE);
      const request = store.get('current_folder');
      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async clearDirectoryHandle(): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction([HANDLE_STORE, TRACKS_STORE, SESSION_STORE], 'readwrite');
      tx.objectStore(HANDLE_STORE).delete('current_folder');
      tx.objectStore(TRACKS_STORE).delete('library');
      tx.objectStore(SESSION_STORE).delete('continue_session');
    } catch (err) {
      console.warn('Could not clear stored handle:', err);
    }
  },

  async saveCachedTracks(tracks: Track[], folderName: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(TRACKS_STORE, 'readwrite');
      const store = tx.objectStore(TRACKS_STORE);

      const serializable: SerializedTrack[] = tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: t.album,
        genre: t.genre,
        year: t.year,
        trackNumber: t.trackNumber,
        fileName: t.fileName,
        relativePath: t.relativePath,
        parentFolder: t.parentFolder,
        format: t.format,
        type: t.type,
        size: t.size,
        lastModified: t.lastModified,
        duration: t.duration,
        dateAdded: t.dateAdded || Date.now(),
        lastPlayed: t.lastPlayed || null,
        playCount: t.playCount || 0,
        isFavorite: !!t.isFavorite,
      }));

      store.put({ folderName, tracks: serializable, savedAt: Date.now() }, 'library');
    } catch (err) {
      console.warn('Could not cache tracks in IndexedDB:', err);
    }
  },

  async getCachedTracks(): Promise<{ folderName: string; tracks: SerializedTrack[] } | null> {
    try {
      const db = await openDB();
      const tx = db.transaction(TRACKS_STORE, 'readonly');
      const store = tx.objectStore(TRACKS_STORE);
      const req = store.get('library');
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async getAllTrackStats(): Promise<Map<string, TrackStats>> {
    const statsMap = new Map<string, TrackStats>();
    try {
      const db = await openDB();
      const tx = db.transaction(STATS_STORE, 'readonly');
      const store = tx.objectStore(STATS_STORE);
      const req = store.openCursor();

      return new Promise((resolve) => {
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            statsMap.set(cursor.key as string, cursor.value as TrackStats);
            cursor.continue();
          } else {
            resolve(statsMap);
          }
        };
        req.onerror = () => resolve(statsMap);
      });
    } catch {
      return statsMap;
    }
  },

  async updateTrackStats(trackId: string, updates: Partial<TrackStats>): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STATS_STORE, 'readwrite');
      const store = tx.objectStore(STATS_STORE);
      const getReq = store.get(trackId);

      getReq.onsuccess = () => {
        const existing: TrackStats = getReq.result || {
          trackId,
          isFavorite: false,
          playCount: 0,
          lastPlayed: null,
          dateAdded: Date.now(),
        };

        const updated: TrackStats = {
          ...existing,
          ...updates,
        };
        store.put(updated, trackId);
      };
    } catch (err) {
      console.warn('Error updating track stats:', err);
    }
  },

  async saveContinueSession(session: ContinueSession): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(SESSION_STORE, 'readwrite');
      tx.objectStore(SESSION_STORE).put(session, 'continue_session');
    } catch (err) {
      console.warn('Could not save continue session:', err);
    }
  },

  async getContinueSession(): Promise<ContinueSession | null> {
    try {
      const db = await openDB();
      const tx = db.transaction(SESSION_STORE, 'readonly');
      const req = tx.objectStore(SESSION_STORE).get('continue_session');
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async clearContinueSession(): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(SESSION_STORE, 'readwrite');
      tx.objectStore(SESSION_STORE).delete('continue_session');
    } catch (err) {
      console.warn('Could not clear continue session:', err);
    }
  },

  async savePreference<T>(key: string, value: T): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(PREFS_STORE, 'readwrite');
      tx.objectStore(PREFS_STORE).put(value, key);
    } catch (err) {
      console.warn(`Could not save preference ${key}:`, err);
    }
  },

  async getPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const db = await openDB();
      const tx = db.transaction(PREFS_STORE, 'readonly');
      const req = tx.objectStore(PREFS_STORE).get(key);
      return new Promise((resolve) => {
        req.onsuccess = () => {
          if (req.result !== undefined) {
            resolve(req.result as T);
          } else {
            resolve(defaultValue);
          }
        };
        req.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  },
};
