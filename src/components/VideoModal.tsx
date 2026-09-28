import React, { useRef, useEffect } from 'react';
import { X, Maximize, Tv } from 'lucide-react';
import { Track } from '../types';
import { playerService } from '../services/playback/PlayerService';

interface VideoModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ track, isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      playerService.bindVideoElement(videoRef.current);
    }
    return () => {
      playerService.bindVideoElement(null);
    };
  }, [isOpen]);

  if (!isOpen || !track || track.type !== 'video') {
    return (
      <video
        ref={videoRef}
        playsInline
        className="hidden"
      />
    );
  }

  const handleFullscreen = () => {
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handlePiP = async () => {
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('PiP error:', err);
      }
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 rounded-lg overflow-hidden bg-[#000000] border border-[#282828] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#181818] border-b border-[#282828]">
        <div className="flex items-center gap-2 text-xs font-semibold text-white truncate max-w-[220px]">
          <Tv className="w-3.5 h-3.5 text-[#1ed760] shrink-0" />
          <span className="truncate">{track.title}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* PiP Button */}
          <button
            onClick={handlePiP}
            title="Picture-in-Picture"
            className="p-1 text-[#b3b3b3] hover:text-white rounded-full hover:bg-[#282828] transition cursor-pointer hidden sm:block"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><rect x="12" y="12" width="8" height="6" rx="1" ry="1"/></svg>
          </button>
          <button
            onClick={handleFullscreen}
            title="Fullscreen"
            className="p-1 text-[#b3b3b3] hover:text-white rounded-full hover:bg-[#282828] transition cursor-pointer"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Hide video window"
            className="p-1 text-[#b3b3b3] hover:text-white rounded-full hover:bg-[#282828] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video display */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};
