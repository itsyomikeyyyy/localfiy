import React, { useState } from 'react';
import {
  X,
  Trash2,
  Play,
  Music,
  ArrowUp,
  ArrowDown,
  ListPlus,
  GripVertical,
} from 'lucide-react';
import { Track, QueueItem } from '../types';
import { Artwork } from './Artwork';
import { formatDuration } from '../utils/formatters';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: QueueItem[];
  upcomingContextTracks: Track[];
  onPlayQueueItem: (item: QueueItem) => void;
  onRemoveFromQueue: (queueId: string) => void;
  onClearQueue: () => void;
  onReorderQueue: (fromIndex: number, toIndex: number) => void;
  onPlayContextTrack: (track: Track) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  queue,
  upcomingContextTracks,
  onPlayQueueItem,
  onRemoveFromQueue,
  onClearQueue,
  onReorderQueue,
  onPlayContextTrack,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      onReorderQueue(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <aside className="w-80 sm:w-96 bg-[#121212] border-l border-[#282828] flex flex-col h-full shrink-0 select-none z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-[#282828] flex items-center justify-between shrink-0 bg-[#181818]">
        <div className="flex items-center gap-2">
          <ListPlus className="w-5 h-5 text-[#1ed760]" />
          <h3 className="text-base font-bold text-white tracking-tight">Play Queue</h3>
          <span className="text-xs font-mono text-[#b3b3b3] bg-[#242424] px-2 py-0.5 rounded-full">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Clear user queue"
              className="text-xs text-[#b3b3b3] hover:text-[#f15e6c] px-2.5 py-1 rounded hover:bg-[#242424] transition cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            title="Close queue"
            className="p-1.5 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#242424] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: Now Playing */}
        {currentTrack && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3] mb-2 px-1">
              Now Playing
            </h4>
            <div className="p-3 rounded-lg bg-[#181818] border border-[#282828] flex items-center gap-3">
              <Artwork track={currentTrack} size="md" animatePlaying={isPlaying} />

              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[#1ed760] truncate block" title={currentTrack.title}>
                  {currentTrack.title}
                </span>
                <span className="text-[11px] text-[#b3b3b3] truncate block mt-0.5">
                  {currentTrack.artist || 'Unknown Artist'}
                </span>
              </div>

              {isPlaying && (
                <div className="flex items-end gap-0.5 h-4 w-4 justify-center shrink-0">
                  <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-3" />
                  <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.8s_ease-in-out_infinite_0.2s] h-4" />
                  <span className="w-0.5 bg-[#1ed760] rounded-full animate-[bounce_0.5s_ease-in-out_infinite_0.4s] h-2" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Explicit User Queue ("Up Next") */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">
              Up Next (Queued)
            </h4>
            {queue.length > 0 && (
              <span className="text-[10px] text-[#727272]">Drag or use arrows to reorder</span>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="p-4 rounded-lg bg-[#181818]/60 border border-dashed border-[#282828] text-center">
              <p className="text-xs text-[#b3b3b3]">Your queue is empty</p>
              <p className="text-[11px] text-[#727272] mt-0.5">
                Use &ldquo;...&rdquo; on any track or &ldquo;Queue All&rdquo; to add songs here.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {queue.map((item, index) => {
                const isBeingDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={item.queueId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group flex items-center justify-between p-2 rounded-md bg-[#181818] hover:bg-[#202020] border transition-colors ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-[#1ed760]'
                        : isDragOver
                        ? 'border-[#1ed760] bg-[#222222]'
                        : 'border-transparent hover:border-[#282828]'
                    }`}
                  >
                    {/* Drag Grip Handle */}
                    <div
                      title="Drag to reorder"
                      className="cursor-grab active:cursor-grabbing text-[#535353] hover:text-[#b3b3b3] p-1 -ml-1 mr-1"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <div
                      onClick={() => onPlayQueueItem(item)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    >
                      <Artwork track={item.track} size="sm" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-white truncate block group-hover:text-[#1ed760] transition" title={item.track.title}>
                          {item.track.title}
                        </span>
                        <span className="text-[10px] text-[#b3b3b3] truncate block">
                          {item.track.artist || 'Unknown Artist'}
                        </span>
                      </div>
                    </div>

                    {/* Actions & Reordering Controls */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="text-[11px] font-mono text-[#727272] mr-1 hidden sm:inline">
                        {formatDuration(item.track.duration)}
                      </span>

                      {/* Move Up */}
                      <button
                        onClick={() => onReorderQueue(index, index - 1)}
                        disabled={index === 0}
                        title="Move up"
                        className="p-1 text-[#727272] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => onReorderQueue(index, index + 1)}
                        disabled={index === queue.length - 1}
                        title="Move down"
                        className="p-1 text-[#727272] hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => onRemoveFromQueue(item.queueId)}
                        title="Remove from queue"
                        className="p-1 text-[#727272] hover:text-[#f15e6c] transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 3: Next in Playlist / Library */}
        {upcomingContextTracks.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3] mb-2 px-1">
              Next in Context
            </h4>
            <div className="divide-y divide-[#282828]/50 bg-[#181818]/40 rounded-lg p-1">
              {upcomingContextTracks.slice(0, 15).map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => onPlayContextTrack(track)}
                  className="group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-white/5 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-4 text-center text-[10px] font-mono text-[#727272]">
                      {i + 1}
                    </span>
                    <Artwork track={track} size="sm" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-white truncate block group-hover:text-[#1ed760] transition" title={track.title}>
                        {track.title}
                      </span>
                      <span className="text-[10px] text-[#b3b3b3] truncate block">
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#727272]">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
