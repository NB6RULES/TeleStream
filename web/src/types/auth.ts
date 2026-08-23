export interface ApiCredentials {
  apiId: number | string;
  apiHash: string;
}

export type AuthMode = 'qr' | 'phone' | 'demo';

export interface AuthState {
  isConfigured: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authStep: 
    | 'config'
    | 'choice'
    | 'qr'
    | 'phone'
    | 'code'
    | 'password'
    | 'ready';
  qrLink?: string;
  qrExpiresIn?: number;
  phoneNumber?: string;
  codeInfo?: {
    type: string;
    nextType?: string;
    timeout?: number;
  };
  passwordHint?: string;
  hasRecoveryEmail?: boolean;
}
