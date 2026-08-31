export interface CodecCompatibilityInfo {
  hasUnsupportedAudio: boolean;
  codecName: string;
  codecDescription: string;
  browserName: string;
  osName: string;
  isUnsupportedInBrowser: boolean;
}

export class AudioCodecDetector {
  static detect(fileName: string, _mimeType?: string): CodecCompatibilityInfo {
    const fn = (fileName || '').toUpperCase();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isWindows = /Windows|Win32|Win64/i.test(ua);
    const isApple = /Macintosh|iPhone|iPad|iPod/i.test(ua);
    const isEdge = /Edg\//i.test(ua);
    const isChrome = /Chrome\//i.test(ua) && !isEdge;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

    let codecName = '';
    let codecDescription = '';
    let hasUnsupportedAudio = false;

    if (/DDP5[._]?1|DDP|EAC3|E-AC-3|DOLBY.?DIGITAL.?PLUS|ATMOS/i.test(fn)) {
      codecName = 'Dolby Digital Plus 5.1 (DDP / E-AC-3)';
      codecDescription = 'High-definition Dolby 5.1 surround sound.';
      hasUnsupportedAudio = true;
    } else if (/\bAC3\b|DD5[._]?1|DOLBY.?DIGITAL/i.test(fn)) {
      codecName = 'Dolby Digital 5.1 (AC-3)';
      codecDescription = 'Multi-channel Dolby AC-3 surround sound.';
      hasUnsupportedAudio = true;
    } else if (/DTS-HD|DTS-MA|DTS-X|\bDTS\b/i.test(fn)) {
      codecName = 'DTS Surround Audio';
      codecDescription = 'High-bitrate DTS cinema audio track.';
      hasUnsupportedAudio = true;
    } else if (/TRUEHD/i.test(fn)) {
      codecName = 'Dolby TrueHD Lossless';
      codecDescription = 'Lossless studio master audio track.';
      hasUnsupportedAudio = true;
    }

    // Apple devices (iOS / Safari / macOS) and Edge on Windows support hardware Dolby decoding
    const isUnsupportedInBrowser = hasUnsupportedAudio && !isApple && (!isEdge || !isWindows);

    let browserName = 'Browser';
    if (isEdge) browserName = 'Microsoft Edge';
    else if (isChrome) browserName = 'Google Chrome';
    else if (isSafari) browserName = 'Safari';
    else if (/Firefox/i.test(ua)) browserName = 'Firefox';

    let osName = 'Windows';
    if (/iPhone|iPad|iPod/i.test(ua)) osName = 'iOS';
    else if (/Android/i.test(ua)) osName = 'Android';
    else if (/Macintosh|Mac/i.test(ua)) osName = 'macOS';

    return {
      hasUnsupportedAudio,
      codecName,
      codecDescription,
      browserName,
      osName,
      isUnsupportedInBrowser,
    };
  }
}
