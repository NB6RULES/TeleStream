/* eslint-disable no-restricted-globals */
// TeleStream Web - Local Virtual HTTP Stream Server (Mirroring iOS LocalStreamServer)
const SW_VERSION = 'v2.0.0';
const STREAM_PREFIX = '/api/stream/video';

// ─── CHUNK WINDOW: 2MB per range response ─────────────────────────
// Doubled from 1MB → 2MB to reduce round-trips and let the browser buffer further ahead.
// Must match the CHUNK_WINDOW constant in streamManager.ts prefetch logic.
const CHUNK_WINDOW = 2 * 1024 * 1024;

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed TeleStream Loopback Engine:', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated TeleStream Loopback Engine:', SW_VERSION);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept virtual video stream requests
  if (url.pathname.startsWith(STREAM_PREFIX) || url.hostname === 'local.stream') {
    event.respondWith(handleRangeStreamRequest(event.request, url));
  }
});

async function handleRangeStreamRequest(request, url) {
  const fileId = url.searchParams.get('fileId') || '1001';
  const totalSize = parseInt(url.searchParams.get('size') || '0', 10);
  const mimeType = url.searchParams.get('mime') || 'video/mp4';
  const rangeHeader = request.headers.get('range');

  let start = 0;
  let end = totalSize > 0 ? Math.min(CHUNK_WINDOW - 1, totalSize - 1) : CHUNK_WINDOW - 1;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10);
    if (parts[1] && parts[1].length > 0) {
      end = parseInt(parts[1], 10);
    } else {
      // Open-ended range: serve 2MB window from start
      end = totalSize > 0 ? Math.min(start + CHUNK_WINDOW - 1, totalSize - 1) : start + CHUNK_WINDOW - 1;
    }
  }

  // Clamp end to file boundary
  if (totalSize > 0 && end >= totalSize) {
    end = totalSize - 1;
  }

  try {
    const chunkData = await requestDataChunkFromClient(fileId, start, end, totalSize);
    const actualLength = chunkData.byteLength;

    if (actualLength === 0) {
      return new Response(null, {
        status: 416,
        statusText: 'Range Not Satisfiable',
        headers: {
          'Content-Range': `bytes */${totalSize || '*'}`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const actualEnd = start + actualLength - 1;

    return new Response(chunkData, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': mimeType,
        'Content-Range': `bytes ${start}-${actualEnd}/${totalSize || '*'}`,
        'Content-Length': actualLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      },
    });
  } catch (err) {
    console.warn('[ServiceWorker] Range Stream fetch failed', err);
    return new Response('Stream fetch failed', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Request chunk from the active window client via MessageChannel
function requestDataChunkFromClient(fileId, start, end, totalSize) {
  return new Promise(async (resolve, reject) => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    if (!clients || clients.length === 0) {
      return reject(new Error('No active window clients found'));
    }

    const messageChannel = new MessageChannel();
    let settled = false;

    messageChannel.port1.onmessage = (event) => {
      if (settled) return;
      settled = true;
      if (event.data && event.data.error) {
        reject(new Error(event.data.error));
      } else if (event.data && event.data.chunk) {
        resolve(event.data.chunk);
      } else {
        reject(new Error('Invalid response from client'));
      }
    };

    clients[0].postMessage(
      {
        type: 'FETCH_STREAM_CHUNK',
        payload: { fileId, start, end, totalSize },
      },
      [messageChannel.port2]
    );

    // Timeout safety — reduced from 30s to 20s since we now have retries upstream
    setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Fetch chunk timeout (20s)'));
      }
    }, 20000);
  });
}
