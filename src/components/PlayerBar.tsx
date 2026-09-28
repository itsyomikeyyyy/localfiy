import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Music,
  Video,
  AlertCircle,
  Tv,
  Heart,
  ListPlus,
  Maximize2,
  Keyboard,
} from 'lucide-react';
import { Track, PlaybackState } from '../types';
import { Artwork } from './Artwork';
import { formatDuration } from '../utils/formatters';

interface PlayerBarProps {
  playbackState: PlaybackState;
  queueCount: number;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleVideo: () => void;
  onToggleFavorite?: (trackId: string) => void;
  onToggleQueue: () => void;
  onOpenNowPlaying: () => void;
  onOpenShortcuts: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  playbackState,
  queueCount,
  onTogglePlay,
  onPlayNext,
  onPlayPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleRepeat,
  onToggleShuffle,
  onToggleVideo,
  onToggleFavorite,
  onToggleQueue,
  onOpenNowPlaying,
  onOpenShortcuts,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    repeatMode,
    isShuffled,
    isVideoOpen,
    isQueueOpen,
  } = playbackState;

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

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
    if (isMuted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-[#b3b3b3] hover:text-white" />;
    }
    if (volume < 0.5) {
      return <Volume1 className="w-4 h-4 text-[#b3b3b3] hover:text-white" />;
    }
    return <Volume2 className="w-4 h-4 text-[#b3b3b3] hover:text-white" />;
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-[#000000] border-t border-[#282828] px-4 sm:px-6 flex items-center justify-between z-30 select-none">
      {/* LEFT: Currently Playing Track Info & Artwork */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px] max-w-[320px]">
        {currentTrack ? (
          <>
            {/* Clickable artwork thumbnail opens Now Playing */}
            <div
              onClick={onOpenNowPlaying}
              title="Open Now Playing"
              className="relative group cursor-pointer shrink-0"
            >
              <Artwork track={currentTrack} size="md" animatePlaying={isPlaying} />
              <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="text-sm font-semibold text-white truncate hover:underline cursor-pointer"
                title={`${currentTrack.title} — Click to open Now Playing`}
                onClick={onOpenNowPlaying}
              >
                {currentTrack.title}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#b3b3b3] truncate mt-0.5">
                <span className="truncate hover:text-white hover:underline cursor-pointer">
                  {currentTrack.artist || currentTrack.parentFolder}
                </span>
                {currentTrack.album && currentTrack.album !== 'Unknown Album' && (
                  <>
                    <span className="text-[#535353]">·</span>
                    <span className="truncate">{currentTrack.album}</span>
                  </>
                )}
              </div>
            </div>

            {/* Favorite button */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(currentTrack.id)}
                title={currentTrack.isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                className="p-1.5 text-[#b3b3b3] hover:text-[#1ed760] transition cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentTrack.isFavorite ? 'fill-[#1ed760] text-[#1ed760]' : ''
                  }`}
                />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3 text-[#535353]">
            <div className="w-14 h-14 rounded-md bg-[#181818] flex items-center justify-center">
              <Music className="w-6 h-6 text-[#404040]" />
            </div>
            <span className="text-xs text-[#b3b3b3]">No song playing</span>
          </div>
        )}
      </div>

      {/* CENTER: Player Controls & Progress Bar */}
      <div className="flex flex-col items-center justify-center w-2/4 max-w-2xl px-4">
        {/* Buttons Row */}
        <div className="flex items-center gap-4 sm:gap-6 mb-1.5">
          {/* Shuffle Button */}
          <button
            onClick={onToggleShuffle}
            title={isShuffled ? 'Disable shuffle' : 'Enable shuffle'}
            className="relative p-1.5 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            <Shuffle className={`w-4 h-4 ${isShuffled ? 'text-[#1ed760]' : ''}`} />
            {isShuffled && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>

          {/* Previous Track Button */}
          <button
            onClick={onPlayPrevious}
            title="Previous (P)"
            disabled={!currentTrack}
            className="text-[#b3b3b3] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play / Pause Main Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            disabled={!currentTrack}
            className="w-8 h-8 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-transform disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer shadow-md"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-black text-black" />
            ) : (
              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
            )}
          </button>

          {/* Next Track Button */}
          <button
            onClick={onPlayNext}
            title="Next (N)"
            disabled={!currentTrack}
            className="text-[#b3b3b3] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat Mode Button */}
          <button
            onClick={onToggleRepeat}
            title={`Repeat mode: ${repeatMode.toUpperCase()} (R)`}
            className="relative p-1.5 text-[#b3b3b3] hover:text-white transition cursor-pointer"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4 text-[#1ed760]" />
            ) : (
              <Repeat className={`w-4 h-4 ${repeatMode !== 'off' ? 'text-[#1ed760]' : ''}`} />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1ed760]" />
            )}
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="w-full flex items-center gap-2 group">
          <span className="text-[11px] font-mono text-[#b3b3b3] w-10 text-right shrink-0">
            {formatDuration(displayTime)}
          </span>

          <div className="relative flex-1 flex items-center">
            <div className="absolute left-0 right-0 h-1 bg-[#4d4d4d] rounded-full pointer-events-none" />
            <div
              className="absolute left-0 h-1 bg-white group-hover:bg-[#1db954] rounded-full pointer-events-none transition-colors"
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
              disabled={!currentTrack || !duration}
              className="w-full h-2 z-10 cursor-pointer"
            />
          </div>

          <span className="text-[11px] font-mono text-[#b3b3b3] w-10 shrink-0">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Playback error banner with Skip Next button */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-[#f15e6c] mt-1 bg-[#f15e6c]/10 border border-[#f15e6c]/20 px-3 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[280px]">{error}</span>
            <button
              onClick={onPlayNext}
              className="underline text-white hover:text-[#1ed760] font-semibold cursor-pointer ml-1"
            >
              Skip Next
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: Queue, Video Viewer, Volume, & Shortcuts */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[200px]">
        {/* If video track, show video screen toggle */}
        {currentTrack?.type === 'video' && (
          <button
            onClick={onToggleVideo}
            title={isVideoOpen ? 'Hide Video' : 'Show Video'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              isVideoOpen
                ? 'bg-[#1ed760] text-black'
                : 'text-[#b3b3b3] hover:text-white bg-[#242424] hover:bg-[#2a2a2a]'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isVideoOpen ? 'Hide' : 'Video'}</span>
          </button>
        )}

        {/* Queue Button */}
        <button
          onClick={onToggleQueue}
          title={isQueueOpen ? 'Close Queue' : 'Open Queue (Q)'}
          className={`relative p-2 rounded-full transition cursor-pointer ${
            isQueueOpen
              ? 'text-[#1ed760] bg-[#242424]'
              : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
          }`}
        >
          <ListPlus className="w-4 h-4" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1ed760] text-black text-[9px] font-bold flex items-center justify-center">
              {queueCount > 9 ? '9+' : queueCount}
            </span>
          )}
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="p-2 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#181818] transition cursor-pointer hidden sm:block"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Mute / Unmute Button */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          className="p-1 text-[#b3b3b3] hover:text-white transition cursor-pointer"
        >
          {renderVolumeIcon()}
        </button>

        {/* Volume Slider */}
        <div className="w-20 sm:w-24 relative flex items-center group">
          <div className="absolute left-0 right-0 h-1 bg-[#4d4d4d] rounded-full pointer-events-none" />
          <div
            className="absolute left-0 h-1 bg-white group-hover:bg-[#1db954] rounded-full pointer-events-none transition-colors"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 z-10 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </footer>
  );
};
