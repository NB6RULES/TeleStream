export class FuzzySearch {
  static matches(query: string, target: string): boolean {
    const queryWords = this.tokenize(query);
    const targetWords = this.tokenize(target);

    if (queryWords.length === 0) return true;
    if (targetWords.length === 0) return false;

    let matchCount = 0;
    for (const qWord of queryWords) {
      for (const tWord of targetWords) {
        if (this.fuzzyWordMatch(qWord, tWord)) {
          matchCount++;
          break;
        }
      }
    }

    const threshold = Math.max(1, Math.floor(queryWords.length / 2));
    return matchCount >= threshold;
  }

  static score(query: string, target: string): number {
    const queryWords = this.tokenize(query);
    const targetWords = this.tokenize(target);

    if (queryWords.length === 0) return 1.0;
    if (targetWords.length === 0) return 0.0;

    let totalScore = 0.0;
    for (const qWord of queryWords) {
      let bestMatch = 0.0;
      for (const tWord of targetWords) {
        const s = this.wordScore(qWord, tWord);
        bestMatch = Math.max(bestMatch, s);
      }
      totalScore += bestMatch;
    }
    return totalScore / queryWords.length;
  }

  private static tokenize(text: string): string[] {
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.split(/[^a-z0-9]+/i).filter((s) => s.length > 0);
  }

  private static fuzzyWordMatch(query: string, target: string): boolean {
    if (target.includes(query)) return true;
    if (target.startsWith(query) || query.startsWith(target)) return true;
    const maxDist = query.length <= 3 ? 1 : 2;
    if (this.levenshtein(query, target) <= maxDist) return true;
    if (this.hasTransposition(query, target)) return true;
    return false;
  }

  private static wordScore(query: string, target: string): number {
    if (query === target) return 1.0;
    if (target.includes(query)) return 0.9;
    if (target.startsWith(query)) return 0.85;

    const dist = this.levenshtein(query, target);
    const maxLen = Math.max(query.length, target.length);
    if (maxLen === 0) return 1.0;

    const similarity = 1.0 - dist / maxLen;
    return Math.max(0, similarity);
  }

  private static levenshtein(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    let curr = new Array(n + 1).fill(0);

    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = [...curr];
    }
    return prev[n];
  }

  private static hasTransposition(s1: string, s2: string): boolean {
    if (s1.length !== s2.length || s1.length < 2) return false;
    const diffs: number[] = [];
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i]) diffs.push(i);
      if (diffs.length > 2) return false;
    }
    if (diffs.length !== 2) return false;
    const [i, j] = diffs;
    return s1[i] === s2[j] && s1[j] === s2[i];
  }
}
