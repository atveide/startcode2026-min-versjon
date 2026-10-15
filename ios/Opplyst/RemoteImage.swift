import SwiftUI
import UIKit
import ImageIO

/// Downloads, downsamples and caches story photos. Decoding happens off the main thread,
/// so scrolling the feed never waits on an image.
actor ImagePipeline {
    static let shared = ImagePipeline()

    nonisolated(unsafe) static let memory: NSCache<NSURL, UIImage> = {
        let cache = NSCache<NSURL, UIImage>()
        cache.countLimit = 48
        return cache
    }()

    private let session: URLSession
    private var inflight: [URL: Task<UIImage?, Never>] = [:]

    init() {
        let config = URLSessionConfiguration.default
        config.urlCache = URLCache(memoryCapacity: 16 * 1024 * 1024, diskCapacity: 200 * 1024 * 1024)
        config.requestCachePolicy = .returnCacheDataElseLoad
        config.timeoutIntervalForRequest = 30
        session = URLSession(configuration: config)
    }

    func image(for url: URL, maxPixel: CGFloat) async -> UIImage? {
        if let hit = Self.memory.object(forKey: url as NSURL) { return hit }
        if let running = inflight[url] { return await running.value }

        let session = session
        let task = Task.detached(priority: .userInitiated) { () -> UIImage? in
            guard let (data, response) = try? await session.data(from: url) else { return nil }
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) { return nil }
            return Self.downsample(data, maxPixel: maxPixel)
        }
        inflight[url] = task
        let image = await task.value
        inflight[url] = nil
        if let image { Self.memory.setObject(image, forKey: url as NSURL) }
        return image
    }

    private nonisolated static func downsample(_ data: Data, maxPixel: CGFloat) -> UIImage? {
        let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else { return nil }
        let options = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
        ] as CFDictionary
        guard let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

/// A photo that fills whatever space it is given. Shows `placeholder` until it has loaded
/// and `fallback` when the photo is missing or fails.
struct RemoteImage<Fallback: View>: View {
    let url: URL?
    var maxPixel: CGFloat = 1600
    @ViewBuilder var fallback: () -> Fallback

    @State private var image: UIImage?
    @State private var failed = false

    init(url: URL?, maxPixel: CGFloat = 1600, @ViewBuilder fallback: @escaping () -> Fallback) {
        self.url = url
        self.maxPixel = maxPixel
        self.fallback = fallback
        _image = State(initialValue: url.flatMap { ImagePipeline.memory.object(forKey: $0 as NSURL) })
    }

    var body: some View {
        ZStack {
            Theme.panelBase
            if let image {
                Color.clear.overlay {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                }
                .clipped()
                .transition(.opacity)
            } else if failed || url == nil {
                fallback()
            }
        }
        .task(id: url) {
            guard let url else { return }
            if image != nil { return }
            failed = false
            let loaded = await ImagePipeline.shared.image(for: url, maxPixel: maxPixel)
            if Task.isCancelled { return }
            withAnimation(.easeOut(duration: 0.25)) {
                image = loaded
                failed = loaded == nil
            }
        }
    }
}
