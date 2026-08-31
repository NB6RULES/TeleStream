import React from 'react';
import {
  Globe,
  Smartphone,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

interface PlatformGridProps {
  onLaunchWeb: () => void;
  onScrollToIos: () => void;
}

export const PlatformGrid: React.FC<PlatformGridProps> = ({ onLaunchWeb, onScrollToIos }) => {
  return (
    <section id="platforms" className="relative py-16 sm:py-24 border-t border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <Globe className="w-3.5 h-3.5" />
            <span>Choose Your Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Stream on your favorite device
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Enjoy instant Telegram media playback on web browsers, desktop computers, and iOS devices.
          </p>
        </div>

        {/* 2 Platform Cards Grid (Web & iOS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Web & Desktop Browser */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-sky-500/50 transition-all duration-300 shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Globe className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Instant Web App
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Web & Desktop</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Runs directly in Google Chrome, Safari, Firefox, and Edge. Powered by client-side Service Worker stream interception for instant playback without installing software.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300 mb-8">
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>No installation required</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Fast HTTP 206 chunk-range streaming</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Works on Windows, macOS, Linux, ChromeOS & Mobile</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onLaunchWeb}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer group-hover:shadow-sky-500/30"
            >
              <span>Launch Web Player</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Apple iOS & iPadOS */}
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-300 shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  IPA & Sideload
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">iOS & iPadOS</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Native iOS app sideloadable via AltStore, SideStore, Sideloadly, or TrollStore. Direct IPA package with one-tap repository sources. No jailbreak required.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300 mb-8">
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>AltStore & SideStore 1-Click Sources</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>Direct latest .IPA download</span>
                </li>
                <li className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>Step-by-step sideloading tutorial guide</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onScrollToIos}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Sideload to your iPhone</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
