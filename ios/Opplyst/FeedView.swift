import SwiftUI

/// The front page and the feed: one story fills the screen and a swipe settles on the next,
/// like the mobile layout of the web app (scroll-snap, full-bleed panels).
struct FeedView: View {
    let content: Content
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        @Bindable var model = model
        let results = filterStories(content.stories, query: model.query, category: model.category)
        let filtered = !model.query.isEmpty || model.category != "Alle"

        ScrollViewReader { proxy in
            ScrollView(.vertical) {
                LazyVStack(spacing: 0) {
                    CoverPanel(content: content) {
                        withAnimation(.easeInOut(duration: 0.45)) { proxy.scrollTo("feed-tools", anchor: .top) }
                    }

                    FeedTools(
                        content: content,
                        resultCount: results.count,
                        filtered: filtered
                    )
                    .id("feed-tools")

                    if results.isEmpty {
                        EmptyFeed()
                    } else {
                        ForEach(results) { story in
                            FeedCard(story: story, stories: content.stories)
                                .id(story.id)
                        }
                    }

                    if !filtered {
                        FeedEnd(content: content) {
                            withAnimation(.easeInOut(duration: 0.5)) { proxy.scrollTo("cover", anchor: .top) }
                        }
                    }
                }
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned(limitBehavior: .always))
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.immediately)
            .ignoresSafeArea()
            .onChange(of: model.feedScrollToken) { _, _ in
                withAnimation(.easeInOut(duration: 0.45)) { proxy.scrollTo("feed-tools", anchor: .top) }
            }
            .onChange(of: model.query) { _, _ in }
        }
    }
}

// MARK: - Cover

private struct CoverPanel: View {
    let content: Content
    let showFeed: () -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        let width = metrics.size.width
        let height = metrics.size.height
        let progress = model.progress
        let count = content.quiz.headlines.count
        let coverStory = content.stories.first(where: { $0.image != nil }) ?? content.stories.first
        let top = Array(content.stories.sorted { $0.publishedAt > $1.publishedAt }.prefix(3))

        var cta = "Spill dagens spill"
        var detail: String?
        if progress.finished {
            cta = "Se resultatet ditt"
            detail = "\(progress.totalPoints) av \(count * maxPoints) poeng"
        } else if progress.hasStarted {
            cta = "Fortsett dagens spill"
            detail = "spørsmål \(progress.index + 1) av \(count)"
        }

        return ZStack(alignment: .bottomLeading) {
            PanelBackground(story: coverStory, seed: 0)
            Theme.panelShade

            // Top row
            VStack {
                HStack(alignment: .top) {
                    Button {
                        model.showAbout = true
                    } label: {
                        (Text("Opplyst ").foregroundStyle(Color(hex: 0xE0E8EE))
                         + Text("· Uke \(content.week) · Adresseavisen").foregroundStyle(Color(hex: 0xC3CCD4)))
                            .font(.system(size: 11))
                            .padding(.vertical, 8)
                    }
                    Spacer()
                    BrandBadge(size: 48)
                }
                .padding(.top, metrics.top + 14)
                .padding(.horizontal, 22)
                Spacer()
            }

            // Copy
            VStack(alignment: .leading, spacing: 0) {
                Text("Denne uken")
                    .font(.system(size: 11, weight: .bold))
                    .textCase(.uppercase)
                    .tracking(0.3)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(Theme.brand, in: RoundedRectangle(cornerRadius: 3))

                Text("Ukens 3 viktigste")
                    .font(.headline(min(max(29, width * 0.0855), 52)))
                    .tight(33, em: 0.035)
                    .foregroundStyle(.white)
                    .padding(.top, 12)
                    .padding(.bottom, 14)

                VStack(alignment: .leading, spacing: 9) {
                    ForEach(Array(top.enumerated()), id: \.element.id) { index, story in
                        Button {
                            model.openStory(story.id)
                        } label: {
                            Text(highlighted("\(index + 1). \(story.title)", background: Color(rgba: 0x005379F5)))
                                .font(.system(size: min(max(14, width * 0.039), 20), weight: .bold))
                                .foregroundStyle(.white)
                                .lineSpacing(5)
                                .multilineTextAlignment(.leading)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(PressableStyle(scale: 0.98))
                    }
                }
                .frame(maxWidth: 360, alignment: .leading)
                .padding(.bottom, 20)

                Button {
                    model.select(.quiz)
                } label: {
                    HStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(cta)
                                .font(.system(size: 17, weight: .bold))
                            if let detail {
                                Text(detail)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.ice)
                            }
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .frame(minHeight: 52)
                    .background(Color(rgba: 0x005379A6), in: RoundedRectangle(cornerRadius: 7))
                    .overlay(RoundedRectangle(cornerRadius: 7).stroke(.white, lineWidth: 1.5))
                    .background(
                        RoundedRectangle(cornerRadius: 9).fill(Color(rgba: 0x002C4666)).padding(-3)
                    )
                }
                .buttonStyle(PressableStyle(scale: 0.98))
                .fixedSize(horizontal: false, vertical: true)

                if !progress.finished {
                    Text("\(count) spørsmål fra ukens nyheter, nye hver dag. Står du fast, finner du svaret i saken.")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0xDBE4EA))
                        .padding(.top, 12)
                        .frame(maxWidth: 360, alignment: .leading)
                }

