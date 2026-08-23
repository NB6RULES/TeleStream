import React, { useState } from 'react';
import { AuthState } from '../../types/auth';
import { QrCodeAuthView } from './QrCodeAuthView';
import { PhoneAuthView } from './PhoneAuthView';
import { ApiConfigView } from './ApiConfigView';
import { QrCode, Smartphone, X } from 'lucide-react';
import { tdlibClient } from '../../services/tdlib/tdlibClient';

interface AuthModalProps {
  authState: AuthState;
}

export const AuthModal: React.FC<AuthModalProps> = ({ authState }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'phone'>('qr');
  const [showApiConfig, setShowApiConfig] = useState(false);

  if (authState.isAuthenticated) {
    return null;
  }

  const isPhoneWorkflow = 
    authState.authStep === 'code' || 
    authState.authStep === 'password' || 
    activeTab === 'phone';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-telegram-blue/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[390px] bg-slate-900/95 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/80 backdrop-blur-2xl my-auto">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <img src={`${import.meta.env.BASE_URL}AppIcon.png`} alt="TeleStream Logo" className="w-9 h-9 rounded-xl shadow-md shadow-telegram-blue/25" />
            <div>
              <span className="font-bold text-white tracking-tight text-sm block leading-none">
                TeleStream Web
              </span>
              <span className="text-[9px] uppercase font-mono text-telegram-blue tracking-wider font-semibold">
                Client-Side WASM
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero Backend</span>
          </div>
        </div>

        {/* Custom API Credentials Drawer */}
        {showApiConfig ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Advanced API Settings
              </span>
              <button
                type="button"
                onClick={() => setShowApiConfig(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ApiConfigView onSuccess={() => setShowApiConfig(false)} />
          </div>
        ) : (
          <>
            {/* Auth Method Navigation Tabs */}
            {authState.authStep !== 'code' && authState.authStep !== 'password' && (
              <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qr');
                    tdlibClient.requestQrCode();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'qr'
                      ? 'bg-telegram-blue text-white shadow-sm shadow-telegram-blue/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('phone');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                    activeTab === 'phone'
                      ? 'bg-telegram-blue text-white shadow-sm shadow-telegram-blue/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Phone Number</span>
                </button>
              </div>
            )}

            {/* Active Flow: QR Code or Phone OTP */}
            {isPhoneWorkflow ? (
              <PhoneAuthView
                authState={authState}
                onSwitchToQr={() => {
                  setActiveTab('qr');
                  tdlibClient.requestQrCode();
                }}
                onBack={() => {
                  setActiveTab('qr');
                  tdlibClient.requestQrCode();
                }}
              />
            ) : (
              <QrCodeAuthView authState={authState} />
            )}

            {/* Direct Official MTProto Badge */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Official MTProto Edge</span>
              </span>
              <span className="font-mono text-slate-500">App: 35445730</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
