import React, { useState } from 'react';
import {
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Info
} from 'lucide-react';

/* ---------------- CUSTOM BRAND SVG ICONS ---------------- */
const AppleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.35c.64-.78 1.08-1.86.96-2.95-1 .04-2.14.65-2.79 1.41-.57.65-1.07 1.76-.94 2.82 1.11.09 2.14-.54 2.77-1.28z"/>
  </svg>
);

const AltStoreIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#14B8A6" fillOpacity="0.2" stroke="#14B8A6" strokeWidth="1.5"/>
    <path d="M12 5L18.5 17.5H5.5L12 5Z" fill="#14B8A6" stroke="#0D9488" strokeWidth="1" strokeLinejoin="round"/>
    <path d="M12 9.5L15.5 16H8.5L12 9.5Z" fill="#042F2E"/>
  </svg>
);

const SideStoreIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#6366F1" fillOpacity="0.2" stroke="#6366F1" strokeWidth="1.5"/>
    <path d="M7 8.5C7 7.67157 7.67157 7 8.5 7H15.5C16.3284 7 17 7.67157 17 8.5V10.5C17 11.3284 16.3284 12 15.5 12H10C8.89543 12 8 12.8954 8 14V15.5C8 16.3284 8.67157 17 9.5 17H16.5" stroke="#818CF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SideloadlyIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#3B82F6" fillOpacity="0.2" stroke="#3B82F6" strokeWidth="1.5"/>
    <path d="M12 4L15.5 10H8.5L12 4Z" fill="#60A5FA"/>
    <rect x="10.5" y="10" width="3" height="6.5" fill="#60A5FA"/>
    <path d="M7 16.5H17V18.5C17 19.3284 16.3284 20 15.5 20H8.5C7.67157 20 7 19.3284 7 18.5V16.5Z" fill="#2563EB"/>
  </svg>
);

const TrollStoreIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="#A855F7" fillOpacity="0.2" stroke="#A855F7" strokeWidth="1.5"/>
    <path d="M6 14L8 7L12 11L16 7L18 14H6Z" fill="#C084FC" stroke="#A855F7" strokeWidth="1" strokeLinejoin="round"/>
    <circle cx="9.5" cy="11" r="1" fill="#3B0764"/>
    <circle cx="14.5" cy="11" r="1" fill="#3B0764"/>
    <path d="M9 15.5C10.5 16.5 13.5 16.5 15 15.5" stroke="#FAF5FF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IosSideloadSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'altstore' | 'sidestore' | 'sideloadly' | 'trollstore'>('altstore');
  const [isCopied, setIsCopied] = useState(false);

  // Exact live repository URLs from NB6RULES/TeleStream
  const SOURCE_URL = 'https://raw.githubusercontent.com/NB6RULES/TeleStream/main/sources.json';
  const LATEST_VERSION = 'v1.40';
  const LATEST_IPA_URL = 'https://github.com/NB6RULES/TeleStream/releases/latest/download/TeleStream.ipa';

  const copySourceUrl = () => {
    navigator.clipboard.writeText(SOURCE_URL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAltStoreInstall = () => {
    window.location.href = `altstore://source?url=${encodeURIComponent(SOURCE_URL)}`;
  };

  const handleSideStoreInstall = () => {
    window.location.href = `sidestore://source?url=${encodeURIComponent(SOURCE_URL)}`;
  };

  return (
    <section id="ios-sideload" className="relative py-14 sm:py-20 border-t border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Apple iOS & iPadOS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Sideload TeleStream to your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">iPhone & iPad</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            Install natively without App Store restrictions. No jailbreak required.
          </p>
        </div>

        {/* ---------------- UNIFIED MERGED SIDELOADING CARD ---------------- */}
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
          {/* TOP ACTION ROW: Download & Store Buttons */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              1. Download & Sources
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Primary Direct IPA Download */}
              <a
                href={LATEST_IPA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer group"
              >
                <AppleIcon className="w-4 h-4 text-white" />
                <span>Download .IPA ({LATEST_VERSION})</span>
              </a>

              {/* AltStore 1-Click */}
              <button
                type="button"
                onClick={handleAltStoreInstall}
                className="py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-teal-500/50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                title="Add repository to AltStore"
              >
                <AltStoreIcon className="w-4 h-4" />
                <span>Add to AltStore</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* SideStore 1-Click */}
              <button
                type="button"
                onClick={handleSideStoreInstall}
                className="py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                title="Add repository to SideStore"
              >
                <SideStoreIcon className="w-4 h-4" />
                <span>Add to SideStore</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Copy Community Repo URL */}
              <button
                type="button"
                onClick={copySourceUrl}
                className="py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-sky-500/50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                title="Copy source URL to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">URL Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Repo URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="border-t border-slate-800" />

          {/* BOTTOM STEP-BY-STEP TUTORIAL */}
          <div id="how-to-sideload">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Sideloading Instructions
              </div>

              {/* Method Switcher Tabs with Brand Icons */}
              <div className="inline-flex flex-wrap p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('altstore')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'altstore'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AltStoreIcon className="w-3.5 h-3.5" />
                  <span>AltStore</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sidestore')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'sidestore'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SideStoreIcon className="w-3.5 h-3.5" />
                  <span>SideStore</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sideloadly')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'sideloadly'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SideloadlyIcon className="w-3.5 h-3.5" />
                  <span>Sideloadly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trollstore')}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'trollstore'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrollStoreIcon className="w-3.5 h-3.5" />
                  <span>TrollStore</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 4 CLEAN NUMBERED STEPS */}
            {activeTab === 'altstore' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-teal-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center">1</div>
                    <AltStoreIcon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Install AltServer</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Install AltServer on PC/Mac from <a href="https://altstore.io" target="_blank" rel="noopener noreferrer" className="text-teal-400 underline">altstore.io</a>.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center mb-2">2</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Install AltStore App</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Connect iPhone via USB and install AltStore with your Apple ID.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center mb-2">3</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Add TeleStream</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Tap <strong>Add to AltStore</strong> above or open downloaded IPA inside AltStore.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center mb-2">4</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Trust & Play</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Trust certificate in <em>Settings &gt; General &gt; VPN &amp; Device Management</em>.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sidestore' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">1</div>
                    <SideStoreIcon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Setup SideStore</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Install SideStore on iPhone and import the WireGuard pairing file.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-2">2</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Add Source</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Tap <strong>Add to SideStore</strong> above to add repository.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-2">3</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Install App</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Tap <strong>Get</strong> on TeleStream in SideStore apps list.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-2">4</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Wi-Fi Auto Refresh</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    SideStore auto-renews wirelessly without connecting to a computer.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sideloadly' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">1</div>
                    <SideloadlyIcon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Open Sideloadly</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Download and open Sideloadly on PC/Mac (<a href="https://sideloadly.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">sideloadly.io</a>).
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-2">2</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Connect iPhone</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Plug device into computer via USB and unlock screen.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-2">3</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Drag &amp; Sign IPA</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Drag <code className="text-blue-400">TeleStream.ipa</code> into app and click <strong>Start</strong>.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center mb-2">4</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Trust Certificate</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Trust in <em>Settings &gt; General &gt; VPN &amp; Device Management</em>.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trollstore' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center">1</div>
                    <TrollStoreIcon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Open TrollStore</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Ensure TrollStore is installed (iOS 14.0 — 17.0 supported).
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center mb-2">2</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Download IPA</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Download <code className="text-purple-400">TeleStream.ipa</code> in Safari on device.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center mb-2">3</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Share to TrollStore</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Tap Share &gt; Open in <strong>TrollStore</strong>.
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs flex items-center justify-center mb-2">4</div>
                  <div className="font-bold text-white text-xs sm:text-sm mb-1">Permanent Install</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    Zero 7-day expiration forever!
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COMPACT HELPER FOOTNOTE */}
          <div className="pt-2 flex items-start space-x-2 text-[11px] sm:text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Tip:</strong> If prompted on first launch, trust developer profile in <em>Settings &gt; General &gt; VPN &amp; Device Management</em>. On iOS 16+, enable Developer Mode in <em>Settings &gt; Privacy &amp; Security</em>.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
