import React from 'react';
import { RefreshCw, Settings, LogOut, Download } from 'lucide-react';
import { TDLibUser } from '../../types/tdlib';

const GithubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface NavbarProps {
  user: TDLibUser | null;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  onInstall?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onRefresh,
  onOpenSettings,
  onLogout,
  onInstall,
  isRefreshing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#000000]/95 backdrop-blur-xl border-b border-[#1E1F23] px-3 sm:px-5 py-2.5 select-none">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}AppIcon.png`}
            alt="TeleStream Logo"
            className="w-7 h-7 rounded-xl object-cover shadow-md shadow-[#007AFF]/20"
          />
          <div className="leading-tight">
            <span className="font-bold text-[#E3E2E7] tracking-tight text-base sm:text-lg block">
              TeleStream
            </span>
          </div>
        </div>

        {/* Right Actions: Install, Refresh, GitHub, Settings, User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
          {/* Subtle Install App Button */}
          {onInstall && (
            <button
              type="button"
              onClick={onInstall}
              className="p-2 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] border border-[#292A2E] text-[#8B90A0] hover:text-[#ADC6FF] transition-all cursor-pointer btn-press flex items-center space-x-1.5"
              title="Install TeleStream App"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-semibold hidden lg:inline text-[#E3E2E7]">Install</span>
            </button>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] border border-[#292A2E] text-[#8B90A0] hover:text-[#E3E2E7] transition-all cursor-pointer btn-press"
              title="Refresh Chats & Videos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ADC6FF]' : ''}`} />
            </button>
          )}

          {/* GitHub Icon Link (Hidden on mobile, available in Settings) */}
          <a
            href="https://github.com/NB6RULES/TeleStream"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex p-2 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] border border-[#292A2E] text-[#8B90A0] hover:text-[#E3E2E7] transition-all cursor-pointer btn-press"
            title="View on GitHub"
          >
            <GithubIcon className="w-4 h-4" />
          </a>

          {/* Settings Button in Header (matching iOS toolbar) */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] border border-[#292A2E] text-[#8B90A0] hover:text-[#ADC6FF] transition-all cursor-pointer btn-press flex items-center space-x-1.5"
              title="Open Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline text-[#E3E2E7]">Settings</span>
            </button>
          )}

          {/* User Profile Info */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 border-l border-[#1E1F23]">
              <div
                onClick={onOpenSettings}
                className="w-8 h-8 rounded-full bg-[#1E1F23] border border-[#292A2E] text-[#ADC6FF] font-semibold text-xs flex items-center justify-center shadow-sm cursor-pointer hover:border-[#007AFF] transition-colors"
                title={`${user.first_name} ${user.last_name || ''} - View Profile & Settings`}
              >
                {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <div
                onClick={onOpenSettings}
                className="hidden sm:block text-left leading-tight cursor-pointer"
              >
                <div className="text-xs font-semibold text-[#E3E2E7] hover:text-white transition-colors truncate max-w-[110px]">
                  {user.first_name} {user.last_name || ''}
                </div>
                <div className="text-[10px] text-[#8B90A0] truncate max-w-[110px]">
                  {user.username ? `@${user.username}` : user.phone_number || 'Online'}
                </div>
              </div>

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-[#8B90A0] hover:text-[#FFB4AB] hover:bg-[#410002]/30 transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
