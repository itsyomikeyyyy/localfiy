import React, { useState } from 'react';
import {
  ChevronDown,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  Maximize,
  ListPlus,
  Tv,
} from 'lucide-react';
import { Track, PlaybackState } from '../types';
import { Artwork } from './Artwork';
import { BackgroundVisualizer } from './BackgroundVisualizer';
import { formatDuration } from '../utils/formatters';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  playbackState: PlaybackState;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleFavorite: (trackId: string) => void;
  onToggleQueue: () => void;
  onToggleVideo: () => void;
  nextTrack?: Track | null;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  playbackState,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onToggleFavorite,
  onToggleQueue,
  onToggleVideo,
  nextTrack,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    repeatMode,
    isShuffled,
  } = playbackState;

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  if (!isOpen || !currentTrack) return null;

  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    onSeek(seekValue);
  };

  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-5 h-5 text-[#b3b3b3]" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5 text-[#b3b3b3]" />;
    return <Volume2 className="w-5 h-5 text-[#b3b3b3]" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
      {/* Background Ambient Frequency Visualizer */}
      <BackgroundVisualizer isPlaying={isPlaying} className="opacity-40" />

      {/* Top Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#727272]">
            Playing from
          </span>
          <span className="text-xs font-semibold text-white truncate max-w-[240px]">
            {currentTrack.parentFolder || 'Your Library'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleQueue}
            title="Open Queue"
            className="p-2 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#181818] transition cursor-pointer"
          >
            <ListPlus className="w-5 h-5" />
          </button>

          {currentTrack.type === 'video' && (
            <button
              onClick={onToggleVideo}
              title="Show Video Viewport"
              className="p-2 rounded-full text-[#b3b3b3] hover:text-[#1ed760] hover:bg-[#181818] transition cursor-pointer"
            >
              <Tv className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            title="Minimize Now Playing"
            className="p-2 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#181818] transition cursor-pointer"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Center Hero Artwork / Title Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-lg mx-auto w-full relative z-10">
        {/* Large Artwork */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-[#1ed760]/10 rounded-full blur-3xl pointer-events-none" />
          <Artwork
            track={currentTrack}
            size="xl"
            animatePlaying={isPlaying}
            className="shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10"
          />
        </div>

        {/* Title, Artist, & Favorite Heart */}
        <div className="w-full flex items-center justify-between mt-2 px-2">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate" title={currentTrack.title}>
              {currentTrack.title}
            </h2>
            <p className="text-sm font-medium text-[#b3b3b3] truncate mt-0.5">
              {currentTrack.artist || 'Unknown Artist'} {currentTrack.album ? `· ${currentTrack.album}` : ''}
            </p>
          </div>

          <button
            onClick={() => onToggleFavorite(currentTrack.id)}
            title={currentTrack.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="p-2 rounded-full hover:bg-white/10 text-[#b3b3b3] hover:text-[#1ed760] transition cursor-pointer shrink-0"
          >
            <Heart
              className={`w-6 h-6 ${
                currentTrack.isFavorite ? 'fill-[#1ed760] text-[#1ed760]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Bottom Controls Area */}
      <div className="max-w-xl mx-auto w-full space-y-4 relative z-10">
        {/* Progress Bar & Timestamps */}
        <div className="space-y-1.5 group">
          <div className="relative w-full flex items-center">
            <div className="absolute left-0 right-0 h-1.5 bg-[#333333] rounded-full pointer-events-none" />
            <div
              className="absolute left-0 h-1.5 bg-white group-hover:bg-[#1db954] rounded-full pointer-events-none transition-colors"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={displayTime}
              onMouseDown={handleSeekMouseDown}
              onTouchStart={handleSeekMouseDown}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchEnd={handleSeekMouseUp}
              disabled={!duration}
              className="w-full h-3 z-10 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#b3b3b3] px-0.5">
            <span>{formatDuration(displayTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between px-4">
          {/* Shuffle Button */}
          <button
            onClick={onToggleShuffle}
            title={isShuffled ? 'Shuffle is ON' : 'Shuffle is OFF'}
            className="relative p-2 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            <Shuffle className={`w-5 h-5 ${isShuffled ? 'text-[#1ed760]' : ''}`} />
            {isShuffled && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>

          {/* Previous Track Button */}
          <button
            onClick={onPlayPrevious}
            title="Previous song"
            className="p-2 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play / Pause Main Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-transform shadow-xl cursor-pointer"
          >
            {isLoading ? (
              <span className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-black text-black" />
            ) : (
              <Play className="w-8 h-8 fill-black text-black ml-1" />
            )}
          </button>

          {/* Next Track Button */}
          <button
            onClick={onPlayNext}
            title="Next song"
            className="p-2 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Repeat Mode Button */}
          <button
            onClick={onToggleRepeat}
            title={`Repeat mode: ${repeatMode.toUpperCase()}`}
            className="relative p-2 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5 text-[#1ed760]" />
            ) : (
              <Repeat className={`w-5 h-5 ${repeatMode !== 'off' ? 'text-[#1ed760]' : ''}`} />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>
        </div>

        {/* Volume & Shortcut Hints */}
        <div className="flex items-center justify-between pt-2 px-4">
          <div className="flex items-center gap-2 w-40 group">
            <button onClick={onToggleMute} className="p-1 cursor-pointer">
              {renderVolumeIcon()}
            </button>
            <div className="relative flex-1 flex items-center">
              <div className="absolute left-0 right-0 h-1 bg-[#333333] rounded-full pointer-events-none" />
              <div
                className="absolute left-0 h-1 bg-white group-hover:bg-[#1db954] rounded-full pointer-events-none"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 cursor-pointer"
              />
            </div>
          </div>

          <span className="text-[11px] text-[#727272] hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#333333] font-mono text-[10px]">Space</kbd> to play/pause · <kbd className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#333333] font-mono text-[10px]">← / →</kbd> to seek
          </span>
        </div>
      </div>

      {/* Up Next Premium Preview Card (Netflix-style) */}
      {nextTrack && (
        <div 
          className="absolute bottom-32 right-4 sm:bottom-40 sm:right-10 w-64 bg-[#181818]/60 backdrop-blur-xl rounded-xl border border-white/10 p-3 flex flex-col gap-2 shadow-2xl transition-all hover:scale-105 hover:bg-[#282828]/80 cursor-pointer group z-20 hidden md:flex"
          onClick={onPlayNext}
          title="Play Next"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#b3b3b3] group-hover:text-white transition-colors">
            Up Next
          </div>
          <div className="flex items-center gap-3">
            <Artwork track={nextTrack} size="sm" className="shadow-md rounded-md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate group-hover:underline">
                {nextTrack.title}
              </div>
              <div className="text-xs text-[#b3b3b3] truncate">
                {nextTrack.artist || 'Unknown'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white flex items-center justify-center transition-colors shrink-0">
               <Play className="w-4 h-4 fill-white text-white group-hover:fill-black group-hover:text-black ml-0.5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
