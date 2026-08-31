import React, { useState, useMemo, useEffect } from 'react';
import { VideoItem } from '../../types/tdlib';
import { VideoCard } from './VideoCard';
import { ContinueWatchingRow } from './ContinueWatchingRow';
import {
  Film,
  Search,
  X,
  Filter,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react';
import { FuzzySearch } from '../../utils/fuzzySearch';
import { appSettingsStore, ContinueWatchingItem } from '../../services/storage/appSettingsStore';

export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'size_desc'
  | 'size_asc'
  | 'duration_desc'
  | 'duration_asc'
  | 'name_asc'
  | 'name_desc';

interface VideoGridProps {
  videos: VideoItem[];
  chatTitle: string;
  chatId?: number | null;
  isLoading: boolean;
  onPlayVideo: (video: VideoItem) => void;
  continueWatchingItems?: ContinueWatchingItem[];
  onBack?: () => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  chatTitle,
  chatId,
  isLoading,
  onPlayVideo,
  continueWatchingItems = [],
  onBack,
}) => {
  const [searchText, setSearchText] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [sizeFilterMB, setSizeFilterMB] = useState<number>(() =>
    appSettingsStore.getSettings().hideClipsBelowMB
  );

  useEffect(() => {
    const unsub = appSettingsStore.subscribe(() => {
      setSizeFilterMB(appSettingsStore.getSettings().hideClipsBelowMB);
    });
    return () => unsub();
  }, []);

  const handleSizeFilterChange = (mb: number) => {
    setSizeFilterMB(mb);
    appSettingsStore.updateSettings({ hideClipsBelowMB: mb });
  };

  // Filter Continue Watching items for current chat
  const chatContinueWatching = useMemo(() => {
    if (!chatId) return continueWatchingItems;
    return continueWatchingItems.filter((item) => item.chatId === chatId);
  }, [continueWatchingItems, chatId]);

  // Filter & Sort videos
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos];

    // Filter by size threshold
    if (sizeFilterMB > 0) {
      const minBytes = sizeFilterMB * 1024 * 1024;
      result = result.filter((v) => v.size >= minBytes);
    }

    // Fuzzy search
    if (searchText.trim()) {
      result = result
        .filter((v) => {
          const target = `${v.title} ${v.fileName || ''} ${v.caption || ''}`;
          return FuzzySearch.matches(searchText, target);
        })
        .sort((a, b) => {
          const targetA = `${a.title} ${a.fileName || ''}`;
          const targetB = `${b.title} ${b.fileName || ''}`;
          return FuzzySearch.score(searchText, targetB) - FuzzySearch.score(searchText, targetA);
        });
      return result;
    }

    // Sort by option and order
    result.sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return (b.date || 0) - (a.date || 0);
        case 'date_asc':
          return (a.date || 0) - (b.date || 0);
        case 'size_desc':
          return (b.size || 0) - (a.size || 0);
        case 'size_asc':
          return (a.size || 0) - (b.size || 0);
        case 'duration_desc':
          return (b.duration || 0) - (a.duration || 0);
        case 'duration_asc':
          return (a.duration || 0) - (b.duration || 0);
        case 'name_asc':
          return (a.fileName || a.title || '').localeCompare(b.fileName || b.title || '');
        case 'name_desc':
          return (b.fileName || b.title || '').localeCompare(a.fileName || a.title || '');
        default:
          return (b.date || 0) - (a.date || 0);
      }
    });

    return result;
  }, [videos, sizeFilterMB, searchText, sortOption]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#000000] select-none">
      {/* Top Header & Search Bar (matching iOS ChatDetailView) - Fixed at top */}
      <div className="flex-shrink-0 bg-[#000000] border-b border-[#1E1F23] px-3.5 sm:px-6 py-2.5 sm:py-3.5 space-y-2.5 z-10">
        <div className="flex items-center justify-between gap-2">
          {/* Chat Title & Info */}
          <div className="flex items-center space-x-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-1.5 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] text-[#8B90A0] hover:text-[#E3E2E7] transition-colors cursor-pointer mr-0.5 flex-shrink-0"
                title="Back to Chats"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-xl font-bold text-[#E3E2E7] tracking-tight truncate">
                  {chatTitle}
                </h2>
                <span className="text-[11px] sm:text-xs px-2 py-0.2 sm:py-0.5 rounded-full bg-[#1E1F23] text-[#ADC6FF] font-semibold flex-shrink-0">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Controls: Size Filter & Unified Sort Selector */}
          <div className="hidden sm:flex items-center space-x-2 flex-shrink-0">
            {/* Size Threshold Filter */}
            <div className="flex items-center space-x-1.5 bg-[#121317] border border-[#292A2E] px-2.5 py-1.5 rounded-xl text-xs text-[#8B90A0]">
              <Filter className="w-3.5 h-3.5 text-[#ADC6FF]" />
              <span className="text-[#8B90A0] font-medium">Min:</span>
              <select
                value={sizeFilterMB}
                onChange={(e) => handleSizeFilterChange(Number(e.target.value))}
                aria-label="Filter minimum file size"
                className="bg-transparent text-[#E3E2E7] font-medium outline-none cursor-pointer text-xs pr-1"
              >
                <option value={0} className="bg-[#121317]">All Sizes</option>
                <option value={5} className="bg-[#121317]">≥ 5 MB</option>
                <option value={10} className="bg-[#121317]">≥ 10 MB</option>
                <option value={25} className="bg-[#121317]">≥ 25 MB</option>
                <option value={50} className="bg-[#121317]">≥ 50 MB</option>
                <option value={100} className="bg-[#121317]">≥ 100 MB</option>
              </select>
            </div>

            {/* Unified Sort by Selector */}
            <div className="flex items-center space-x-1.5 bg-[#121317] border border-[#292A2E] px-2.5 py-1.5 rounded-xl text-xs text-[#8B90A0]">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#ADC6FF]" />
              <span className="text-[#8B90A0] font-medium">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-label="Sort videos by"
                className="bg-transparent text-[#E3E2E7] font-medium outline-none cursor-pointer text-xs pr-1"
              >
                <option value="date_desc" className="bg-[#121317]">Recent (Newest)</option>
                <option value="date_asc" className="bg-[#121317]">Recent (Oldest)</option>
                <option value="size_desc" className="bg-[#121317]">Size (Largest)</option>
                <option value="size_asc" className="bg-[#121317]">Size (Smallest)</option>
                <option value="duration_desc" className="bg-[#121317]">Duration (Longest)</option>
                <option value="duration_asc" className="bg-[#121317]">Duration (Shortest)</option>
                <option value="name_asc" className="bg-[#121317]">Name (A → Z)</option>
                <option value="name_desc" className="bg-[#121317]">Name (Z → A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Video Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#8B90A0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search videos, episodes..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-[#1E1F23] text-[#E3E2E7] placeholder-[#8B90A0] text-sm pl-10 pr-9 py-1.5 sm:py-2 rounded-xl border border-transparent focus:border-[#007AFF] focus:bg-[#16171B] outline-none transition-all placeholder:truncate"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#8B90A0] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Filters Row (Compact horizontal row with Min Size & Sort By) */}
        <div className="flex sm:hidden items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 text-xs">
          {/* Min Size Dropdown */}
          <div className="flex items-center space-x-1 bg-[#121317] border border-[#292A2E] px-2.5 py-1 rounded-xl text-[#8B90A0] flex-shrink-0">
            <Filter className="w-3 h-3 text-[#ADC6FF]" />
            <select
              value={sizeFilterMB}
              onChange={(e) => handleSizeFilterChange(Number(e.target.value))}
              aria-label="Filter minimum file size"
              className="bg-transparent text-[#E3E2E7] font-medium outline-none cursor-pointer text-xs"
            >
              <option value={0} className="bg-[#121317]">All Sizes</option>
              <option value={5} className="bg-[#121317]">≥ 5 MB</option>
              <option value={10} className="bg-[#121317]">≥ 10 MB</option>
              <option value={25} className="bg-[#121317]">≥ 25 MB</option>
              <option value={50} className="bg-[#121317]">≥ 50 MB</option>
              <option value={100} className="bg-[#121317]">≥ 100 MB</option>
            </select>
          </div>

          {/* Unified Sort by Selector on Mobile */}
          <div className="flex items-center space-x-1 bg-[#121317] border border-[#292A2E] px-2.5 py-1 rounded-xl text-[#8B90A0] flex-shrink-0">
            <ArrowUpDown className="w-3 h-3 text-[#ADC6FF]" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Sort videos by"
              className="bg-transparent text-[#E3E2E7] font-medium outline-none cursor-pointer text-xs"
            >
              <option value="date_desc" className="bg-[#121317]">Recent (Newest)</option>
              <option value="date_asc" className="bg-[#121317]">Recent (Oldest)</option>
              <option value="size_desc" className="bg-[#121317]">Size (Largest)</option>
              <option value="size_asc" className="bg-[#121317]">Size (Smallest)</option>
              <option value="duration_desc" className="bg-[#121317]">Duration (Longest)</option>
              <option value="duration_asc" className="bg-[#121317]">Duration (Shortest)</option>
              <option value="name_asc" className="bg-[#121317]">Name (A → Z)</option>
              <option value="name_desc" className="bg-[#121317]">Name (Z → A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Continue Watching / Recents Row (matching iOS ChatListView lines 53-54) */}
        {!searchText && chatContinueWatching.length > 0 && (
          <div className="pt-3 border-b border-[#1E1F23]/60">
            <ContinueWatchingRow items={chatContinueWatching} onPlayItem={onPlayVideo} />
          </div>
        )}

        {/* Main Video Stream Grid */}
        <div className="p-3.5 sm:p-6 pb-24">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="aspect-video rounded-2xl bg-[#1A1B1F] border border-[#292A2E] animate-pulse"
                />
              ))}
            </div>
          ) : filteredAndSortedVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#1E1F23] border border-[#292A2E] flex items-center justify-center text-[#8B90A0]">
                <Film className="w-8 h-8 opacity-60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#E3E2E7]">
                  {searchText ? 'No matching videos' : 'No videos in this chat'}
                </h3>
                <p className="text-xs text-[#8B90A0] max-w-sm">
                  {searchText
                    ? 'Try checking for typos or clear your search query.'
                    : 'Forward or upload video files to this chat or check Saved Messages.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
              {filteredAndSortedVideos.map((video) => (
                <VideoCard key={video.id} video={video} onPlay={onPlayVideo} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