                Button(action: showFeed) {
                    HStack(spacing: 8) {
                        Text("Sveip videre til feeden")
                        Image(systemName: "arrow.down")
                    }
                    .font(.system(size: 13))
                    .foregroundStyle(Color(hex: 0xF4F6F8))
                    .frame(minHeight: 44)
                }
                .padding(.top, 5)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, metrics.barClearance + 22)
            .scrollTransition(.animated(.easeOut(duration: 0.45)).threshold(.visible(0.5))) { view, phase in
                view
                    .opacity(phase.isIdentity ? 1 : 0)
                    .offset(y: phase.isIdentity ? 0 : 28)
            }

            if let image = coverStory?.image {
                Text("Bildet: \(coverStory?.title ?? "")\(image.credit.map { " · Foto: \($0)" } ?? "")")
                    .font(.system(size: 8))
                    .foregroundStyle(Color(hex: 0xC5D1D9))
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 240, alignment: .trailing)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .padding(.trailing, 22)
                    .padding(.bottom, metrics.barClearance + 4)
                    .allowsHitTesting(false)
            }
        }
        .frame(width: width, height: height)
        .clipped()
        .id("cover")
    }
}

// MARK: - Search and categories

private struct FeedTools: View {
    let content: Content
    let resultCount: Int
    let filtered: Bool
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        @Bindable var model = model
        let categories = ["Alle"] + content.stories.map(\.category).reduce(into: [String]()) {
            if !$0.contains($1) { $0.append($1) }
        }
        let edition = content.importedAt.map { "Hentet \(DateText.format($0))" } ?? "Uke \(content.week)"

        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(model.progress.finished ? "Utforsk videre etter spillet" : "Ukens nyhetsbilde")
                        .font(.system(size: 9, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(1.1)
                        .foregroundStyle(Theme.brandLight)
                    Text("Feeden")
                        .font(.headline(32, weight: .heavy))
                        .tight(32, em: 0.045)
                        .foregroundStyle(.white)
                }
                Spacer(minLength: 12)
                Text(edition)
                    .font(.system(size: 10))
                    .foregroundStyle(Theme.muted)
                    .padding(.bottom, 5)
            }
            .padding(.bottom, 22)

            SearchField(text: $model.query)

            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.self) { name in
                        let active = name == model.category
                        Button {
                            model.category = name
                        } label: {
                            Text(name)
                                .font(.system(size: 12, weight: active ? .bold : .semibold))
                                .foregroundStyle(active ? Theme.surface : .white)
                                .padding(.horizontal, 16)
                                .frame(minHeight: 44)
                                .background(active ? Color.white : Color.clear, in: Capsule())
                                .overlay(Capsule().stroke(active ? Color.white : Theme.line, lineWidth: 1))
                        }
                        .buttonStyle(PressableStyle(scale: 0.95))
                        .accessibilityAddTraits(active ? .isSelected : [])
                    }
                }
                .padding(.top, 14)
                .padding(.bottom, 2)
            }
            .scrollIndicators(.hidden)

            if filtered {
                Text("\(resultCount) \(resultCount == 1 ? "sak" : "saker")\(model.query.isEmpty ? "" : " for «\(model.query)»")")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.muted)
                    .padding(.top, 10)
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, max(28, metrics.top))
        .padding(.bottom, 24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.canvas)
    }
}

private struct EmptyFeed: View {
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 34, weight: .regular))
                .foregroundStyle(Theme.brandLight)
                .padding(.bottom, 8)
            Text("Ingen treff")
                .font(.headline(28))
                .foregroundStyle(.white)
            Text("Prøv et annet søkeord eller velg Alle.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.muted)
            Button("Vis alle saker") {
                model.query = ""
                model.category = "Alle"
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.top, 8)
        }
        .padding(.vertical, 56)
        .frame(maxWidth: .infinity)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.line, lineWidth: 1))
        .padding(.horizontal, 22)
        .padding(.bottom, metrics.barClearance + 80)
    }
}

// MARK: - A story

