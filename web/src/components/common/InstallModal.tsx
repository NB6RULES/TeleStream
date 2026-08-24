import React from 'react';
import { X, Share, PlusSquare, Download } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose, isIOS }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <img
            src={`${import.meta.env.BASE_URL}AppIcon.png`}
            alt="TeleStream App"
            className="w-12 h-12 rounded-2xl shadow-lg shadow-telegram-blue/20"
          />
          <div>
            <h3 className="text-base font-bold text-white">Install TeleStream</h3>
            <p className="text-xs text-slate-400">Fast, fullscreen streaming app</p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
            <p className="text-slate-300 font-medium">To install on your iPhone or iPad:</p>
            <ol className="space-y-2.5 text-slate-400">
              <li className="flex items-center space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                <span>Tap the <Share className="inline w-3.5 h-3.5 text-telegram-blue mx-0.5" /> <strong>Share</strong> button in Safari's toolbar.</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                <span>Scroll down and select <PlusSquare className="inline w-3.5 h-3.5 text-telegram-blue mx-0.5" /> <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                <span>Tap <strong>Add</strong> in the top right to finish.</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-2 text-telegram-blue">
              <Download className="w-4 h-4" />
              <span className="font-semibold">Web App Installation</span>
            </div>
            <p className="text-slate-400">
              If your browser didn't prompt automatically, open your browser menu (⋮) and tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-telegram-blue to-sky-500 hover:from-sky-400 hover:to-blue-600 text-white text-sm font-semibold shadow-lg shadow-telegram-blue/20 transition-all cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
