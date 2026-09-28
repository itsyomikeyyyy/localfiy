/**
 * 🎨 THE MAIN APP LAYOUT 🎨
 * 
 * Welcome to App.tsx! This is where the magic happens visually. ✨
 * 
 * If the `useLocalify` hook is the "Brain" of the app, this file is the "Body".
 * It takes all the data (like the list of songs, the current playing track) and 
 * passes it down to the UI components (like the Sidebar, Header, and PlayerBar).
 * 
 * Notice how it looks like a giant HTML sandwich? That's called JSX! It lets us 
 * write HTML directly inside JavaScript. Super cool, right? 😎
 */
import React, { useEffect, useMemo } from 'react';
import { useLocalify } from './hooks/useLocalify';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TrackList } from './components/TrackList';
import { HomeDashboard } from './components/HomeDashboard';
import { FolderExplorer } from './components/FolderExplorer';
import { PlayerBar } from './components/PlayerBar';
import { EmptyState } from './components/EmptyState';
import { ScanningOverlay } from './components/ScanningOverlay';
import { ReconnectBanner } from './components/ReconnectBanner';
import { VideoModal } from './components/VideoModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QueuePanel } from './components/QueuePanel';
import { NowPlayingModal } from './components/NowPlayingModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { BackgroundVisualizer } from './components/BackgroundVisualizer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Heart, Play, FolderPlus } from 'lucide-react';

