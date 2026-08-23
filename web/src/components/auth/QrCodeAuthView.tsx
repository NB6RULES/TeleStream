import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw } from 'lucide-react';
import { tdlibClient } from '../../services/tdlib/tdlibClient';
import { AuthState } from '../../types/auth';

interface QrCodeAuthViewProps {
  authState: AuthState;
  onSwitchToPhone?: () => void;
  onBack?: () => void;
}

export const QrCodeAuthView: React.FC<QrCodeAuthViewProps> = ({
  authState,
}) => {
  const [timeLeft, setTimeLeft] = useState(authState.qrExpiresIn || 180);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authState.qrLink && !authState.isLoading) {
      tdlibClient.requestQrCode();
    }
  }, [authState.qrLink, authState.isLoading]);

  useEffect(() => {
    if (!authState.qrExpiresIn) return;
    setTimeLeft(authState.qrExpiresIn);

    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [authState.qrExpiresIn, authState.qrLink]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await tdlibClient.requestQrCode();
    setIsRefreshing(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="space-y-3.5">
      <div className="text-center space-y-0.5">
        <h2 className="text-lg font-bold text-white tracking-tight">Log in by QR Code</h2>
        <p className="text-xs text-slate-400">
          Scan this QR code with your Telegram mobile app
        </p>
      </div>

      {/* QR Code Container */}
      <div className="relative flex flex-col items-center justify-center p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-inner">
        {authState.error ? (
          <div className="w-40 h-40 flex flex-col items-center justify-center p-3 text-center space-y-2">
            <span className="text-[11px] text-rose-400 font-medium leading-tight">{authState.error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 bg-telegram-blue hover:bg-sky-400 text-white text-[11px] font-semibold rounded-lg shadow transition-all flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : authState.isLoading || !authState.qrLink ? (
          <div className="w-40 h-40 flex flex-col items-center justify-center space-y-2.5 text-slate-400">
            <div className="w-8 h-8 border-2 border-telegram-blue/30 border-t-telegram-blue rounded-full animate-spin" />
            <span className="text-[11px] font-mono">Connecting to Telegram...</span>
          </div>
        ) : (
          <div className="relative p-2.5 bg-white rounded-xl shadow-xl flex items-center justify-center">
            <QRCodeSVG
              value={authState.qrLink}
              size={150}
              level="M"
              includeMargin={false}
            />
            {timeLeft === 0 && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-2 space-y-2">
                <span className="text-[11px] text-rose-400 font-medium">Expired</span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 bg-telegram-blue hover:bg-sky-400 text-white text-[11px] font-semibold rounded-lg shadow-md transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Reload</span>
                </button>
              </div>
            )}
          </div>
        )}

        {authState.qrLink && timeLeft > 0 && !authState.error && (
          <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Valid: <strong className="text-slate-200 font-mono">{formattedTime}</strong></span>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-slate-500 hover:text-slate-300 ml-1 cursor-pointer transition-colors p-0.5"
              title="Refresh QR Code"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Guide Steps */}
      <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-800/80 space-y-1 text-[11px] text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[10px]">1</span>
          <span>Open <strong>Telegram</strong> on phone</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[10px]">2</span>
          <span>Go to <strong>Settings → Devices → Link Desktop Device</strong></span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-slate-800 text-telegram-blue font-bold flex items-center justify-center text-[10px]">3</span>
          <span>Point your camera at this screen to confirm</span>
        </div>
      </div>
    </div>
  );
};
