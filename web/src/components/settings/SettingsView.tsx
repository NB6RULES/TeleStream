import React, { useState, useEffect } from 'react';
import {
  LogOut,
  Trash2,
  Check,
  AlertTriangle,
  X,
  Download,
} from 'lucide-react';
import { TDLibUser } from '../../types/tdlib';
import { appSettingsStore, AppSettingsState } from '../../services/storage/appSettingsStore';

const GithubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface SettingsViewProps {
  user: TDLibUser | null;
  onLogout: () => void;
  onClose?: () => void;
  onInstall?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout, onClose, onInstall }) => {
  const [settings, setSettings] = useState<AppSettingsState>(() =>
    appSettingsStore.getSettings()
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [cacheSizeText, setCacheSizeText] = useState('Estimating...');
  const [isClearing, setIsClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = appSettingsStore.subscribe(() => {
      setSettings(appSettingsStore.getSettings());
    });
    return () => unsub();
  }, []);

  // Estimate browser storage
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const usageMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
        setCacheSizeText(`${usageMB} MB`);
      });
    } else {
      setCacheSizeText('~12 MB');
    }
  }, []);

  const handleToggleAutoNext = () => {
    const next = !settings.autoNextEpisode;
    appSettingsStore.updateSettings({ autoNextEpisode: next });
  };

  const handleToggleDownloadWhole = () => {
    const next = !settings.downloadWholeFirst;
    appSettingsStore.updateSettings({ downloadWholeFirst: next });
  };

  const handleFilterChange = (mb: number) => {
    appSettingsStore.updateSettings({ hideClipsBelowMB: mb });
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setCacheSizeText('0 MB');
      setClearedNotice('Video & thumbnail cache cleared successfully');
      setTimeout(() => setClearedNotice(null), 3000);
    } catch {}
    setIsClearing(false);
    setShowClearCacheConfirm(false);
  };

  const handleClearHistory = () => {
    appSettingsStore.clearAllPositions();
    setShowClearHistoryConfirm(false);
    setClearedNotice('Watch history cleared successfully');
    setTimeout(() => setClearedNotice(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#000000] select-none">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#000000]/95 backdrop-blur-xl border-b border-[#1E1F23] px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-[#E3E2E7] tracking-tight">
          Settings
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] text-xs font-semibold text-[#ADC6FF] hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
          >
            <span>Done</span>
            <X className="w-3.5 h-3.5 ml-0.5" />
          </button>
        )}
      </div>

      {/* Main Settings Body */}
      <div className="p-4 sm:p-6 pb-24 max-w-2xl mx-auto w-full space-y-6">
        {clearedNotice && (
          <div className="p-3 rounded-xl bg-[#007AFF]/20 border border-[#007AFF]/40 text-[#ADC6FF] text-xs font-medium flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#007AFF]" />
            <span>{clearedNotice}</span>
          </div>
        )}

        {/* SECTION 1: ACCOUNT (matching iOS SettingsView) */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7] px-2">
            ACCOUNT
          </h3>
          <div className="bg-[#1E1F23] border border-[#292A2E] rounded-2xl divide-y divide-[#292A2E] overflow-hidden">
            <div className="p-4 flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-[#292A2E] border border-[#343539] text-[#ADC6FF] font-bold text-base flex items-center justify-center shadow">
                {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-semibold text-[#E3E2E7] truncate">
                  {user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Telegram User'}
                </h4>
                <p className="text-xs text-[#8B90A0] truncate mt-0.5">
                  {user?.username ? `@${user.username}` : user?.phone_number || 'Connected to Telegram Cloud'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full p-3.5 text-left text-sm font-semibold text-[#FFB4AB] hover:bg-[#410002]/30 transition-colors flex items-center space-x-2.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#FFB4AB]" />
              <span>Log Out of Telegram</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: PLAYBACK */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7] px-2">
            PLAYBACK
          </h3>
          <div className="bg-[#1E1F23] border border-[#292A2E] rounded-2xl divide-y divide-[#292A2E] overflow-hidden">
            {/* Auto Play Next Episode Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#E3E2E7]">
                  Auto-play next episode
                </span>
                <p className="text-xs text-[#8B90A0] mt-0.5">
                  Automatically detects and queues the next episode in a series
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoNext}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  settings.autoNextEpisode ? 'bg-[#007AFF] justify-end' : 'bg-[#343539] justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Download Whole First Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#E3E2E7]">
                  Aggressive video buffering
                </span>
                <p className="text-xs text-[#8B90A0] mt-0.5">
                  Prefetches extra chunks ahead of current playback position
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleDownloadWhole}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                  settings.downloadWholeFirst ? 'bg-[#007AFF] justify-end' : 'bg-[#343539] justify-start'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: FILTERS */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7] px-2">
            FILTERS
          </h3>
          <div className="bg-[#1E1F23] border border-[#292A2E] rounded-2xl overflow-hidden p-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[#E3E2E7]">
                Hide clips below
              </span>
              <p className="text-xs text-[#8B90A0] mt-0.5">
                Exclude short video messages & small attachments
              </p>
            </div>
            <select
              value={settings.hideClipsBelowMB}
              onChange={(e) => handleFilterChange(Number(e.target.value))}
              aria-label="Hide clips below file size"
              className="bg-[#121317] border border-[#292A2E] text-[#ADC6FF] text-xs font-semibold rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value={0} className="bg-[#121317]">Off (Show all)</option>
              <option value={5} className="bg-[#121317]">5 MB</option>
              <option value={10} className="bg-[#121317]">10 MB</option>
              <option value={25} className="bg-[#121317]">25 MB</option>
              <option value={50} className="bg-[#121317]">50 MB</option>
              <option value={100} className="bg-[#121317]">100 MB</option>
            </select>
          </div>
        </div>

        {/* SECTION 4: STORAGE */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7] px-2">
            STORAGE
          </h3>
          <div className="bg-[#1E1F23] border border-[#292A2E] rounded-2xl divide-y divide-[#292A2E] overflow-hidden">
            <div className="p-4 flex items-center justify-between text-sm">
              <span className="text-[#E3E2E7] font-medium">Cache Size</span>
              <span className="text-[#ADC6FF] font-mono text-xs font-bold">
                {cacheSizeText}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowClearCacheConfirm(true)}
              className="w-full p-3.5 text-left text-sm font-semibold text-[#FFB4AB] hover:bg-[#410002]/30 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Clear Video & Thumbnail Cache</span>
              <Trash2 className="w-4 h-4 text-[#FFB4AB]" />
            </button>

            <button
              type="button"
              onClick={() => setShowClearHistoryConfirm(true)}
              className="w-full p-3.5 text-left text-sm font-semibold text-[#FFB4AB] hover:bg-[#410002]/30 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Clear Watch History</span>
              <Trash2 className="w-4 h-4 text-[#FFB4AB]" />
            </button>
          </div>
        </div>

        {/* SECTION 5: INSTALL APP (PWA) */}
        {onInstall && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7] px-2">
              APP INSTALLATION
            </h3>
            <div className="bg-[#1E1F23] border border-[#292A2E] rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <span className="text-sm font-medium text-[#E3E2E7] block">
                  Install TeleStream App
                </span>
                <p className="text-xs text-[#8B90A0] mt-0.5">
                  Launch full-screen native standalone app directly from your home screen or dock
                </p>
              </div>
              <button
                type="button"
                onClick={onInstall}
                className="px-3.5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0062cc] text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center space-x-1.5 flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Install</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 6: ABOUT */}
        <div className="flex flex-col items-center justify-center pt-4 space-y-3 select-none text-center">
          <img
            src={`${import.meta.env.BASE_URL}AppIcon.png`}
            alt="TeleStream"
            className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-[#007AFF]/20"
          />
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">TeleStream Web</h4>
            <p className="text-[11px] text-[#8B90A0] mt-0.5">Version 1.08 (PWA / Web Edition)</p>
          </div>
          <p className="text-[11px] text-[#8B90A0] max-w-xs leading-relaxed">
            Zero-wait virtual streaming client powered by MTProto & Service Worker. Inspired by iOS TeleStream.
          </p>

          <a
            href="https://github.com/NB6RULES/TeleStream"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] border border-[#292A2E] text-xs font-semibold text-[#ADC6FF] hover:text-white transition-colors cursor-pointer"
          >
            <GithubIcon className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#121317] border border-[#292A2E] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#FFB4AB]">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Log Out?</h3>
            </div>
            <p className="text-xs text-[#8B90A0] leading-relaxed">
              This will disconnect your active Telegram MTProto session and clear cached credentials from this device.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#E3E2E7] hover:bg-[#1E1F23] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#410002] hover:bg-[#5c0004] text-[#FFB4AB] transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cache Modal */}
      {showClearCacheConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#121317] border border-[#292A2E] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#FFB4AB]">
              <Trash2 className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Clear Video Cache?</h3>
            </div>
            <p className="text-xs text-[#8B90A0] leading-relaxed">
              This will remove cached thumbnails and media data stored in browser storage.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearCacheConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#E3E2E7] hover:bg-[#1E1F23] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#410002] hover:bg-[#5c0004] text-[#FFB4AB] transition-colors cursor-pointer"
              >
                {isClearing ? 'Clearing...' : 'Clear Cache'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearHistoryConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#121317] border border-[#292A2E] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#FFB4AB]">
              <Trash2 className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Clear Watch History?</h3>
            </div>
            <p className="text-xs text-[#8B90A0] leading-relaxed">
              This will remove all saved playback positions and your continue watching list.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearHistoryConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#E3E2E7] hover:bg-[#1E1F23] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#410002] hover:bg-[#5c0004] text-[#FFB4AB] transition-colors cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
