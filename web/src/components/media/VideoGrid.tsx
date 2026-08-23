import React, { useState } from 'react';
import { VideoItem } from '../../types/tdlib';
import { VideoCard } from './VideoCard';
import { Film, ArrowUpDown, ChevronLeft } from 'lucide-react';

interface VideoGridProps {
  videos: VideoItem[];
  chatTitle: string;
  isLoading: boolean;
  onPlayVideo: (video: VideoItem) => void;
  onBack?: () => void;
  isChatSelected?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  videos,
  chatTitle,
  isLoading,
  onPlayVideo,
  onBack,
  isChatSelected = false,
}) => {
  const [sortBy, setSortBy] = useState<'recent' | 'size' | 'duration'>('recent');

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'size') return b.size - a.size;
    if (sortBy === 'duration') return b.duration - a.duration;
    return b.date - a.date;
  });

  return (
    <div className={`flex-1 flex-col h-[calc(100vh-65px)] overflow-y-auto bg-slate-950/40 p-4 lg:p-8 ${!isChatSelected ? 'hidden md:flex' : 'flex'}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="md:hidden p-1.5 -ml-1.5 mr-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-white tracking-tight">{chatTitle}</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {videos.length} Videos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-wait virtual streaming powered by TDLib & Service Worker range requests
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <span className="text-xs text-slate-400 flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </span>
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'recent' ? 'bg-telegram-blue text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recent
            </button>
            <button
              type="button"
              onClick={() => setSortBy('size')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'size' ? 'bg-telegram-blue text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Size
            </button>
            <button
              type="button"
              onClick={() => setSortBy('duration')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                sortBy === 'duration' ? 'bg-telegram-blue text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Duration
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sortedVideos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No videos in this chat</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Select another chat from the left sidebar or forward video files to Saved Messages.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedVideos.map((video) => (
            <VideoCard key={video.id} video={video} onPlay={onPlayVideo} />
          ))}
        </div>
      )}
    </div>
  );
};
