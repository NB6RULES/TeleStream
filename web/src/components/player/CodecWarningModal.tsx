import React from 'react';
import { AlertCircle, X, Monitor, Smartphone, Apple, Copy, Check } from 'lucide-react';
import { CodecCompatibilityInfo } from '../../utils/audioCodecDetector';

interface CodecWarningModalProps {
  info: CodecCompatibilityInfo;
  fileName: string;
  onClose: () => void;
}

export const CodecWarningModal: React.FC<CodecWarningModalProps> = ({
  info,
  fileName,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-lg bg-[#121317] border border-[#FFB4AB]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#1A1B1F] text-[#8B90A0] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Warning Icon */}
        <div className="flex items-start space-x-3.5 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-[#FFB4AB]/15 border border-[#FFB4AB]/30 text-[#FFB4AB] flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base">Unsupported Audio Format</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#FFB4AB]/20 text-[#FFB4AB] font-bold text-[10px] uppercase font-mono tracking-tight">
                No Sound
              </span>
            </div>
            <p className="text-xs text-[#ADC6FF] font-medium mt-0.5">
              {info.codecName}
            </p>
          </div>
        </div>

        {/* File Name Pill */}
        <div className="p-2.5 rounded-xl bg-[#1A1B1F] border border-[#292A2E] text-[11px] font-mono text-[#8B90A0] truncate">
          <span className="text-[#C1C6D7] font-semibold">File: </span>
          {fileName}
        </div>

        {/* Reason Explanation */}
        <p className="text-xs text-[#C1C6D7] leading-relaxed">
          This file uses <strong className="text-white font-semibold">{info.codecName}</strong>. 
          Web browsers like <span className="text-[#FFB4AB]">{info.browserName}</span> do not include proprietary Dolby/DTS patent licenses, causing the audio track to play silently.
        </p>

        {/* Platform-Specific Recommendations */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-[#8B90A0] uppercase tracking-wider">
            How to play this file with full audio:
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* Windows */}
            <div className="p-3 rounded-2xl bg-[#16171B] border border-[#292A2E] flex items-start space-x-3">
              <div className="w-7 h-7 rounded-xl bg-[#007AFF]/15 text-[#007AFF] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Windows PC</div>
                <p className="text-[11px] text-[#8B90A0] mt-0.5">
                  Open this link in <strong>Microsoft Edge</strong> (which supports Dolby Digital Plus on Windows) or try the <strong>Audio Boost</strong> in player settings.
                </p>
              </div>
            </div>

            {/* iPhone / iPad */}
            <div className="p-3 rounded-2xl bg-[#16171B] border border-[#292A2E] flex items-start space-x-3">
              <div className="w-7 h-7 rounded-xl bg-[#ADC6FF]/15 text-[#ADC6FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Apple className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">iPhone, iPad & Mac</div>
                <p className="text-[11px] text-[#8B90A0] mt-0.5">
                  Open in <strong>Safari</strong> or the <strong>TeleStream iOS App</strong> — Apple devices feature built-in hardware Dolby Digital Plus decoding.
                </p>
              </div>
            </div>

            {/* Android */}
            <div className="p-3 rounded-2xl bg-[#16171B] border border-[#292A2E] flex items-start space-x-3">
              <div className="w-7 h-7 rounded-xl bg-[#34C759]/15 text-[#34C759] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">Android & Smart TVs</div>
                <p className="text-[11px] text-[#8B90A0] mt-0.5">
                  Stream using <strong>Chrome for Android</strong> or install as a PWA app.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 gap-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="px-3.5 py-2 rounded-xl bg-[#1A1B1F] hover:bg-[#292A2E] text-xs font-semibold text-[#ADC6FF] flex items-center space-x-1.5 transition-colors cursor-pointer border border-[#292A2E]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#34C759]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Copy Site Link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-xs font-bold text-white transition-colors cursor-pointer shadow-lg shadow-[#007AFF]/25"
          >
            Continue Watching
          </button>
        </div>
      </div>
    </div>
  );
};
