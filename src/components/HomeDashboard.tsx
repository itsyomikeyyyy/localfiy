import React, { useMemo } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Clock,
  Heart,
  Folder,
  CheckCircle2,
  ListPlus,
} from 'lucide-react';
import { Track, ContinueSession } from '../types';
import { Artwork } from './Artwork';
import { formatDuration } from '../utils/formatters';

interface HomeDashboardProps {
  tracks: Track[];
  recentlyPlayed: Track[];
  recentlyAdded: Track[];
  continueSession: ContinueSession | null;
  onContinueListening: () => void;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onSelectFolder: (folderPath: string) => void;
  onNavigateTab: (tab: 'songs' | 'folders' | 'favorites' | 'recent') => void;
  onAddToQueue?: (track: Track) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  tracks,
  recentlyPlayed,
  recentlyAdded,
  continueSession,
  onContinueListening,
  onPlayTrack,
  onToggleFavorite,
  onSelectFolder,
  onNavigateTab,
  onAddToQueue,
  currentTrackId,
  isPlaying,
}) => {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const stats = useMemo(() => {
    const artists = new Set<string>();
    const albums = new Set<string>();
    const folders = new Set<string>();
    let totalSeconds = 0;

    tracks.forEach((t) => {
      if (t.artist && t.artist !== 'Unknown Artist') artists.add(t.artist);
      if (t.album && t.album !== 'Unknown Album') albums.add(t.album);
      if (t.parentFolder) folders.add(t.parentFolder);
      if (t.duration) totalSeconds += t.duration;
    });

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return {
      totalSongs: tracks.length,
      artistsCount: artists.size,
      albumsCount: albums.size,
      foldersCount: folders.size,
      playtime: hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`,
    };
  }, [tracks]);

  const topFolders = useMemo(() => {
    const folderCounts = new Map<string, number>();
    tracks.forEach((t) => {
      const parts = t.relativePath.split('/');
      if (parts.length > 1) {
        const topFolder = parts[0];
        folderCounts.set(topFolder, (folderCounts.get(topFolder) || 0) + 1);
      }
    });
    return Array.from(folderCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [tracks]);

  const continueTrack = useMemo(() => {
    if (!continueSession) return null;
    return tracks.find((t) => t.id === continueSession.trackId) || null;
  }, [continueSession, tracks]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-8 bg-[#121212]">
      {/* Dynamic Time-based Greeting */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {greeting}
        </h2>
        <div className="hidden sm:flex items-center gap-3 text-xs text-[#b3b3b3]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>{stats.totalSongs} Local Songs</span>
          </span>
          <span>·</span>
          <span>{stats.playtime} Playtime</span>
        </div>
      </div>

      {/* 1. Continue Listening Hero Section */}
      {continueSession && (
        <section className="bg-gradient-to-r from-[#18281c] via-[#151c17] to-[#181818] border border-[#1ed760]/20 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-[#1ed760]/10 to-transparent pointer-events-none" />

          <div className="flex items-center gap-2 text-xs font-bold text-[#1ed760] uppercase tracking-wider mb-3">
            <RotateCcw className="w-4 h-4" />
            <span>Continue Listening</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Artwork
                track={
                  continueTrack || {
                    id: continueSession.trackId,
                    title: continueSession.title,
                    artist: continueSession.artist,
                    album: continueSession.album,
                    coverArt: continueSession.coverArt,
                    fileName: continueSession.title,
                    relativePath: '',
                    parentFolder: '',
                    format: 'mp3',
                    type: 'audio',
                    size: 0,
                    lastModified: 0,
                    duration: continueSession.duration,
                    dateAdded: 0,
                    lastPlayed: 0,
                    playCount: 0,
                    isFavorite: false,
                  }
                }
                size="lg"
              />

              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate" title={continueSession.title}>
                  {continueSession.title}
                </h3>
                <p className="text-xs text-[#b3b3b3] truncate mt-0.5">
                  {continueSession.artist || 'Unknown Artist'} {continueSession.album ? `· ${continueSession.album}` : ''}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-mono text-[#1ed760] font-medium">
                    {formatDuration(continueSession.position)}
                  </span>
                  <span className="text-xs text-[#535353]">/</span>
                  <span className="text-xs font-mono text-[#b3b3b3]">
                    {formatDuration(continueSession.duration)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onContinueListening}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-xs shadow-lg shadow-[#1ed760]/20 transition-all cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Resume Song</span>
            </button>
          </div>
        </section>
      )}

      {/* 2. Top Folders Quick Jump */}
      {topFolders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#b3b3b3]">
              Quick Folders
            </h3>
            <button
              onClick={() => onNavigateTab('folders')}
              className="text-xs font-bold text-[#b3b3b3] hover:text-white transition cursor-pointer"
            >
              Show all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topFolders.map((folder) => (
              <div
                key={folder.name}
                onClick={() => onSelectFolder(folder.name)}
                className="group flex items-center justify-between p-3 rounded-lg bg-[#181818] hover:bg-[#222222] transition-colors cursor-pointer border border-transparent hover:border-[#282828]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded bg-[#242424] group-hover:bg-[#2a2a2a] flex items-center justify-center shrink-0 transition">
                    <Folder className="w-5 h-5 text-[#1ed760]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white truncate block">
                      {folder.name}
                    </span>
                    <span className="text-[11px] text-[#b3b3b3]">
                      {folder.count} {folder.count === 1 ? 'song' : 'songs'}
                    </span>
                  </div>
                </div>
                <button
                  title={`Open ${folder.name}`}
                  className="opacity-0 group-hover:opacity-100 transition p-2 rounded-full bg-[#1ed760] text-black shadow-md hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Recently Added Songs Section */}
      {recentlyAdded.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1ed760]" />
              <h3 className="text-base font-bold text-white">Recently Added</h3>
            </div>
            <button
              onClick={() => onNavigateTab('songs')}
              className="text-xs font-bold text-[#b3b3b3] hover:text-white transition cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recentlyAdded.slice(0, 6).map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="group p-3 rounded-lg bg-[#181818] hover:bg-[#222222] transition duration-150 cursor-pointer flex flex-col relative"
              >
                {/* Artwork box with hovering play button */}
                <div className="relative aspect-square w-full rounded-md mb-3 shadow-md overflow-hidden">
                  <Artwork track={track} size="responsive" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayTrack(track);
                    }}
                    className="absolute right-2 bottom-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition duration-150 hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-black ml-0.5" />
                  </button>
                </div>

                <div className="text-xs font-semibold text-white truncate" title={track.title}>
                  {track.title}
                </div>
                <div className="text-[11px] text-[#b3b3b3] truncate mt-0.5">
                  {track.artist || track.parentFolder}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Recently Played Rows Section */}
      {recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1ed760]" />
              <h3 className="text-base font-bold text-white">Recently Played</h3>
            </div>
            <button
              onClick={() => onNavigateTab('recent')}
              className="text-xs font-bold text-[#b3b3b3] hover:text-white transition cursor-pointer"
            >
              See all
            </button>
          </div>

          <div className="divide-y divide-[#282828]/60 bg-[#181818]/60 rounded-lg p-1">
            {recentlyPlayed.slice(0, 6).map((track, idx) => {
              const isCurrent = currentTrackId === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer transition ${
                    isCurrent ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-center text-xs font-mono text-[#b3b3b3] group-hover:hidden">
                      {idx + 1}
                    </span>
                    <Play className="w-4 h-4 text-[#1ed760] fill-current hidden group-hover:block shrink-0 ml-0.5" />

                    <Artwork track={track} size="sm" />

                    <div className="min-w-0">
                      <span className={`text-xs font-medium truncate block ${isCurrent ? 'text-[#1ed760]' : 'text-white'}`}>
                        {track.title}
                      </span>
                      <span className="text-[11px] text-[#b3b3b3] truncate block">
                        {track.artist} {track.album ? `· ${track.album}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onAddToQueue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQueue(track);
                        }}
                        title="Add to queue"
                        className="p-1 text-[#b3b3b3] opacity-0 group-hover:opacity-100 hover:text-[#1ed760] transition"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.id);
                      }}
                      className="p-1 text-[#b3b3b3] hover:text-[#1ed760] transition"
                    >
                      <Heart
                        className={`w-4 h-4 ${track.isFavorite ? 'fill-[#1ed760] text-[#1ed760]' : ''}`}
                      />
                    </button>
                    <span className="text-xs font-mono text-[#b3b3b3]">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Library Overview Card */}
      <section className="p-4 rounded-xl bg-[#181818] border border-[#282828] text-xs text-[#b3b3b3]">
        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-2">
          Your Library Overview
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mt-3">
          <div className="p-2.5 rounded bg-[#242424]">
            <div className="text-base font-bold text-white">{stats.totalSongs}</div>
            <div className="text-[11px] text-[#b3b3b3] mt-0.5">Total Tracks</div>
          </div>
          <div className="p-2.5 rounded bg-[#242424]">
            <div className="text-base font-bold text-white">{stats.artistsCount || '—'}</div>
            <div className="text-[11px] text-[#b3b3b3] mt-0.5">Artists</div>
          </div>
          <div className="p-2.5 rounded bg-[#242424]">
            <div className="text-base font-bold text-white">{stats.albumsCount || '—'}</div>
            <div className="text-[11px] text-[#b3b3b3] mt-0.5">Albums</div>
          </div>
          <div className="p-2.5 rounded bg-[#242424]">
            <div className="text-base font-bold text-white">{stats.foldersCount}</div>
            <div className="text-[11px] text-[#b3b3b3] mt-0.5">Folders</div>
          </div>
        </div>
      </section>
    </div>
  );
};
