import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var metrics = DeviceMetrics.current

    var body: some View {
        @Bindable var model = model

        Group {
            if let content = model.content {
                MainView(content: content)
            } else if let message = model.failureMessage {
                Splash(message: "\(message). Prøv igjen.") {
                    Task { await model.load() }
                }
            } else {
                Splash(message: "Henter ukens nyheter …", retry: nil)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.canvas.ignoresSafeArea())
        .environment(\.metrics, metrics)
        .task { await model.load() }
        .onAppear { metrics = DeviceMetrics.current }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            metrics = DeviceMetrics.current
            Task { await model.refreshIfStale() }
        }
        .sheet(isPresented: $model.showAbout) {
            AboutSheet()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(item: $model.safariURL) { item in
            SafariView(url: item.url).ignoresSafeArea()
        }
    }
}

private struct Splash: View {
    let message: String
    let retry: (() -> Void)?

    var body: some View {
        VStack(spacing: 18) {
            Wordmark(size: 40)
            if retry == nil {
                ProgressView().tint(.white)
            }
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
            if let retry {
                Button("Prøv igjen", action: retry)
                    .buttonStyle(PrimaryButtonStyle())
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Tabs, stack and floating chrome

private struct MainView: View {
    let content: Content
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        @Bindable var model = model
        let current = model.path.last
        let readingForQuiz: Bool = {
            if case .story(_, let fromQuiz)? = current { return fromQuiz }
            return false
        }()

        ZStack(alignment: .bottom) {
            NavigationStack(path: $model.path) {
                ZStack {
                    tab(.feed) { FeedView(content: content) }
                    tab(.quiz) { QuizView(content: content) }
                    tab(.saved) { SavedView(content: content) }
                }
                .background(Theme.canvas.ignoresSafeArea())
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: Route.self) { route in
                    switch route {
                    case .story(let id, let fromQuiz):
                        StoryView(id: id, fromQuiz: fromQuiz, content: content)
                            .toolbar(.hidden, for: .navigationBar)
                            .navigationBarBackButtonHidden(true)
                    }
                }
            }

            Group {
                if readingForQuiz {
                    QuizReturnButton()
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                } else {
                    FloatingBar()
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .padding(.bottom, metrics.barGap)
            .ignoresSafeArea(.keyboard)

            ToastView()
                .padding(.bottom, metrics.safeClearance + 14)
                .allowsHitTesting(false)
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.86), value: readingForQuiz)
        .sensoryFeedback(.selection, trigger: model.tab)
    }

    private func tab<V: View>(_ tab: AppTab, @ViewBuilder _ view: () -> V) -> some View {
        let active = model.tab == tab
        return view()
            .opacity(active ? 1 : 0)
            .allowsHitTesting(active)
            .accessibilityHidden(!active)
            .zIndex(active ? 1 : 0)
    }
}

private struct FloatingBar: View {
    @Environment(AppModel.self) private var model
    @State private var showMenu = false

    var body: some View {
        HStack(spacing: 4) {
            Button {
                showMenu = true
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 21, weight: .regular))
                    .foregroundStyle(Theme.navText)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .contentShape(Rectangle())
            }
            .buttonStyle(PressableStyle(scale: 0.9))
            .accessibilityLabel("Åpne meny")

            tab(.feed, icon: "newspaper", label: "Feeden")
            tab(.quiz, icon: "lightbulb", label: "Quiz")
            tab(.saved, icon: "bookmark", label: "Lagret")
        }
        .padding(.horizontal, 12)
        .frame(width: 310, height: 66)
        .glassCapsule()
        .shadow(color: .black.opacity(0.3), radius: 16, y: 6)
        .frame(maxWidth: .infinity)
        .confirmationDialog("Ditt Opplyst", isPresented: $showMenu, titleVisibility: .visible) {
            Button("Feeden") { model.select(.feed) }
            Button("Ukens nyhetsquiz") { model.select(.quiz) }
            Button("Lagrede saker") { model.select(.saved) }
            Button("Om Opplyst") { model.showAbout = true }
            Button("Avbryt", role: .cancel) {}
        }
    }

    private func tab(_ tab: AppTab, icon: String, label: String) -> some View {
        let active = model.tab == tab && model.path.isEmpty
        return Button {
            model.select(tab)
        } label: {
            VStack(spacing: 3) {
                Image(systemName: active && tab == .saved ? "bookmark.fill" : icon)
                    .font(.system(size: 21, weight: .regular))
                Text(label)
                    .font(.system(size: 10, weight: active ? .semibold : .medium))
            }
            .foregroundStyle(active ? Color.white : Theme.navText)
            .frame(maxWidth: .infinity, minHeight: 54)
            .overlay(alignment: .bottom) {
                if active {
                    Capsule()
                        .fill(Theme.accent)
                        .frame(width: 34, height: 3)
                        .offset(y: 3)
                        .transition(.opacity)
                }
            }
            .overlay(alignment: .topTrailing) {
                if tab == .saved, !model.saved.isEmpty {
                    Text("\(model.saved.count)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .frame(minWidth: 15, minHeight: 15)
                        .background(Theme.brand, in: Capsule())
                        .offset(x: -8, y: 3)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(PressableStyle(scale: 0.92))
        .animation(.easeOut(duration: 0.2), value: active)
        .accessibilityLabel(label)
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}

private struct QuizReturnButton: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Button {
            model.goBack()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 17, weight: .bold))
                Text(model.progress.finished ? "Tilbake til resultatet" : "Tilbake til spørsmålet")
                    .font(.system(size: 17, weight: .heavy))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: 440, minHeight: 62)
            .frame(maxWidth: .infinity)
            .background(Color(hex: 0x005379), in: Capsule())
            .overlay(Capsule().stroke(Theme.brandLight, lineWidth: 1.5))
            .shadow(color: .black.opacity(0.3), radius: 16, y: 6)
        }
        .buttonStyle(PressableStyle(scale: 0.97))
        .padding(.horizontal, 20)
    }
}

private struct ToastView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ZStack {
            if let message = model.toastMessage {
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Theme.surface, in: Capsule())
                    .overlay(Capsule().stroke(Theme.line, lineWidth: 1))
                    .shadow(color: .black.opacity(0.25), radius: 12, y: 4)
                    .padding(.horizontal, 16)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .id(message)
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: model.toastMessage)
        .accessibilityElement(children: .contain)
    }
}

