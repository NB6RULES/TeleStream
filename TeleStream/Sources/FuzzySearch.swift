import Foundation

struct FuzzySearch {
    static func matches(query: String, target: String) -> Bool {
        let queryWords = tokenize(query)
        let targetWords = tokenize(target)

        if queryWords.isEmpty { return true }
        if targetWords.isEmpty { return false }

        var matchCount = 0
        for qWord in queryWords {
            for tWord in targetWords {
                if fuzzyWordMatch(qWord, tWord) {
                    matchCount += 1
                    break
                }
            }
        }

        // At least half the query words must match, minimum 1
        let threshold = max(1, queryWords.count / 2)
        return matchCount >= threshold
    }

    static func score(query: String, target: String) -> Double {
        let queryWords = tokenize(query)
        let targetWords = tokenize(target)

        if queryWords.isEmpty { return 1.0 }
        if targetWords.isEmpty { return 0.0 }

        var totalScore = 0.0
        for qWord in queryWords {
            var bestMatch = 0.0
            for tWord in targetWords {
                let s = wordScore(qWord, tWord)
                bestMatch = max(bestMatch, s)
            }
            totalScore += bestMatch
        }
        return totalScore / Double(queryWords.count)
    }

    private static func tokenize(_ text: String) -> [String] {
        let normalized = text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
        return normalized.components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
    }

    private static func fuzzyWordMatch(_ query: String, _ target: String) -> Bool {
        // Exact substring
        if target.contains(query) { return true }
        // Prefix match
        if target.hasPrefix(query) || query.hasPrefix(target) { return true }
        // Levenshtein distance <= threshold
        let maxDist = query.count <= 3 ? 1 : 2
        if levenshtein(query, target) <= maxDist { return true }
        // Transposition check (two letters swapped)
        if hasTransposition(query, target) { return true }
        return false
    }

    private static func wordScore(_ query: String, _ target: String) -> Double {
        if query == target { return 1.0 }
        if target.contains(query) { return 0.9 }
        if target.hasPrefix(query) { return 0.85 }

        let dist = levenshtein(query, target)
        let maxLen = max(query.count, target.count)
        if maxLen == 0 { return 1.0 }

        let similarity = 1.0 - (Double(dist) / Double(maxLen))
        return max(0, similarity)
    }

    private static func levenshtein(_ s1: String, _ s2: String) -> Int {
        let a = Array(s1)
        let b = Array(s2)
        let m = a.count
        let n = b.count

        if m == 0 { return n }
        if n == 0 { return m }

        var prev = Array(0...n)
        var curr = Array(repeating: 0, count: n + 1)

        for i in 1...m {
            curr[0] = i
            for j in 1...n {
                let cost = a[i-1] == b[j-1] ? 0 : 1
                curr[j] = min(prev[j] + 1, curr[j-1] + 1, prev[j-1] + cost)
            }
            prev = curr
        }
        return prev[n]
    }

    private static func hasTransposition(_ s1: String, _ s2: String) -> Bool {
        guard s1.count == s2.count && s1.count >= 2 else { return false }
        let a = Array(s1)
        let b = Array(s2)
        var diffs: [Int] = []
        for i in 0..<a.count {
            if a[i] != b[i] { diffs.append(i) }
            if diffs.count > 2 { return false }
        }
        guard diffs.count == 2 else { return false }
        let i = diffs[0], j = diffs[1]
        return a[i] == b[j] && a[j] == b[i]
    }
}
