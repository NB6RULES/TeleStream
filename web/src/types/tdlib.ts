// Telegram TDLib Types and MTProto definitions

export type TDLibAuthState =
  | 'authorizationStateWaitTdlibParameters'
  | 'authorizationStateWaitEncryptionKey'
  | 'authorizationStateWaitPhoneNumber'
  | 'authorizationStateWaitCode'
  | 'authorizationStateWaitOtherDeviceConfirmation' // QR code
  | 'authorizationStateWaitRegistration'
  | 'authorizationStateWaitPassword' // 2FA Cloud Password
  | 'authorizationStateReady'
  | 'authorizationStateLoggingOut'
  | 'authorizationStateClosing'
  | 'authorizationStateClosed';

export interface TDLibUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
  profile_photo?: {
    small?: { local: { path?: string; id?: number } };
    big?: { local: { path?: string; id?: number } };
  };
}

export interface TDLibChat {
  id: number;
  type: {
    '@type': 'chatTypePrivate' | 'chatTypeBasicGroup' | 'chatTypeSupergroup' | 'chatTypeSecret';
    is_channel?: boolean;
    user_id?: number;
  };
  title: string;
  photo?: {
    small?: { local: { path?: string; id?: number } };
    minithumbnail?: { data: string };
  };
  photoUrl?: string;
  unread_count: number;
  last_message?: TDLibMessage;
  is_saved_messages?: boolean;
}

export interface TDLibVideo {
  duration: number; // in seconds
  width: number;
  height: number;
  file_name: string;
  mime_type: string;
  has_stickers?: boolean;
  supports_streaming: boolean;
  minithumbnail?: {
    data: string; // Base64 thumbnail preview
    width: number;
    height: number;
  };
  thumbnail?: {
    file: TDLibFile;
    width: number;
    height: number;
  };
  video: TDLibFile;
}

export interface TDLibDocument {
  file_name: string;
  mime_type: string;
  minithumbnail?: {
    data: string;
    width: number;
    height: number;
  };
  thumbnail?: {
    file: TDLibFile;
    width: number;
    height: number;
  };
  document: TDLibFile;
}

export interface TDLibFile {
  id: number;
  size: number;
  expected_size?: number;
  local: {
    path: string;
    can_be_downloaded: boolean;
    can_be_deleted: boolean;
    is_downloading_active: boolean;
    is_downloading_completed: boolean;
    download_offset: number;
    downloaded_prefix_size: number;
    downloaded_size: number;
  };
  remote: {
    id: string;
    unique_id: string;
    is_uploading_active: boolean;
    is_uploading_completed: boolean;
    uploaded_size: number;
  };
}

export interface TDLibMessage {
  id: number;
  chat_id: number;
  sender_id: {
    '@type': 'messageSenderUser' | 'messageSenderChat';
    user_id?: number;
    chat_id?: number;
  };
  date: number; // UNIX timestamp
  content: {
    '@type': 'messageVideo' | 'messageDocument' | 'messageText' | string;
    video?: TDLibVideo;
    document?: TDLibDocument;
    caption?: {
      text: string;
    };
  };
}

export interface VideoItem {
  id: string;
  messageId: number;
  chatId: number;
  chatTitle: string;
  title: string;
  fileName: string;
  fileId: number;
  remoteFileId: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
  format: 'mp4' | 'mkv' | 'webm' | 'mov' | 'other';
  date: number;
  thumbnailUrl?: string;
  miniThumbnail?: string;
  caption?: string;
  supportsStreaming: boolean;
}
