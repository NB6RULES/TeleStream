export interface EpisodeInfo {
  season?: number;
  episode: number;
  title: string;
  displayName: string;
}

const patterns: Array<{ regex: RegExp; hasSeason: boolean }> = [
  // S02E04, s02e04, S2E4
  { regex: /[Ss](\d{1,2})[Ee](\d{1,3})/, hasSeason: true },
  // 2x04, 02x04
  { regex: /(\d{1,2})[xX](\d{2,3})/, hasSeason: true },
  // Season 2 Episode 4
  { regex: /[Ss]eason\s*(\d{1,2})\s*[Ee]pisode\s*(\d{1,3})/i, hasSeason: true },
  // EP04, Ep04, ep04 (no season)
  { regex: /[Ee][Pp]\s?(\d{1,3})/i, hasSeason: false },
  // Episode 04
  { regex: /[Ee]pisode\s*(\d{1,3})/i, hasSeason: false },
  // E04 (standalone, no season)
  { regex: /(?<![Ss\d])[Ee](\d{2,3})(?!\d)/, hasSeason: false },
];

export class EpisodeDetector {
  static detect(fileName: string): EpisodeInfo | null {
    const name = fileName;
    for (const { regex, hasSeason } of patterns) {
      const match = regex.exec(name);
      if (match) {
        if (hasSeason && match.length >= 3) {
          const season = parseInt(match[1], 10);
          const episode = parseInt(match[2], 10);
          if (!isNaN(season) && !isNaN(episode)) {
            const title = this.cleanTitle(name);
            const padSeason = season < 10 ? `0${season}` : `${season}`;
            const padEpisode = episode < 10 ? `0${episode}` : `${episode}`;
            return {
              season,
              episode,
              title,
              displayName: `S${padSeason}E${padEpisode}`,
            };
          }
        } else if (!hasSeason && match.length >= 2) {
          const episode = parseInt(match[1], 10);
          if (!isNaN(episode)) {
            const title = this.cleanTitle(name);
            const padEpisode = episode < 10 ? `0${episode}` : `${episode}`;
            return {
              episode,
              title,
              displayName: `E${padEpisode}`,
            };
          }
        }
      }
    }
    return null;
  }

  static findNeighbors(
    currentFileId: number,
    videos: Array<{ fileId: number; fileName: string }>
  ): { prev: number | null; next: number | null } {
    const currentVideo = videos.find((v) => v.fileId === currentFileId);
    if (!currentVideo) return { prev: null, next: null };

    const currentInfo = this.detect(currentVideo.fileName);
    if (!currentInfo) return { prev: null, next: null };

    const sameShow = videos
      .map((v) => {
        const info = this.detect(v.fileName);
        if (!info || info.season !== currentInfo.season) return null;
        return { fileId: v.fileId, info };
      })
      .filter((v): v is { fileId: number; info: EpisodeInfo } => v !== null)
      .sort((a, b) => a.info.episode - b.info.episode);

    const currentIdx = sameShow.findIndex((v) => v.fileId === currentFileId);
    if (currentIdx === -1) return { prev: null, next: null };

    const prev = currentIdx > 0 ? sameShow[currentIdx - 1].fileId : null;
    const next = currentIdx < sameShow.length - 1 ? sameShow[currentIdx + 1].fileId : null;
    return { prev, next };
  }

  static cleanTitle(fileName: string): string {
    let cleaned = fileName;
    // Remove common video file extensions
    cleaned = cleaned.replace(/\.(mp4|mkv|avi|ts|mov|m4v|webm)$/i, '');

    // Remove episode pattern and trailing text
    for (const { regex } of patterns) {
      const match = regex.exec(cleaned);
      if (match && match.index !== undefined) {
        cleaned = cleaned.substring(0, match.index);
        break;
      }
    }

    // Replace dots and underscores with spaces
    cleaned = cleaned.replace(/[._]/g, ' ').trim();
    return cleaned;
  }
}
