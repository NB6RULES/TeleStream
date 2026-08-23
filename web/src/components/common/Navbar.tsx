import React from 'react';
import { Search, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';
import { TDLibUser } from '../../types/tdlib';

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
              src="/AppIcon.png"
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

        {/* Right: Refresh, User Profile & Actions positioned close to the edge */}
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
