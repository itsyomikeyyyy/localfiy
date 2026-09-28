import { useEffect } from 'react';

interface ShortcutActions {
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seekRelative: (seconds: number) => void;
  toggleQueue: () => void;
  toggleShortcuts: () => void;
  closeModals: () => void;
}

export function useKeyboardShortcuts({
  togglePlay,
  playNext,
  playPrevious,
  toggleMute,
  toggleShuffle,
  toggleRepeat,
  seekRelative,
  toggleQueue,
  toggleShortcuts,
  closeModals,
}: ShortcutActions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Ignore shortcuts if the user is typing in an input
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyN':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            playNext();
          }
          break;
        case 'KeyP':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            playPrevious();
          }
          break;
        case 'KeyM':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleMute();
          }
          break;
        case 'KeyS':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleShuffle();
          }
          break;
        case 'KeyR':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleRepeat();
          }
          break;
        case 'KeyQ':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleQueue();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'Escape':
          closeModals();
          break;
        case 'Slash':
          if (e.shiftKey) {
            // '?' key
            e.preventDefault();
            toggleShortcuts();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    playNext,
    playPrevious,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    seekRelative,
    toggleQueue,
    toggleShortcuts,
    closeModals,
  ]);
}
