import { StreamRangeRequest } from '../../types/stream';
import { tdlibClient } from '../tdlib/tdlibClient';
import { addLog } from '../../components/debug/Logger';

// ─── CONFIG ────────────────────────────────────────────────────────
const MAX_CONCURRENT = 3;          // Allow 3 parallel MTProto chunk fetches
const MAX_RETRIES = 2;             // Retry failed chunks up to 2 times
const RETRY_DELAY_MS = 500;        // Base delay between retries (doubles each retry)
const CACHE_MAX_ENTRIES = 200;     // In-memory LRU chunk cache size
const PREFETCH_AHEAD = 2;          // Prefetch this many chunks ahead of current request

// ─── IN-MEMORY CHUNK CACHE (LRU) ──────────────────────────────────
const chunkCache = new Map<string, ArrayBuffer>();

function cacheSet(key: string, buffer: ArrayBuffer) {
  // Move to end (LRU) by deleting and re-inserting
  if (chunkCache.has(key)) chunkCache.delete(key);
  chunkCache.set(key, buffer);
  // Evict oldest entries if over limit
  while (chunkCache.size > CACHE_MAX_ENTRIES) {
    const oldest = chunkCache.keys().next().value;
    if (oldest) chunkCache.delete(oldest);
  }
}

// ─── CONCURRENCY-LIMITED SEMAPHORE ─────────────────────────────────
// Replaces the old serialized boolean gate with a proper semaphore
// that allows up to MAX_CONCURRENT parallel chunk downloads
let activeCount = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      activeCount++;
      resolve();
    });
  });
}

function releaseSlot() {
  activeCount--;
  if (waitQueue.length > 0 && activeCount < MAX_CONCURRENT) {
    const next = waitQueue.shift();
    if (next) next();
  }
}

// ─── STATS TRACKING ───────────────────────────────────────────────
let totalDownloadedBytes = 0;
let lastBytesTime = Date.now();
let currentSpeedBps = 0;
let recentBytes = 0;

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastBytesTime) / 1000;
  if (dt > 0.5 && recentBytes > 0) {
    currentSpeedBps = recentBytes / dt;
    recentBytes = 0;
    lastBytesTime = now;
    window.dispatchEvent(new CustomEvent('STREAM_STATS', {
      detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes }
    }));
  } else if (dt > 2 && recentBytes === 0) {
    currentSpeedBps = 0;
    window.dispatchEvent(new CustomEvent('STREAM_STATS', {
      detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes }
    }));
  }
}, 500); // Update stats every 500ms for smoother UI

// ─── RETRY WRAPPER ────────────────────────────────────────────────
async function fetchWithRetry(
  fileIdNum: number,
  start: number,
  end: number,
  attempt: number = 0
): Promise<ArrayBuffer> {
  try {
    return await tdlibClient.downloadFileChunk(fileIdNum, start, end);
  } catch (err: any) {
    const errMsg = (err?.message || '').toUpperCase();
    // Don't retry on permanent errors
    if (errMsg.includes('NOT FOUND') || errMsg.includes('NOT CONNECTED')) {
      throw err;
    }
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      addLog(`Retry ${attempt + 1}/${MAX_RETRIES} for [${start}-${end}] in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return fetchWithRetry(fileIdNum, start, end, attempt + 1);
    }
    throw err;
  }
}

// ─── IN-FLIGHT DEDUP ──────────────────────────────────────────────
// Prevent duplicate requests for the same chunk range
const inFlight = new Map<string, Promise<ArrayBuffer>>();

// ─── PREFETCH TRACKER ─────────────────────────────────────────────
// Track which file's chunks we should prefetch
const prefetchInProgress = new Set<string>();

// ─── CORE CHUNK FETCHER (with concurrency, retries, dedup) ────────
async function fetchChunkInternal(
  fileIdNum: number,
  start: number,
  end: number,
  _totalSize: number,
  isPrefetch: boolean = false
): Promise<ArrayBuffer> {
  const cacheKey = `${fileIdNum}_${start}_${end}`;

  // 1. Check memory cache
  if (chunkCache.has(cacheKey)) {
    if (!isPrefetch) addLog(`Cache HIT: [${start}-${end}]`);
    return chunkCache.get(cacheKey)!;
  }

  // 2. Check if already in-flight (dedup)
  if (inFlight.has(cacheKey)) {
    if (!isPrefetch) addLog(`Dedup JOIN: [${start}-${end}]`);
    return inFlight.get(cacheKey)!;
  }

  // 3. Create the fetch promise
  const fetchPromise = (async () => {
    await acquireSlot();
    try {
      if (!isPrefetch) addLog(`Fetching [${start}-${end}]...`);
      const buffer = await fetchWithRetry(fileIdNum, start, end);
      if (!isPrefetch) addLog(`Fetched [${start}-${end}] (${buffer.byteLength} bytes)`);

      // Track stats
      totalDownloadedBytes += buffer.byteLength;
      recentBytes += buffer.byteLength;
      window.dispatchEvent(new CustomEvent('STREAM_STATS', {
        detail: { speed: currentSpeedBps, downloaded: totalDownloadedBytes }
      }));

      // Cache the chunk
      cacheSet(cacheKey, buffer);
      return buffer;
    } finally {
      releaseSlot();
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// ─── PREFETCH: speculatively fetch upcoming chunks ────────────────
function triggerPrefetch(fileIdNum: number, currentEnd: number, totalSize: number) {
  if (totalSize <= 0) return;

  // Standard chunk window (must match sw.js CHUNK_WINDOW)
  const CHUNK_WINDOW = 2 * 1024 * 1024; // 2MB

  for (let i = 1; i <= PREFETCH_AHEAD; i++) {
    const prefetchStart = currentEnd + 1 + (i - 1) * CHUNK_WINDOW;
    const prefetchEnd = Math.min(prefetchStart + CHUNK_WINDOW - 1, totalSize - 1);

    if (prefetchStart >= totalSize) break;

    const prefetchKey = `${fileIdNum}_${prefetchStart}_${prefetchEnd}`;
    if (chunkCache.has(prefetchKey) || prefetchInProgress.has(prefetchKey)) continue;

    prefetchInProgress.add(prefetchKey);
    addLog(`Prefetch queued: [${prefetchStart}-${prefetchEnd}]`);

    fetchChunkInternal(fileIdNum, prefetchStart, prefetchEnd, totalSize, true)
      .catch(() => { /* prefetch failures are silent */ })
      .finally(() => prefetchInProgress.delete(prefetchKey));
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────────
export async function fetchVideoChunk(req: StreamRangeRequest): Promise<ArrayBuffer> {
  const fileIdNum = Number(req.fileId);

  // Fetch the requested chunk (with concurrency + retries + dedup)
  const buffer = await fetchChunkInternal(fileIdNum, req.start, req.end, req.totalSize, false);

  // Fire-and-forget: prefetch the next chunks for smooth playback
  triggerPrefetch(fileIdNum, req.end, req.totalSize);

  return buffer;
}
