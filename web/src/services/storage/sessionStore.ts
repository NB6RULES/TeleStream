import { get, set, del } from 'idb-keyval';
import { ApiCredentials } from '../../types/auth';

const STORAGE_KEYS = {
  API_CREDENTIALS: 'tg_streamer_api_credentials',
  AUTH_SESSION: 'tg_streamer_session',
  USER_PROFILE: 'tg_streamer_user_profile',
  IS_DEMO: 'tg_streamer_is_demo',
  SETTINGS: 'tg_streamer_settings',
};

export interface AppSettings {
  autoPlay: boolean;
  defaultVolume: number;
  bufferAheadChunks: number;
  hwAcceleration: boolean;
  theme: 'dark' | 'midnight' | 'black';
}

export const defaultSettings: AppSettings = {
  autoPlay: true,
  defaultVolume: 0.8,
  bufferAheadChunks: 4,
  hwAcceleration: true,
  theme: 'dark',
};

export const DEFAULT_API_CREDENTIALS: ApiCredentials = {
  apiId: 35445730,
  apiHash: '9725211238ec77a8af28423d60cb9fa2',
};

export const sessionStore = {
  // API Credentials
  async getApiCredentials(): Promise<ApiCredentials> {
    try {
      const stored = await get<ApiCredentials>(STORAGE_KEYS.API_CREDENTIALS);
      if (stored && stored.apiId && stored.apiHash) {
        return stored;
      }
      // Fallback to localStorage
      const local = localStorage.getItem(STORAGE_KEYS.API_CREDENTIALS);
      if (local) {
        return JSON.parse(local);
      }
      return DEFAULT_API_CREDENTIALS;
    } catch {
      return DEFAULT_API_CREDENTIALS;
    }
  },

  async saveApiCredentials(creds: ApiCredentials): Promise<void> {
    await set(STORAGE_KEYS.API_CREDENTIALS, creds);
    localStorage.setItem(STORAGE_KEYS.API_CREDENTIALS, JSON.stringify(creds));
  },

  async clearApiCredentials(): Promise<void> {
    await del(STORAGE_KEYS.API_CREDENTIALS);
    localStorage.removeItem(STORAGE_KEYS.API_CREDENTIALS);
  },

  // Demo Mode
  isDemoMode(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true';
  },

  setDemoMode(isDemo: boolean): void {
    if (isDemo) {
      localStorage.setItem(STORAGE_KEYS.IS_DEMO, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    }
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    try {
      const stored = await get<AppSettings>(STORAGE_KEYS.SETTINGS);
      return { ...defaultSettings, ...(stored || {}) };
    } catch {
      return defaultSettings;
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    await set(STORAGE_KEYS.SETTINGS, { ...current, ...settings });
  },

  // Full Session Clear
  async clearAllSession(): Promise<void> {
    await del(STORAGE_KEYS.API_CREDENTIALS);
    await del(STORAGE_KEYS.AUTH_SESSION);
    await del(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.IS_DEMO);
    localStorage.removeItem(STORAGE_KEYS.API_CREDENTIALS);
  },
};
