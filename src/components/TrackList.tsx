import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Music,
  Clock3,
  Heart,
  MoreHorizontal,
  Folder,
  Copy,
  Check,
  FolderOpen,
  ListPlus,
  PlaySquare,
} from 'lucide-react';
import { Track } from '../types';
import { Artwork } from './Artwork';
import { formatDuration } from '../utils/formatters';

interface TrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onSelectFolder?: (folderPath: string) => void;
  onAddToQueue?: (track: Track) => void;
  onPlayNextInQueue?: (track: Track) => void;
}

const ROW_HEIGHT = 56;
const OVERSCAN = 12;

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onSelectFolder,
  onAddToQueue,
  onPlayNextInQueue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Measure container height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.track-menu-container')) {
        setActiveMenuTrackId(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Virtualization calculations
  const totalRows = tracks.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT);
    const end = Math.min(totalRows, start + visibleCount + 2 * OVERSCAN);
    const offset = start * ROW_HEIGHT;
    return { startIndex: start, endIndex: end, offsetY: offset };
  }, [scrollTop, containerHeight, totalRows]);

  const visibleTracks = useMemo(() => {
    return tracks.slice(startIndex, endIndex);
  }, [tracks, startIndex, endIndex]);

  const handleCopyTitle = (track: Track) => {
    const text = track.artist && track.artist !== 'Unknown Artist'
      ? `${track.artist} - ${track.title}`
      : track.title;
    navigator.clipboard.writeText(text);
    setCopiedId(track.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#b3b3b3]">
        <Music className="w-12 h-12 text-[#535353] mb-3" />
        <p className="text-base font-semibold text-white">No tracks match your query</p>
        <p className="text-xs text-[#b3b3b3] mt-1">Try another search or reset active filters.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-6 py-2 bg-[#121212] select-none"
    >
      {/* Sticky Table Header */}
      <div className="grid grid-cols-[36px_minmax(180px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_70px_36px] gap-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#b3b3b3] border-b border-[#282828] sticky top-0 bg-[#121212] z-10">
        <div className="text-center">#</div>
        <div>Title & Artist</div>
        <div className="hidden md:block">Album</div>
        <div className="hidden lg:block">Folder</div>
        <div className="text-right flex items-center justify-end gap-1">
          <Clock3 className="w-3.5 h-3.5" />
        </div>
        <div className="text-center"></div>
      </div>

      {/* Virtualized Container */}
      <div style={{ height: `${totalHeight}px`, position: 'relative' }} className="mt-1 pb-24">
        <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', left: 0, right: 0 }}>
          {visibleTracks.map((track, i) => {
            const actualIndex = startIndex + i;
            const isCurrent = currentTrack?.id === track.id;
            const isCurrentPlaying = isCurrent && isPlaying;
            const isMenuOpen = activeMenuTrackId === track.id;

            return (
              <div
                key={track.id}
                style={{ height: `${ROW_HEIGHT}px` }}
                onClick={() => {
                  if (isCurrent) {
                    onTogglePlay();
                  } else {
                    onPlayTrack(track);
                  }
                }}
                className={`group grid grid-cols-[36px_minmax(180px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_70px_36px] gap-4 px-3 rounded-md items-center cursor-pointer transition-colors duration-100 ${
                  isCurrent
                    ? 'bg-white/10 hover:bg-white/15'
                    : 'hover:bg-white/10'
                }`}
              >
                {/* # / Play / Equalizer Animation */}
                <div className="flex items-center justify-center">
                  {isCurrent ? (
                    isCurrentPlaying ? (
                      <div className="flex items-end gap-0.5 h-3.5 w-3.5 justify-center">
                        <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-3" />
                        <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-3.5" />
                        <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.4s] h-2" />
                      </div>
                    ) : (
                      <Play className="w-3.5 h-3.5 text-[#1ed760] fill-current" />
                    )
                  ) : (
                    <>
                      <span className="text-xs text-[#b3b3b3] group-hover:hidden font-mono">
                        {actualIndex + 1}
                      </span>
                      <Play className="w-3.5 h-3.5 text-white fill-current hidden group-hover:block transition-transform" />
                    </>
                  )}
                </div>

                {/* Title & Artist & Artwork Thumbnail */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <Artwork track={track} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm truncate ${
                          isCurrent
                            ? 'text-[#1ed760] font-semibold'
                            : 'text-white font-medium group-hover:text-white'
                        }`}
                        title={track.title}
                      >
                        {track.title}
                      </span>
                      {track.type === 'video' && (
                        <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#282828] text-[#1ed760] border border-[#1ed760]/30">
                          VIDEO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#b3b3b3] truncate mt-0.5 flex items-center gap-1.5">
                      <span className="hover:text-white transition">{track.artist || 'Unknown Artist'}</span>
                      {track.year && <span className="text-[#535353]">· {track.year}</span>}
                    </div>
                  </div>
                </div>

                {/* Album */}
                <div className="hidden md:flex items-center text-xs text-[#b3b3b3] truncate">
                  <span className="truncate hover:text-white transition">{track.album || '—'}</span>
                </div>

                {/* Folder */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-[#b3b3b3] truncate">
                  <Folder className="w-3.5 h-3.5 text-[#535353] shrink-0" />
                  <span
                    onClick={(e) => {
                      if (onSelectFolder && track.parentFolder) {
                        e.stopPropagation();
                        onSelectFolder(track.parentFolder);
                      }
                    }}
                    className="truncate hover:underline hover:text-white cursor-pointer"
                  >
                    {track.parentFolder}
                  </span>
                </div>

                {/* Duration & Favorite Button */}
                <div className="flex items-center justify-end gap-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    title={track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    className={`p-1 transition cursor-pointer ${
                      track.isFavorite
                        ? 'text-[#1ed760] opacity-100'
                        : 'text-[#b3b3b3] opacity-0 group-hover:opacity-100 hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-[#1ed760] text-[#1ed760]' : ''}`}
                    />
                  </button>
                  <span className="text-xs font-mono text-[#b3b3b3]">
                    {formatDuration(track.duration)}
                  </span>
                </div>

                {/* More / Actions Menu */}
                <div className="relative text-center track-menu-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuTrackId(isMenuOpen ? null : track.id);
                    }}
                    title="More actions"
                    className={`p-1.5 rounded-full hover:bg-[#282828] text-[#b3b3b3] hover:text-white transition cursor-pointer ${
                      isMenuOpen ? 'opacity-100 text-white' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Actions Dropdown Popover */}
                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-full mt-1 w-52 rounded-lg bg-[#282828] border border-[#383838] shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        onClick={() => {
                          onPlayTrack(track);
                          setActiveMenuTrackId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Play Now</span>
                      </button>

                      {onPlayNextInQueue && (
                        <button
                          onClick={() => {
                            onPlayNextInQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer"
                        >
                          <PlaySquare className="w-3.5 h-3.5 text-[#1ed760]" />
                          <span>Play Next in Queue</span>
                        </button>
                      )}

                      {onAddToQueue && (
                        <button
                          onClick={() => {
                            onAddToQueue(track);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
                          <span>Add to Queue</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onToggleFavorite(track.id);
                          setActiveMenuTrackId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer"
                      >
                        <Heart className={`w-3.5 h-3.5 ${track.isFavorite ? 'fill-[#1ed760] text-[#1ed760]' : ''}`} />
                        <span>{track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                      </button>

                      {onSelectFolder && (
                        <button
                          onClick={() => {
                            onSelectFolder(track.parentFolder);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>View Folder</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          handleCopyTitle(track);
                          setActiveMenuTrackId(null);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#383838] transition cursor-pointer border-t border-[#383838] mt-1 pt-1.5"
                      >
                        {copiedId === track.id ? (
                          <Check className="w-3.5 h-3.5 text-[#1ed760]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === track.id ? 'Copied!' : 'Copy Title'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
