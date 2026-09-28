import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Track,
  PlaybackState,
  ScanProgress,
  FolderPermissionStatus,
  NavTab,
  SortOption,
  ContinueSession,
  QueueItem,
} from '../types';
import {
  pickMusicDirectory,
  scanDirectoryHandle,
  scanFileList,
  verifyFolderPermission,
  isFileSystemAccessSupported,
} from '../services/filesystem/scanner';
import { StorageService } from '../services/storage/db';
import { playerService } from '../services/playback/PlayerService';
import { sortTracks } from '../utils/sorting';
import { filterTracksByFolder } from '../utils/folderTree';

export function useLocalify() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<FolderPermissionStatus>('idle');

  // Navigation & Search State
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'title',
    direction: 'asc',
  });

  // Up Next Queue State
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // True Shuffle Order State
  const [shuffleOrder, setShuffleOrder] = useState<string[]>([]);
  const [shuffleIndex, setShuffleIndex] = useState<number>(0);

  // Continue Listening Session State
  const [continueSession, setContinueSession] = useState<ContinueSession | null>(null);

  // Scanning State
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    filesFound: 0,
    currentFolder: '',
  });

  // Playback State
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
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
  });

  const tracksRef = useRef<Track[]>([]);
  tracksRef.current = tracks;

  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const playbackStateRef = useRef<PlaybackState>(playbackState);
  playbackStateRef.current = playbackState;

  const shuffleOrderRef = useRef<string[]>(shuffleOrder);
  shuffleOrderRef.current = shuffleOrder;

  const shuffleIndexRef = useRef<number>(shuffleIndex);
  shuffleIndexRef.current = shuffleIndex;

  // 1. Initial restoration on startup
  useEffect(() => {
    let isCancelled = false;

    async function initRestoration() {
      if (!isFileSystemAccessSupported()) {
        setPermissionStatus('unsupported');
      }

      // Restore user preferences
      const savedVolume = await StorageService.getPreference<number>('volume', 0.85);
      const savedMuted = await StorageService.getPreference<boolean>('isMuted', false);
      const savedRepeat = await StorageService.getPreference<'all' | 'one' | 'off'>('repeatMode', 'all');
      const savedShuffle = await StorageService.getPreference<boolean>('isShuffled', false);
      const savedSort = await StorageService.getPreference<SortOption>('sortOption', { field: 'title', direction: 'asc' });

      playerService.setVolume(savedVolume);
      playerService.setMuted(savedMuted);

      setPlaybackState((prev) => ({
        ...prev,
        volume: savedVolume,
        isMuted: savedMuted,
        repeatMode: savedRepeat,
        isShuffled: savedShuffle,
      }));
      setSortOption(savedSort);

      // Restore continue listening session
      const savedSession = await StorageService.getContinueSession();
      if (!isCancelled && savedSession) {
        setContinueSession(savedSession);
      }

      // Check stored directory handle
      const stored = await StorageService.getStoredDirectoryHandle();
      if (isCancelled) return;

      if (stored && stored.handle) {
        setFolderName(stored.folderName);
        setFolderHandle(stored.handle);

        const perm = await verifyFolderPermission(stored.handle, false);
        if (isCancelled) return;

        setPermissionStatus(perm);

        if (perm === 'granted') {
          scanHandle(stored.handle, stored.folderName);
        } else {
          const cached = await StorageService.getCachedTracks();
          if (cached && cached.tracks.length > 0) {
            setTracks(
              cached.tracks.map((t) => ({
                ...t,
                isFavorite: !!t.isFavorite,
                playCount: t.playCount || 0,
                lastPlayed: t.lastPlayed || null,
                dateAdded: t.dateAdded || Date.now(),
              }))
            );
          }
        }
      }
    }

    initRestoration();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 2. Scan directory helper
  const scanHandle = useCallback(
    async (handle: FileSystemDirectoryHandle, name: string) => {
      console.debug(`[Localify] Starting scan for folder: ${name}`);
      console.time(`scanFolder-${name}`);
      setScanProgress({ isScanning: true, filesFound: 0, currentFolder: name });

      try {
        const existingMap = new Map<string, Track>();
        tracksRef.current.forEach((t) => existingMap.set(t.id, t));

        const dbStats = await StorageService.getAllTrackStats();

        const scannedTracks = await scanDirectoryHandle(handle, existingMap, (prog) => {
          setScanProgress(prog);
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

        console.debug(`[Localify] Scan complete: ${mergedTracks.length} tracks found`);
        setTracks(mergedTracks);
        setFolderName(name);
        setFolderHandle(handle);
        setPermissionStatus('granted');

        // Restore saved queue if empty
        if (queueRef.current.length === 0) {
          const savedQueueIds = await StorageService.getPreference<string[]>('saved_queue', []);
          if (savedQueueIds && savedQueueIds.length > 0) {
            const trackMap = new Map(mergedTracks.map((t) => [t.id, t]));
            const restoredQueue: QueueItem[] = savedQueueIds
              .map((id) => trackMap.get(id))
              .filter((t): t is Track => !!t)
              .map((t) => ({
                queueId: `${t.id}-${Math.random().toString(36).substring(2, 6)}`,
                track: t,
              }));
            if (restoredQueue.length > 0) {
              setQueue(restoredQueue);
            }
          }
        }

        console.time('saveToIndexedDB');
        await StorageService.saveDirectoryHandle(handle, name);
        await StorageService.saveCachedTracks(mergedTracks, name);
        console.timeEnd('saveToIndexedDB');
      } catch (err: any) {
        console.error('[Localify] Scan error:', err);
        setPlaybackState((prev) => ({
          ...prev,
          error: 'Failed to scan folder: ' + (err?.message || 'unknown error'),
        }));
      } finally {
        console.timeEnd(`scanFolder-${name}`);
        setScanProgress({ isScanning: false, filesFound: 0, currentFolder: '' });
      }
    },
    []
  );

  // 3. Rescan current library
  const rescanLibrary = useCallback(async () => {
    if (folderHandle && folderName) {
      await scanHandle(folderHandle, folderName);
    } else {
      selectFolder();
    }
  }, [folderHandle, folderName, scanHandle]);

  // 4. Select directory via File System Access API
  const selectFolder = useCallback(async () => {
    try {
      const handle = await pickMusicDirectory();
      if (!handle) return;
      await scanHandle(handle, handle.name);
    } catch (err: any) {
      if (err.message === 'FileSystemAccessNotSupported') {
        setPermissionStatus('unsupported');
      } else {
        console.error('Directory pick error:', err);
        setPlaybackState((prev) => ({
          ...prev,
          error: 'Could not access folder: ' + (err?.message || 'Permission denied'),
        }));
      }
    }
  }, [scanHandle]);

  // 5. Reconnect folder permission
  const reconnectFolder = useCallback(async (): Promise<boolean> => {
    console.debug('[Localify] Attempting to reconnect folder...');
    console.time('reconnectFolder');
    if (!folderHandle) {
      console.debug('[Localify] No folder handle found, opening picker');
      await selectFolder();
      console.timeEnd('reconnectFolder');
      return false;
    }

    try {
      const permission = await verifyFolderPermission(folderHandle, true);
      console.debug(`[Localify] Reconnect permission result: ${permission}`);
      setPermissionStatus(permission);

      if (permission === 'granted') {
        await scanHandle(folderHandle, folderName || folderHandle.name);
        console.timeEnd('reconnectFolder');
        return true;
      } else {
        setPlaybackState((prev) => ({
          ...prev,
          error: 'Access permission was not granted. Please choose the folder again.',
        }));
        console.timeEnd('reconnectFolder');
        return false;
      }
    } catch (err: any) {
      console.error('[Localify] Error reconnecting folder:', err);
      await selectFolder();
      console.timeEnd('reconnectFolder');
      return false;
    }
  }, [folderHandle, folderName, scanHandle, selectFolder]);

  // 6. Fallback file picker for unsupported browsers
  const selectFilesFallback = useCallback(
    async (fileList: FileList | File[]) => {
      console.debug('[Localify] Running fallback file picker scan...');
      console.time('fallbackScan');
      setScanProgress({ isScanning: true, filesFound: 0, currentFolder: 'Local Files' });
      try {
        const existingMap = new Map<string, Track>();
        tracksRef.current.forEach((t) => existingMap.set(t.id, t));

        const scannedTracks = await scanFileList(fileList, existingMap, (prog) => {
          setScanProgress(prog);
        });

        setTracks(scannedTracks);
        setFolderName('Local Music');
        setPermissionStatus('granted');
      } catch (err: any) {
        console.error('[Localify] Fallback scan error:', err);
      } finally {
        console.timeEnd('fallbackScan');
        setScanProgress({ isScanning: false, filesFound: 0, currentFolder: '' });
      }
    },
    []
  );

  // Helper: Fisher-Yates shuffle array
  const createShuffledArray = useCallback((items: Track[], currentTrackId?: string): string[] => {
    const ids = items.map((t) => t.id);
    // Remove current track to place at head
    const filtered = currentTrackId ? ids.filter((id) => id !== currentTrackId) : ids;
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    return currentTrackId ? [currentTrackId, ...filtered] : filtered;
  }, []);

  // 7. Play a specific track
  const playTrack = useCallback(
    async (track: Track, resumePosition = 0) => {
      console.debug(`[Localify] Requested playback for track: ${track.title} (ID: ${track.id})`);
      console.time(`playTrack-${track.id}`);
      if (permissionStatus === 'prompt' && !track.file && track.handle) {
        console.debug('[Localify] Folder permission prompt required before playing track');
        const success = await reconnectFolder();
        if (!success) {
           console.timeEnd(`playTrack-${track.id}`);
           return;
        }
        // Proceed with playing after successful reconnect
      }

      const isVideo = track.type === 'video';
      setPlaybackState((prev) => ({
        ...prev,
        currentTrack: track,
        isVideoOpen: isVideo ? true : prev.isVideoOpen,
        error: null,
      }));

      // Update recently played & playCount
      const now = Date.now();
      const updatedPlayCount = (track.playCount || 0) + 1;

      setTracks((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, lastPlayed: now, playCount: updatedPlayCount } : t
        )
      );

      StorageService.updateTrackStats(track.id, {
        lastPlayed: now,
        playCount: updatedPlayCount,
      });

      // Update continue listening session
      const session: ContinueSession = {
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        coverArt: track.coverArt,
        position: resumePosition,
        duration: track.duration || 0,
        timestamp: now,
      };
      setContinueSession(session);
      StorageService.saveContinueSession(session);

      // If shuffle is active, update shuffle index
      const order = shuffleOrderRef.current;
      const idx = order.indexOf(track.id);
      if (idx >= 0) {
        setShuffleIndex(idx);
      } else if (playbackStateRef.current.isShuffled) {
        // Track wasn't in shuffle list, rebuild around it
        const newOrder = createShuffledArray(tracksRef.current, track.id);
        setShuffleOrder(newOrder);
        setShuffleIndex(0);
      }

      console.time('playerService.loadTrack');
      await playerService.loadTrack(track, true, resumePosition);
      console.timeEnd('playerService.loadTrack');
      console.timeEnd(`playTrack-${track.id}`);
    },
    [permissionStatus, reconnectFolder, createShuffledArray]
  );

  // 8. Queue Management Functions
  const addToQueue = useCallback((track: Track) => {
    const item: QueueItem = {
      queueId: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      track,
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const playNextInQueue = useCallback((track: Track) => {
    const item: QueueItem = {
      queueId: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      track,
    };
    setQueue((prev) => [item, ...prev]);
  }, []);

  const addMultipleToQueue = useCallback((tracksToAdd: Track[]) => {
    const newItems: QueueItem[] = tracksToAdd.map((track) => ({
      queueId: `${track.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      track,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const removeFromQueue = useCallback((queueId: string) => {
    setQueue((prev) => prev.filter((item) => item.queueId !== queueId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const playQueueItem = useCallback((item: QueueItem) => {
    removeFromQueue(item.queueId);
    playTrack(item.track);
  }, [removeFromQueue, playTrack]);

  // Persist queue to preferences
  useEffect(() => {
    StorageService.savePreference(
      'saved_queue',
      queue.map((q) => q.track.id)
    );
  }, [queue]);

  // 9. Play Next Track (Honors user queue, shuffle order, and repeat)
  const playNext = useCallback(() => {
    const currentQueue = queueRef.current;
    // Check if user has explicit items queued up
    if (currentQueue.length > 0) {
      const [nextItem, ...remainingQueue] = currentQueue;
      setQueue(remainingQueue);
      playTrack(nextItem.track);
      return;
    }

    const currentTracks = tracksRef.current;
    const currentState = playbackStateRef.current;

    if (!currentTracks.length) return;

    if (!currentState.currentTrack) {
      playTrack(currentTracks[0]);
      return;
    }

    // Shuffled mode
    if (currentState.isShuffled) {
      let order = shuffleOrderRef.current;
      if (!order.length) {
        order = createShuffledArray(currentTracks, currentState.currentTrack.id);
        setShuffleOrder(order);
      }

      const nextIdx = shuffleIndexRef.current + 1;
      if (nextIdx < order.length) {
        setShuffleIndex(nextIdx);
        const nextTrack = currentTracks.find((t) => t.id === order[nextIdx]);
        if (nextTrack) {
          playTrack(nextTrack);
          return;
        }
      } else {
        // Reached end of shuffled playlist
        if (currentState.repeatMode === 'all') {
          const freshOrder = createShuffledArray(currentTracks);
          setShuffleOrder(freshOrder);
          setShuffleIndex(0);
          const firstTrack = currentTracks.find((t) => t.id === freshOrder[0]);
          if (firstTrack) playTrack(firstTrack);
        } else {
          playerService.pause();
          playerService.seek(0);
        }
        return;
      }
    }

    // Normal sequential playback
    const currentIndex = currentTracks.findIndex((t) => t.id === currentState.currentTrack?.id);
    if (currentIndex >= 0 && currentIndex < currentTracks.length - 1) {
      playTrack(currentTracks[currentIndex + 1]);
    } else {
      if (currentState.repeatMode === 'all') {
        playTrack(currentTracks[0]);
      } else {
        playerService.pause();
        playerService.seek(0);
      }
    }
  }, [playTrack, createShuffledArray]);

  // 10. Play Previous Track
  const playPrevious = useCallback(() => {
    const currentState = playbackStateRef.current;
    if (currentState.currentTime > 3) {
      playerService.seek(0);
      return;
    }

    const currentTracks = tracksRef.current;
    if (!currentTracks.length) return;

    if (!currentState.currentTrack) {
      playTrack(currentTracks[0]);
      return;
    }

    if (currentState.isShuffled) {
      const order = shuffleOrderRef.current;
      const prevIdx = shuffleIndexRef.current - 1;
      if (prevIdx >= 0 && prevIdx < order.length) {
        setShuffleIndex(prevIdx);
        const prevTrack = currentTracks.find((t) => t.id === order[prevIdx]);
        if (prevTrack) {
          playTrack(prevTrack);
          return;
        }
      } else {
        playerService.seek(0);
        return;
      }
    }

    const currentIndex = currentTracks.findIndex((t) => t.id === currentState.currentTrack?.id);
    if (currentIndex > 0) {
      playTrack(currentTracks[currentIndex - 1]);
    } else {
      if (currentState.repeatMode === 'all') {
        playTrack(currentTracks[currentTracks.length - 1]);
      } else {
        playerService.seek(0);
      }
    }
  }, [playTrack]);

  // 11. Toggle Shuffle
  const toggleShuffle = useCallback(() => {
    setPlaybackState((prev) => {
      const nextShuffle = !prev.isShuffled;
      StorageService.savePreference('isShuffled', nextShuffle);

      if (nextShuffle) {
        const order = createShuffledArray(tracksRef.current, prev.currentTrack?.id);
        setShuffleOrder(order);
        setShuffleIndex(0);
      } else {
        setShuffleOrder([]);
        setShuffleIndex(0);
      }

      return {
        ...prev,
        isShuffled: nextShuffle,
      };
    });
  }, [createShuffledArray]);

  // 12. Toggle Repeat Mode
  const toggleRepeat = useCallback(() => {
    setPlaybackState((prev) => {
      const nextMode = prev.repeatMode === 'all' ? 'one' : prev.repeatMode === 'one' ? 'off' : 'all';
      StorageService.savePreference('repeatMode', nextMode);
      return { ...prev, repeatMode: nextMode };
    });
  }, []);

  // 13. Continue Listening action
  const continueListening = useCallback(() => {
    if (!continueSession) return;
    const targetTrack = tracks.find((t) => t.id === continueSession.trackId);
    if (targetTrack) {
      playTrack(targetTrack, continueSession.position);
    } else if (tracks.length > 0) {
      playTrack(tracks[0], 0);
    }
  }, [continueSession, tracks, playTrack]);

  // 14. Toggle Favorite
  const toggleFavorite = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const nextFav = !t.isFavorite;
          StorageService.updateTrackStats(trackId, { isFavorite: nextFav });
          return { ...t, isFavorite: nextFav };
        }
        return t;
      })
    );
  }, []);

  // 15. Register Player Service Event Listeners
  useEffect(() => {
    playerService.registerListeners({
      onTimeUpdate: (currentTime, duration) => {
        setPlaybackState((prev) => ({
          ...prev,
          currentTime,
          duration: duration || prev.duration,
        }));

        const current = playbackStateRef.current.currentTrack;
        if (current && Math.floor(currentTime) % 4 === 0) {
          StorageService.saveContinueSession({
            trackId: current.id,
            title: current.title,
            artist: current.artist,
            album: current.album,
            coverArt: current.coverArt,
            position: currentTime,
            duration: duration || current.duration || 0,
            timestamp: Date.now(),
          });
        }
      },
      onPlayStateChange: (isPlaying) => {
        setPlaybackState((prev) => ({
          ...prev,
          isPlaying,
        }));
      },
      onLoadingChange: (isLoading) => {
        setPlaybackState((prev) => ({
          ...prev,
          isLoading,
        }));
      },
      onError: (errorMessage) => {
        setPlaybackState((prev) => ({
          ...prev,
          error: errorMessage,
          isPlaying: false,
        }));
      },
      onEnded: () => {
        const state = playbackStateRef.current;
        if (state.repeatMode === 'one' && state.currentTrack) {
          playerService.seek(0);
          playerService.play();
        } else {
          playNext();
        }
      },
      onTrackLoaded: (track, duration) => {
        setTracks((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, duration } : t))
        );
      },
      onNextTrackRequested: () => {
        playNext();
      },
      onPreviousTrackRequested: () => {
        playPrevious();
      },
    });
  }, [playNext, playPrevious]);

  // 16. Playback controls
  const togglePlay = useCallback(() => {
    if (!playbackState.currentTrack && tracks.length > 0) {
      playTrack(tracks[0]);
    } else {
      playerService.togglePlay();
    }
  }, [playbackState.currentTrack, tracks, playTrack]);

  const seek = useCallback((time: number) => {
    playerService.seek(time);
    setPlaybackState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const seekRelative = useCallback((deltaSeconds: number) => {
    playerService.seekRelative(deltaSeconds);
  }, []);

  const setVolume = useCallback((vol: number) => {
    playerService.setVolume(vol);
    setPlaybackState((prev) => ({ ...prev, volume: vol, isMuted: false }));
    StorageService.savePreference('volume', vol);
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !playbackState.isMuted;
    playerService.setMuted(nextMuted);
    setPlaybackState((prev) => ({ ...prev, isMuted: nextMuted }));
    StorageService.savePreference('isMuted', nextMuted);
  }, [playbackState.isMuted]);

  const setIsVideoOpen = useCallback((isOpen: boolean) => {
    setPlaybackState((prev) => ({ ...prev, isVideoOpen: isOpen }));
  }, []);

  const setIsQueueOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setPlaybackState((prev) => ({
      ...prev,
      isQueueOpen: typeof open === 'function' ? open(prev.isQueueOpen) : open,
    }));
  }, []);

  const setIsNowPlayingOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setPlaybackState((prev) => ({
      ...prev,
      isNowPlayingOpen: typeof open === 'function' ? open(prev.isNowPlayingOpen) : open,
    }));
  }, []);

  const setIsShortcutsOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setPlaybackState((prev) => ({
      ...prev,
      isShortcutsOpen: typeof open === 'function' ? open(prev.isShortcutsOpen) : open,
    }));
  }, []);

  const clearLibrary = useCallback(async () => {
    playerService.pause();
    await StorageService.clearDirectoryHandle();
    setTracks([]);
    setQueue([]);
    setFolderName(null);
    setFolderHandle(null);
    setPermissionStatus('idle');
    setContinueSession(null);
    setPlaybackState((prev) => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
  }, []);

  const updateSortOption = useCallback((option: SortOption) => {
    setSortOption(option);
    StorageService.savePreference('sortOption', option);
  }, []);

  // 17. Smart Filters & Derived Collections
  const recentlyPlayed = useMemo(() => {
    return tracks
      .filter((t) => t.lastPlayed != null && t.lastPlayed > 0)
      .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
      .slice(0, 20);
  }, [tracks]);

  const recentlyAdded = useMemo(() => {
    return [...tracks]
      .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
      .slice(0, 24);
  }, [tracks]);

  const favoriteTracks = useMemo(() => {
    return tracks.filter((t) => t.isFavorite);
  }, [tracks]);

  const processedTracks = useMemo(() => {
    let list = tracks;

    if (activeTab === 'audio') {
      list = list.filter((t) => t.type === 'audio');
    } else if (activeTab === 'video') {
      list = list.filter((t) => t.type === 'video');
    } else if (activeTab === 'favorites') {
      list = list.filter((t) => t.isFavorite);
    } else if (activeTab === 'recent') {
      list = list.filter((t) => t.lastPlayed != null && t.lastPlayed > 0);
    }

    if (selectedFolder) {
      list = filterTracksByFolder(list, selectedFolder);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q) ||
          t.fileName.toLowerCase().includes(q) ||
          t.parentFolder.toLowerCase().includes(q) ||
          t.format.toLowerCase().includes(q)
      );
    }

    return sortTracks(list, sortOption);
  }, [tracks, activeTab, selectedFolder, searchQuery, sortOption]);

  const playAllFavorites = useCallback(() => {
    if (favoriteTracks.length > 0) {
      playTrack(favoriteTracks[0]);
    }
  }, [favoriteTracks, playTrack]);

  return {
    tracks,
    processedTracks,
    recentlyPlayed,
    recentlyAdded,
    favoriteTracks,
    continueSession,
    folderName,
    folderHandle,
    permissionStatus,
    scanProgress,
    playbackState,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    selectedFolder,
    setSelectedFolder,
    sortOption,
    updateSortOption,
    selectFolder,
    rescanLibrary,
    reconnectFolder,
    selectFilesFallback,
    playTrack,
    continueListening,
    toggleFavorite,
    playAllFavorites,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setIsVideoOpen,
    setIsQueueOpen,
    setIsNowPlayingOpen,
    setIsShortcutsOpen,
    clearLibrary,
    // Queue functions
    queue,
    addToQueue,
    playNextInQueue,
    addMultipleToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playQueueItem,
    isFileSystemSupported: isFileSystemAccessSupported(),
  };
}
