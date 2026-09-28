import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  FolderTree,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  ChevronRight,
  Home,
  ListPlus,
} from 'lucide-react';
import { Track, SortOption, SortField, NavTab } from '../types';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  tracks: Track[];
  folderName: string | null;
  selectedFolder: string | null;
  onSelectFolderBreadcrumb: (path: string | null) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  onRescan: () => void;
  isScanning: boolean;
  onClearLibrary: () => void;
  onQueueAll?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  onSearchChange,
  tracks,
  folderName,
  selectedFolder,
  onSelectFolderBreadcrumb,
  sortOption,
  onSortChange,
  onRescan,
  isScanning,
  onClearLibrary,
  onQueueAll,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl/Cmd + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        onSearchChange('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchChange]);

  const tabTitles: Record<NavTab, string> = {
    home: 'Home',
    songs: 'All Songs',
    folders: 'Folder Explorer',
    favorites: 'Favorites',
    recent: 'Recently Played',
    audio: 'Audio Tracks',
    video: 'Video Files',
  };

  const breadcrumbParts = selectedFolder ? selectedFolder.split('/') : [];

  const handleFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange({
      ...sortOption,
      field: e.target.value as SortField,
    });
  };

  const toggleDirection = () => {
    onSortChange({
      ...sortOption,
      direction: sortOption.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  return (
    <header className="h-16 px-6 bg-[#121212] border-b border-[#282828] flex items-center justify-between gap-4 shrink-0 z-20 rounded-t-lg">
      {/* Title & Folder Breadcrumb Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
            {selectedFolder ? (
              <nav className="flex items-center gap-1.5 text-xs text-[#b3b3b3]">
                <button
                  onClick={() => onSelectFolderBreadcrumb(null)}
                  className="hover:text-white flex items-center gap-1 font-medium transition cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{folderName || 'Music'}</span>
                </button>
                {breadcrumbParts.map((part, idx) => {
                  const partialPath = breadcrumbParts.slice(0, idx + 1).join('/');
                  const isLast = idx === breadcrumbParts.length - 1;
                  return (
                    <React.Fragment key={partialPath}>
                      <ChevronRight className="w-3 h-3 text-[#535353]" />
                      {isLast ? (
                        <span className="text-white font-semibold truncate max-w-[160px]">{part}</span>
                      ) : (
                        <button
                          onClick={() => onSelectFolderBreadcrumb(partialPath)}
                          className="hover:text-white truncate max-w-[120px] transition cursor-pointer"
                        >
                          {part}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            ) : (
              <h2 className="text-xl font-bold text-white tracking-tight truncate">
                {tabTitles[activeTab]}
              </h2>
            )}
          </div>
          <p className="text-xs text-[#b3b3b3]">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} in view
          </p>
        </div>
      </div>

      {/* Center & Right Controls: Search, Sort, Queue All, Rescan */}
      <div className="flex items-center gap-2.5">
        {/* Search Bar with Ctrl+K shortcut badge */}
        <div className="relative w-44 sm:w-60 md:w-68">
          <Search className="w-4 h-4 text-[#b3b3b3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-9 pr-14 py-2 rounded-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-xs text-white placeholder-[#b3b3b3] border border-transparent focus:border-white focus:outline-none transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              title="Clear search (Esc)"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#727272] bg-[#181818] px-1.5 py-0.5 rounded border border-[#333333]">
              ⌘K
            </span>
          )}
        </div>

        {/* Sorting Dropdown Control */}
        {activeTab !== 'home' && (
          <div className="flex items-center bg-[#242424] rounded-full border border-transparent hover:border-[#383838] transition px-2 py-1">
            <select
              value={sortOption.field}
              onChange={handleFieldChange}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1 py-0.5"
            >
              <option value="title" className="bg-[#242424] text-white">Title</option>
              <option value="artist" className="bg-[#242424] text-white">Artist</option>
              <option value="album" className="bg-[#242424] text-white">Album</option>
              <option value="duration" className="bg-[#242424] text-white">Duration</option>
              <option value="dateAdded" className="bg-[#242424] text-white">Date Added</option>
              <option value="recentlyPlayed" className="bg-[#242424] text-white">Recently Played</option>
            </select>
            <button
              onClick={toggleDirection}
              title={sortOption.direction === 'asc' ? 'Ascending (A-Z)' : 'Descending (Z-A)'}
              className="p-1 text-[#b3b3b3] hover:text-white transition rounded-full cursor-pointer ml-1"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Queue All in View Button */}
        {onQueueAll && tracks.length > 0 && activeTab !== 'home' && (
          <button
            onClick={onQueueAll}
            title="Add all songs in this view to queue"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-[#b3b3b3] hover:text-white text-xs font-semibold border border-transparent hover:border-[#383838] transition cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
            <span className="hidden md:inline">Queue All</span>
          </button>
        )}

        {/* Rescan Button */}
        {folderName && (
          <button
            onClick={onRescan}
            title="Rescan library for new or deleted files"
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-[#b3b3b3] hover:text-white text-xs font-semibold border border-transparent hover:border-[#383838] transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#1ed760]' : ''}`} />
            <span className="hidden lg:inline">{isScanning ? 'Rescanning...' : 'Rescan'}</span>
          </button>
        )}

        {/* Disconnect Folder */}
        {folderName && (
          <button
            onClick={() => {
              if (window.confirm('Do you want to disconnect this folder? Local files on disk will NOT be modified.')) {
                onClearLibrary();
              }
            }}
            title="Disconnect folder"
            className="p-2 rounded-full text-[#b3b3b3] hover:text-[#f15e6c] hover:bg-[#242424] transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
