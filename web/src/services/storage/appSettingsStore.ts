export interface ContinueWatchingItem {
  fileId: number;
  fileSize: number;
  fileName: string;
  chatId: number;
  chatTitle: string;
  position: number;
  duration: number;
  lastWatched: number;
  thumbnailUrl?: string;
}

export interface AppSettingsState {
  maxCachedVideos: number;
  downloadWholeFirst: boolean;
  autoNextEpisode: boolean;
  hideClipsBelowMB: number;
}

const STORAGE_KEYS = {
  SETTINGS: 'telestream_app_settings',
  PLAYBACK_POSITIONS: 'telestream_playback_positions',
  CONTINUE_WATCHING: 'telestream_continue_watching',
};

class AppSettingsStore {
  private static instance: AppSettingsStore;
  private settings: AppSettingsState;
  private playbackPositions: Record<number, number> = {};
  private continueWatching: ContinueWatchingItem[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.settings = this.loadSettings();
    this.playbackPositions = this.loadPlaybackPositions();
    this.continueWatching = this.loadContinueWatching();
  }

  public static getInstance(): AppSettingsStore {
    if (!AppSettingsStore.instance) {
      AppSettingsStore.instance = new AppSettingsStore();
    }
    return AppSettingsStore.instance;
  }

  private loadSettings(): AppSettingsState {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        return {
          maxCachedVideos: 3,
          downloadWholeFirst: false,
          autoNextEpisode: true,
          hideClipsBelowMB: 0,
          ...JSON.parse(saved),
        };
      }
    } catch {}
    return {
      maxCachedVideos: 3,
      downloadWholeFirst: false,
      autoNextEpisode: true,
      hideClipsBelowMB: 0,
    };
  }

  private loadPlaybackPositions(): Record<number, number> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYBACK_POSITIONS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  }

  private loadContinueWatching(): ContinueWatchingItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      localStorage.setItem(STORAGE_KEYS.PLAYBACK_POSITIONS, JSON.stringify(this.playbackPositions));
      localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(this.continueWatching));
    } catch {}
    this.notify();
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Getters
  public getSettings(): AppSettingsState {
    return { ...this.settings };
  }

  public getPlaybackPositions(): Record<number, number> {
    return { ...this.playbackPositions };
  }

  public getPosition(fileId: number): number | undefined {
    return this.playbackPositions[fileId];
  }

  public getContinueWatching(): ContinueWatchingItem[] {
    return [...this.continueWatching];
  }

  // Mutations
  public updateSettings(partial: Partial<AppSettingsState>) {
    this.settings = { ...this.settings, ...partial };
    this.persist();
  }

  public savePosition(item: {
    fileId: number;
    fileSize?: number;
    position: number;
    fileName: string;
    chatId: number;
    chatTitle: string;
    duration: number;
    thumbnailUrl?: string;
  }) {
    if (!item.fileId || item.position < 0) return;

    this.playbackPositions[item.fileId] = item.position;

    const existingIndex = this.continueWatching.findIndex((i) => i.fileId === item.fileId);
    const existing = existingIndex >= 0 ? this.continueWatching[existingIndex] : null;

    const updatedItem: ContinueWatchingItem = {
      fileId: item.fileId,
      fileSize: item.fileSize || existing?.fileSize || 0,
      fileName: item.fileName,
      chatId: item.chatId,
      chatTitle: item.chatTitle,
      position: item.position,
      duration: item.duration || existing?.duration || 0,
      lastWatched: Date.now(),
      thumbnailUrl: item.thumbnailUrl || existing?.thumbnailUrl,
    };

    if (existingIndex >= 0) {
      this.continueWatching.splice(existingIndex, 1);
    }
    this.continueWatching.unshift(updatedItem);

    if (this.continueWatching.length > 100) {
      this.continueWatching = this.continueWatching.slice(0, 100);
    }

    this.persist();
  }

  public clearPosition(fileId: number) {
    delete this.playbackPositions[fileId];
    this.continueWatching = this.continueWatching.filter((i) => i.fileId !== fileId);
    this.persist();
  }

  public clearAllPositions() {
    this.playbackPositions = {};
    this.continueWatching = [];
    this.persist();
  }
}

export const appSettingsStore = AppSettingsStore.getInstance();
