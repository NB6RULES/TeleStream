import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { TDLibChat, TDLibUser, VideoItem } from '../../types/tdlib';
import { AuthState } from '../../types/auth';
import { sessionStore } from '../storage/sessionStore';
import { Buffer } from 'buffer';
import bigInt from 'big-integer';
import { getMediaFromCache, saveMediaToCache } from '../cache/thumbnailCache';

type UpdateCallback = (update: any) => void;
type AuthStateCallback = (state: AuthState) => void;

// RFC 4648 Base64URL converter compatible with all browser polyfills
function toBase64Url(data: Buffer | Uint8Array): string {
  const base64 = Buffer.from(data).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to prevent GramJS methods from deadlocking
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

class RealTelegramClient {
  private static instance: RealTelegramClient;
  private client: TelegramClient | null = null;
  private rawChunkCache = new Map<string, Buffer>();
  private apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID || 0);
  private apiHash = import.meta.env.VITE_TELEGRAM_API_HASH || '';

  private updateListeners: Set<UpdateCallback> = new Set();
  private authStateListeners: Set<AuthStateCallback> = new Set();

  private currentAuthState: AuthState = {
    isConfigured: true,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    authStep: 'qr',
  };

  private currentUser: TDLibUser | null = null;
  private phoneCodeHash = '';
  private qrPollTimer: any = null;
  private connectPromise: Promise<void> | null = null;

  // Cache entity references for each chat ID
  private dialogsEntityMap: Map<number, any> = new Map();

  // Cache chat profile photos
  private chatPhotosCache: Map<number, string> = new Map();

  // Cache video thumbnails
  private videoThumbnailsCache: Map<number, string> = new Map();

  // Cache of fetched real messages to stream chunks from
  private mediaMessagesCache: Map<number, Api.Message> = new Map();

  private constructor() {
    this.init();
  }

  public static getInstance(): RealTelegramClient {
    if (!RealTelegramClient.instance) {
      RealTelegramClient.instance = new RealTelegramClient();
    }
    return RealTelegramClient.instance;
  }

  public async ensureConnected(): Promise<void> {
    if (this.client && this.client.connected) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = (async () => {
      try {
        const creds = await sessionStore.getApiCredentials();
        if (creds && creds.apiId) {
          this.apiId = Number(creds.apiId);
          this.apiHash = creds.apiHash;
        }

        console.log('[MTProto] Connecting with API ID:', this.apiId);
        const savedSession = localStorage.getItem('tg_real_session') || '';

        if (!this.client) {
          this.client = new TelegramClient(
            new StringSession(savedSession),
            this.apiId,
            this.apiHash,
            {
              connectionRetries: 5,
              useWSS: true,
            }
          );
        }

        await Promise.race([
          this.client.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection to Telegram edge timed out')), 15000))
        ]);

        console.log('[MTProto] Connected to Telegram edge server successfully');
      } catch (err: any) {
        console.error('[MTProto Connection Error]', err);
        throw err;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  private async init() {
    try {
      await this.ensureConnected();

      // Check if session is already authorized
      if (this.client && (await this.client.checkAuthorization())) {
        const me = (await this.client.getMe()) as Api.User;
        await this.handleUserAuthorized(me);
      } else {
        await this.requestQrCode();
      }
    } catch (err: any) {
      this.currentAuthState = {
        ...this.currentAuthState,
        isLoading: false,
        error: err?.message || 'Failed to connect to Telegram MTProto edge.',
      };
      this.notifyAuthState();
    }
  }

  private async handleUserAuthorized(userObj?: Api.User | Api.TypeUser) {
    if (!this.client) return;
    if (this.qrPollTimer) {
      clearInterval(this.qrPollTimer);
      this.qrPollTimer = null;
    }

    try {
      let me: Api.User;
      if (userObj && 'firstName' in userObj) {
        me = userObj as Api.User;
      } else {
        me = (await this.client.getMe()) as Api.User;
      }

      const sessionStr = this.client.session.save() as unknown as string;
      localStorage.setItem('tg_real_session', sessionStr);

      this.currentUser = {
        id: Number(me.id || 0),
        first_name: me.firstName || 'Telegram User',
        last_name: me.lastName || undefined,
        username: me.username || undefined,
        phone_number: me.phone || undefined,
      };

      console.log('[MTProto] Logged in successfully as:', this.currentUser.first_name, `@${this.currentUser.username || ''}`);

      this.currentAuthState = {
        isConfigured: true,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        authStep: 'ready',
      };
      this.notifyAuthState();
    } catch (e) {
      console.error('[MTProto] Error finalizing user authorization', e);
    }
  }

  public subscribeAuthState(callback: AuthStateCallback): () => void {
    this.authStateListeners.add(callback);
    callback(this.currentAuthState);
    return () => this.authStateListeners.delete(callback);
  }

  public subscribeUpdates(callback: UpdateCallback): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  private notifyAuthState() {
    this.authStateListeners.forEach((cb) => cb({ ...this.currentAuthState }));
  }

  // Request Official Telegram QR Code
  public async requestQrCode() {
    if (this.qrPollTimer) {
      clearInterval(this.qrPollTimer);
      this.qrPollTimer = null;
    }

    this.currentAuthState = {
      ...this.currentAuthState,
      isLoading: true,
      error: null,
      authStep: 'qr',
    };
    this.notifyAuthState();

    try {
      await this.ensureConnected();

      console.log('[MTProto] Invoking ExportLoginToken...');
      const res = await this.client!.invoke(
        new Api.auth.ExportLoginToken({
          apiId: this.apiId,
          apiHash: this.apiHash,
          exceptIds: [],
        })
      );

      if (res instanceof Api.auth.LoginToken) {
        const base64UrlToken = toBase64Url(res.token);
        const realQrLink = `tg://login?token=${base64UrlToken}`;

        console.log('[MTProto] Official Telegram QR Link Generated:', realQrLink);
        this.currentAuthState = {
          ...this.currentAuthState,
          isLoading: false,
          qrLink: realQrLink,
          qrExpiresIn: res.expires,
          authStep: 'qr',
        };
        this.notifyAuthState();

        this.startQrPolling();
      } else if (res instanceof Api.auth.LoginTokenSuccess) {
        if ('user' in res.authorization) {
          await this.handleUserAuthorized(res.authorization.user as Api.User);
        } else {
          await this.handleUserAuthorized();
        }
      } else if (res instanceof Api.auth.LoginTokenMigrateTo) {
        console.log('[MTProto] User authorized, migrating to DC:', res.dcId);
        await (this.client as any)._switchDC(res.dcId);
        const importRes = await this.client!.invoke(
          new Api.auth.ImportLoginToken({
            token: res.token,
          })
        );
        if (importRes instanceof Api.auth.LoginTokenSuccess) {
          if ('user' in importRes.authorization) {
            await this.handleUserAuthorized(importRes.authorization.user as Api.User);
          } else {
            await this.handleUserAuthorized();
          }
        }
      }
    } catch (err: any) {
      console.error('[MTProto QR Error]', err);
      this.currentAuthState = {
        ...this.currentAuthState,
        isLoading: false,
        error: err?.errorMessage || err?.message || 'Could not load Telegram QR code.',
      };
      this.notifyAuthState();
    }
  }

  // Poll for QR approval
  private startQrPolling() {
    if (this.qrPollTimer) clearInterval(this.qrPollTimer);

    this.qrPollTimer = setInterval(async () => {
      if (!this.client || this.currentAuthState.isAuthenticated || this.currentAuthState.authStep !== 'qr') {
        if (this.qrPollTimer) clearInterval(this.qrPollTimer);
        return;
      }

      try {
        const res = await this.client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: this.apiId,
            apiHash: this.apiHash,
            exceptIds: [],
          })
        );

        if (res instanceof Api.auth.LoginTokenSuccess) {
          if (this.qrPollTimer) clearInterval(this.qrPollTimer);
          if ('user' in res.authorization) {
            await this.handleUserAuthorized(res.authorization.user as Api.User);
          } else {
            await this.handleUserAuthorized();
          }
        } else if (res instanceof Api.auth.LoginTokenMigrateTo) {
          console.log('[MTProto Polling] User authorized! Migrating session to DC:', res.dcId);
          if (this.qrPollTimer) clearInterval(this.qrPollTimer);

          await (this.client as any)._switchDC(res.dcId);
          const importRes = await this.client.invoke(
            new Api.auth.ImportLoginToken({
              token: res.token,
            })
          );

          if (importRes instanceof Api.auth.LoginTokenSuccess) {
            if ('user' in importRes.authorization) {
              await this.handleUserAuthorized(importRes.authorization.user as Api.User);
            } else {
              await this.handleUserAuthorized();
            }
          }
        } else if (res instanceof Api.auth.LoginToken) {
          const base64UrlToken = toBase64Url(res.token);
          const realQrLink = `tg://login?token=${base64UrlToken}`;
          if (realQrLink !== this.currentAuthState.qrLink) {
            this.currentAuthState = {
              ...this.currentAuthState,
              qrLink: realQrLink,
              qrExpiresIn: res.expires,
            };
            this.notifyAuthState();
          }
        }
      } catch (err: any) {
        if (err?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
          if (this.qrPollTimer) clearInterval(this.qrPollTimer);
          this.currentAuthState = {
            ...this.currentAuthState,
            isLoading: false,
            authStep: 'password',
            passwordHint: 'Enter your Telegram 2-Step Verification Password to complete login',
          };
          this.notifyAuthState();
        }
      }
    }, 2000);
  }

  // Real Phone Number Auth Request
  public async sendPhoneNumber(phone: string) {
    if (this.qrPollTimer) {
      clearInterval(this.qrPollTimer);
      this.qrPollTimer = null;
    }

    this.currentAuthState = {
      ...this.currentAuthState,
      isLoading: true,
      error: null,
      phoneNumber: phone,
    };
    this.notifyAuthState();

    try {
      await this.ensureConnected();

      console.log('[MTProto] Sending real code to phone:', phone);
      const res = await this.client!.sendCode(
        { apiId: this.apiId, apiHash: this.apiHash },
        phone
      );

      this.phoneCodeHash = res.phoneCodeHash;

      this.currentAuthState = {
        ...this.currentAuthState,
        isLoading: false,
        authStep: 'code',
      };
      this.notifyAuthState();
    } catch (err: any) {
      console.error('[MTProto Send Code Error]', err);
      this.currentAuthState = {
        ...this.currentAuthState,
        isLoading: false,
        error: err?.errorMessage || err?.message || 'Failed to send verification code. Ensure phone number starts with country code (+...).',
      };
      this.notifyAuthState();
    }
  }

  // Submit Real SMS / Telegram App OTP Code
  public async sendAuthCode(code: string) {
    if (!this.client || !this.currentAuthState.phoneNumber) return;

    this.currentAuthState = {
      ...this.currentAuthState,
      isLoading: true,
      error: null,
    };
    this.notifyAuthState();

    try {
      const res = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.currentAuthState.phoneNumber,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: code.trim(),
        })
      );

      if (res instanceof Api.auth.Authorization) {
        await this.handleUserAuthorized(res.user as Api.User);
      } else {
        await this.handleUserAuthorized();
      }
    } catch (err: any) {
      console.warn('[MTProto Auth Code Error]', err);
      if (err?.errorMessage === 'SESSION_PASSWORD_NEEDED' || err?.message?.includes('PASSWORD')) {
        this.currentAuthState = {
          ...this.currentAuthState,
          isLoading: false,
          authStep: 'password',
          passwordHint: 'Enter your Telegram 2-Step Verification Cloud Password',
        };
        this.notifyAuthState();
      } else {
        this.currentAuthState = {
          ...this.currentAuthState,
          isLoading: false,
          error: err?.errorMessage || err?.message || 'Invalid Telegram code. Please check and try again.',
        };
        this.notifyAuthState();
      }
    }
  }

  // Submit Real 2FA Cloud Password
  public async sendPassword(password: string) {
    if (!this.client) return;

    this.currentAuthState = {
      ...this.currentAuthState,
      isLoading: true,
      error: null,
    };
    this.notifyAuthState();

    try {
      const user = await this.client.signInWithPassword(
        { apiId: this.apiId, apiHash: this.apiHash },
        {
          password: async () => password,
          onError: (err) => {
            throw err;
          },
        }
      );

      if (user) {
        await this.handleUserAuthorized(user as Api.User);
      } else {
        await this.handleUserAuthorized();
      }
    } catch (err: any) {
      this.currentAuthState = {
        ...this.currentAuthState,
        isLoading: false,
        error: err?.errorMessage || err?.message || 'Incorrect 2FA password',
      };
      this.notifyAuthState();
    }
  }

  public async logOut() {
    if (this.qrPollTimer) {
      clearInterval(this.qrPollTimer);
      this.qrPollTimer = null;
    }

    this.currentAuthState = {
      ...this.currentAuthState,
      isLoading: true,
    };
    this.notifyAuthState();

    try {
      if (this.client) {
        await this.client.invoke(new Api.auth.LogOut());
      }
      localStorage.removeItem('tg_real_session');
      await sessionStore.clearAllSession();
      this.currentUser = null;
      this.dialogsEntityMap.clear();
      this.chatPhotosCache.clear();
      this.videoThumbnailsCache.clear();
      this.mediaMessagesCache.clear();
      this.currentAuthState = {
        isConfigured: true,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        authStep: 'qr',
      };
      this.notifyAuthState();
      this.requestQrCode();
    } catch (e) {
      console.error('[MTProto Logout]', e);
    }
  }

  public getCurrentUser(): TDLibUser | null {
    return this.currentUser;
  }

  public getAuthState(): AuthState {
    return this.currentAuthState;
  }

  // Update API Credentials and reconnect
  public async setCredentials(creds: { apiId: number | string; apiHash: string }) {
    this.apiId = Number(creds.apiId);
    this.apiHash = creds.apiHash;
    await sessionStore.saveApiCredentials(creds);
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch {}
      this.client = null;
    }
    await this.init();
  }

  // Fetch Real Chats & Saved Messages with Avatars
  public async getChats(): Promise<TDLibChat[]> {
    if (!this.client) return [];

    try {
      const dialogs = await this.client.getDialogs({ limit: 100 });
      const me = (await this.client.getMe()) as Api.User;

      const chatList: TDLibChat[] = [];

      for (const d of dialogs) {
        const entity: any = d.entity;
        const chatId = Number(d.id);
        this.dialogsEntityMap.set(chatId, entity);

        const isSavedMessages = d.isUser && entity?.id?.equals?.(me.id);
        const title = isSavedMessages
          ? 'Saved Messages'
          : d.title || (entity?.firstName ? `${entity.firstName} ${entity.lastName || ''}`.trim() : 'Telegram Chat');

        let photoUrl = this.chatPhotosCache.get(chatId);

        chatList.push({
          id: chatId,
          title,
          type: {
            '@type': d.isChannel ? 'chatTypeSupergroup' : d.isGroup ? 'chatTypeBasicGroup' : 'chatTypePrivate',
            is_channel: d.isChannel,
            user_id: d.isUser ? Number(entity?.id) : undefined,
          },
          photoUrl,
          unread_count: d.unreadCount || 0,
          is_saved_messages: isSavedMessages,
        });
      }

      return chatList;
    } catch (e) {
      console.error('[MTProto Fetch Chats Error]', e);
      return [];
    }
  }

  // Fetch Chat Avatar (DP) lazily on-demand with IndexedDB caching
  public async getChatAvatar(chatId: number): Promise<string | null> {
    if (this.chatPhotosCache.has(chatId)) {
      return this.chatPhotosCache.get(chatId)!;
    }

    // Check IndexedDB first
    const cachedBlob = await getMediaFromCache(`chat_${chatId}`);
    if (cachedBlob) {
      const url = URL.createObjectURL(cachedBlob);
      this.chatPhotosCache.set(chatId, url);
      return url;
    }

    if (!this.client) return null;
    const entity = this.dialogsEntityMap.get(chatId);
    if (!entity) return null;

    return new Promise((resolve) => {
      this.thumbQueue.push(async () => {
        if (this.chatPhotosCache.has(chatId)) {
          return resolve(this.chatPhotosCache.get(chatId)!);
        }

        try {
          const photoBuf = await withTimeout(this.client!.downloadProfilePhoto(entity, { isBig: false }), 15000);
          if (photoBuf && (photoBuf as any).length > 0) {
            const blob = new Blob([new Uint8Array(photoBuf as any)], { type: 'image/jpeg' });
            saveMediaToCache(`chat_${chatId}`, blob); // Save to IndexedDB
            const url = URL.createObjectURL(blob);
            this.chatPhotosCache.set(chatId, url);
            return resolve(url);
          }
        } catch {}
        
        resolve(null);
      });
      this.processThumbQueue();
    });
  }

  // Fetch Real Video & Media Files from a specific Chat
  public async getChatVideos(chatId: number, chatTitle: string): Promise<VideoItem[]> {
    if (!this.client) return [];

    try {
      const entity = this.dialogsEntityMap.get(chatId) || chatId;
      console.log(`[MTProto] Fetching videos for chat ${chatTitle} (ID: ${chatId})...`);

      // Retrieve recent messages from this specific conversation
      const messages = await this.client.getMessages(entity, {
        limit: 100,
      });

      const videoItems: VideoItem[] = [];

      for (const msg of messages) {
        if (!msg.media) continue;

        let doc: Api.Document | null = null;
        let isVideoDoc = false;
        let fileName = '';
        let duration = 0;
        let width = 1920;
        let height = 1080;
        let supportsStreaming = true;

        if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
          doc = msg.media.document;

          for (const attr of doc.attributes) {
            if (attr instanceof Api.DocumentAttributeFilename) {
              fileName = attr.fileName;
            } else if (attr instanceof Api.DocumentAttributeVideo) {
              isVideoDoc = true;
              duration = attr.duration;
              width = attr.w;
              height = attr.h;
              supportsStreaming = attr.supportsStreaming || true;
            }
          }

          const mime = (doc.mimeType || '').toLowerCase();
          const ext = fileName.toLowerCase();
          const isVideoFile =
            isVideoDoc ||
            mime.startsWith('video/') ||
            ext.endsWith('.mp4') ||
            ext.endsWith('.mkv') ||
            ext.endsWith('.avi') ||
            ext.endsWith('.mov') ||
            ext.endsWith('.webm') ||
            ext.endsWith('.m4v') ||
            ext.endsWith('.ts');

          if (!isVideoFile) continue;
        } else {
          continue;
        }

        if (!fileName) {
          fileName = `video_${msg.id}.mp4`;
        }

        // Cache message for real chunk streaming
        this.mediaMessagesCache.set(msg.id, msg);

        const isMkv = fileName.toLowerCase().endsWith('.mkv') || (doc.mimeType || '').includes('matroska');
        const format = isMkv ? 'mkv' : 'mp4';

        // Extract clean display title
        let displayTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[._]/g, ' ').trim();
        if ((!displayTitle || displayTitle.startsWith('video ')) && msg.message) {
          displayTitle = msg.message.split('\n')[0].slice(0, 80);
        }

        let thumbnailUrl = this.videoThumbnailsCache.get(msg.id);

        videoItems.push({
          id: `msg_${msg.id}`,
          messageId: msg.id,
          chatId,
          chatTitle,
          title: displayTitle || `${chatTitle} Video #${msg.id}`,
          fileName,
          fileId: msg.id,
          remoteFileId: String(doc.id),
          size: Number(doc.size),
          duration,
          width,
          height,
          mimeType: doc.mimeType || (isMkv ? 'video/x-matroska' : 'video/mp4'),
          format,
          date: msg.date * 1000,
          caption: msg.message || '',
          thumbnailUrl,
          supportsStreaming,
        });
      }

      return videoItems;
    } catch (e) {
      console.error('[MTProto Fetch Videos Error]', e);
      return [];
    }
  }

  // Queue for thumbnails to prevent MTProto socket flooding (Concurrency: 1)
  // CRITICAL: Telegram aggressively drops sockets if we request multiple concurrent file downloads.
  // If the socket drops, GramJS's sender becomes a permanent zombie and BREAKS video playback!
  private thumbQueue: Array<() => Promise<void>> = [];
  private activeThumbFetches = 0;
  private readonly MAX_CONCURRENT_THUMBS = 1;

  private async processThumbQueue() {
    if (this.activeThumbFetches >= this.MAX_CONCURRENT_THUMBS || this.thumbQueue.length === 0) return;
    
    while (this.thumbQueue.length > 0 && this.activeThumbFetches < this.MAX_CONCURRENT_THUMBS) {
      const task = this.thumbQueue.shift();
      if (task) {
        this.activeThumbFetches++;
        task().finally(() => {
          this.activeThumbFetches--;
          this.processThumbQueue();
        });
      }
    }
  }

  // Fetch a thumbnail on-demand for a single video with IndexedDB caching
  public async getThumbnail(messageId: number): Promise<string | null> {
    if (this.videoThumbnailsCache.has(messageId)) {
      return this.videoThumbnailsCache.get(messageId)!;
    }

    // Check IndexedDB first
    const cachedBlob = await getMediaFromCache(`thumb_${messageId}`);
    if (cachedBlob) {
      const url = URL.createObjectURL(cachedBlob);
      this.videoThumbnailsCache.set(messageId, url);
      return url;
    }

    if (!this.client) return null;
    const msg = this.mediaMessagesCache.get(messageId);
    if (!msg || !msg.media) return null;

    const media = msg.media;
    if (!media) return null;

    return new Promise((resolve) => {
      this.thumbQueue.push(async () => {
        if (this.videoThumbnailsCache.has(messageId)) {
          return resolve(this.videoThumbnailsCache.get(messageId)!);
        }

        try {
          const thumbBuf = await withTimeout(this.client!.downloadMedia(media, { thumb: 1 }), 15000);
          if (thumbBuf && (thumbBuf as any).length > 0) {
            const blob = new Blob([new Uint8Array(thumbBuf as any)], { type: 'image/jpeg' });
            saveMediaToCache(`thumb_${messageId}`, blob); // Save to IndexedDB
            const url = URL.createObjectURL(blob);
            this.videoThumbnailsCache.set(messageId, url);
            return resolve(url);
          }
        } catch {}

        try {
          const thumbBuf2 = await withTimeout(this.client!.downloadMedia(media, { thumb: 0 }), 15000);
          if (thumbBuf2 && (thumbBuf2 as any).length > 0) {
            const blob = new Blob([new Uint8Array(thumbBuf2 as any)], { type: 'image/jpeg' });
            saveMediaToCache(`thumb_${messageId}`, blob); // Save to IndexedDB
            const url = URL.createObjectURL(blob);
            this.videoThumbnailsCache.set(messageId, url);
            return resolve(url);
          }
        } catch {}

        resolve(null);
      });
      this.processThumbQueue();
    });
  }

  // Active full media cache for instant seeking & playback
  private activeVideoBuffers: Map<number, Promise<Uint8Array> | Uint8Array> = new Map();

  // Download media buffer from Telegram MTProto with live progress
  public async getOrDownloadFullMedia(
    fileId: number | string,
    onProgress?: (receivedBytes: number, totalBytes: number) => void
  ): Promise<Uint8Array> {
    const numId = Number(fileId);
    const existing = this.activeVideoBuffers.get(numId);
    if (existing) {
      if (existing instanceof Promise) {
        return await existing;
      }
      return existing;
    }

    if (!this.client) throw new Error('Telegram client not connected');
    const msg = this.mediaMessagesCache.get(numId);
    if (!msg || !msg.media) throw new Error(`Media message ${numId} not found in cache`);

    console.log(`[MTProto Stream] Starting live media download for video #${numId}...`);

    const downloadPromise = (async () => {
      try {
        let buffer: any;

        const doc = msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document 
          ? msg.media.document 
          : null;

        if (doc) {
          const location = new Api.InputDocumentFileLocation({
            id: doc.id,
            accessHash: doc.accessHash,
            fileReference: doc.fileReference,
            thumbSize: '',
          });

          // High-speed parallel chunk download with 512KB part size & 4 workers
          buffer = await (this.client!.downloadFile as any)(location, {
            dcId: doc.dcId,
            workers: 4,
            partSizeKb: 512,
            fileSize: (doc.size as any),
            progressCallback: (downloaded: any, total: any) => {
              const down = Number(downloaded || 0);
              const tot = Number(total || 0);
              if (onProgress && tot > 0) {
                onProgress(down, tot);
              }
            },
          });
        } else {
          buffer = await this.client!.downloadMedia(msg.media!, {
            progressCallback: (downloaded: any, total: any) => {
              const down = Number(downloaded || 0);
              const tot = Number(total || 0);
              if (onProgress && tot > 0) {
                onProgress(down, tot);
              }
            },
          });
        }

        let uint8: Uint8Array;
        if (buffer instanceof Uint8Array) {
          uint8 = buffer;
        } else if (Buffer.isBuffer(buffer)) {
          uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } else if (buffer && typeof buffer === 'object' && 'buffer' in buffer) {
          const buf = buffer as any;
          uint8 = new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength || buf.length);
        } else {
          uint8 = new Uint8Array(0);
        }

        console.log(`[MTProto Stream] Media #${numId} downloaded successfully (${uint8.length} bytes)!`);
        this.activeVideoBuffers.set(numId, uint8);
        return uint8;
      } catch (err) {
        console.error(`[MTProto Stream Error] Failed to download media #${numId}`, err);
        this.activeVideoBuffers.delete(numId);
        throw err;
      }
    })();

    this.activeVideoBuffers.set(numId, downloadPromise);
    return await downloadPromise;
  }

  // Stream video progressively - triggers playback on the very first chunk in <500ms
  public async streamMediaProgressive(
    fileId: number | string,
    onFirstBufferReady: (initialBlobUrl: string, totalBytes: number) => void,
    onProgress?: (received: number, total: number) => void
  ): Promise<Uint8Array> {
    const numId = Number(fileId);
    if (!this.client) throw new Error('Telegram client not connected');
    const msg = this.mediaMessagesCache.get(numId);
    if (!msg || !msg.media) throw new Error(`Media message ${numId} not found in cache`);

    const doc = msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document 
      ? msg.media.document 
      : null;

    const totalSize = doc ? Number(doc.size) : 0;
    const isMkv = (doc?.mimeType || '').includes('matroska');
    const mimeType = isMkv ? 'video/mp4' : (doc?.mimeType || 'video/mp4');

    console.log(`[MTProto Progressive] Starting progressive live stream for #${numId} (${totalSize} bytes)...`);

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    let initialReadyFired = false;

    // Instant Playback Threshold: 1.5MB (or totalSize if smaller)
    const INITIAL_THRESHOLD = Math.min(1.5 * 1024 * 1024, totalSize > 0 ? totalSize : 1.5 * 1024 * 1024);

    try {
      for await (const chunk of this.client.iterDownload({
        file: msg.media,
        requestSize: 512 * 1024,
      })) {
        const raw = chunk as any;
        let uint8: Uint8Array;
        if (chunk instanceof Uint8Array) {
          uint8 = chunk;
        } else if (raw && typeof raw === 'object' && 'buffer' in raw) {
          uint8 = new Uint8Array(raw.buffer, raw.byteOffset || 0, raw.byteLength || raw.length);
        } else {
          continue;
        }

        chunks.push(uint8);
        receivedBytes += uint8.length;

        if (onProgress && totalSize > 0) {
          onProgress(receivedBytes, totalSize);
        }

        // Fire instant playback as soon as the first 1.5MB arrives (~300-500ms!)
        if (!initialReadyFired && receivedBytes >= INITIAL_THRESHOLD) {
          initialReadyFired = true;
          const initialBlob = new Blob(chunks as any, { type: mimeType });
          const initialUrl = URL.createObjectURL(initialBlob);
          console.log(`[MTProto Progressive] First chunk ready (${receivedBytes} bytes)! Firing instant playback.`);
          onFirstBufferReady(initialUrl, totalSize);
        }
      }

      // Combine full buffer
      const fullBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const c of chunks) {
        fullBuffer.set(c, offset);
        offset += c.length;
      }

      this.activeVideoBuffers.set(numId, fullBuffer);

      if (!initialReadyFired) {
        const fullBlob = new Blob([fullBuffer as any], { type: mimeType });
        onFirstBufferReady(URL.createObjectURL(fullBlob), totalSize);
      }

      return fullBuffer;
    } catch (err) {
      console.error('[MTProto Progressive Stream Error]', err);
      throw err;
    }
  }

  // Download a specific byte range from Telegram MTProto for Range Streaming.
  //
  // KEY INSIGHT: GramJS iterDownload auto-calculates limit = ceil(fileSize / chunkSize).
  // If we pass file: msg.media, getFileInfo() extracts the FULL file size â†’ downloads everything.
  // Fix: pass InputDocumentFileLocation (getFileInfo returns size=undefined) with an explicit
  // fileSize equal to ONLY the bytes we need. GramJS then stops after those bytes.
  public async downloadFileChunk(fileId: number | string, start: number, end: number): Promise<ArrayBuffer> {
    if (!this.client) {
      throw new Error('Telegram client not connected');
    }

    const numId = Number(fileId);
    const msg = this.mediaMessagesCache.get(numId);
    if (!msg || !msg.media) {
      throw new Error(`Media message ${numId} not found in cache`);
    }

    const doc = msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document 
      ? msg.media.document 
      : null;

    if (!doc) {
      throw new Error(`Message ${numId} has no document`);
    }

    const length = end - start + 1;
    // MTProto requires offset to be a multiple of the limit (512KB boundaries)
    const ALIGNMENT = 512 * 1024; 


    // Align offset DOWN to 4KB boundary; align end UP to 4KB boundary
    const alignedStart = Math.floor(start / ALIGNMENT) * ALIGNMENT;
    const alignedEnd = Math.ceil((end + 1) / ALIGNMENT) * ALIGNMENT;
    const totalNeeded = alignedEnd - alignedStart;

    // Build a bare InputDocumentFileLocation â€” getFileInfo() will return size=undefined for this,
    // so iterDownload won't auto-calculate a huge limit from the full file size.
    const location = new Api.InputDocumentFileLocation({
      id: doc.id,
      accessHash: doc.accessHash,
      fileReference: doc.fileReference,
      thumbSize: '',
    });

    console.log(`[MTProto Stream] Chunk [${start}-${end}] (need ${totalNeeded} bytes) for msg #${numId}`);

    try {
      const parts: Buffer[] = [];
      let fetched = 0;
      
      const sender = await (this.client as any).getSender(doc.dcId);

      while (fetched < totalNeeded) {
        const partOffset = alignedStart + fetched;
        const currentLimit = 512 * 1024; // ALWAYS 512KB to avoid MTProto LIMIT_INVALID and GenericDownloadIter corruption
        
        const chunkKey = `${doc.id.toString()}_${partOffset}`;
        if (this.rawChunkCache.has(chunkKey)) {
            const cachedPart = this.rawChunkCache.get(chunkKey)!;
            parts.push(cachedPart);
            fetched += cachedPart.length;
            if (cachedPart.length < currentLimit) {
              break;
            }
            continue;
        }

        try {
          const result = await (this.client as any).invokeWithSender(
            new Api.upload.GetFile({
              location: location,
              offset: bigInt(partOffset) as any,
              limit: currentLimit,
            }),
            sender
          );

          if (result && result.bytes && result.bytes.length > 0) {
            this.rawChunkCache.set(chunkKey, result.bytes);
            // Max 200 chunks (100MB) to prevent memory leaks on mobile
            if (this.rawChunkCache.size > 200) {
              const firstKey = this.rawChunkCache.keys().next().value;
              if (firstKey) this.rawChunkCache.delete(firstKey);
            }

            parts.push(result.bytes);
            fetched += result.bytes.length;
            // EOF check: if Telegram returned less than we asked for, we've hit the end of the file
            if (result.bytes.length < currentLimit) {
              break;
            }
          } else {
            break;
          }
        } catch (err: any) {
          const msg = (err?.message || '').toUpperCase();
          if (msg.includes('OFFSET_INVALID') || msg.includes('LIMIT_INVALID')) {
            // We reached EOF or past EOF. Stop fetching.
            break;
          }
          throw err;
        }
      }

      if (parts.length > 0) {
        const combined = Buffer.concat(parts);
        const relativeStart = start - alignedStart;
        const slice = combined.subarray(relativeStart, relativeStart + length);
        return slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength) as ArrayBuffer;
      }
      
      // If we got exactly 0 bytes (at or past EOF), return empty buffer
      // so the Service Worker can properly return HTTP 416 Range Not Satisfiable
      return new ArrayBuffer(0);
    } catch (err: any) {
      const msg = (err?.message || '').toUpperCase();
      if (msg.includes('OFFSET_INVALID') || msg.includes('LIMIT_INVALID')) {
        console.warn(`[MTProto] Out of bounds request [${start}-${end}]. Returning 416 EOF.`);
        return new ArrayBuffer(0);
      }
      
      console.error('[MTProto Stream Error]', err);
      throw err;
    }
  }
}

export const tdlibClient = RealTelegramClient.getInstance();
