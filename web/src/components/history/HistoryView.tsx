import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  X,
  Play,
  Film,
  MessageSquare,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { ContinueWatchingItem, appSettingsStore } from '../../services/storage/appSettingsStore';
import { VideoItem } from '../../types/tdlib';
import { FuzzySearch } from '../../utils/fuzzySearch';
import { EpisodeDetector } from '../../utils/episodeDetector';

interface HistoryViewProps {
  items: ContinueWatchingItem[];
  onPlayVideo: (video: VideoItem) => void;
  onBrowseChats: () => void;
  onBack?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  items,
  onPlayVideo,
  onBrowseChats,
  onBack,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    return items.filter(
      (item) =>
        FuzzySearch.matches(searchText, item.fileName) ||
        FuzzySearch.matches(searchText, item.chatTitle)
    );
  }, [items, searchText]);

  const handlePlay = (item: ContinueWatchingItem) => {
    const video: VideoItem = {
      id: `history_${item.fileId}`,
      messageId: item.fileId,
      chatId: item.chatId,
      chatTitle: item.chatTitle,
      title: item.fileName.replace(/\.[^/.]+$/, '').replace(/[._]/g, ' '),
      fileName: item.fileName,
      fileId: item.fileId,
      remoteFileId: String(item.fileId),
      size: item.fileSize,
      duration: item.duration,
      width: 1920,
      height: 1080,
      mimeType: item.fileName.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4',
      format: item.fileName.toLowerCase().endsWith('.mkv') ? 'mkv' : 'mp4',
      date: item.lastWatched,
      thumbnailUrl: item.thumbnailUrl,
      supportsStreaming: true,
    };
    onPlayVideo(video);
  };

  const handleDeleteItem = (e: React.MouseEvent, fileId: number) => {
    e.stopPropagation();
    appSettingsStore.clearPosition(fileId);
  };

  const handleClearAll = () => {
    appSettingsStore.clearAllPositions();
    setShowClearConfirm(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatProgressText = (position: number, duration: number) => {
    const posStr = formatTime(Math.floor(position));
    if (duration > 0) {
      const durStr = formatTime(duration);
      return `${posStr} / ${durStr}`;
    }
    return `${posStr} watched`;
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#000000] select-none">
      {/* Top Header matching iOS HistoryView */}
      <div className="sticky top-0 z-20 bg-[#000000]/95 backdrop-blur-xl border-b border-[#1E1F23] px-4 sm:px-6 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-1.5 rounded-xl bg-[#1E1F23] hover:bg-[#292A2E] text-[#8B90A0] hover:text-[#E3E2E7] transition-colors cursor-pointer mr-1"
                title="Back to Chats"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Clock className="w-5 h-5 text-[#ADC6FF]" />
            <h2 className="text-lg sm:text-xl font-bold text-[#E3E2E7] tracking-tight">
              Watch History
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1E1F23] text-[#ADC6FF] font-semibold">
              {items.length}
            </span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-xs font-semibold text-[#FFB4AB] hover:text-[#FFB4AB]/80 hover:bg-[#410002]/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search History Bar */}
        {items.length > 0 && (
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#8B90A0] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-[#1E1F23] text-[#E3E2E7] placeholder-[#8B90A0] text-sm pl-10 pr-9 py-2 rounded-xl border border-transparent focus:border-[#007AFF] focus:bg-[#16171B] outline-none transition-all"
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
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 pb-24 max-w-4xl mx-auto w-full">
        {items.length === 0 ? (
          /* Empty State (matching iOS HistoryView lines 145-185) */
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 space-y-5">
            <div className="w-20 h-20 rounded-full bg-[#1E1F23] border border-[#292A2E] flex items-center justify-center text-[#ADC6FF] shadow-xl">
              <Clock className="w-9 h-9 stroke-[1.5]" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-bold text-white">No Watch History</h3>
              <p className="text-xs text-[#8B90A0] leading-relaxed">
                Videos you start streaming will automatically appear here so you can easily resume right where you left off.
              </p>
            </div>

            <button
              type="button"
              onClick={onBrowseChats}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-[#007AFF]/25 transition-all cursor-pointer btn-press"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Browse Chats</span>
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-[#8B90A0]">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No matching videos in history</p>
          </div>
        ) : (
          /* History Card List (matching iOS HistoryCard.swift) */
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const episodeInfo = EpisodeDetector.detect(item.fileName);
              const progress = item.duration > 0 ? Math.min(1, Math.max(0.02, item.position / item.duration)) : 0.5;

              return (
                <div
                  key={item.fileId}
                  onClick={() => handlePlay(item)}
                  className="flex items-center space-x-4 p-3 rounded-2xl bg-[#121317] hover:bg-[#1A1B1F] border border-[#292A2E] hover:border-[#007AFF]/40 cursor-pointer transition-all duration-200 btn-press group shadow-md"
                >
                  {/* Thumbnail with Mini Progress Bar */}
                  <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-[#16171B] flex-shrink-0 border border-[#292A2E]">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8B90A0]">
                        <Film className="w-6 h-6 opacity-50" />
                      </div>
                    )}

                    {/* Centered Mini Play Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center text-white shadow">
                        <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                      </div>
                    </div>

                    {/* Mini Bottom Progress Bar */}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-[#007AFF]"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Information Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        {episodeInfo && (
                          <span className="px-2 py-0.5 rounded-md bg-[#007AFF] text-white font-bold text-[10px] tracking-tight">
                            {episodeInfo.displayName}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[#ADC6FF] truncate">
                          {item.chatTitle}
                        </span>
                      </div>

                      {/* Remove from history button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(e, item.fileId)}
                        className="p-1.5 rounded-lg text-[#8B90A0] hover:text-[#FFB4AB] hover:bg-[#410002]/30 transition-colors ml-2"
                        title="Remove from history"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-medium text-[#E3E2E7] truncate group-hover:text-white transition-colors">
                      {item.fileName}
                    </h4>

                    {/* Progress timestamp & relative watched time */}
                    <div className="flex items-center space-x-2 text-[12px] text-[#8B90A0]">
                      <span>{formatProgressText(item.position, item.duration)}</span>
                      <span className="text-[#343539]">•</span>
                      <span>{formatRelativeTime(item.lastWatched)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#121317] border border-[#292A2E] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-[#FFB4AB]">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Clear Watch History?</h3>
            </div>
            <p className="text-xs text-[#8B90A0] leading-relaxed">
              This will remove all saved playback progress and watched videos from your local device.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#E3E2E7] hover:bg-[#1E1F23] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#410002] hover:bg-[#5c0004] text-[#FFB4AB] transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
