import SwiftUI

struct SavedView: View {
    let content: Content
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics
    @State private var query = ""

    var body: some View {
        let stories = model.saved.compactMap { content.storiesById[$0] }
        let results = filterStories(stories, query: query)

        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                // Masthead
                Wordmark(size: 28)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(alignment: .bottom) { Theme.line.frame(height: 1) }
                    .padding(.bottom, 32)

                VStack(alignment: .leading, spacing: 0) {
                    Text("Ta vare på det som interesserer deg")
                        .font(.system(size: 11, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(1.3)
                        .foregroundStyle(Theme.brandLight)
                        .padding(.bottom, 8)
                    Text("Lagrede saker")
                        .font(.headline(38))
                        .tight(38, em: 0.045)
                        .foregroundStyle(.white)
                        .padding(.bottom, 14)
                    Text("Sakene du vil komme tilbake til. De lagres på denne enheten.")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.muted)
                }
                .padding(.bottom, 28)

                SearchField(text: $query, placeholder: "Søk i lagrede saker")

                if results.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bookmark")
                            .font(.system(size: 34))
                            .foregroundStyle(Theme.brandLight)
                            .padding(.bottom, 8)
                        Text(query.isEmpty ? "Ingen lagrede saker ennå" : "Ingen treff i lagrede saker")
                            .font(.headline(24))
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                        Text(query.isEmpty ? "Trykk på bokmerket på en sak for å finne den igjen her." : "Prøv et annet søkeord.")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.muted)
                            .multilineTextAlignment(.center)
                        if query.isEmpty {
                            Button("Utforsk feeden") { model.scrollFeedToTools() }
                                .buttonStyle(PrimaryButtonStyle())
                                .padding(.top, 8)
                        }
                    }
                    .padding(.vertical, 56)
                    .padding(.horizontal, 24)
                    .frame(maxWidth: .infinity)
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.line, lineWidth: 1))
                    .padding(.top, 28)
                } else {
                    VStack(spacing: 0) {
                        ForEach(results) { story in
                            SavedRow(story: story)
                        }
                    }
                    .padding(.top, 24)
                    .animation(.spring(response: 0.4, dampingFraction: 0.85), value: results.map(\.id))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 4)
            .padding(.bottom, metrics.safeClearance + 56)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.canvas.ignoresSafeArea())
        .safeAreaPadding(.top, 0)
    }
}

private struct SavedRow: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        HStack(spacing: 10) {
            Button {
                model.openStory(story.id)
            } label: {
                HStack(spacing: 12) {
                    Thumb(story: story)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(story.category)
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.muted)
                        Text(story.title)
                            .font(.headline(17, weight: .bold))
                            .tracking(-0.5)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.leading)
                            .lineLimit(4)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 18)
                .contentShape(Rectangle())
            }
            .buttonStyle(PressableStyle(scale: 0.98))

            SaveButton(story: story)
        }
        .overlay(alignment: .bottom) { Theme.line.frame(height: 1) }
        .transition(.opacity.combined(with: .move(edge: .leading)))
    }
}

private struct Thumb: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            if let image = story.image, let url = model.api.resolve(image.src) {
                RemoteImage(url: url, maxPixel: 300) { placeholder }
            } else {
                placeholder
            }
        }
        .frame(width: 60, height: 60)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var placeholder: some View {
        ZStack {
            Theme.soft
            Image(systemName: "newspaper")
                .font(.system(size: 22))
                .foregroundStyle(Theme.brandLight)
        }
    }
}
