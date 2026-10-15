import SwiftUI

struct StoryView: View {
    let id: String
    let fromQuiz: Bool
    let content: Content

    var body: some View {
        if let story = content.storiesById[id] {
            ArticleView(story: story, fromQuiz: fromQuiz, content: content)
        } else {
            StoryNotFound()
        }
    }
}

private struct ArticleView: View {
    let story: Story
    let fromQuiz: Bool
    let content: Content
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics
    @State private var readProgress: CGFloat = 0

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if fromQuiz { QuizContext(story: story, content: content) }
                if let image = story.image { Hero(story: story, image: image) }
                intro
                articleBody
            }
            .padding(.bottom, metrics.safeClearance + 56)
        }
        .scrollIndicators(.hidden)
        .background(Theme.surface.ignoresSafeArea())
        .safeAreaInset(edge: .top, spacing: 0) { masthead }
        .overlay(alignment: .top) {
            GeometryReader { geo in
                Theme.accent
                    .frame(width: geo.size.width * readProgress, height: 3)
                    .animation(.linear(duration: 0.1), value: readProgress)
            }
            .frame(height: 3)
            .ignoresSafeArea(edges: .top)
            .allowsHitTesting(false)
        }
        .trackReadingProgress($readProgress)
        .onAppear {
            model.markRead(story.id)
            if fromQuiz { model.markQuizRead(storyId: story.id) }
        }
    }

    // MARK: Top bar

    private var masthead: some View {
        HStack(spacing: 8) {
            circleButton(systemName: "chevron.left", label: "Gå tilbake") { model.goBack() }
            Spacer(minLength: 0)
            VStack(spacing: 3) {
                Wordmark(size: 24)
                Text("Ukens nyheter fra Adresseavisen")
                    .font(.system(size: 8))
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
            }
            .onTapGesture { model.select(.feed) }
            Spacer(minLength: 0)
            SaveCircle(story: story)
            if let url = URL(string: story.url) {
                ShareLink(item: url, subject: Text(story.title)) {
                    circleLabel(systemName: "square.and.arrow.up")
                }
                .accessibilityLabel("Del saken")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(Theme.surface.ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) { Theme.line.frame(height: 1) }
    }

    private func circleLabel(systemName: String) -> some View {
        Image(systemName: systemName)
            .font(.system(size: 17, weight: .medium))
            .foregroundStyle(Theme.brandLight)
            .frame(width: 44, height: 44)
            .background(Theme.surface, in: Circle())
            .overlay(Circle().stroke(Theme.line, lineWidth: 1))
            .contentShape(Circle())
    }

    private func circleButton(systemName: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { circleLabel(systemName: systemName) }
            .buttonStyle(PressableStyle())
            .accessibilityLabel(label)
    }

    // MARK: Intro

    private var intro: some View {
        VStack(alignment: .leading, spacing: 0) {
            CategoryTag(story: story)
            Text(story.title)
                .font(.headline(36))
                .tight(36, em: 0.03)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 16)
                .padding(.bottom, 20)

            let meta: [String] = {
                var parts = ["Publisert \(DateText.format(story.publishedAt))"]
                if let modified = story.modifiedAt { parts.append("Oppdatert \(DateText.format(modified))") }
                parts.append(story.source)
                if !story.authors.isEmpty { parts.append(story.authors.joined(separator: ", ")) }
                return parts
            }()
            Text(meta.joined(separator: " · "))
                .font(.system(size: 11))
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)
        }
        .padding(.horizontal, 22)
        .padding(.top, story.image == nil ? 32 : 28)
        .padding(.bottom, 24)
    }

    // MARK: Body

    private var articleBody: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let lead = story.lead {
                Text(lead)
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(6)
                    .padding(.bottom, 28)
            }

            if story.imported {
                FullStory(story: story)
            } else {
                NotImported(story: story)
            }

            VStack(alignment: .leading, spacing: 16) {
                Text("Kilde")
                    .font(.headline(24, weight: .heavy))
                    .tight(24, em: 0.035)
                    .foregroundStyle(.white)
                Button {
                    model.open(url: story.url)
                } label: {
                    HStack(spacing: 12) {
                        BrandBadge(size: 42)
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Les originalartikkelen hos \(story.source)")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                                .multilineTextAlignment(.leading)
                            Text("adressa.no · Publisert \(DateText.format(story.publishedAt)) · Kan kreve abonnement")
                                .font(.system(size: 10))
                                .foregroundStyle(Theme.muted)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.brandLight)
                    }
                    .padding(12)
                    .background(Theme.surface, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Theme.line, lineWidth: 1))
                }
                .buttonStyle(PressableStyle(scale: 0.98))
            }
            .padding(.top, 40)

            Text(
                story.imported && content.importedAt != nil
                    ? "Hentet fra \(story.source) \(DateText.format(content.importedAt ?? "")) med eget abonnement, og lagret bare på denne maskinen. Saken kan være endret hos Adressa siden."
                    : "Journalistikk fra \(story.source). Hele saken leser du hos Adressa."
            )
            .font(.system(size: 11))
            .foregroundStyle(Theme.muted)
            .lineSpacing(4)
            .padding(.top, 20)
            .overlay(alignment: .top) { Theme.line.frame(height: 1) }
            .padding(.top, 32)
        }
        .padding(.horizontal, 22)
    }
}

