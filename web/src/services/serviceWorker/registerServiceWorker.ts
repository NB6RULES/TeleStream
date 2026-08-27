import { StreamRangeRequest } from '../../types/stream';
import { addLog } from '../../components/debug/Logger';

type ChunkProvider = (req: StreamRangeRequest) => Promise<ArrayBuffer | Uint8Array>;

let chunkProviderCallback: ChunkProvider | null = null;
let isListenerAttached = false;

export function setChunkProvider(provider: ChunkProvider) {
  chunkProviderCallback = provider;
}

// Global message handler for ServiceWorker MessageChannel chunk requests
function ensureSwMessageHandler() {
  if (isListenerAttached || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  isListenerAttached = true;

  navigator.serviceWorker.addEventListener('message', async (event: MessageEvent) => {
    const { type, payload } = event.data || {};
    const port = event.ports && event.ports[0];

    if (type === 'FETCH_STREAM_CHUNK' && port) {
      try {
        addLog(`SW req: ${payload.start}-${payload.end}`);
        if (chunkProviderCallback) {
          const chunk = await chunkProviderCallback(payload);
          port.postMessage({ chunk });
        } else {
          port.postMessage({ error: 'No chunk provider registered' });
        }
      } catch (err: any) {
        addLog(`SW req failed: ${err.message}`);
        port.postMessage({ error: err?.message || 'Failed to fetch chunk' });
      }
    }
  });
}

export async function registerServiceWorker(onReady?: () => void): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SW] Browser does not support Service Workers');
    return false;
  }

  ensureSwMessageHandler();

  // If already controlling the page, trigger callback immediately
  if (navigator.serviceWorker.controller) {
    onReady?.();
  }

  // Listen for controller changes (e.g. after hard refresh or first installation)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed — active controller:', navigator.serviceWorker.controller?.scriptURL);
    onReady?.();
  });

  try {
    const basePath = typeof window !== 'undefined'
      ? new URL(import.meta.env.BASE_URL || './', window.location.href).pathname
      : '/';
    const swUrl = `${basePath.replace(/\/+$/, '')}/sw.js`;

    console.log('[SW] Registering ServiceWorker from:', swUrl, 'with scope:', basePath);

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: basePath,
    });

    // Check for updates
    registration.update().catch(() => {});

    // Wait for the SW to become active / ready
    if (!navigator.serviceWorker.controller) {
      await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
    }

    const isReady = !!navigator.serviceWorker.controller || registration.active !== null;
    console.log('[SW] Registration complete. Controller ready:', isReady);
    
    if (isReady) {
      onReady?.();
    }

    return isReady;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return false;
  }
}
