import React, { useState } from 'react';
import { Key, Shield, ArrowRight, ExternalLink, Info } from 'lucide-react';
import { tdlibClient } from '../../services/tdlib/tdlibClient';

interface ApiConfigViewProps {
  onSuccess: () => void;
}

export const ApiConfigView: React.FC<ApiConfigViewProps> = ({ onSuccess }) => {
  const [apiId, setApiId] = useState('35445730');
  const [apiHash, setApiHash] = useState('9725211238ec77a8af28423d60cb9fa2');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiId.trim() || !apiHash.trim()) {
      setError('Please provide both API ID and API Hash');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await tdlibClient.setCredentials({
        apiId: apiId.trim(),
        apiHash: apiHash.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize MTProto credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-telegram-blue/10 border border-telegram-blue/20 text-telegram-blue mb-2 shadow-lg shadow-telegram-blue/10">
          <Key className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Telegram MTProto Setup</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Connecting directly to Telegram edge servers from your browser with zero backend intermediaries.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start space-x-2.5">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Telegram API ID
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 35445730"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all font-mono text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Telegram API Hash
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="e.g. 9725211238ec..."
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all font-mono text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <a
            href="https://my.telegram.org/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-telegram-blue hover:text-sky-300 transition-colors"
          >
            Get API credentials at my.telegram.org
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
          <span className="text-slate-500">Stored in IndexedDB</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-telegram-blue to-sky-500 hover:from-sky-500 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-telegram-blue/20 hover:shadow-telegram-blue/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <span>{isLoading ? 'Connecting to MTProto...' : 'Connect to Telegram'}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
        <div className="flex items-center text-slate-300 font-medium space-x-1.5">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Client-Side Zero-Knowledge Privacy</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Your credentials and MTProto sessions never touch any intermediate server. All encryption and streaming happen directly inside your browser.
        </p>
      </div>
    </div>
  );
};