private struct FeedCard: View {
    let story: Story
    let stories: [Story]
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        let width = metrics.size.width
        let height = metrics.size.height
        let position = stories.firstIndex(where: { $0.id == story.id }) ?? 0
        let excerpt = story.summary?.bullets.first ?? story.lead
        let titleSize = min(max(34, width * 0.10), 58)
        let summarySize = min(max(16, width * 0.0455), 24)

        ZStack(alignment: .bottomLeading) {
            PanelBackground(story: story, seed: position + 1)
            Theme.panelShade

            // The whole card opens the story; the save button sits on top of it.
            Button {
                model.openStory(story.id)
            } label: {
                Color.clear.contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(story.title)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    (Text("\(story.category) ").foregroundStyle(Color(hex: 0xE0E8EE))
                     + Text("· \(DateText.format(story.publishedAt))").foregroundStyle(Color(hex: 0xC3CCD4)))
                        .font(.system(size: 11))
                        .padding(.vertical, 8)
                        .allowsHitTesting(false)
                    Spacer()
                    SaveButton(story: story)
                }
                .padding(.top, metrics.top + 14)
                .padding(.horizontal, 22)
                Spacer()
            }

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 10) {
                    CategoryTag(story: story)
                    if model.isRead(story.id) { ReadBadge() }
                }
                .padding(.bottom, 14)

                Text(story.title)
                    .font(.headline(titleSize))
                    .tight(titleSize, em: 0.028)
                    .lineSpacing(0)
                    .foregroundStyle(.white)
                    .lineLimit(6)
                    .minimumScaleFactor(0.7)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.bottom, 20)

                if let excerpt {
                    Text(story.summary?.heading ?? "Ingress")
                        .font(.system(size: 11, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(1.1)
                        .foregroundStyle(Theme.ice)
                        .padding(.bottom, 10)
                    Text(highlighted(excerpt, background: Color(rgba: 0x005379F5)))
                        .font(.system(size: summarySize, weight: .bold))
                        .foregroundStyle(.white)
                        .lineSpacing(summarySize * 0.5)
                        .lineLimit(5)
                        .padding(.bottom, 20)
                }

                VStack(alignment: .leading, spacing: 0) {
                    Text("Kilde: \(story.source)")
                        .foregroundStyle(Color(hex: 0xE8EDF2))
                    if let credit = story.image?.credit {
                        Text("Foto: \(credit)").foregroundStyle(Color(hex: 0xBDCBD5))
                    }
                }
                .font(.system(size: 10))
                .padding(.bottom, 5)

                HStack(spacing: 8) {
                    Text("Les saken").underline(true, color: .white)
                    Image(systemName: "arrow.right").font(.system(size: 14, weight: .semibold))
                }
                .font(.system(size: 15))
                .foregroundStyle(.white)
                .frame(minHeight: 44, alignment: .leading)

                HStack(spacing: 4) {
                    ForEach(stories) { other in
                        Capsule()
                            .fill(other.id == story.id ? Color.white : Color.white.opacity(0.33))
                            .frame(height: 3)
                    }
                }
                .frame(maxWidth: 680)
                .padding(.top, 14)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, metrics.barClearance + 16)
            .allowsHitTesting(false)
            .scrollTransition(.animated(.easeOut(duration: 0.45)).threshold(.visible(0.5))) { view, phase in
                view
                    .opacity(phase.isIdentity ? 1 : 0)
                    .offset(y: phase.isIdentity ? 0 : 28)
            }

            Text("\(String(format: "%02d", position + 1)) / \(String(format: "%02d", stories.count))")
                .font(.system(size: 8).monospacedDigit())
                .tracking(0.6)
                .foregroundStyle(Color(hex: 0xBAC8D1))
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.trailing, 22)
                .padding(.bottom, metrics.barClearance + 2)
                .allowsHitTesting(false)
        }
        .frame(width: width, height: height)
        .clipped()
        .accessibilityElement(children: .contain)
    }
}

private struct FeedEnd: View {
    let content: Content
    let toTop: () -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(Theme.success)
            Text("Du er oppdatert på ukens saker")
                .font(.headline(22, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(.top, 4)
            Text("\(content.stories.count) saker fra Adresseavisen · uke \(content.week)")
                .font(.system(size: 12))
                .foregroundStyle(Theme.muted)
            if !model.progress.finished {
                Button("Spill dagens spill") { model.select(.quiz) }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, 18)
            }
            Button("Til toppen ↑", action: toTop)
                .font(.system(size: 13))
                .foregroundStyle(Theme.brandLight)
                .frame(minHeight: 44)
                .padding(.top, 6)
        }
        .padding(.horizontal, 20)
        .padding(.top, 56)
        .padding(.bottom, metrics.barClearance + 40)
        .frame(maxWidth: .infinity)
        .background(Theme.canvas)
    }
}
