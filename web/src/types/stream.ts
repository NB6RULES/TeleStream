export interface StreamRangeRequest {
  fileId: number;
  start: number;
  end: number;
  totalSize: number;
}

export interface StreamRangeResponse {
  data: Uint8Array | ArrayBuffer;
  start: number;
  end: number;
  totalSize: number;
  mimeType: string;
}

export type AspectRatio = 'fit' | 'cover' | 'stretch' | '16:9' | '4:3';
