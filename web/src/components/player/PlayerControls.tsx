import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Settings,
  Network
} from 'lucide-react';
import { AspectRatio } from '../../types/stream';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  aspectRatio: AspectRatio;
  playbackRate: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onPlaybackRateChange: (rate: number) => void;
  onSkip: (seconds: number) => void;
  onToggleNetworkStatus?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  bufferedEnd,
  volume,
  isMuted,
  isFullscreen,
  aspectRatio,
  playbackRate,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onTogglePip,
  onAspectRatioChange,
  onPlaybackRateChange,
  onSkip,
  onToggleNetworkStatus
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileVolume, setShowMobileVolume] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return '00:00';
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  const handleTouchScrub = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const aspectOptions: { label: string; value: AspectRatio }[] = [
    { label: 'Fit to Window', value: 'fit' },
    { label: 'Fill / Crop', value: 'cover' },
    { label: 'Stretch 100%', value: 'stretch' },
    { label: '16:9 Standard', value: '16:9' },
    { label: '4:3 Classic', value: '4:3' },
  ];

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 sm:px-6 pt-6 pb-6 sm:pb-6 transition-opacity duration-300 select-none z-30">
      {/* Timeline Progress Bar */}
      <div
        ref={progressRef}
        onClick={handleProgressBarClick}
        onTouchStart={handleTouchScrub}
        onTouchMove={handleTouchScrub}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative group h-2 sm:h-2.5 hover:h-4 w-full bg-slate-800/80 rounded-full cursor-pointer transition-all mb-3 sm:mb-4"
      >
        {/* Buffered Progress */}
        <div
          className="absolute top-0 left-0 h-full bg-slate-600/70 rounded-full transition-all duration-200"
          style={{ width: `${Math.min(100, bufferedPercent)}%` }}
        />

        {/* Current Time Progress */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-telegram-blue to-sky-400 rounded-full"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />

        {/* Scrubber Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -ml-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-lg shadow-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          style={{ left: `${progressPercent}%` }}
        />

        {/* Hover Time Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 -translate-x-1/2 px-2 py-1 rounded bg-slate-900/90 border border-slate-700 text-[11px] font-mono text-white pointer-events-none shadow-md"
            style={{ left: `${hoverPosition}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-4">
        {/* Left: Play, Skip, Volume, Time */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="p-1.5 sm:p-2 rounded-xl bg-white text-slate-950 hover:bg-sky-200 active:scale-95 transition-transform cursor-pointer shadow-md flex-shrink-0"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
            ) : (
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 ml-0.5" />
            )}
          </button>

          {/* Skip -10s */}
          <button
            type="button"
            onClick={() => onSkip(-10)}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer flex-shrink-0"
            title="Skip back 10s (Left Arrow)"
            aria-label="Skip backward"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Skip +10s */}
          <button
            type="button"
            onClick={() => onSkip(10)}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer flex-shrink-0"
            title="Skip forward 10s (Right Arrow)"
            aria-label="Skip forward"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Volume Control with mobile popover / desktop inline slider */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                // On mobile click, toggle popup volume slider or mute
                if (window.innerWidth < 640) {
                  setShowMobileVolume(!showMobileVolume);
                } else {
                  onToggleMute();
                }
              }}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              title="Volume / Mute"
              aria-label="Volume"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Mobile Volume Popover */}
            {showMobileVolume && (
              <div className="sm:hidden absolute bottom-12 left-0 p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl z-50 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="text-slate-300 hover:text-white text-xs"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-2 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Desktop Volume Slider */}
            <div className="hidden sm:flex items-center ml-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 md:w-20 lg:w-24 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="text-[10px] sm:text-xs font-mono text-slate-300 tracking-wider whitespace-nowrap pl-0.5 sm:pl-1">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Network Status, Aspect Ratio/Speed Settings, PiP, Fullscreen */}
        <div className="flex items-center space-x-0.5 sm:space-x-2 flex-shrink-0">
          {/* Network Status Toggle */}
          {onToggleNetworkStatus && (
            <button
              onClick={onToggleNetworkStatus}
              className="p-1.5 sm:p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Network Status"
              aria-label="Network Status"
            >
              <Network className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Settings Menu Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Playback Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showSettings && (
              <div className="absolute right-0 bottom-12 w-48 sm:w-56 p-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl space-y-3 z-50 text-xs">
                <div>
                  <div className="font-semibold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                    Aspect Ratio
                  </div>
                  <div className="space-y-1">
                    {aspectOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onAspectRatioChange(opt.value);
                          setShowSettings(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          aspectRatio === opt.value
                            ? 'bg-telegram-blue text-white font-medium'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2">
                  <div className="font-semibold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">
                    Playback Speed
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {speedOptions.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          onPlaybackRateChange(rate);
                          setShowSettings(false);
                        }}
                        className={`px-2 py-1 rounded-lg text-center cursor-pointer ${
                          playbackRate === rate
                            ? 'bg-telegram-blue text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Picture-in-Picture Button */}
          <button
            type="button"
            onClick={onTogglePip}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Picture-in-Picture"
            aria-label="Picture-in-Picture"
          >
            <PictureInPicture2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
