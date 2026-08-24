import React, { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'How does video streaming work without downloading the entire file?',
      answer: 'TeleStream uses HTTP 206 Partial Content Range streaming. When you press play or seek, our client-side streaming engine requests only the specific 512KB-2MB byte ranges needed for that moment in the video directly from Telegram’s data centers. You start watching in 2 seconds without waiting for 2GB+ to download first.'
    },
    {
      question: 'Is it safe to log in with my Telegram account?',
      answer: 'Yes! TeleStream connects directly from your browser or device straight to Telegram’s official MTProto servers over encrypted WebSockets / TLS. TeleStream has zero backend servers, zero database, and zero tracking. Your session keys remain exclusively in your own device’s secure local storage.'
    },
    {
      question: 'Do I need to jailbreak my iPhone or iPad to sideload TeleStream?',
      answer: 'Not at all! AltStore, SideStore, and Sideloadly utilize Apple’s official free personal developer signing system. They install cleanly on any stock, unmodified iPhone running iOS 14.0 through iOS 18+.'
    },
    {
      question: 'Why do free sideloaded iOS apps need to be refreshed every 7 days?',
      answer: 'Apple limits free Apple ID developer certificates to 7 days of validity. Tools like AltStore and SideStore automate this process in the background over your local Wi-Fi network without you needing to do anything manual. If you have a paid Apple Developer Account, apps stay valid for 365 days.'
    },
    {
      question: 'Which platform should I choose (Android vs iOS vs PC)?',
      answer: 'For Android phones/tablets, Windows, macOS, Linux, and Smart TVs, simply click "Launch Player" — it runs instantly in your browser and can be installed to your home screen as a standalone PWA app with zero sideloading. For Apple iPhone and iPad users, we recommend sideloading the dedicated native iOS app (.IPA) to enjoy background audio and full streaming capabilities.'
    },
    {
      question: 'Is TeleStream free and open source?',
      answer: 'Yes. TeleStream is released under the GNU General Public License v3.0 (GPL-3.0). The full source code is public, auditable, and free for the community forever.'
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-20 sm:py-28 border-t border-slate-800/80 overflow-hidden">
      {/* Soft Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Common Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Everything you need to know about streaming, sideloading, and security.
          </p>
        </div>

        {/* Aesthetic FAQ Accordion Cards */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl transition-all duration-300 border backdrop-blur-xl overflow-hidden group ${
                  isOpen
                    ? 'bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-sky-500/30 shadow-xl shadow-black/40 ring-1 ring-sky-500/20'
                    : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-4 sm:py-4.5 px-5 sm:px-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className={`text-sm sm:text-base font-semibold tracking-tight transition-colors ${
                    isOpen ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {faq.question}
                  </span>
                  
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isOpen
                      ? 'bg-sky-500/20 text-sky-400 rotate-180 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700/80 group-hover:text-slate-200 rotate-0'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 pt-0 text-xs sm:text-sm text-slate-300/90 leading-relaxed animate-fadeIn">
                    <div className="pt-2 border-t border-slate-800/60">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