// MARK: - About

private struct AboutSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("Om Opplyst")
                        .font(.headline(26, weight: .heavy))
                        .tight(26)
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .semibold))
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel("Lukk")
                }
                .padding(.top, 8)

                Text("Opplyst gjør det morsomt å følge med på det som skjer rundt deg. Hver dag får du et nytt spill med spørsmål fra ukens nyheter. Står du fast, leser du saken og går tilbake til spørsmålet.")
                    .body14()

                VStack(alignment: .leading, spacing: 8) {
                    bullet("Dagens spill med hint og vurdering av svaret ditt")
                    bullet("Saken bak hvert spørsmål, med Adressas egen oppsummering")
                    bullet("Nyhetsfeed, søk, kategorier og lagrede saker")
                }

                Text("Spørsmålene og sakene bygger på ukens journalistikk fra Adresseavisen (Polaris Media). Claude vurderer svarene i spillet. Hele saken med Adressas oppsummering vises bare der den er hentet med eget abonnement; ellers lenker appen til saken hos Adressa.")
                    .body14()

                Text("Uoffisiell hackathon-prototype med Adressa-design fra hackathonpakken. Den har ingen tilknytning til eller godkjenning fra Adresseavisen eller Polaris Media. Quizfremdrift og lagrede saker lagres bare på denne enheten.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(4)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .background(Theme.surface.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Circle().fill(Theme.brandLight).frame(width: 5, height: 5).offset(y: -2)
            Text(text).body14()
        }
    }
}

private extension Text {
    func body14() -> some View {
        font(.system(size: 14))
            .foregroundStyle(Theme.muted)
            .lineSpacing(5)
            .fixedSize(horizontal: false, vertical: true)
    }
}
