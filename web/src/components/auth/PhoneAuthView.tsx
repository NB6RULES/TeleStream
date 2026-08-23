import React, { useState } from 'react';
import { Phone, Lock, KeyRound, ArrowRight, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';
import { tdlibClient } from '../../services/tdlib/tdlibClient';
import { AuthState } from '../../types/auth';

interface PhoneAuthViewProps {
  authState: AuthState;
  onSwitchToQr: () => void;
  onBack: () => void;
}

export const PhoneAuthView: React.FC<PhoneAuthViewProps> = ({
  authState,
  onSwitchToQr,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isStepCode = authState.authStep === 'code';
  const isStepPassword = authState.authStep === 'password';
  const isStepPhone = !isStepCode && !isStepPassword;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setLocalError('Please enter a valid international phone number with country code (e.g. +1 555 123 4567)');
      return;
    }
    setLocalError(null);
    await tdlibClient.sendPhoneNumber(cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setLocalError('Please enter the verification code');
      return;
    }
    setLocalError(null);
    await tdlibClient.sendAuthCode(code.trim());
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setLocalError('Please enter your 2-Step Verification password');
      return;
    }
    setLocalError(null);
    await tdlibClient.sendPassword(password);
  };

  const error = localError || authState.error;

  return (
    <div className="space-y-6">
      {/* Back button only when in sub-steps (OTP or Password) */}
      {(isStepCode || isStepPassword) && (
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={onSwitchToQr}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Phone Number / Method</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2.5">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Phone Number Input */}
      {isStepPhone && (
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-telegram-blue/10 border border-telegram-blue/20 text-telegram-blue mb-1">
              <Phone className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Your Phone Number</h2>
            <p className="text-sm text-slate-400">
              Please confirm your country code and enter your mobile number.
            </p>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all font-mono text-base"
                  disabled={authState.isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authState.isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-telegram-blue to-sky-500 hover:from-sky-500 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-telegram-blue/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{authState.isLoading ? 'Sending Request...' : 'Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Verification Code */}
      {isStepCode && (
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-1">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Enter Code</h2>
            <p className="text-sm text-slate-400">
              We have sent a code to the Telegram app on <strong className="text-slate-200">{authState.phoneNumber}</strong>
            </p>
          </div>

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Telegram Code
              </label>
              <input
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 text-center tracking-[0.4em] bg-slate-900/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all font-mono text-xl font-bold"
                disabled={authState.isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={authState.isLoading || !code.trim()}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-telegram-blue to-sky-500 hover:from-sky-500 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-telegram-blue/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{authState.isLoading ? 'Verifying Code...' : 'Confirm and Log In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Step 3: 2FA Password */}
      {isStepPassword && (
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Two-Step Verification</h2>
            <p className="text-sm text-slate-400">
              Your Telegram account is protected with an additional 2FA Cloud Password.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cloud Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your 2FA password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-telegram-blue focus:ring-1 focus:ring-telegram-blue transition-all font-mono text-sm"
                  disabled={authState.isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authState.isLoading || !password}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-telegram-blue to-sky-500 hover:from-sky-500 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg shadow-telegram-blue/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{authState.isLoading ? 'Verifying Password...' : 'Unlock Session'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
