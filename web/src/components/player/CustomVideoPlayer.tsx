import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Film, Play, Loader2 } from 'lucide-react';
import { VideoItem } from '../../types/tdlib';
import { AspectRatio } from '../../types/stream';
import { PlayerControls } from './PlayerControls';
import { NetworkStatusOverlay } from '../debug/NetworkStatusOverlay';
import { appSettingsStore } from '../../services/storage/appSettingsStore';

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
  const streamUrl = `/api/stream/video?fileId=${video.fileId}&size=${video.size}&mime=${encodeURIComponent(
    mimeType
  )}&name=${encodeURIComponent(video.fileName || video.title || 'video.mp4')}`;

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
        })
        .catch((err) => {
          console.warn('[VideoPlayer] Autoplay blocked, attempting muted fallback:', err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          }
        });
    }
  };

  // Save playback position on unmount / pause
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 2) {
        appSettingsStore.savePosition({
          fileId: video.fileId,
          fileSize: video.size,
          position: videoRef.current.currentTime,
          fileName: video.fileName || video.title,
          chatId: video.chatId,
          chatTitle: video.chatTitle,
          duration: videoRef.current.duration || video.duration || 0,
          thumbnailUrl: video.thumbnailUrl,
        });
      }
    };
  }, [video]);

  // Picture-in-Picture event sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);

    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn('[VideoPlayer] Play error:', err);
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (videoRef.current.currentTime > 2) {
        appSettingsStore.savePosition({
          fileId: video.fileId,
          fileSize: video.size,
          position: videoRef.current.currentTime,
          fileName: video.fileName || video.title,
          chatId: video.chatId,
          chatTitle: video.chatTitle,
          duration: videoRef.current.duration || video.duration || 0,
          thumbnailUrl: video.thumbnailUrl,
        });
      }
    }
  }, [video]);

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    setIsBuffering(true);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
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
        setIsPip(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.warn('[VideoPlayer] Picture-in-Picture failed:', err);
    }
  };

  const isInteractingWithControlsRef = useRef(false);

  const scheduleControlsHide = useCallback((delay = 3500) => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !isInteractingWithControlsRef.current) {
        setShowControls(false);
      }
    }, delay);
  }, []);

  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    scheduleControlsHide(3500);
  }, [scheduleControlsHide]);

  // Fullscreen change synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      setShowControls(true);
      scheduleControlsHide(3500);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [scheduleControlsHide]);

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
  };

  const handleMouseMove = () => {
    handleUserActivity();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!showControls) {
      e.stopPropagation();
      setShowControls(true);
      scheduleControlsHide(3500);
      return;
    }
    togglePlay();
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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleUserActivity}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isPip ? 'opacity-0 pointer-events-none' : 'bg-black'
      }`}
    >
      {/* Top Overlay Header */}
      <div
        onMouseEnter={() => {
          isInteractingWithControlsRef.current = true;
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          setShowControls(true);
        }}
        onMouseLeave={() => {
          isInteractingWithControlsRef.current = false;
          scheduleControlsHide(2500);
        }}
        className={`absolute inset-x-0 top-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent p-4 sm:p-6 z-30 transition-opacity duration-200 flex items-center justify-between ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-3 max-w-xl truncate">
          <div className="w-9 h-9 rounded-xl bg-[#007AFF]/20 border border-[#007AFF]/30 text-[#007AFF] flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h3 className="font-bold text-white text-base truncate tracking-tight">
              {video.title}
            </h3>
            <div className="flex items-center space-x-2 text-xs text-[#8B90A0] font-mono">
              <span>{video.chatTitle}</span>
              <span>•</span>
              <span className="uppercase text-[#007AFF] font-semibold">{video.format}</span>
              <span>•</span>
              <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-[#121317]/90 hover:bg-[#1E1F23] border border-[#292A2E] text-[#8B90A0] hover:text-white transition-all cursor-pointer shadow-lg"
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
          onPlay={() => {
            setIsPlaying(true);
            scheduleControlsHide(3000);
          }}
          onPause={() => {
            setIsPlaying(false);
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          }}
          onError={() => {
            console.log('[VideoPlayer] Stream buffering from Telegram MTProto');
          }}
        />

        {/* Live Buffering Indicator */}
        {isBuffering && (
          <div className="absolute flex flex-col items-center justify-center space-y-2.5 p-5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-white pointer-events-none shadow-2xl">
            <Loader2 className="w-9 h-9 text-[#007AFF] animate-spin" />
            <span className="text-xs font-mono text-slate-300">Live Streaming from Telegram...</span>
          </div>
        )}

        {/* Interactive Center Play Button on Pause */}
        {!isPlaying && !isBuffering && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="absolute w-20 h-20 rounded-full bg-[#007AFF]/90 hover:bg-[#007AFF] hover:scale-110 active:scale-95 border border-white/30 flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer"
          >
            <Play className="w-9 h-9 text-white fill-white ml-1" />
          </div>
        )}
      </div>

      {/* Custom Bottom Controls */}
      <div
        onMouseEnter={() => {
          isInteractingWithControlsRef.current = true;
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          setShowControls(true);
        }}
        onMouseLeave={() => {
          isInteractingWithControlsRef.current = false;
          scheduleControlsHide(2500);
        }}
        className={`z-30 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
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
