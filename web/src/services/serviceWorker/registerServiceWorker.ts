import { StreamRangeRequest } from '../../types/stream';
import { addLog } from '../../components/debug/Logger';

type ChunkProvider = (req: StreamRangeRequest) => Promise<ArrayBuffer | Uint8Array>;

let chunkProviderCallback: ChunkProvider | null = null;

export function setChunkProvider(provider: ChunkProvider) {
  chunkProviderCallback = provider;
}

export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Browser does not support Service Workers');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Force check for updated sw.js on every page load
    registration.update();

    // Wait for the SW to become active if it isn't already
    const sw = registration.active || registration.waiting || registration.installing;
    if (sw && sw.state !== 'activated') {
      await new Promise<void>((resolve) => {
        sw.addEventListener('statechange', function onStateChange() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', onStateChange);
            resolve();
          }
        });
      });
    }

    // If we don't have a controller yet (first install), use clients.claim() in sw.js
    // and wait for controllerchange, but with a simple timeout that just resolves (no reload!)
    if (!navigator.serviceWorker.controller) {
      console.log('[SW] No controller yet, waiting for claim...');
      await Promise.race([
        new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    }

    console.log('[SW] Ready. Controller:', navigator.serviceWorker.controller?.scriptURL || 'pending');

    // Message handler: Service Worker asks us for video chunks via MessageChannel
    const handleSwMessage = async (event: MessageEvent) => {
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
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);

    return !!navigator.serviceWorker.controller;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return false;
  }
}