// MARK: - Pieces

private struct SaveCircle: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        let saved = model.isSaved(story.id)
        Button {
            model.toggleSaved(story.id)
        } label: {
            Image(systemName: saved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.brandLight)
                .frame(width: 44, height: 44)
                .background(saved ? Theme.soft : Theme.surface, in: Circle())
                .overlay(Circle().stroke(Theme.line, lineWidth: 1))
                .contentShape(Circle())
        }
        .buttonStyle(PressableStyle())
        .sensoryFeedback(.selection, trigger: saved)
        .accessibilityLabel(saved ? "Fjern fra lagrede" : "Lagre sak")
    }
}

private struct Hero: View {
    let story: Story
    let image: StoryImage
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                PanelBackground(story: story, maxPixel: 1800)
                if let credit = image.credit, image.caption == nil {
                    Text("Foto: \(credit)")
                        .font(.system(size: 9))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(rgba: 0x061726A6), in: RoundedRectangle(cornerRadius: 4))
                        .padding(16)
                }
            }
            .frame(height: 360)
            .clipped()

            if let caption = image.caption {
                Text("\(caption)\(image.credit.map { " Foto: \($0)" } ?? "")")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)
                    .padding(.horizontal, 22)
                    .padding(.top, 10)
            }
        }
    }
}

/// Adressa's «Kort oppsummert» and the article text, from the local import.
private struct FullStory: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text(story.summary?.heading ?? "Kort oppsummert")
                    .font(.headline(24, weight: .heavy))
                    .tight(24, em: 0.035)
                    .foregroundStyle(.white)
                    .padding(.bottom, 16)

                if let summary = story.summary {
                    VStack(alignment: .leading, spacing: 14) {
                        ForEach(summary.bullets, id: \.self) { BulletRow(text: $0, size: 16) }
                    }
                    .padding(.bottom, 18)

                    if let disclosure = summary.disclosure {
                        Text(disclosure)
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(3)
                            .padding(.bottom, 6)
                        if let link = summary.disclosureUrl {
                            Button("Mer om KI-bruken ↗") { model.open(url: link) }
                                .font(.system(size: 12))
                                .foregroundStyle(Theme.brandLight)
                                .padding(.bottom, 6)
                        }
                    }
                    Button("Kilde: \(summary.source) ↗") { model.open(url: summary.sourceUrl) }
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.brandLight)
                } else {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "info.circle").foregroundStyle(Theme.brandLight)
                        Text("Adresseavisen har ikke laget en kort oppsummering av denne saken. Les ingressen og saken under.")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.muted)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.soft, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.line, lineWidth: 1))

            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(story.body.enumerated()), id: \.offset) { _, block in
                    switch block.type {
                    case "heading":
                        Text(block.text ?? "")
                            .font(.headline(22, weight: .heavy))
                            .tight(22, em: 0.03)
                            .foregroundStyle(.white)
                            .padding(.top, 34)
                            .padding(.bottom, 12)
                    case "list":
                        VStack(alignment: .leading, spacing: 10) {
                            ForEach(block.items ?? [], id: \.self) { BulletRow(text: $0, size: 17) }
                        }
                        .padding(.bottom, 18)
                    default:
                        Text(block.text ?? "")
                            .font(.system(size: 17))
                            .foregroundStyle(.white)
                            .lineSpacing(7)
                            .padding(.bottom, 18)
                    }
                }
            }
            .padding(.top, 40)
        }
    }
}

