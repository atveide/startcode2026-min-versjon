import Foundation

// These mirror frontend/src/api.ts. Decoding is forgiving: a missing optional field
// should never take the whole feed down.

struct StoryImage: Codable, Hashable {
    let src: String
    let alt: String?
    let caption: String?
    let credit: String?
}

/// Adressa's own «Kort oppsummert», unchanged, with its AI and editorial disclosure.
struct Summary: Codable, Hashable {
    let heading: String
    let bullets: [String]
    let source: String
    let sourceUrl: String
    let disclosure: String?
    let disclosureUrl: String?
}

struct Block: Codable, Hashable {
    let type: String
    let text: String?
    let items: [String]?
}

struct Story: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let url: String
    let category: String
    let source: String
    let publishedAt: String
    let modifiedAt: String?
    let authors: [String]
    let lead: String?
    let summary: Summary?
    let image: StoryImage?
    let body: [Block]
    /// True when the backend has the full article text (a local Adressa import).
    let imported: Bool

    private enum CodingKeys: String, CodingKey {
        case id, title, url, category, source, publishedAt, modifiedAt, authors, lead, summary, image, body, imported
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        url = try c.decode(String.self, forKey: .url)
        category = (try? c.decode(String.self, forKey: .category)) ?? "Nyheter"
        source = (try? c.decode(String.self, forKey: .source)) ?? "Adresseavisen"
        publishedAt = (try? c.decode(String.self, forKey: .publishedAt)) ?? ""
        modifiedAt = try? c.decodeIfPresent(String.self, forKey: .modifiedAt)
        authors = (try? c.decodeIfPresent([String].self, forKey: .authors)) ?? []
        lead = try? c.decodeIfPresent(String.self, forKey: .lead)
        summary = try? c.decodeIfPresent(Summary.self, forKey: .summary)
        image = try? c.decodeIfPresent(StoryImage.self, forKey: .image)
        body = (try? c.decodeIfPresent([Block].self, forKey: .body)) ?? []
        imported = (try? c.decodeIfPresent(Bool.self, forKey: .imported)) ?? false
    }
}

struct StoriesResponse: Decodable {
    let week: Int
    let importedAt: String?
    let stories: [Story]
}

struct Headline: Codable, Hashable, Identifiable {
    let id: Int
    let text: String
    let storyId: String

    private enum CodingKeys: String, CodingKey {
        case id, text
        case storyId = "story_id"
    }
}

struct Quiz: Codable, Hashable {
    let id: String
    let date: String
    let week: Int
    let maxHints: Int
    let headlines: [Headline]

    private enum CodingKeys: String, CodingKey {
        case id, date, week, headlines
        case maxHints = "max_hints"
    }
}

struct GuessResult: Decodable {
    let score: Int
    let solved: Bool
    let answer: String?
    let fullText: String?

    private enum CodingKeys: String, CodingKey {
        case score, solved, answer
        case fullText = "full_text"
    }
}

struct HintResult: Decodable {
    let hint: String
    let level: Int
    let maxLevel: Int

    private enum CodingKeys: String, CodingKey {
        case hint, level
        case maxLevel = "max_level"
    }
}

struct RevealResult: Decodable {
    let answer: String
    let fullText: String

    private enum CodingKeys: String, CodingKey {
        case answer
        case fullText = "full_text"
    }
}

/// What the app shows once the week and today's game are loaded.
struct Content {
    let stories: [Story]
    let storiesById: [String: Story]
    let importedAt: String?
    let quiz: Quiz

    init(stories: StoriesResponse, quiz: Quiz) {
        self.stories = stories.stories
        self.storiesById = Dictionary(stories.stories.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        self.importedAt = stories.importedAt
        self.quiz = quiz
    }

    var week: Int { quiz.week }
}
