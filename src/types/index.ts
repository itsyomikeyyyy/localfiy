export type MediaType = 'audio' | 'video';

export interface TrackMetadata {
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: string;
  trackNumber?: number;
  coverArt?: string; // data URL or cached artwork
}

export interface Track {
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
  format: string; // 'mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'mp4', 'webm', etc.
  type: MediaType;
  size: number;
  lastModified: number;
  duration: number | null; // in seconds
  dateAdded: number; // timestamp when discovered
  lastPlayed: number | null; // timestamp when last played
  playCount: number;
  isFavorite: boolean;
  handle?: FileSystemFileHandle | null;
  file?: File | null;
  isMissing?: boolean;
}

export interface QueueItem {
  queueId: string;
  track: Track;
}

export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'dateAdded' | 'recentlyPlayed';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

export type NavTab = 'home' | 'songs' | 'folders' | 'favorites' | 'recent' | 'audio' | 'video';

export interface ContinueSession {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  coverArt?: string;
  position: number;
  duration: number;
  timestamp: number;
  queueTrackIds?: string[];
  shuffle?: boolean;
  repeatMode?: 'all' | 'one' | 'off';
  volume?: number;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
  isVideoOpen: boolean;
  repeatMode: 'all' | 'one' | 'off';
  isShuffled: boolean;
  isQueueOpen: boolean;
  isNowPlayingOpen: boolean;
  isShortcutsOpen: boolean;
}

export interface ScanProgress {
  isScanning: boolean;
  filesFound: number;
  currentFolder: string;
}

export type FolderPermissionStatus = 'granted' | 'prompt' | 'denied' | 'unsupported' | 'idle';

export interface FolderNode {
  name: string;
  path: string;
  trackCount: number;
  subFolders: FolderNode[];
}
