import React from 'react';
import { Wifi, Cpu, Layers } from 'lucide-react';

interface StatusBadgeProps {
  isMtprotoConnected: boolean;
  isServiceWorkerReady: boolean;
  isWasmReady: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  isMtprotoConnected,
  isServiceWorkerReady,
  isWasmReady,
}) => {
  return (
    <div className="hidden lg:flex items-center space-x-3 text-xs">
      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
          isMtprotoConnected
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}
        title="Telegram MTProto WebSocket Connection"
      >
        <Wifi className="w-3.5 h-3.5" />
        <span className="font-mono text-[11px]">{isMtprotoConnected ? 'MTProto Live' : 'Connecting'}</span>
      </div>

      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
          isServiceWorkerReady
            ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}
        title="Service Worker Range Interceptor"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="font-mono text-[11px]">Virtual Streamer Active</span>
      </div>

      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${
          isWasmReady
            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
            : 'bg-slate-800 border-slate-700 text-slate-400'
        }`}
        title="TDLib WebAssembly Engine"
      >
        <Cpu className="w-3.5 h-3.5" />
        <span className="font-mono text-[11px]">TDLib WASM</span>
      </div>
    </div>
  );
};
