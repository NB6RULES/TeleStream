import React from 'react';
import { Search, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';
import { TDLibUser } from '../../types/tdlib';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface NavbarProps {
  user: TDLibUser | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout: () => void;
  onRefresh?: () => void;
  onBackToHome?: () => void;
  isRefreshing?: boolean;
  isServiceWorkerReady?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  searchQuery,
  onSearchChange,
  onLogout,
  onRefresh,
  onBackToHome,
  isRefreshing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-2 sm:px-4 lg:px-6 py-2.5">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Back Button & Brand Logo positioned close to the edge */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="py-1.5 px-2 sm:px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Return to Website"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Website</span>
            </button>
          )}

          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={onBackToHome}
          >
            <img
              src={`${import.meta.env.BASE_URL}AppIcon.png`}
              alt="TeleStream Logo"
              className="w-8 h-8 rounded-xl shadow-md shadow-telegram-blue/20"
            />
            <span className="font-bold text-white tracking-tight text-base sm:text-lg leading-none">
              TeleStream
            </span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search videos, movies, series..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 sm:py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all"
            />
          </div>
        </div>

        {/* Right: Refresh, GitHub, User Profile & Actions positioned close to the edge */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh videos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* GitHub Icon Link */}
          <a
            href="https://github.com/NB6RULES/TeleStream"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="View on GitHub"
          >
            <GithubIcon className="w-4 h-4" />
          </a>

          {user && (
            <div className="flex items-center space-x-2 sm:space-x-2.5 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-telegram-blue/20 to-sky-500/20 border border-telegram-blue/30 text-telegram-blue font-semibold text-xs flex items-center justify-center shadow-sm">
                {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-xs font-semibold text-white">
                  {user.first_name} {user.last_name || ''}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {user.username ? `@${user.username}` : user.phone_number || ''}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Disconnect & Clear Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
