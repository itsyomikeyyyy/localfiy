import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause media' },
  { key: 'N', desc: 'Next track' },
  { key: 'P', desc: 'Previous track (or restart song)' },
  { key: '←', desc: 'Seek backward 5 seconds' },
  { key: '→', desc: 'Seek forward 5 seconds' },
  { key: 'M', desc: 'Mute / Unmute audio' },
  { key: 'S', desc: 'Toggle Shuffle mode' },
  { key: 'R', desc: 'Cycle Repeat mode (All / One / Off)' },
  { key: 'Q', desc: 'Toggle Play Queue panel' },
  { key: 'Ctrl / ⌘ + K', desc: 'Focus & search library' },
  { key: 'Esc', desc: 'Clear search / Close modals' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-xl bg-[#181818] border border-[#282828] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#1ed760]" />
            <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#282828] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-[#282828]/60 text-xs">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="py-2.5 flex items-center justify-between">
              <span className="text-[#b3b3b3]">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#242424] border border-[#383838] font-mono text-[11px] font-semibold text-white shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
