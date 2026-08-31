import React, { useEffect, useState } from 'react';
import { Play, Film, Layers } from 'lucide-react';
import { VideoItem } from '../../types/tdlib';
import { tdlibClient } from '../../services/tdlib/tdlibClient';
import { EpisodeDetector } from '../../utils/episodeDetector';
import { appSettingsStore } from '../../services/storage/appSettingsStore';

interface VideoCardProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(video.thumbnailUrl || null);
  const [playbackPos, setPlaybackPos] = useState<number | undefined>(() =>
    appSettingsStore.getPosition(video.fileId)
  );
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Subscribe to playback progress updates
  useEffect(() => {
    const unsub = appSettingsStore.subscribe(() => {
      setPlaybackPos(appSettingsStore.getPosition(video.fileId));
    });
    return () => unsub();
  }, [video.fileId]);

  // Lazy load thumbnail
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
      { rootMargin: '120px' }
    );

    observer.observe(cardRef.current);

    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [video.messageId, thumbUrl]);

  // Port iOS Episode Detector
  const episodeInfo = React.useMemo(() => {
    return EpisodeDetector.detect(video.fileName || video.title);
  }, [video.fileName, video.title]);

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
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const is4K = video.width >= 3840 || video.height >= 2160;
  const is1080p = (video.width >= 1920 || video.height >= 1080) && !is4K;
  const is720p = (video.width >= 1280 || video.height >= 720) && !is1080p && !is4K;
  const isMkv = video.format === 'mkv' || (video.fileName || '').toLowerCase().endsWith('.mkv');

  // Watch progress calculation (matching iOS VideoCard.swift)
  const watchProgress = React.useMemo(() => {
    if (!playbackPos || !video.duration || video.duration <= 0) return null;
    const p = playbackPos / video.duration;
    return p > 0.01 && p < 0.99 ? p : null;
  }, [playbackPos, video.duration]);

  return (
    <div
      ref={cardRef}
      onClick={() => onPlay(video)}
      className="group relative bg-[#1A1B1F] hover:bg-[#23242A] border border-[#292A2E] hover:border-[#007AFF]/40 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-0.5 select-none btn-press"
    >
      {/* 16:9 Aspect Ratio Thumbnail Container (iOS VideoCard standard) */}
      <div className="relative aspect-video w-full bg-[#121317] overflow-hidden">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#121317] to-[#1E1F23] text-[#8B90A0]">
            <Film className="w-10 h-10 mb-2 opacity-40" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8B90A0]">
              {isMkv ? 'MKV Stream' : 'Video Stream'}
            </span>
          </div>
        )}

        {/* Linear Gradient Layer (iOS style) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 group-hover:via-black/10 transition-colors" />

        {/* Centered Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl group-hover:bg-[#007AFF] group-hover:scale-110 transition-all duration-200">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>

        {/* Top Floating Badges (Resolution & Episode detector) */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
            {is4K && (
              <span className="px-2 py-0.5 rounded-full bg-[#ADC6FF]/20 text-[#ADC6FF] border border-[#ADC6FF]/30 font-semibold text-[10px] tracking-wide backdrop-blur-md">
                4K HDR
              </span>
            )}
            {is1080p && (
              <span className="px-2 py-0.5 rounded-full bg-[#ADC6FF]/20 text-[#ADC6FF] border border-[#ADC6FF]/30 font-semibold text-[10px] tracking-wide backdrop-blur-md">
                1080p
              </span>
            )}
            {is720p && (
              <span className="px-2 py-0.5 rounded-full bg-[#ADC6FF]/20 text-[#ADC6FF] border border-[#ADC6FF]/30 font-semibold text-[10px] tracking-wide backdrop-blur-md">
                720p
              </span>
            )}

            {/* Episode Detector Badge (Ported from iOS) */}
            {episodeInfo && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF]/80 text-white font-bold text-[11px] tracking-tight shadow-md backdrop-blur-md">
                {episodeInfo.displayName}
              </span>
            )}
          </div>

          {/* Format Badge */}
          {isMkv ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/90 text-black font-bold text-[10px] uppercase tracking-wider shadow flex items-center space-x-1 backdrop-blur-md">
              <Layers className="w-3 h-3" />
              <span>MKV</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-[#007AFF]/90 text-white font-bold text-[10px] uppercase tracking-wider shadow backdrop-blur-md">
              MP4
            </span>
          )}
        </div>

        {/* Bottom Bar: Progress Bar & Duration Capsule */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          {/* Progress Bar Capsule */}
          {watchProgress !== null ? (
            <div className="flex-1 mr-3 h-1.5 rounded-full bg-white/30 overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-[#ADC6FF] rounded-full transition-all duration-300"
                style={{ width: `${watchProgress * 100}%` }}
              />
            </div>
          ) : (
            <div />
          )}

          {/* Duration Capsule */}
          {video.duration > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-mono text-white font-medium shadow ml-auto">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
      </div>

      {/* Details Container (matching iOS VideoCard.swift layout) */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h4 className="font-semibold text-[#E3E2E7] text-[14px] sm:text-[15px] line-clamp-2 break-words group-hover:text-[#ADC6FF] transition-colors leading-snug">
            {video.fileName || video.title}
          </h4>

          {/* Metadata Row: File Size & Dimensions */}
          <div className="flex items-center space-x-2 text-[13px] text-[#C1C6D7] mt-1 font-medium">
            {video.size > 0 && <span>{formatFileSize(video.size)}</span>}
            {video.width > 0 && video.height > 0 && (
              <>
                <span className="text-[#343539]">•</span>
                <span>
                  {video.width}×{video.height}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Date & Caption Snippet */}
        <div className="space-y-1 pt-1 border-t border-[#292A2E]/60">
          <p className="text-[12px] text-[#8B90A0]">
            {formatTimestamp(video.date)}
          </p>

          {video.caption && (
            <p className="text-[12px] text-[#8B90A0] line-clamp-2 leading-relaxed italic">
              {video.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
