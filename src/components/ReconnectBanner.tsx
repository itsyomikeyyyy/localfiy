import React from 'react';
import { FolderLock, RefreshCw } from 'lucide-react';

interface ReconnectBannerProps {
  folderName: string;
  onReconnect: () => void;
}

export const ReconnectBanner: React.FC<ReconnectBannerProps> = ({
  folderName,
  onReconnect,
}) => {
  return (
    <div className="mx-6 mt-4 p-4 rounded-lg bg-[#181818] border border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#242424] flex items-center justify-center shrink-0">
          <FolderLock className="w-5 h-5 text-[#1ed760]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">
            Permission needed for &ldquo;{folderName}&rdquo;
          </h4>
          <p className="text-xs text-[#b3b3b3]">
            Localify needs your confirmation after reload to continue reading files from this folder.
          </p>
        </div>
      </div>

      <button
        onClick={onReconnect}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-xs shadow-md transition transform cursor-pointer shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Reconnect Folder</span>
      </button>
    </div>
  );
};
