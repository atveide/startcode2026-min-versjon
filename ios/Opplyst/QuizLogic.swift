import Foundation

// Port of frontend/src/quiz.ts and frontend/src/logic.ts. Same rules, same texts.

let blankMarker = "___"
let maxPoints = 10

struct Guess: Codable, Hashable {
    var word: String
    var score: Int
}

struct QuestionState: Codable, Hashable {
    var guesses: [Guess] = []
    var hints = 0
    var hint: String?
    /// Set once the question is solved or given up.
    var answer: String?
    var fullText: String?
    var gaveUp = false
    /// Opened the story behind the question.
    var readStory = false

    init() {}

    private enum CodingKeys: String, CodingKey {
        case guesses, hints, hint, answer, fullText, gaveUp, readStory
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        guesses = (try? c.decodeIfPresent([Guess].self, forKey: .guesses)) ?? []
        hints = (try? c.decodeIfPresent(Int.self, forKey: .hints)) ?? 0
        hint = try? c.decodeIfPresent(String.self, forKey: .hint)
        answer = try? c.decodeIfPresent(String.self, forKey: .answer)
        fullText = try? c.decodeIfPresent(String.self, forKey: .fullText)
        gaveUp = (try? c.decodeIfPresent(Bool.self, forKey: .gaveUp)) ?? false
        readStory = (try? c.decodeIfPresent(Bool.self, forKey: .readStory)) ?? false
    }

    var isDone: Bool { answer != nil }

    /// 10 points for a first-try solve; every extra guess and every hint costs a point.
    /// Reading the story is free: it's what the game wants you to do.
    var points: Int {
        guard isDone, !gaveUp else { return 0 }
        return max(0, maxPoints - (guesses.count - 1) - hints)
    }
}

struct QuizProgress: Codable, Hashable {
    var quizId: String
    var index: Int
    var questions: [QuestionState]
    var finished: Bool

    static let empty = QuizProgress(quizId: "", index: 0, questions: [], finished: false)

    static func fresh(for quiz: Quiz) -> QuizProgress {
        QuizProgress(
            quizId: quiz.id,
            index: 0,
            questions: quiz.headlines.map { _ in QuestionState() },
            finished: false
        )
    }

    /// Progress for today's quiz, or a fresh start when it's a new game or the data is unusable.
    static func restored(for quiz: Quiz, from stored: QuizProgress?) -> QuizProgress {
        guard let stored,
              stored.quizId == quiz.id,
              stored.questions.count == quiz.headlines.count,
              stored.index >= 0,
              stored.index < quiz.headlines.count
        else { return fresh(for: quiz) }
        return stored
    }

    var totalPoints: Int { questions.reduce(0) { $0 + $1.points } }

    var hasStarted: Bool {
        finished || index > 0 || questions.contains { !$0.guesses.isEmpty || $0.hints > 0 || $0.isDone }
    }
}

struct Verdict {
    let title: String
    let text: String
}

func verdict(points: Int, max: Int) -> Verdict {
    let ratio = max > 0 ? Double(points) / Double(max) : 0
    if ratio >= 0.8 {
        return Verdict(
            title: "Godt opplyst!",
            text: "Du har fulgt med på ukens nyheter. Utforsk feeden, så er du klar til morgendagens spill."
        )
    }
    if ratio >= 0.5 {
        return Verdict(
            title: "Godt på vei",
            text: "Du kan mye om ukens nyheter. Les sakene du bommet på, så går det enda bedre i morgen."
        )
    }
    return Verdict(
        title: "Tid for å lese seg opp",
        text: "Sakene bak spørsmålene ligger i feeden. Les deg opp, så stiller du sterkere i morgen."
    )
}

enum Heat {
    case hot, warm, cold

    /// How warm a guess is, for colouring the bar.
    init(score: Int) {
        if score >= 70 { self = .hot } else if score >= 30 { self = .warm } else { self = .cold }
    }
}

// MARK: - Text helpers

/// Lowercase, strip accents and punctuation, collapse whitespace: what the web feed uses to
/// compare guesses and search.
func normalize(_ text: String) -> String {
    let decomposed = text.lowercased().decomposedStringWithCanonicalMapping
    var scalars = String.UnicodeScalarView()
    for scalar in decomposed.unicodeScalars {
        switch scalar.properties.generalCategory {
        case .nonspacingMark:
            continue
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter,
             .decimalNumber, .letterNumber, .otherNumber:
            scalars.append(scalar)
        default:
            scalars.append(" ")
        }
    }
    return String(scalars).split(whereSeparator: { $0 == " " }).joined(separator: " ")
}

/// Searches what the feed card shows: title, category, the lead and Adressa's summary points.
func filterStories(_ stories: [Story], query: String = "", category: String = "Alle") -> [Story] {
    let terms = normalize(query).split(separator: " ").map(String.init)
    return stories.filter { story in
        guard category == "Alle" || story.category == category else { return false }
        if terms.isEmpty { return true }
        let haystack = normalize(
            ([story.title, story.category, story.lead ?? ""] + (story.summary?.bullets ?? [])).joined(separator: " ")
        )
        return terms.allSatisfy { haystack.contains($0) }
    }
}

enum DateText {
    private static let parsers: [ISO8601DateFormatter] = {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return [withFraction, plain]
    }()

    private static let display: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "nb_NO")
        f.timeZone = TimeZone(identifier: "Europe/Oslo")
        f.dateFormat = "d. MMM, HH:mm"
        return f
    }()

    static func format(_ iso: String) -> String {
        for parser in parsers {
            if let date = parser.date(from: iso) { return display.string(from: date) }
        }
        return ""
    }
}
