import React, { useRef } from 'react';
import { FolderPlus, Music, ShieldCheck, AlertCircle, HardDrive, FileAudio, FolderLock, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  onSelectFolder: () => void;
  onSelectFilesFallback: (files: FileList) => void;
  isFileSystemSupported: boolean;
  permissionStatus?: 'idle' | 'prompt' | 'granted' | 'denied' | 'unsupported';
  folderName?: string | null;
  onReconnect?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectFolder,
  onSelectFilesFallback,
  isFileSystemSupported,
  permissionStatus,
  folderName,
  onReconnect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFallbackClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFilesFallback(e.target.files);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto bg-[#121212]">
      {/* Decorative Icon */}
      <div className="relative mb-8">
        <div className="absolute -inset-6 bg-[#1ed760]/20 rounded-full blur-2xl" />
        <div className="relative w-24 h-24 rounded-full bg-[#181818] border border-[#282828] flex items-center justify-center shadow-2xl">
          {permissionStatus === 'prompt' ? (
            <FolderLock className="w-12 h-12 text-[#1ed760]" />
          ) : (
            <Music className="w-12 h-12 text-[#1ed760]" />
          )}
        </div>
      </div>

      {permissionStatus === 'prompt' && folderName ? (
        <>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Reconnect to &ldquo;{folderName}&rdquo;
          </h2>
          <p className="text-[#b3b3b3] text-sm sm:text-base max-w-md mb-8 leading-relaxed">
            Your browser requires you to verify permission again after reloading to continue reading files from this folder.
          </p>
          <button
            onClick={onReconnect}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-sm shadow-xl shadow-[#1ed760]/20 transition-all duration-150 cursor-pointer"
          >
            <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            <span>Grant Permission</span>
          </button>
        </>
      ) : (
        <>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Your music library is empty
          </h2>

          <p className="text-[#b3b3b3] text-sm sm:text-base max-w-md mb-8 leading-relaxed">
            Choose a folder containing your music to get started. Localify scans your local audio and video files directly in your browser.
          </p>

          {/* Primary Action Button */}
          {isFileSystemSupported ? (
            <button
              onClick={onSelectFolder}
              className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-sm shadow-xl shadow-[#1ed760]/20 transition-all duration-150 cursor-pointer"
            >
              <FolderPlus className="w-5 h-5 stroke-[2.5]" />
              <span>Choose Music Folder</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>This browser does not support the File System Access API.</span>
              </div>
              <button
                onClick={handleFallbackClick}
                className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-sm shadow-xl shadow-[#1ed760]/20 transition cursor-pointer"
              >
                <FolderPlus className="w-5 h-5 stroke-[2.5]" />
                <span>Select Local Folder / Files</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Spotify Feature Cards */}
      <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg text-left">
        <div className="p-4 rounded-lg bg-[#181818] hover:bg-[#202020] transition border border-[#242424]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
            <ShieldCheck className="w-4 h-4 text-[#1ed760]" />
            <span>100% Private</span>
          </div>
          <p className="text-[11px] text-[#b3b3b3]">
            Files never leave your computer. No cloud upload or tracking.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#181818] hover:bg-[#202020] transition border border-[#242424]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
            <FileAudio className="w-4 h-4 text-[#1ed760]" />
            <span>All Formats</span>
          </div>
          <p className="text-[11px] text-[#b3b3b3]">
            MP3, FLAC, WAV, M4A, AAC, OGG, and video playback (MP4/WebM).
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#181818] hover:bg-[#202020] transition border border-[#242424]">
          <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
            <HardDrive className="w-4 h-4 text-[#1ed760]" />
            <span>Recursive Scan</span>
          </div>
          <p className="text-[11px] text-[#b3b3b3]">
            Automatically traverses all subfolders and albums in your directory.
          </p>
        </div>
      </div>
    </div>
  );
};
