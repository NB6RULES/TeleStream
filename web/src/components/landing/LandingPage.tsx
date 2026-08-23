import React from 'react';
import {
  Smartphone,
  Play,
  ArrowRight,
  Star,
  CheckCircle
} from 'lucide-react';
import { PlatformGrid } from './PlatformGrid';
import { FeaturesSection } from './FeaturesSection';
import { IosSideloadSection } from './IosSideloadSection';
import { FaqSection } from './FaqSection';
import { TDLibUser } from '../../types/tdlib';

interface LandingPageProps {
  onLaunchWeb: () => void;
  currentUser: TDLibUser | null;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWeb,
  currentUser,
  isAuthenticated
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 selection:bg-telegram-blue selection:text-white">
      {/* ---------------- FIXED / STICKY HEADER ---------------- */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/AppIcon.png"
              alt="TeleStream Logo"
              className="w-9 h-9 rounded-xl shadow-md shadow-sky-500/20"
            />
            <span className="font-extrabold text-white tracking-tight text-lg">
              TeleStream
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('platforms')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platforms
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('ios-sideload')}
              className="hover:text-white transition-colors cursor-pointer text-sky-400 hover:text-sky-300"
            >
              iOS Sideload
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-to-sideload')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Installation Guide
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <a
              href="https://github.com/NB6RULES/telestream"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title="Star on GitHub"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Star</span>
            </a>

            <button
              type="button"
              onClick={onLaunchWeb}
              className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isAuthenticated ? 'Open Player' : 'Launch Web Player'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- HERO SECTION ---------------- */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            {/* Top Announcement Pill */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-semibold mb-6 shadow-md backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Zero Server Storage</span>
              <span>•</span>
              <span className="text-sky-400">100% Client-Side Streaming</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Stream your Telegram videos directly to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
                any screen
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              A free, open-source media player that signs into your personal Telegram account and streams the videos already in your chats. Press play and it starts in seconds — no waiting for full file downloads.
            </p>

            {/* Main Hero Buttons (Web Player + Sideload on iOS) */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onLaunchWeb}
                className="py-3.5 px-7 sm:px-8 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base flex items-center space-x-2.5 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Web Player</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('ios-sideload')}
                className="py-3.5 px-6 sm:px-7 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-white font-bold text-sm sm:text-base flex items-center space-x-2 shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Sideload on iOS</span>
              </button>
            </div>

            {/* Authenticated user quick badge */}
            {isAuthenticated && currentUser && (
              <div className="mt-5 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300">
                <span>Signed in as <strong>{currentUser.first_name}</strong></span>
                <span>•</span>
                <button
                  onClick={onLaunchWeb}
                  className="font-bold underline hover:text-white cursor-pointer"
                >
                  Resume Watching →
                </button>
              </div>
            )}

            {/* Key feature pills */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-semibold text-slate-400">
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Instant Playback</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Official QR Code Login</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>MKV / MP4 / Multi-Audio</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>100% Free & Open Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PLATFORMS SECTION ---------------- */}
      <PlatformGrid
        onLaunchWeb={onLaunchWeb}
        onScrollToIos={() => scrollToSection('ios-sideload')}
      />

      {/* ---------------- FEATURES SECTION ---------------- */}
      <FeaturesSection />

      {/* ---------------- IOS SIDELOAD & TUTORIAL SECTION ---------------- */}
      <IosSideloadSection />

      {/* ---------------- FAQ SECTION ---------------- */}
      <FaqSection />

      {/* ---------------- BOTTOM CTA BANNER ---------------- */}
      <section className="py-16 sm:py-20 border-t border-slate-800/80 bg-gradient-to-b from-slate-900/50 to-slate-950">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to watch your Telegram media?
          </h3>
          <p className="mt-3 text-slate-300 text-base sm:text-lg max-w-xl mx-auto">
            No registration with 3rd parties. No subscription fees. Just open and stream.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onLaunchWeb}
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm sm:text-base flex items-center space-x-2 shadow-xl shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch Web Player</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('ios-sideload')}
              className="py-3.5 px-7 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-bold text-sm sm:text-base flex items-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Sideload on iOS</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="py-12 border-t border-slate-800 bg-[#080c14] text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img src="/AppIcon.png" alt="TeleStream Logo" className="w-8 h-8 rounded-xl" />
              <div>
                <div className="font-bold text-white text-sm">TeleStream</div>
                <div className="text-[11px] text-slate-500">Free & Open Source Telegram Media Streamer</div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
              <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Features</button>
              <button onClick={() => scrollToSection('platforms')} className="hover:text-white transition-colors cursor-pointer">Platforms</button>
              <button onClick={() => scrollToSection('ios-sideload')} className="hover:text-white transition-colors cursor-pointer">iOS Sideload</button>
              <button onClick={() => scrollToSection('how-to-sideload')} className="hover:text-white transition-colors cursor-pointer">Installation Guide</button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">FAQ</button>
              <a href="https://github.com/NB6RULES/telestream" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>

          <div className="pt-8 text-center text-slate-400 space-y-3">
            <p className="max-w-2xl mx-auto text-[11px] leading-relaxed">
              GPL-3.0 License. An unofficial Telegram video player, not affiliated with Telegram FZ-LLC. TeleStream does not provide media: use it only with content you own or are authorized to access.
            </p>
            <div className="text-[11px] text-slate-400">
              Built for seamless streaming across Web and Apple iOS.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
