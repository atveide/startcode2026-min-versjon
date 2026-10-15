import Foundation

/// Talks to the same FastAPI backend as the web app (see frontend/src/api.ts).
struct APIClient {
    struct Failure: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    let baseURL: URL
    private let session: URLSession

    init() {
        let configured = ProcessInfo.processInfo.environment["OPPLYST_API_BASE"]
            ?? Bundle.main.object(forInfoDictionaryKey: "OpplystAPIBase") as? String
            ?? "https://startcode-august-api.onrender.com"
        baseURL = URL(string: configured.trimmingCharacters(in: CharacterSet(charactersIn: "/ ")))
            ?? URL(string: "https://startcode-august-api.onrender.com")!

        let config = URLSessionConfiguration.default
        // The free Render instance sleeps and can need a minute to wake up.
        config.timeoutIntervalForRequest = 70
        config.waitsForConnectivity = true
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: config)
    }

    /// Photos from the local import come as `/api/media/...`; press photos are absolute.
    func resolve(_ src: String) -> URL? {
        if src.hasPrefix("http://") || src.hasPrefix("https://") { return URL(string: src) }
        return URL(string: src, relativeTo: baseURL)?.absoluteURL
    }

    // MARK: Endpoints

    func stories() async throws -> StoriesResponse {
        try await request("/api/stories", failure: "Vi kunne ikke hente sakene")
    }

    func quiz() async throws -> Quiz {
        try await request("/api/quiz", failure: "Vi kunne ikke hente ukens quiz")
    }

    func guess(headlineId: Int, word: String) async throws -> GuessResult {
        struct Body: Encodable {
            let headline_id: Int
            let guess: String
        }
        return try await request(
            "/api/guess",
            method: "POST",
            body: Body(headline_id: headlineId, guess: word),
            failure: "Vi fikk ikke sjekket svaret. Prøv igjen"
        )
    }

    func hint(headlineId: Int, level: Int) async throws -> HintResult {
        try await request("/api/headlines/\(headlineId)/hint/\(level)", failure: "Vi fikk ikke hentet hintet")
    }

    func reveal(headlineId: Int) async throws -> RevealResult {
        try await request(
            "/api/headlines/\(headlineId)/reveal",
            method: "POST",
            failure: "Vi fikk ikke hentet svaret"
        )
    }

    // MARK: Plumbing

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        failure: String
    ) async throws -> T {
        try await send(try makeRequest(path, method: method, body: nil, failure: failure), failure: failure)
    }

    private func request<T: Decodable, B: Encodable>(
        _ path: String,
        method: String,
        body: B,
        failure: String
    ) async throws -> T {
        let data = try JSONEncoder().encode(body)
        return try await send(try makeRequest(path, method: method, body: data, failure: failure), failure: failure)
    }

    private func makeRequest(_ path: String, method: String, body: Data?, failure: String) throws -> URLRequest {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw Failure(message: failure)
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        return request
    }

    private func send<T: Decodable>(_ request: URLRequest, failure: String) async throws -> T {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch is CancellationError {
            throw CancellationError()
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch {
            throw Failure(message: "\(failure). Sjekk nettforbindelsen")
        }

        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw Failure(message: "\(failure) (\(status))")
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw Failure(message: "\(failure). Svaret fra serveren var uventet")
        }
    }
}
