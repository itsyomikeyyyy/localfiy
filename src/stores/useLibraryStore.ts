import { create } from 'zustand';
import { Track, ScanProgress, FolderPermissionStatus, NavTab, SortOption } from '../types';
import { StorageService } from '../services/storage/db';
import { 
  scanDirectoryHandle, 
  verifyFolderPermission, 
  scanFileList 
} from '../services/filesystem/scanner';

interface LibraryStore {
  tracks: Track[];
  processedTracks: Track[]; // We will compute this externally or here
  folderName: string | null;
  folderHandle: FileSystemDirectoryHandle | null;
  permissionStatus: FolderPermissionStatus;
  scanProgress: ScanProgress;
  
  // App UI State that relates to library
  activeTab: NavTab;
  searchQuery: string;
  selectedFolder: string | null;
  sortOption: SortOption;

  // Actions
  setTracks: (tracks: Track[]) => void;
  updateTrackStats: (trackId: string, updates: Partial<Track>) => void;
  setFolderName: (name: string | null) => void;
  setFolderHandle: (handle: FileSystemDirectoryHandle | null) => void;
  setPermissionStatus: (status: FolderPermissionStatus) => void;
  setScanProgress: (progress: ScanProgress) => void;
  
  setActiveTab: (tab: NavTab) => void;
  setSearchQuery: (query: string) => void;
  setSelectedFolder: (folder: string | null) => void;
  setSortOption: (sort: SortOption) => void;

  // Thunks
  scanHandle: (handle: FileSystemDirectoryHandle, name: string) => Promise<void>;
  reconnectFolder: () => Promise<boolean>;
  selectFilesFallback: (fileList: FileList | File[]) => Promise<void>;
  clearLibrary: () => Promise<void>;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  tracks: [],
  processedTracks: [],
  folderName: null,
  folderHandle: null,
  permissionStatus: 'idle',
  scanProgress: { isScanning: false, filesFound: 0, currentFolder: '' },

  activeTab: 'home',
  searchQuery: '',
  selectedFolder: null,
  sortOption: { field: 'title', direction: 'asc' },

  setTracks: (tracks) => set({ tracks }),
  updateTrackStats: (trackId, updates) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, ...updates } : t)
  })),
  setFolderName: (folderName) => set({ folderName }),
  setFolderHandle: (folderHandle) => set({ folderHandle }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  
  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedFolder: (selectedFolder) => set({ selectedFolder }),
  setSortOption: (sortOption) => {
    set({ sortOption });
    StorageService.savePreference('sortOption', sortOption);
  },

  scanHandle: async (handle, name) => {
    set({ scanProgress: { isScanning: true, filesFound: 0, currentFolder: name } });
    try {
      const existingMap = new Map<string, Track>();
      get().tracks.forEach((t) => existingMap.set(t.id, t));

      const dbStats = await StorageService.getAllTrackStats();
      const scannedTracks = await scanDirectoryHandle(handle, existingMap, (prog) => {
        set({ scanProgress: prog });
      });

      const mergedTracks = scannedTracks.map((t) => {
        const stats = dbStats.get(t.id);
        if (stats) {
          return {
            ...t,
            isFavorite: stats.isFavorite ?? t.isFavorite,
            playCount: stats.playCount ?? t.playCount,
            lastPlayed: stats.lastPlayed ?? t.lastPlayed,
            dateAdded: stats.dateAdded || t.dateAdded,
          };
        }
        return t;
      });

      set({
        tracks: mergedTracks,
        folderName: name,
        folderHandle: handle,
        permissionStatus: 'granted'
      });

      await StorageService.saveDirectoryHandle(handle, name);
      await StorageService.saveCachedTracks(mergedTracks, name);
    } catch (err) {
      console.error('Scan error', err);
    } finally {
      set({ scanProgress: { isScanning: false, filesFound: 0, currentFolder: '' } });
    }
  },

  reconnectFolder: async () => {
    const handle = get().folderHandle;
    if (!handle) return false;
    try {
      const permission = await verifyFolderPermission(handle, true);
      set({ permissionStatus: permission });
      if (permission === 'granted') {
        await get().scanHandle(handle, get().folderName || handle.name);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  selectFilesFallback: async (fileList) => {
    set({ scanProgress: { isScanning: true, filesFound: 0, currentFolder: 'Local Files' } });
    try {
      const existingMap = new Map<string, Track>();
      get().tracks.forEach((t) => existingMap.set(t.id, t));

      const scannedTracks = await scanFileList(fileList, existingMap, (prog) => {
        set({ scanProgress: prog });
      });

      set({
        tracks: scannedTracks,
        folderName: 'Local Music',
        permissionStatus: 'granted'
      });
    } catch (err) {
      console.error(err);
    } finally {
      set({ scanProgress: { isScanning: false, filesFound: 0, currentFolder: '' } });
    }
  },

  clearLibrary: async () => {
    set({
      tracks: [],
      folderName: null,
      folderHandle: null,
      permissionStatus: 'idle',
      activeTab: 'home',
    });
    await StorageService.clearDirectoryHandle();
  }
}));
