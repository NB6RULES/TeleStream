import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Film, Play, Pause, RotateCcw, RotateCw, Loader2 } from 'lucide-react';
import { VideoItem } from '../../types/tdlib';
import { AspectRatio } from '../../types/stream';
import { PlayerControls } from './PlayerControls';

import { NetworkStatusOverlay } from '../debug/NetworkStatusOverlay';

interface CustomVideoPlayerProps {
  video: VideoItem;
  onClose: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMkv = video.format === 'mkv' || (video.fileName || '').toLowerCase().endsWith('.mkv');
  const mimeType = isMkv ? 'video/mp4' : video.mimeType || 'video/mp4';

  // Virtual Range Stream URL intercepted by Service Worker for pure instant streaming
  const baseHref = typeof window !== 'undefined'
    ? new URL(import.meta.env.BASE_URL || './', window.location.href).pathname.replace(/\/+$/, '')
    : '';
  const streamUrl = `${baseHref}/api/stream/video?fileId=${video.fileId}&size=${video.size}&mime=${encodeURIComponent(
    mimeType
  )}&name=${encodeURIComponent(video.fileName)}`;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isNetworkStatusOpen, setIsNetworkStatusOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPip, setIsPip] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleHideControls = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setIsBuffering(false);

    const buffered = videoRef.current.buffered;
    if (buffered.length > 0) {
      setBufferedEnd(buffered.end(buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
    videoRef.current.volume = volume;
    setIsBuffering(false);

    // Attempt autoplay; fallback to muted if blocked by browser policy
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          scheduleHideControls();
        })
        .catch((err) => {
          console.warn('[VideoPlayer] Autoplay blocked, attempting muted fallback:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current
              .play()
              .then(() => {
                setIsPlaying(true);
                scheduleHideControls();
              })
              .catch(() => setIsPlaying(false));
          }
        });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('playing', () => { 
      setIsPlaying(true); 
      setIsBuffering(false); 
      scheduleHideControls();
    });
    video.addEventListener('pause', () => {
      setIsPlaying(false);
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    });
    video.addEventListener('waiting', () => setIsBuffering(true));
    video.addEventListener('canplay', () => setIsBuffering(false));
    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    scheduleHideControls();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('playing', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('waiting', () => setIsBuffering(true));
      video.removeEventListener('canplay', () => setIsBuffering(false));
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [scheduleHideControls]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          scheduleHideControls();
        })
        .catch((err) => {
          console.warn('[VideoPlayer] Play error:', err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  }, [scheduleHideControls]);

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    setIsBuffering(true);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    setShowControls(true);
    scheduleHideControls();
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setShowControls(true);
    scheduleHideControls();
  };

  const handleVolumeChange = (vol: number) => {
    if (!videoRef.current) return;
    setVolume(vol);
    videoRef.current.volume = vol;
    setIsMuted(vol === 0);
    if (vol > 0 && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    setShowControls(true);
    scheduleHideControls();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
    setShowControls(true);
    scheduleHideControls();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('[VideoPlayer] Picture-in-Picture failed:', err);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
    setShowControls(true);
    scheduleHideControls();
  };

  const handleMouseMove = () => {
    setShowControls(true);
    scheduleHideControls();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.1));
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, volume, duration, onClose]);

  // Determine CSS class for aspect ratio
  const getObjectFitClass = () => {
    switch (aspectRatio) {
      case 'cover':
        return 'object-cover';
      case 'stretch':
        return 'object-fill w-full h-full';
      case '16:9':
        return 'aspect-video object-cover';
      case '4:3':
        return 'aspect-[4/3] object-cover';
      default:
        return 'object-contain';
    }
  };

  // Handle clicking anywhere on the player backdrop to toggle overlay visibility
  const handleBackdropClick = () => {
    // Only toggle when clicking directly on the backdrop/video area
    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      setShowControls(true);
      scheduleHideControls();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isPip ? 'opacity-0 pointer-events-none' : 'bg-black'
      }`}
    >
      {/* Top Overlay Header */}
      <div
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 sm:p-6 z-20 transition-opacity duration-300 flex items-center justify-between ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-3 max-w-xl truncate">
          <div className="w-9 h-9 rounded-xl bg-telegram-blue/20 border border-telegram-blue/30 text-telegram-blue flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-white text-base truncate tracking-tight">
              {video.title}
            </h3>
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
              <span>{video.chatTitle}</span>
              <span>•</span>
              <span className="uppercase text-telegram-blue font-semibold">{video.format}</span>
              <span>•</span>
              <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-lg"
            title="Close Player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Element Container */}
      <div
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleBackdropClick}
      >
        <video
          ref={videoRef}
          src={streamUrl}
          playsInline
          autoPlay
          className={`max-w-full max-h-full ${getObjectFitClass()}`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            console.log('[VideoPlayer] Stream buffering from Telegram MTProto');
          }}
        />

        {/* Live Buffering Indicator */}
        {isBuffering && (
          <div className="absolute flex flex-col items-center justify-center space-y-2.5 p-5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-white pointer-events-none shadow-2xl">
            <Loader2 className="w-9 h-9 text-telegram-blue animate-spin" />
            <span className="text-xs font-mono text-slate-300">Live Streaming from Telegram...</span>
          </div>
        )}

        {/* Center Play/Pause & Skip Controls Overlay */}
        {!isBuffering && (
          <div
            className={`absolute flex items-center justify-center space-x-6 sm:space-x-10 z-20 transition-all duration-300 ${
              showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 10s Backward */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(-10);
              }}
              className="group flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 border border-white/10 text-white/90 hover:text-white shadow-xl transition-all cursor-pointer backdrop-blur-md"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-rotate-45 transition-transform" />
              <span className="text-[10px] sm:text-xs font-bold font-mono text-slate-300 mt-0.5">10s</span>
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-telegram-blue/90 hover:bg-telegram-blue hover:scale-105 active:scale-95 border border-white/30 flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer backdrop-blur-sm"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
              ) : (
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
              )}
            </button>

            {/* 10s Forward */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip(10);
              }}
              className="group flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-full bg-black/60 hover:bg-black/80 active:scale-90 border border-white/10 text-white/90 hover:text-white shadow-xl transition-all cursor-pointer backdrop-blur-md"
              title="Fast Forward 10 seconds"
            >
              <RotateCw className="w-6 h-6 sm:w-8 sm:h-8 group-hover:rotate-45 transition-transform" />
              <span className="text-[10px] sm:text-xs font-bold font-mono text-slate-300 mt-0.5">10s</span>
            </button>
          </div>
        )}
      </div>

      {/* Custom Bottom Controls */}
      <div className={showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}>
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          bufferedEnd={bufferedEnd}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          aspectRatio={aspectRatio}
          playbackRate={playbackRate}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onTogglePip={togglePip}
          onAspectRatioChange={setAspectRatio}
          onPlaybackRateChange={handlePlaybackRateChange}
          onSkip={handleSkip}
          onToggleNetworkStatus={() => setIsNetworkStatusOpen(!isNetworkStatusOpen)}
        />
      </div>

      <NetworkStatusOverlay 
        isOpen={isNetworkStatusOpen} 
        onClose={() => setIsNetworkStatusOpen(false)} 
        totalSize={video.size || 0}
      />
    </div>
  );
};
