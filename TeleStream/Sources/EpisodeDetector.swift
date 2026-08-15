import Foundation

struct EpisodeInfo: Equatable {
    let season: Int?
    let episode: Int
    let title: String

    var displayName: String {
        if let s = season {
            return "S\(String(format: "%02d", s))E\(String(format: "%02d", episode))"
        }
        return "E\(String(format: "%02d", episode))"
    }
}

struct EpisodeDetector {
    private static let patterns: [(NSRegularExpression, Bool)] = {
        let defs: [(String, Bool)] = [
            // S02E04, s02e04, S2E4
            (#"[Ss](\d{1,2})[Ee](\d{1,3})"#, true),
            // 2x04, 02x04
            (#"(\d{1,2})[xX](\d{2,3})"#, true),
            // Season 2 Episode 4
            (#"[Ss]eason\s*(\d{1,2})\s*[Ee]pisode\s*(\d{1,3})"#, true),
            // EP04, Ep04, ep04 (no season)
            (#"[Ee][Pp]\s?(\d{1,3})"#, false),
            // Episode 04
            (#"[Ee]pisode\s*(\d{1,3})"#, false),
            // E04 (standalone, no season)
            (#"(?<![Ss\d])[Ee](\d{2,3})(?!\d)"#, false),
        ]
        return defs.compactMap { (pattern, hasSeason) in
            guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
            return (regex, hasSeason)
        }
    }()

    static func detect(from fileName: String) -> EpisodeInfo? {
        let name = fileName
        for (regex, hasSeason) in patterns {
            let range = NSRange(name.startIndex..., in: name)
            if let match = regex.firstMatch(in: name, range: range) {
                if hasSeason && match.numberOfRanges >= 3 {
                    guard let seasonRange = Range(match.range(at: 1), in: name),
                          let episodeRange = Range(match.range(at: 2), in: name),
                          let season = Int(name[seasonRange]),
                          let episode = Int(name[episodeRange]) else { continue }
                    let title = cleanTitle(from: name)
                    return EpisodeInfo(season: season, episode: episode, title: title)
                } else if !hasSeason && match.numberOfRanges >= 2 {
                    guard let episodeRange = Range(match.range(at: 1), in: name),
                          let episode = Int(name[episodeRange]) else { continue }
                    let title = cleanTitle(from: name)
                    return EpisodeInfo(season: nil, episode: episode, title: title)
                }
            }
        }
        return nil
    }

    static func findNeighbors(currentFileId: Int, videos: [(fileId: Int, fileName: String)]) -> (prev: Int?, next: Int?) {
        guard let currentInfo = detect(from: videos.first(where: { $0.fileId == currentFileId })?.fileName ?? "") else {
            return (nil, nil)
        }

        let sameShow = videos.compactMap { v -> (fileId: Int, info: EpisodeInfo)? in
            guard let info = detect(from: v.fileName) else { return nil }
            if info.season != currentInfo.season { return nil }
            return (v.fileId, info)
        }.sorted { $0.info.episode < $1.info.episode }

        guard let currentIdx = sameShow.firstIndex(where: { $0.fileId == currentFileId }) else {
            return (nil, nil)
        }

        let prev = currentIdx > 0 ? sameShow[currentIdx - 1].fileId : nil
        let next = currentIdx < sameShow.count - 1 ? sameShow[currentIdx + 1].fileId : nil
        return (prev, next)
    }

    private static func cleanTitle(from name: String) -> String {
        var cleaned = name
        // Remove file extension
        if let dotRange = cleaned.range(of: ".", options: .backwards) {
            let ext = String(cleaned[dotRange.upperBound...]).lowercased()
            if ["mp4", "mkv", "avi", "ts", "mov", "m4v"].contains(ext) {
                cleaned = String(cleaned[..<dotRange.lowerBound])
            }
        }
        // Remove episode pattern and everything after
        for (regex, _) in patterns {
            let range = NSRange(cleaned.startIndex..., in: cleaned)
            if let match = regex.firstMatch(in: cleaned, range: range),
               let r = Range(match.range, in: cleaned) {
                cleaned = String(cleaned[..<r.lowerBound])
                break
            }
        }
        // Replace dots and underscores with spaces
        cleaned = cleaned.replacingOccurrences(of: ".", with: " ")
        cleaned = cleaned.replacingOccurrences(of: "_", with: " ")
        cleaned = cleaned.trimmingCharacters(in: .whitespaces)
        return cleaned
    }
}
