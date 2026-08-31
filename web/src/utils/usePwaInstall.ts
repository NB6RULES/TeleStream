import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);

      const dismissed = sessionStorage.getItem('telestream_pwa_banner_dismissed');
      if (!dismissed) {
        setShowMobileBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowMobileBanner(false);
      setDeferredPrompt(null);
      console.log('[PWA] TeleStream app successfully installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // Fallback instructions if prompt not available (e.g. iOS Safari)
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert('To install TeleStream on iOS:\n1. Tap the Share button in Safari\n2. Select "Add to Home Screen"');
      } else {
        alert('To install TeleStream:\nUse your browser menu and select "Install App" or "Add to Home Screen"');
      }
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setShowMobileBanner(false);
        setDeferredPrompt(null);
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
    isInstallable: isInstallable || !isInstalled,
    isInstalled,
    showMobileBanner: showMobileBanner && !isInstalled,
    promptInstall,
    dismissMobileBanner,
  };
}