export default function App() {
  const {
    tracks,
    processedTracks,
    recentlyPlayed,
    recentlyAdded,
    favoriteTracks,
    continueSession,
    folderName,
    permissionStatus,
    scanProgress,
    playbackState,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    selectedFolder,
    setSelectedFolder,
    sortOption,
    updateSortOption,
    selectFolder,
    rescanLibrary,
    reconnectFolder,
    selectFilesFallback,
    playTrack,
    continueListening,
    toggleFavorite,
    playAllFavorites,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setIsVideoOpen,
    setIsQueueOpen,
    setIsNowPlayingOpen,
    setIsShortcutsOpen,
    clearLibrary,
    // Queue functions
    queue,
    addToQueue,
    playNextInQueue,
    addMultipleToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    playQueueItem,
    isFileSystemSupported,
  } = useLocalify();

  // Determine upcoming context tracks for Queue panel
  const upcomingContextTracks = useMemo(() => {
    if (!playbackState.currentTrack) return processedTracks.slice(0, 20);
    const currentIndex = processedTracks.findIndex((t) => t.id === playbackState.currentTrack?.id);
    if (currentIndex >= 0 && currentIndex < processedTracks.length - 1) {
      return processedTracks.slice(currentIndex + 1);
    }
    return processedTracks;
  }, [processedTracks, playbackState.currentTrack]);

  // Initialize Global Keyboard Shortcuts
  useKeyboardShortcuts({
    togglePlay,
    playNext,
    playPrevious,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    seekRelative,
    toggleQueue: () => setIsQueueOpen((prev) => !prev),
    toggleShortcuts: () => setIsShortcutsOpen((prev) => !prev),
    closeModals: () => {
      setIsQueueOpen(false);
      setIsNowPlayingOpen(false);
      setIsShortcutsOpen(false);
    },
  });

  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      // For items that are files, we can just use the fallback picker 
      // which supports FileList parsing
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await selectFilesFallback(files);
      }
    }
  };

  return (
    <div 
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#000000] text-white font-sans antialiased relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Global Drag and Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm border-4 border-dashed border-[#1ed760] rounded-lg m-4 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-[#1ed760]/20 flex items-center justify-center mb-6 animate-pulse">
            <FolderPlus className="w-12 h-12 text-[#1ed760]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Drop your music here</h2>
          <p className="text-[#b3b3b3]">Instantly create a temporary playlist from your files.</p>
        </div>
      )}

      {/* Non-blocking scanning progress toast */}
      <ScanningOverlay progress={scanProgress} />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Video Modal Viewport for MP4/WebM */}
      <VideoModal
        track={playbackState.currentTrack}
        isOpen={playbackState.isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
      />

      {/* Fullscreen Immersive Now Playing Experience */}
      <NowPlayingModal
        isOpen={playbackState.isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        playbackState={playbackState}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleRepeat={toggleRepeat}
        onToggleShuffle={toggleShuffle}
        onToggleFavorite={toggleFavorite}
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        onToggleVideo={() => setIsVideoOpen(!playbackState.isVideoOpen)}
        nextTrack={queue.length > 0 ? queue[0].track : upcomingContextTracks[0] || null}
      />

      {/* Keyboard Shortcuts Help Overlay */}
      <ShortcutsModal
        isOpen={playbackState.isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Main App Body (Desktop 2-column layout with 8px padding) */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2 pb-22">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          folderName={folderName}
          tracks={tracks}
          onSelectFolder={selectFolder}
          onRescan={rescanLibrary}
          isScanning={scanProgress.isScanning}
          selectedFolder={selectedFolder}
          onSelectFolderFilter={(path) => {
            setSelectedFolder(path);
            if (path) setActiveTab('folders');
          }}
          favoriteCount={favoriteTracks.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#121212] rounded-lg">
          {/* Top Header with Instant Search, Sorting, Breadcrumbs & Queue All */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            tracks={processedTracks}
            folderName={folderName}
            selectedFolder={selectedFolder}
            onSelectFolderBreadcrumb={(path) => {
              setSelectedFolder(path);
            }}
            sortOption={sortOption}
            onSortChange={updateSortOption}
            onRescan={rescanLibrary}
            isScanning={scanProgress.isScanning}
            onClearLibrary={clearLibrary}
            onQueueAll={() => addMultipleToQueue(processedTracks)}
          />

          {/* Reconnect permission prompt banner if needed */}
          {permissionStatus === 'prompt' && folderName && (
            <ReconnectBanner
              folderName={folderName}
              onReconnect={async () => {
                const success = await reconnectFolder();
                if (success && continueSession) {
                  const targetTrack = tracks.find((t) => t.id === continueSession.trackId);
                  if (targetTrack) {
                    playTrack(targetTrack, continueSession.position);
                  }
                }
              }}
            />
          )}

          {/* Main View Router */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Ambient Background Frequency Visualizer */}
            <BackgroundVisualizer isPlaying={playbackState.isPlaying} />

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
              {tracks.length === 0 && !scanProgress.isScanning ? (
                <EmptyState
                  onSelectFolder={selectFolder}
                  onSelectFilesFallback={selectFilesFallback}
                  isFileSystemSupported={isFileSystemSupported}
                  permissionStatus={permissionStatus}
                  folderName={folderName}
                  onReconnect={async () => {
                    const success = await reconnectFolder();
                    if (success && continueSession) {
                      const targetTrack = tracks.find((t) => t.id === continueSession.trackId);
                      if (targetTrack) {
                        playTrack(targetTrack, continueSession.position);
                      }
                    }
                  }}
                />
              ) : activeTab === 'home' && !searchQuery ? (
                <HomeDashboard
                  tracks={tracks}
                  recentlyPlayed={recentlyPlayed}
                  recentlyAdded={recentlyAdded}
                  continueSession={continueSession}
                  onContinueListening={continueListening}
                  onPlayTrack={playTrack}
                  onToggleFavorite={toggleFavorite}
                  onSelectFolder={(folderPath) => {
                    setSelectedFolder(folderPath);
                    setActiveTab('folders');
                  }}
                  onNavigateTab={setActiveTab}
                  onAddToQueue={addToQueue}
                  currentTrackId={playbackState.currentTrack?.id}
                  isPlaying={playbackState.isPlaying}
                />
              ) : activeTab === 'folders' && !searchQuery ? (
                <FolderExplorer
                  tracks={tracks}
                  rootFolderName={folderName || 'Music'}
                  selectedFolder={selectedFolder}
                  onSelectFolder={setSelectedFolder}
                  currentTrack={playbackState.currentTrack}
                  isPlaying={playbackState.isPlaying}
                  onPlayTrack={playTrack}
                  onTogglePlay={togglePlay}
                  onToggleFavorite={toggleFavorite}
                  onAddToQueue={addToQueue}
                  onPlayNextInQueue={playNextInQueue}
                  onQueueFolder={addMultipleToQueue}
                />
              ) : (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Special header banner for Favorites view */}
                  {activeTab === 'favorites' && !searchQuery && (
                    <div className="px-6 py-4 bg-gradient-to-b from-[#2e1d3e]/80 to-transparent flex items-center justify-between border-b border-[#282828]/60">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                          <Heart className="w-6 h-6 fill-white text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Liked Songs</h3>
                          <p className="text-xs text-[#b3b3b3]">{favoriteTracks.length} favorite songs</p>
                        </div>
                      </div>

                      {favoriteTracks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addMultipleToQueue(favoriteTracks)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white text-xs font-semibold border border-[#383838] transition cursor-pointer"
                          >
                            Queue All
                          </button>
                          <button
                            onClick={playAllFavorites}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] hover:scale-105 active:scale-95 text-black font-bold text-xs shadow-md transition cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-black" />
                            <span>Play All</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Track Table */}
                  <TrackList
                    tracks={processedTracks}
                    currentTrack={playbackState.currentTrack}
                    isPlaying={playbackState.isPlaying}
                    onPlayTrack={playTrack}
                    onTogglePlay={togglePlay}
                    onToggleFavorite={toggleFavorite}
                    onAddToQueue={addToQueue}
                    onPlayNextInQueue={playNextInQueue}
                    onSelectFolder={(f) => {
                      setSelectedFolder(f);
                      setActiveTab('folders');
                    }}
                  />
                </div>
              )}
            </div>

            {/* Persistent Right Queue Panel */}
            <QueuePanel
              isOpen={playbackState.isQueueOpen}
              onClose={() => setIsQueueOpen(false)}
              currentTrack={playbackState.currentTrack}
              isPlaying={playbackState.isPlaying}
              queue={queue}
              upcomingContextTracks={upcomingContextTracks}
              onPlayQueueItem={playQueueItem}
              onRemoveFromQueue={removeFromQueue}
              onClearQueue={clearQueue}
              onReorderQueue={reorderQueue}
              onPlayContextTrack={playTrack}
            />
          </div>
        </main>
      </div>

      {/* Fixed Bottom Player Bar */}
      <PlayerBar
        playbackState={playbackState}
        queueCount={queue.length}
        onTogglePlay={togglePlay}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleMute={toggleMute}
        onToggleRepeat={toggleRepeat}
        onToggleShuffle={toggleShuffle}
        onToggleVideo={() => setIsVideoOpen(!playbackState.isVideoOpen)}
        onToggleFavorite={toggleFavorite}
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />
    </div>
  );
}
