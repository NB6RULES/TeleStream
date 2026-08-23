import { StreamRangeRequest } from '../../types/stream';
import { tdlibClient } from '../tdlib/tdlibClient';
import { addLog } from '../../components/debug/Logger';

// In-memory cache for downloaded chunks to ensure ultra-fast scrubbing
const chunkCache = new Map<string, ArrayBuffer>();

// Queue to serialize requests and prevent Telegram FloodWaits / Sender Deadlocks
let isFetching = false;
const requestQueue: Array<() => Promise<void>> = [];

// Stats tracking for Network UI
let totalDownloadedBytes = 0;
let lastBytesTime = Date.now();
let currentSpeedBps = 0;
let recentBytes = 0;

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastBytesTime) / 1000;
  if (dt > 1 && recentBytes > 0) {
    currentSpeedBps = recentBytes / dt;
    recentBytes = 0;
    lastBytesTime = now;
    
    // Dispatch stats update
    window.dispatchEvent(new CustomEvent('STREAM_STATS', { 
      detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes } 
    }));
  } else if (dt > 2 && recentBytes === 0) {
    currentSpeedBps = 0; // decay to 0 if inactive
    window.dispatchEvent(new CustomEvent('STREAM_STATS', { 
      detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes } 
    }));
  }
}, 1000);

async function processQueue() {
  if (isFetching || requestQueue.length === 0) return;
  isFetching = true;
  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error('Task error', err);
      }
    }
  }
  isFetching = false;
}

export async function fetchVideoChunk(req: StreamRangeRequest): Promise<ArrayBuffer> {
  const fileIdNum = Number(req.fileId);
  const cacheKey = `${fileIdNum}_${req.start}_${req.end}`;
  if (chunkCache.has(cacheKey)) {
    addLog(`Cache HIT: [${req.start}-${req.end}]`);
    return chunkCache.get(cacheKey)!;
  }

  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        addLog(`Fetching chunk [${req.start}-${req.end}]...`);
        const buffer = await tdlibClient.downloadFileChunk(fileIdNum, req.start, req.end);
        addLog(`Fetched [${req.start}-${req.end}] (${buffer.byteLength} bytes)`);
        
        totalDownloadedBytes += buffer.byteLength;
        recentBytes += buffer.byteLength;
        window.dispatchEvent(new CustomEvent('STREAM_STATS', { 
          detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes } 
        }));

        // Cache up to 100 recent chunks
        if (chunkCache.size > 100) {
          const firstKey = chunkCache.keys().next().value;
          if (firstKey) chunkCache.delete(firstKey);
        }
        chunkCache.set(cacheKey, buffer);
        resolve(buffer);
      } catch (e) {
        console.error(`[StreamManager] Error downloading chunk for file ${fileIdNum}:`, e);
        reject(e);
      }
    });
    processQueue();
  });
}
