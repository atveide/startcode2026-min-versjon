import SwiftUI
import Observation

enum AppTab: Hashable {
    case feed, quiz, saved
}

enum Route: Hashable {
    case story(id: String, fromQuiz: Bool)
}

enum LoadPhase {
    case loading
    case failed(String)
    case ready(Content)
}

struct IdentifiableURL: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

/// localStorage in the web app, UserDefaults here. Same keys, same shapes.
private enum Store {
    static let quizKey = "opplyst-quiz-v1"
    static let savedKey = "opplyst-saved-v1"
    static let readKey = "opplyst-read-v1"

    static func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    static func save<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func loadIds(key: String, valid: Set<String>) -> [String] {
        var seen = Set<String>()
        return (load([String].self, key: key) ?? []).filter { valid.contains($0) && seen.insert($0).inserted }
    }
}

@MainActor
@Observable
final class AppModel {
    // Data
    private(set) var phase: LoadPhase = .loading
    private(set) var progress = QuizProgress.empty
    private(set) var saved: [String] = []
    private(set) var read: [String] = []

    // Navigation and UI
    var tab: AppTab = .feed
    var path: [Route] = []
    var showAbout = false
    var safariURL: IdentifiableURL?
    private(set) var toastMessage: String?
    /// Bumped to ask the feed to scroll to its search and categories.
    private(set) var feedScrollToken = 0

    // Feed filter
    var query = ""
    var category = "Alle"

    let api = APIClient()
    private var toastTask: Task<Void, Never>?
    private var lastLoaded: Date?

    var failureMessage: String? {
        if case .failed(let message) = phase { return message }
        return nil
    }

    var content: Content? {
        if case .ready(let content) = phase { return content }
        return nil
    }

    // MARK: Loading

    func load() async {
        if content == nil { phase = .loading }
        do {
            async let stories = api.stories()
            async let quiz = api.quiz()
            let loaded = try await Content(stories: stories, quiz: quiz)
            apply(loaded)
        } catch is CancellationError {
            return
        } catch {
            // A refresh that fails keeps showing what we already have.
            if content == nil { phase = .failed(error.localizedDescription) }
        }
    }

    /// Called when the app comes back to the foreground: a new day means a new game.
    func refreshIfStale() async {
        guard content != nil, let lastLoaded else { return }
        if Date().timeIntervalSince(lastLoaded) > 20 * 60 || !Calendar.current.isDateInToday(lastLoaded) {
            await load()
        }
    }

    private func apply(_ loaded: Content) {
        let ids = Set(loaded.stories.map(\.id))
        saved = Store.loadIds(key: Store.savedKey, valid: ids)
        read = Store.loadIds(key: Store.readKey, valid: ids)
        // Keep a game in progress when the same game comes back from a refresh.
        if progress.quizId != loaded.quiz.id || progress.questions.count != loaded.quiz.headlines.count {
            progress = QuizProgress.restored(for: loaded.quiz, from: Store.load(QuizProgress.self, key: Store.quizKey))
        }
        lastLoaded = Date()
        phase = .ready(loaded)
    }

    // MARK: Quiz

    private func updateQuestion(_ index: Int, _ change: (inout QuestionState) -> Void) {
        guard progress.questions.indices.contains(index) else { return }
        change(&progress.questions[index])
        persistProgress()
    }

    private func persistProgress() {
        Store.save(progress, key: Store.quizKey)
    }

    func guess(_ word: String) async throws {
        guard let content, progress.questions.indices.contains(progress.index) else { return }
        let index = progress.index
        guard !progress.questions[index].isDone else { return }
        let result = try await api.guess(headlineId: content.quiz.headlines[index].id, word: word)
        updateQuestion(index) { q in
            guard !q.isDone else { return }
            q.guesses.append(Guess(word: word, score: result.score))
            if result.solved {
                q.answer = result.answer
                q.fullText = result.fullText
            }
        }
    }

    func hint() async throws {
        guard let content, progress.questions.indices.contains(progress.index) else { return }
        let index = progress.index
        let q = progress.questions[index]
        guard !q.isDone, q.hints < content.quiz.maxHints else { return }
        let result = try await api.hint(headlineId: content.quiz.headlines[index].id, level: q.hints + 1)
        updateQuestion(index) { q in
            guard !q.isDone else { return }
            q.hints = result.level
            q.hint = result.hint
        }
    }

    func giveUp() async throws {
        guard let content, progress.questions.indices.contains(progress.index) else { return }
        let index = progress.index
        guard !progress.questions[index].isDone else { return }
        let result = try await api.reveal(headlineId: content.quiz.headlines[index].id)
        updateQuestion(index) { q in
            guard !q.isDone else { return }
            q.answer = result.answer
            q.fullText = result.fullText
            q.gaveUp = true
        }
    }

    func nextQuestion() {
        if progress.index >= progress.questions.count - 1 {
            progress.finished = true
        } else {
            progress.index += 1
        }
        persistProgress()
    }

    func restartQuiz() {
        guard let content else { return }
        progress = QuizProgress.fresh(for: content.quiz)
        persistProgress()
    }

    func markQuizRead(storyId: String) {
        guard let content else { return }
        var changed = false
        for (i, headline) in content.quiz.headlines.enumerated()
        where headline.storyId == storyId && progress.questions.indices.contains(i) && !progress.questions[i].readStory {
            progress.questions[i].readStory = true
            changed = true
        }
        if changed { persistProgress() }
    }

    // MARK: Saved and read

    func isSaved(_ id: String) -> Bool { saved.contains(id) }
    func isRead(_ id: String) -> Bool { read.contains(id) }

    func toggleSaved(_ id: String) {
        let wasSaved = saved.contains(id)
        if wasSaved { saved.removeAll { $0 == id } } else { saved.insert(id, at: 0) }
        Store.save(saved, key: Store.savedKey)
        showToast(wasSaved ? "Saken er fjernet fra lagrede" : "Saken er lagret på denne enheten")
    }

    func markRead(_ id: String) {
        guard read.first != id else { return }
        read.removeAll { $0 == id }
        read.insert(id, at: 0)
        Store.save(read, key: Store.readKey)
    }

    // MARK: Navigation

    func openStory(_ id: String, fromQuiz: Bool = false) {
        path.append(.story(id: id, fromQuiz: fromQuiz))
    }

    func goBack() {
        if !path.isEmpty { path.removeLast() }
    }

    func select(_ newTab: AppTab) {
        path.removeAll()
        tab = newTab
    }

    func scrollFeedToTools() {
        select(.feed)
        feedScrollToken += 1
    }

    func open(url string: String) {
        guard let url = URL(string: string), ["http", "https"].contains(url.scheme?.lowercased()) else { return }
        safariURL = IdentifiableURL(url: url)
    }

    // MARK: Toast

    func showToast(_ message: String) {
        toastMessage = message
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            self?.toastMessage = nil
        }
    }
}
