import React, { useEffect, useState } from 'react';
import { Play, Film, Clock, HardDrive, Sparkles, Layers } from 'lucide-react';
import { VideoItem } from '../../types/tdlib';
import { tdlibClient } from '../../services/tdlib/tdlibClient';

interface VideoCardProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(video.thumbnailUrl || null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thumbUrl || !cardRef.current) return;

    let mounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          tdlibClient.getThumbnail(video.messageId).then((url) => {
            if (mounted && url) {
              setThumbUrl(url);
            }
          });
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(cardRef.current);

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [video.messageId, thumbUrl]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const is4K = video.width >= 3840 || video.height >= 2160;
  const is1080p = (video.width >= 1920 || video.height >= 1080) && !is4K;
  const isMkv = video.format === 'mkv';

  return (
    <div
      ref={cardRef}
      onClick={() => onPlay(video)}
      className="group relative bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-telegram-blue/40 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-telegram-blue/10 hover:-translate-y-0.5"
    >
      {/* Thumbnail Banner */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600">
            <Film className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-[11px] font-mono uppercase tracking-wider">Video Stream</span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
          <div className="w-13 h-13 rounded-full bg-telegram-blue text-white flex items-center justify-center shadow-xl shadow-telegram-blue/40 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 ml-0.5 fill-white" />
          </div>
        </div>

        {/* Duration Badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-mono text-white flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-300" />
            <span>{formatDuration(video.duration)}</span>
          </div>
        )}

        {/* Format & Quality Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
          {isMkv ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span>MKV</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-telegram-blue/90 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
              MP4
            </span>
          )}

          {is4K && (
            <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
              4K UHD
            </span>
          )}
          {is1080p && (
            <span className="px-2 py-0.5 rounded-md bg-sky-600/90 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm">
              1080p
            </span>
          )}
        </div>
      </div>

      {/* Video Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-telegram-blue transition-colors">
            {video.title}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {video.caption || video.fileName}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatFileSize(video.size)}</span>
          </span>
          <span className="text-telegram-blue flex items-center space-x-1 group-hover:underline">
            <Sparkles className="w-3 h-3" />
            <span>Instant Stream</span>
          </span>
        </div>
      </div>
    </div>
  );
};
