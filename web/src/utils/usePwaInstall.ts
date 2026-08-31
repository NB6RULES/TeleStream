import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const globalListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    globalListeners.forEach((listener) => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalListeners.forEach((listener) => listener(null));
    console.log('[PWA] TeleStream app successfully installed');
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstallable, setIsInstallable] = useState(!!globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
      return;
    }

    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstallable(true);
      const dismissed = sessionStorage.getItem('telestream_pwa_banner_dismissed');
      if (!dismissed) {
        setShowMobileBanner(true);
      }
    }

    const listener = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      setIsInstallable(!!prompt);
      if (prompt) {
        const dismissed = sessionStorage.getItem('telestream_pwa_banner_dismissed');
        if (!dismissed) {
          setShowMobileBanner(true);
        }
      }
    };

    globalListeners.add(listener);

    return () => {
      globalListeners.delete(listener);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || globalDeferredPrompt;
    if (!promptEvent) {
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert('To install TeleStream on iOS:\n1. Tap the Share button in Safari\n2. Select "Add to Home Screen"');
      }
      return false;
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setShowMobileBanner(false);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
    }
    return false;
  };

  const dismissMobileBanner = () => {
    setShowMobileBanner(false);
    sessionStorage.setItem('telestream_pwa_banner_dismissed', 'true');
  };

  return {
    isInstallable: isInstallable || !!globalDeferredPrompt || !isInstalled,
    isInstalled,
    showMobileBanner: showMobileBanner && !isInstalled,
    promptInstall,
    dismissMobileBanner,
  };
}
