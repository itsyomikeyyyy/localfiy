import React, { useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  Play,
  Music,
  Home,
  ListPlus,
} from 'lucide-react';
import { Track } from '../types';
import { buildFolderTree, filterTracksByFolder } from '../utils/folderTree';
import { TrackList } from './TrackList';

interface FolderExplorerProps {
  tracks: Track[];
  rootFolderName: string;
  selectedFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  onToggleFavorite: (trackId: string) => void;
  onAddToQueue?: (track: Track) => void;
  onPlayNextInQueue?: (track: Track) => void;
  onQueueFolder?: (tracks: Track[]) => void;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  tracks,
  rootFolderName,
  selectedFolder,
  onSelectFolder,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onToggleFavorite,
  onAddToQueue,
  onPlayNextInQueue,
  onQueueFolder,
}) => {
  const tree = useMemo(() => {
    return buildFolderTree(tracks, rootFolderName);
  }, [tracks, rootFolderName]);

  const activeNode = useMemo(() => {
    if (!selectedFolder) return tree;
    const parts = selectedFolder.split('/');
    let current = tree;
    for (const part of parts) {
      const match = current.subFolders.find((f) => f.name === part);
      if (match) {
        current = match;
      } else {
        break;
      }
    }
    return current;
  }, [tree, selectedFolder]);

  const folderTracks = useMemo(() => {
    return filterTracksByFolder(tracks, selectedFolder || '');
  }, [tracks, selectedFolder]);

  const breadcrumbParts = selectedFolder ? selectedFolder.split('/') : [];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#121212]">
      {/* Folder Header & Breadcrumb Bar */}
      <div className="px-6 py-4 border-b border-[#282828] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#181818]/60">
        <div className="flex items-center gap-2 text-xs text-[#b3b3b3] flex-wrap">
          <button
            onClick={() => onSelectFolder(null)}
            className="flex items-center gap-1.5 font-semibold text-white hover:text-[#1ed760] transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{rootFolderName || 'Music'}</span>
          </button>

          {breadcrumbParts.map((part, idx) => {
            const path = breadcrumbParts.slice(0, idx + 1).join('/');
            const isLast = idx === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={path}>
                <ChevronRight className="w-3.5 h-3.5 text-[#535353]" />
                {isLast ? (
                  <span className="text-white font-bold">{part}</span>
                ) : (
                  <button
                    onClick={() => onSelectFolder(path)}
                    className="hover:text-white transition cursor-pointer"
                  >
                    {part}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {folderTracks.length > 0 && (
          <div className="flex items-center gap-2">
            {onQueueFolder && (
              <button
                onClick={() => onQueueFolder(folderTracks)}
                title="Queue all songs in this folder"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white text-xs font-semibold border border-[#383838] transition cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5 text-[#1ed760]" />
                <span>Queue Folder</span>
              </button>
            )}

            <button
              onClick={() => onPlayTrack(folderTracks[0])}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Play Folder ({folderTracks.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Subfolders Grid if any exist */}
      {activeNode.subFolders.length > 0 && (
        <div className="px-6 pt-4 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3] mb-3">
            Subfolders
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activeNode.subFolders.map((sub) => (
              <div
                key={sub.path}
                onClick={() => onSelectFolder(sub.path)}
                className="group p-3 rounded-lg bg-[#181818] hover:bg-[#242424] border border-transparent hover:border-[#282828] transition cursor-pointer flex flex-col"
              >
                <div className="w-10 h-10 rounded bg-[#2a2a2a] group-hover:bg-[#333333] flex items-center justify-center mb-2 transition">
                  <FolderOpen className="w-5 h-5 text-[#1ed760]" />
                </div>
                <span className="text-xs font-semibold text-white truncate" title={sub.name}>
                  {sub.name}
                </span>
                <span className="text-[11px] text-[#b3b3b3] mt-0.5">
                  {sub.trackCount} {sub.trackCount === 1 ? 'track' : 'tracks'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracks in Current Folder */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 pt-3 pb-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">
            {selectedFolder ? 'Files in this folder' : 'All Media Files'}
          </h4>
        </div>
        <TrackList
          tracks={folderTracks}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayTrack={onPlayTrack}
          onTogglePlay={onTogglePlay}
          onToggleFavorite={onToggleFavorite}
          onAddToQueue={onAddToQueue}
          onPlayNextInQueue={onPlayNextInQueue}
        />
      </div>
    </div>
  );
};
