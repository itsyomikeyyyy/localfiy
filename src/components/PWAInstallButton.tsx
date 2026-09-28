import React, { useState } from 'react';
import { Download, Monitor, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA in standalone mode
  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 text-xs text-[#1ed760] px-3 py-1.5 rounded-full bg-[#1ed760]/10 border border-[#1ed760]/20 ${compact ? 'justify-center' : ''}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-[#1ed760]" />
        {!compact && <span>Desktop App Ready</span>}
      </div>
    );
  }

  // Chromium / Android / Edge Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Install Localify as a desktop app"
        className={`group flex items-center gap-2.5 rounded-full bg-[#242424] hover:bg-[#2a2a2a] text-white hover:text-white border border-[#333333] px-3.5 py-2 text-xs font-semibold transition-all shadow-sm ${
          compact ? 'justify-center w-full' : 'w-full'
        }`}
      >
        <Download className="w-4 h-4 text-[#1ed760] group-hover:scale-110 transition-transform" />
        {!compact && (
          <div className="flex flex-col text-left">
            <span className="font-semibold text-white">Install App</span>
            <span className="text-[10px] text-[#b3b3b3]">Desktop PWA</span>
          </div>
        )}
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-full border border-[#333333] bg-[#242424] px-3.5 py-2 text-xs font-semibold text-[#b3b3b3] hover:text-white hover:bg-[#2a2a2a] transition ${
            compact ? 'justify-center' : ''
          }`}
        >
          <Monitor className="w-4 h-4 text-[#1ed760]" />
          {!compact && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-lg bg-[#181818] border border-[#282828] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Install on iPad / iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#b3b3b3] hover:text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#b3b3b3] leading-relaxed space-y-2">
                1. Tap the <strong className="text-[#1ed760]">Share</strong> button in the Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-[#1ed760]">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-full bg-[#242424] py-2.5 text-xs font-semibold text-white hover:bg-[#2a2a2a] transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
