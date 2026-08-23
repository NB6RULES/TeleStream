import React from 'react';
import {
  Zap,
  ShieldCheck,
  QrCode,
  Sliders,
  Layers,
  CheckCircle2,
  XCircle,
  Monitor,
  HardDriveDownload
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative py-16 sm:py-24 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>High Performance Player</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Designed for seamless media playback
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Telegram is where you store videos, movies, and episodes. TeleStream eliminates the hassle of waiting for gigabytes of downloads before watching.
          </p>
        </div>

        {/* 6 Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5">
                <HardDriveDownload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Stream While It Downloads</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Press play and the video begins immediately in seconds. Intelligent chunk streaming buffers only what you need as you watch.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Accurate Seeking & Range Requests</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Jump anywhere along the timeline instantly. TeleStream uses HTTP 206 Byte-Range streaming to fetch the exact chunks without downloading intermediate video.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Format & Audio Versatility</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Flawless playback for MKV, MP4, WebM, AVI, and TS files. Switch multiple audio tracks and toggle embedded subtitles with ease.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-5">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Official Telegram QR Login</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Log in securely using Telegram's official "Link Desktop Device" QR flow. No phone passwords shared, zero 3rd-party bots, pure client-to-client MTProto.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">100% Client-Side Privacy</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                No middleman proxy servers. Video decryption and stream piping occur entirely in your browser sandbox and device RAM.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Keyboard & Fullscreen Controls</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Complete keyboard shortcuts (Space to Play/Pause, Arrow keys for 10s seek, F for Fullscreen, M for Mute, and Up/Down for Volume).
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- WHAT IT IS NOT SECTION ---------------- */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Transparency & Limits
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              What TeleStream is and is not
            </h3>
            <p className="text-slate-300 text-sm sm:text-base mt-2">
              TeleStream is an open source media player utility, not a content provider or unauthorized scraper.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: What it is not */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-rose-500/20 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                <XCircle className="w-4 h-4" />
                <span>What it is NOT</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start space-x-2.5">
                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                  <span><strong>Not a media hosting service:</strong> We host 0 files and run no video storage servers.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                  <span><strong>Not a public directory:</strong> It does not index or search public channels you haven't joined.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                  <span><strong>Not a chat messenger:</strong> It cannot read, edit, or send messages on your behalf.</span>
                </li>
              </ul>
            </div>

            {/* Right: What it is */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-emerald-500/20 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>What it IS</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start space-x-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span><strong>A client-side media player:</strong> Signs in as your personal Telegram session to play videos in your chats.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span><strong>Direct MTProto Connection:</strong> Decrypts Telegram file streams straight in your device memory.</span>
                </li>
                <li className="flex items-start space-x-2.5">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span><strong>100% Free & Open Source:</strong> Auditable code under GPL-3.0 with zero ads or tracking.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
