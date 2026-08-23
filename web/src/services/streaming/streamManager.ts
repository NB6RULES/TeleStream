import { StreamRangeRequest } from '../../types/stream';
import { tdlibClient } from '../tdlib/tdlibClient';
import { addLog } from '../../components/debug/Logger';

// ─── CONFIGURATION ──────────────────────────────────────────────────
const CHUNK_SIZE = 1024 * 1024; // 1 MB streaming blocks
const MAX_CACHE_ENTRIES = 150;  // Store up to ~150 MB in memory for instant scrubbing
const MAX_PRELOAD_AHEAD_BYTES = 30 * 1024 * 1024; // Preload up to 30 MB ahead of playhead

// ─── IN-MEMORY LRU CHUNK CACHE ──────────────────────────────────────
const chunkCache = new Map<string, ArrayBuffer>();

function setInCache(key: string, buffer: ArrayBuffer) {
  if (chunkCache.has(key)) {
    chunkCache.delete(key);
  } else if (chunkCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = chunkCache.keys().next().value;
    if (oldestKey) chunkCache.delete(oldestKey);
  }
  chunkCache.set(key, buffer);
}

// ─── STATE MANAGEMENT ───────────────────────────────────────────────
let activeFileId: number | null = null;
let currentPlayheadOffset = 0;
let preloadTargetOffset = 0;
let totalFileSize = 0;
let isPreloaderActive = false;

// Urgent queue for user-facing player requests that missed the cache
const urgentQueue: Array<{
  fileId: number;
  start: number;
  end: number;
  resolve: (buf: ArrayBuffer) => void;
  reject: (err: any) => void;
}> = [];

// ─── SMOOTH BITRATE / SPEED TRACKING ────────────────────────────────
let totalDownloadedBytes = 0;
let recentBytes = 0;
let lastStatsTime = Date.now();
let currentSmoothedSpeed = 0;

setInterval(() => {
  const now = Date.now();
  const dt = (now - lastStatsTime) / 1000;
  if (dt >= 0.5) {
    const instantSpeed = recentBytes / dt;
    // Exponential Moving Average for stable display
    if (recentBytes > 0) {
      currentSmoothedSpeed = currentSmoothedSpeed === 0 ? instantSpeed : currentSmoothedSpeed * 0.7 + instantSpeed * 0.3;
    } else if (dt > 1.5) {
      currentSmoothedSpeed = currentSmoothedSpeed * 0.5;
      if (currentSmoothedSpeed < 1024) currentSmoothedSpeed = 0;
    }
    recentBytes = 0;
    lastStatsTime = now;

    window.dispatchEvent(
      new CustomEvent('STREAM_STATS', {
        detail: {
          speed: currentSmoothedSpeed,
          downloaded: totalDownloadedBytes,
        },
      })
    );
  }
}, 500);

// ─── CONTINUOUS BACKGROUND PRELOAD & STREAM WORKER ──────────────────
// Runs sequentially (1 MTProto query at a time) to guarantee zero sender deadlocks
async function runStreamingWorker() {
  if (isPreloaderActive) return;
  isPreloaderActive = true;

  while (true) {
    // 1. Check for high-priority browser requests that missed cache
    if (urgentQueue.length > 0) {
      const task = urgentQueue.shift();
      if (task) {
        const cacheKey = `${task.fileId}_${task.start}_${task.end}`;
        if (chunkCache.has(cacheKey)) {
          task.resolve(chunkCache.get(cacheKey)!);
          continue;
        }

        try {
          addLog(`[Stream] Urgent fetch [${task.start}-${task.end}]...`);
          const buf = await tdlibClient.downloadFileChunk(task.fileId, task.start, task.end);
          
          if (buf.byteLength > 0) {
            totalDownloadedBytes += buf.byteLength;
            recentBytes += buf.byteLength;
            setInCache(cacheKey, buf);
          }
          
          // Adjust preload target to continue smoothly after this urgent chunk
          preloadTargetOffset = Math.max(preloadTargetOffset, task.end + 1);
          task.resolve(buf);
        } catch (err) {
          console.error('[StreamManager] Urgent chunk fetch error:', err);
          task.reject(err);
        }
        continue;
      }
    }

    // 2. Active Continuous Preloading
    if (activeFileId !== null && totalFileSize > 0) {
      const bytesAhead = preloadTargetOffset - currentPlayheadOffset;

      // Keep buffering up to MAX_PRELOAD_AHEAD_BYTES (30MB) ahead of playhead
      if (bytesAhead < MAX_PRELOAD_AHEAD_BYTES && preloadTargetOffset < totalFileSize) {
        const nextStart = preloadTargetOffset;
        const nextEnd = Math.min(nextStart + CHUNK_SIZE - 1, totalFileSize - 1);
        const cacheKey = `${activeFileId}_${nextStart}_${nextEnd}`;

        if (chunkCache.has(cacheKey)) {
          preloadTargetOffset = nextEnd + 1;
          continue;
        }

        try {
          const buf = await tdlibClient.downloadFileChunk(activeFileId, nextStart, nextEnd);
          if (buf && buf.byteLength > 0) {
            totalDownloadedBytes += buf.byteLength;
            recentBytes += buf.byteLength;
            setInCache(cacheKey, buf);
            preloadTargetOffset = nextEnd + 1;
          } else {
            // EOF reached
            preloadTargetOffset = totalFileSize;
          }
        } catch (err) {
          console.warn('[StreamManager] Preload fetch pause:', err);
          await new Promise((r) => setTimeout(r, 1000));
        }

        // Short micro-yield to keep UI responsive
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }
    }

    // If nothing to preload or urgent, pause worker until next request
    if (urgentQueue.length === 0) {
      await new Promise((r) => setTimeout(r, 100));
      // If still inactive after pause, exit loop (will be re-awakened on next request)
      if (urgentQueue.length === 0 && (activeFileId === null || preloadTargetOffset - currentPlayheadOffset >= MAX_PRELOAD_AHEAD_BYTES)) {
        break;
      }
    }
  }

  isPreloaderActive = false;
}

// ─── PUBLIC API: FETCH VIDEO CHUNK ──────────────────────────────────
export async function fetchVideoChunk(req: StreamRangeRequest): Promise<ArrayBuffer> {
  const fileIdNum = Number(req.fileId);
  const cacheKey = `${fileIdNum}_${req.start}_${req.end}`;

  // Update playback tracker
  activeFileId = fileIdNum;
  currentPlayheadOffset = req.start;
  totalFileSize = req.totalSize;

  // If playback seeked ahead or behind, realign preload target
  if (req.start > preloadTargetOffset || req.start + MAX_PRELOAD_AHEAD_BYTES < preloadTargetOffset) {
    preloadTargetOffset = req.end + 1;
  }

  // 1. Instant Cache HIT (0ms latency!)
  if (chunkCache.has(cacheKey)) {
    addLog(`Cache HIT: [${req.start}-${req.end}]`);
    // Ensure background worker keeps feeding upcoming chunks
    runStreamingWorker();
    return chunkCache.get(cacheKey)!;
  }

  // 2. Cache MISS: Queue urgent fetch & awaken streaming worker immediately
  return new Promise((resolve, reject) => {
    urgentQueue.push({
      fileId: fileIdNum,
      start: req.start,
      end: req.end,
      resolve,
      reject,
    });
    runStreamingWorker();
  });
}
