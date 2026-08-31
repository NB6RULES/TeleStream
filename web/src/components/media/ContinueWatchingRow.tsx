import React from 'react';
import { Play, Clock, Film } from 'lucide-react';
import { ContinueWatchingItem } from '../../services/storage/appSettingsStore';
import { VideoItem } from '../../types/tdlib';

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onPlayItem: (video: VideoItem) => void;
}

export const ContinueWatchingRow: React.FC<ContinueWatchingRowProps> = ({
  items,
  onPlayItem,
}) => {
  if (!items || items.length === 0) return null;

  const formatTimeRemaining = (item: ContinueWatchingItem) => {
    const remaining = Math.max(0, item.duration - Math.floor(item.position));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s < 10 ? '0' : ''}${s} left`;
  };

  const handleClick = (item: ContinueWatchingItem) => {
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
    onPlayItem(video);
  };

  return (
    <div className="w-full py-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-[#ADC6FF]" />
          <h3 className="text-xs font-semibold tracking-wider uppercase text-[#C1C6D7]">
            RECENTS
          </h3>
        </div>
        <span className="text-xs text-[#8B90A0] font-mono">
          {items.length} {items.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-center space-x-3 overflow-x-auto px-4 sm:px-6 pb-2 scrollbar-none snap-x select-none">
        {items.map((item) => {
          const progress = item.duration > 0 ? Math.min(1, Math.max(0.02, item.position / item.duration)) : 0.5;

          return (
            <div
              key={item.fileId}
              onClick={() => handleClick(item)}
              className="flex-shrink-0 w-44 sm:w-48 cursor-pointer group btn-press snap-start"
            >
              {/* Card Thumbnail */}
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[#121317] border border-[#292A2E] group-hover:border-[#007AFF]/60 transition-colors shadow-md">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.fileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#16171B] text-[#8B90A0]">
                    <Film className="w-7 h-7 opacity-60" />
                  </div>
                )}

                {/* Dark Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Centered Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-[#007AFF] group-hover:scale-110 transition-all shadow-lg">
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                  </div>
                </div>

                {/* Time Remaining Pill */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-medium text-white shadow">
                  {formatTimeRemaining(item)}
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-[#ADC6FF] transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Title & Chat Name */}
              <div className="mt-1.5 px-0.5">
                <h4 className="text-xs font-semibold text-[#E3E2E7] truncate group-hover:text-[#ADC6FF] transition-colors leading-tight">
                  {item.fileName}
                </h4>
                <p className="text-[11px] text-[#8B90A0] truncate mt-0.5 leading-none">
                  {item.chatTitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
