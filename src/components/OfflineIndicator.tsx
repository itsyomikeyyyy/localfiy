import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 rounded-full bg-[#181818] border border-[#282828] px-4 py-2 text-xs font-medium text-white shadow-xl">
      <WifiOff className="w-3.5 h-3.5 text-[#1ed760]" />
      <span>Offline Mode — Media works locally</span>
    </div>
  );
};
