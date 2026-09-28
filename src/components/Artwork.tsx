import React, { useState } from 'react';
import { Music, Video, Disc } from 'lucide-react';
import { Track } from '../types';

interface ArtworkProps {
  track: Track | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'responsive';
  className?: string;
  animatePlaying?: boolean;
}

const GRADIENTS = [
  'from-emerald-950 via-[#122216] to-[#181818]',
  'from-indigo-950 via-[#181628] to-[#181818]',
  'from-purple-950 via-[#22162a] to-[#181818]',
  'from-sky-950 via-[#14202c] to-[#181818]',
  'from-rose-950 via-[#28161c] to-[#181818]',
  'from-amber-950 via-[#261f14] to-[#181818]',
  'from-teal-950 via-[#142624] to-[#181818]',
];

const ACCENT_COLORS = [
  'text-[#1ed760]',
  'text-indigo-400',
  'text-purple-400',
  'text-sky-400',
  'text-rose-400',
  'text-amber-400',
  'text-teal-400',
];

export const Artwork: React.FC<ArtworkProps> = ({
  track,
  size = 'md',
  className = '',
  animatePlaying = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Deterministic gradient choice based on track string hash
  const hash = React.useMemo(() => {
    if (!track) return 0;
    const str = `${track.title}:${track.artist || ''}`;
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }, [track?.id, track?.title, track?.artist]);

  const gradientClass = GRADIENTS[hash % GRADIENTS.length];
  const accentClass = ACCENT_COLORS[hash % ACCENT_COLORS.length];

  const sizeClasses = {
    sm: 'w-10 h-10 rounded',
    md: 'w-14 h-14 rounded-md',
    lg: 'w-16 h-16 rounded-lg',
    xl: 'w-64 h-64 sm:w-72 sm:h-72 rounded-2xl shadow-2xl',
    responsive: 'w-full h-full rounded-md',
  };

  if (!track) {
    return (
      <div
        className={`${sizeClasses[size]} bg-[#181818] border border-[#282828] flex items-center justify-center shrink-0 text-[#404040] ${className}`}
      >
        <Music className={size === 'xl' ? 'w-16 h-16' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
      </div>
    );
  }

  // If cover art exists and hasn't errored (only render real images in the large player to save memory in lists)
  if (track.coverArt && !imgError && size === 'xl') {
    return (
      <div
        className={`${sizeClasses[size]} overflow-hidden shrink-0 bg-[#181818] relative shadow-md ${className}`}
      >
        <img
          src={track.coverArt}
          alt={track.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>
    );
  }

  // Generated fallback placeholder with vinyl rings and subtle accent (for both video and audio)
  const Icon = track.type === 'video' ? Video : Music;
  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br ${gradientClass} border border-white/5 flex flex-col items-center justify-center shrink-0 relative overflow-hidden shadow-md ${className}`}
    >
      {/* Vinyl record grooves watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <Disc className={`w-full h-full ${accentClass} ${animatePlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center p-2">
        <Icon
          className={`${
            size === 'xl'
              ? 'w-16 h-16 mb-2'
              : size === 'lg'
              ? 'w-7 h-7'
              : size === 'sm'
              ? 'w-4 h-4'
              : 'w-6 h-6'
          } ${accentClass}`}
        />
        {size === 'xl' && (
          <span className="text-[11px] font-semibold text-white/70 max-w-[200px] truncate px-2">
            {track.artist || 'Local Audio'}
          </span>
        )}
      </div>
    </div>
  );
};