private struct BulletRow: View {
    let text: String
    let size: CGFloat

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Circle().fill(Theme.brandLight).frame(width: 5, height: 5).offset(y: -3)
            Text(text)
                .font(.system(size: size))
                .foregroundStyle(.white)
                .lineSpacing(5)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Without the local import there is no article text here; the story lives on adressa.no.
private struct NotImported: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Hele saken er ikke hentet på denne enheten. Les den hos \(story.source), og kom tilbake hit etterpå.")
                .font(.system(size: 15))
                .foregroundStyle(.white)
                .lineSpacing(4)
            Button {
                model.open(url: story.url)
            } label: {
                HStack(spacing: 8) {
                    Text("Les saken hos \(story.source)")
                    Image(systemName: "arrow.up.right").font(.system(size: 13, weight: .bold))
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.soft, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.line, lineWidth: 1))
        .padding(.bottom, 8)
    }
}

/// While reading for the quiz, the question stays in view.
private struct QuizContext: View {
    let story: Story
    let content: Content
    @Environment(AppModel.self) private var model

    var body: some View {
        if let index = content.quiz.headlines.firstIndex(where: { $0.storyId == story.id }),
           model.progress.questions.indices.contains(index) {
            let headline = content.quiz.headlines[index]
            let parts = headline.text.components(separatedBy: blankMarker)
            let before = parts.first ?? ""
            let after = parts.dropFirst().joined(separator: blankMarker)
            let answer = model.progress.questions[index].answer

            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "lightbulb")
                    .font(.system(size: 21))
                    .foregroundStyle(Theme.brandLight)
                    .padding(.top, 2)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Dagens spill · Spørsmål \(index + 1) av \(content.quiz.headlines.count)")
                        .font(.system(size: 10, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(1.1)
                        .foregroundStyle(Theme.brandLight)
                    Text(contextLine(before: before, after: after, answer: answer))
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .lineSpacing(3)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.soft, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line, lineWidth: 1))
            .padding(.horizontal, 22)
            .padding(.top, 20)
        }
    }

    private func contextLine(before: String, after: String, answer: String?) -> AttributedString {
        var text = AttributedString((answer == nil ? "Finn ordet som mangler: " : "Svaret: ") + before)
        var mark = AttributedString("\u{00A0}\(answer ?? blankMarker)\u{00A0}")
        mark.backgroundColor = Theme.brandLight
        mark.foregroundColor = Color(hex: 0x010101)
        text += mark
        text += AttributedString(after)
        return text
    }
}

private struct StoryNotFound: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 34))
                .foregroundStyle(Theme.brandLight)
            Text("Fant ikke saken")
                .font(.headline(28))
                .foregroundStyle(.white)
            Text("Saken finnes ikke i ukens utvalg.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.muted)
            Button("Til forsiden") { model.select(.feed) }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.surface.ignoresSafeArea())
    }
}

// MARK: - Reading progress

private extension View {
    /// The thin accent line at the top fills as you read. Needs the scroll geometry API (iOS 18).
    @ViewBuilder
    func trackReadingProgress(_ progress: Binding<CGFloat>) -> some View {
        if #available(iOS 18.0, *) {
            onScrollGeometryChange(for: CGFloat.self) { geometry in
                let range = geometry.contentSize.height + geometry.contentInsets.top
                    + geometry.contentInsets.bottom - geometry.containerSize.height
                guard range > 0 else { return 1 }
                return min(1, max(0, (geometry.contentOffset.y + geometry.contentInsets.top) / range))
            } action: { _, newValue in
                progress.wrappedValue = newValue
            }
        } else {
            self
        }
    }
}
