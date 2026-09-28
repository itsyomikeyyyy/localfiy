import React from 'react';
import { Loader2, Music2 } from 'lucide-react';
import { ScanProgress } from '../types';

interface ScanningOverlayProps {
  progress: ScanProgress;
}

export const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ progress }) => {
  if (!progress.isScanning) return null;

  return (
    <div className="fixed top-5 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3.5 px-4 py-3 rounded-full bg-[#181818] border border-[#282828] text-white shadow-2xl">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#1ed760] animate-spin" />
          <Music2 className="w-2.5 h-2.5 text-white absolute" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">Scanning your music...</span>
            <span className="text-xs font-mono font-medium text-black bg-[#1ed760] px-2 py-0.2 rounded-full">
              {progress.filesFound} {progress.filesFound === 1 ? 'file' : 'files'}
            </span>
          </div>
          {progress.currentFolder && (
            <span className="text-[11px] text-[#b3b3b3] truncate max-w-[200px]">
              in {progress.currentFolder}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
