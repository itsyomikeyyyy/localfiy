import React, { useMemo } from 'react';
import {
  FolderPlus,
  Music,
  ListMusic,
  Video,
  Disc3,
  HardDrive,
  RefreshCw,
  FolderOpen,
  Home,
  Heart,
  Clock,
  FolderTree,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { Track, NavTab } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  folderName: string | null;
  tracks: Track[];
  onSelectFolder: () => void;
  onRescan: () => void;
  isScanning: boolean;
  selectedFolder: string | null;
  onSelectFolderFilter: (path: string | null) => void;
  favoriteCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  folderName,
  tracks,
  onSelectFolder,
  onRescan,
  isScanning,
  selectedFolder,
  onSelectFolderFilter,
  favoriteCount,
}) => {
  // Extract discovered top folders
  const topDiscoveredFolders = useMemo(() => {
    const folderSet = new Map<string, number>();
    tracks.forEach((t) => {
      const parts = t.relativePath.split('/');
      if (parts.length > 1) {
        const topFolder = parts[0];
        folderSet.set(topFolder, (folderSet.get(topFolder) || 0) + 1);
      }
    });
    return Array.from(folderSet.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tracks]);

  return (
    <aside className="w-64 bg-[#000000] p-2 flex flex-col h-full shrink-0 select-none gap-2">
      {/* 1. Upper Navigation Card */}
      <div className="bg-[#121212] rounded-lg p-3 space-y-3">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-9 h-9 rounded-full bg-[#1db954] flex items-center justify-center shadow-lg shadow-[#1db954]/25">
            <Disc3 className="w-5 h-5 text-black animate-[spin_8s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Localify
              <span className="text-[10px] font-semibold text-[#1ed760] bg-[#1ed760]/10 px-1.5 py-0.5 rounded-full border border-[#1ed760]/20">
                v2.0
              </span>
            </h1>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="space-y-0.5">
          <button
            onClick={() => {
              onSelectTab('home');
              onSelectFolderFilter(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#242424] text-white'
                : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === 'home' ? 'text-[#1ed760]' : ''}`} />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('songs');
              onSelectFolderFilter(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'songs' && !selectedFolder
                ? 'bg-[#242424] text-white'
                : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ListMusic className={`w-4 h-4 ${activeTab === 'songs' ? 'text-[#1ed760]' : ''}`} />
              <span>All Songs</span>
            </div>
            <span className="text-[11px] font-mono text-[#727272]">{tracks.length}</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('folders');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'folders'
                ? 'bg-[#242424] text-white'
                : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
            }`}
          >
            <FolderTree className={`w-4 h-4 ${activeTab === 'folders' ? 'text-[#1ed760]' : ''}`} />
            <span>Folder Explorer</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('favorites');
              onSelectFolderFilter(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-[#242424] text-white'
                : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-[#1ed760] text-[#1ed760]' : ''}`} />
              <span>Favorites</span>
            </div>
            <span className="text-[11px] font-mono text-[#727272]">{favoriteCount}</span>
          </button>

          <button
            onClick={() => {
              onSelectTab('recent');
              onSelectFolderFilter(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === 'recent'
                ? 'bg-[#242424] text-white'
                : 'text-[#b3b3b3] hover:text-white hover:bg-[#181818]'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'recent' ? 'text-[#1ed760]' : ''}`} />
            <span>Recently Played</span>
          </button>
        </nav>
      </div>

      {/* 2. Lower Library & Folders Card */}
      <div className="bg-[#121212] rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Section Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3] flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-[#1ed760]" />
            Discovered Folders
          </span>
          {folderName && (
            <button
              onClick={onRescan}
              title="Rescan folder"
              disabled={isScanning}
              className="text-[#b3b3b3] hover:text-white p-1 rounded-full hover:bg-[#242424] transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#1ed760]' : ''}`} />
            </button>
          )}
        </div>

        {/* Scrollable Folder Hierarchy in Sidebar */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {topDiscoveredFolders.length > 0 ? (
            topDiscoveredFolders.map((f) => {
              const isSelected = selectedFolder === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => {
                    onSelectTab('folders');
                    onSelectFolderFilter(f.name);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#242424] text-[#1ed760] font-semibold'
                      : 'text-[#b3b3b3] hover:bg-[#181818] hover:text-white'
                  }`}
                >
                  <span className="truncate text-left">{f.name}</span>
                  <span className="text-[10px] text-[#727272] shrink-0 font-mono ml-1">{f.count}</span>
                </button>
              );
            })
          ) : (
            <div className="px-2 py-4 text-center text-xs text-[#727272]">
              {folderName ? 'No subfolders found' : 'Select a folder to scan'}
            </div>
          )}
        </div>

        {/* Bottom Action & PWA Controls */}
        <div className="p-3 bg-[#121212] border-t border-[#282828]/60 space-y-2.5">
          <button
            onClick={onSelectFolder}
            disabled={isScanning}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white hover:text-[#1ed760] font-semibold text-xs border border-[#333333] transition disabled:opacity-50 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{folderName ? 'Change Folder' : 'Choose Music Folder'}</span>
          </button>

          <PWAInstallButton />

          <div className="flex items-center gap-2 text-[11px] text-[#727272] px-1">
            <HardDrive className="w-3.5 h-3.5 text-[#1ed760]" />
            <span>100% on your device</span>
          </div>
          <div className="text-[10px] text-[#535353] text-center pt-2 mt-2 border-t border-[#282828]/60">
            v0.9.27 - Powered by <a href="https://bhama.xyz" target="_blank" rel="noreferrer" className="hover:text-white hover:underline transition">bhama.xyz</a>
          </div>
        </div>
      </div>
    </aside>
  );
};
