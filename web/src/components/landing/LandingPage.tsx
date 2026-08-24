import React from 'react';
import {
  Smartphone,
  Play,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { PlatformGrid } from './PlatformGrid';
import { FeaturesSection } from './FeaturesSection';
import { IosSideloadSection } from './IosSideloadSection';
import { FaqSection } from './FaqSection';
import { TDLibUser } from '../../types/tdlib';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface LandingPageProps {
  onLaunchWeb: () => void;
  currentUser: TDLibUser | null;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWeb,
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* GitHub Repository Link */}
            <a
              href="https://github.com/NB6RULES/TeleStream"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-sm group"
              title="View on GitHub"
            >
              <GithubIcon className="w-4 h-4 text-slate-300 group-hover:text-white" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <button
              type="button"
              onClick={onLaunchWeb}
              className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isAuthenticated ? 'Open Player' : 'Launch Player (Android & Web)'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- HERO SECTION ---------------- */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-500/10 to-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
            Fast Video Streaming{' '}
            <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400">
              Directly from Telegram
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Instant playback with HTTP 206 chunk-range streaming on Android, Web & Desktop. Zero full downloads, zero waiting, and no backend servers.
          </p>

          {/* Hero CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onLaunchWeb}
              className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-xl shadow-sky-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isAuthenticated ? 'Open Streaming Player' : 'Launch Player (Android & Web)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('ios-sideload')}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white font-semibold text-sm sm:text-base flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Sideload to iPhone & iPad</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Direct MTProto WebSocket</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Zero-server privacy</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>100% Free & Open Source</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PLATFORMS SECTION ---------------- */}
      <PlatformGrid
        onLaunchWeb={onLaunchWeb}
        onScrollToIos={() => scrollToSection('ios-sideload')}
      />

      {/* ---------------- FEATURES & ARCHITECTURE SECTION ---------------- */}
      <FeaturesSection />

      {/* ---------------- MERGED SINGLE-CARD IOS SIDELOAD SECTION ---------------- */}
      <IosSideloadSection />

      {/* ---------------- FAQ SECTION ---------------- */}
      <FaqSection />

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <img src="/AppIcon.png" alt="TeleStream Logo" className="w-8 h-8 rounded-xl" />
            <div>
              <div className="font-bold text-white text-sm">TeleStream</div>
              <div>Direct Telegram Video Streaming Engine</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-400 text-xs">
            <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection('platforms')} className="hover:text-white transition-colors cursor-pointer">Platforms</button>
            <button onClick={() => scrollToSection('ios-sideload')} className="hover:text-white transition-colors cursor-pointer">iOS Sideload</button>
            <button onClick={() => scrollToSection('how-to-sideload')} className="hover:text-white transition-colors cursor-pointer">Installation Guide</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">FAQ</button>
            <a href="https://github.com/NB6RULES/TeleStream" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pt-6 border-t border-slate-900 text-[11px] text-slate-400 text-center">
          GPL-3.0 License. An unofficial Telegram video player, not affiliated with Telegram FZ-LLC. TeleStream does not provide media: use it only with content you own or are authorized to access.
        </div>
      </footer>
    </div>
  );
};
