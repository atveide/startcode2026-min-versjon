import SwiftUI

struct QuizView: View {
    let content: Content
    @Environment(AppModel.self) private var model

    var body: some View {
        let progress = model.progress
        if progress.questions.isEmpty {
            QuizFrame(content: content, story: nil) {
                Text("Ingen spørsmål i dag. Kom tilbake i morgen.")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.white)
            }
        } else if progress.finished {
            ResultView(content: content)
        } else {
            QuestionView(content: content)
                .id(progress.index)
        }
    }
}

// MARK: - Frame

/// The game sits on the story's photo (or the news graphic), in the same panel language as the feed.
private struct QuizFrame<Inner: View>: View {
    let content: Content
    let story: Story?
    var seed = 0
    @ViewBuilder var inner: () -> Inner
    @Environment(AppModel.self) private var model
    @Environment(\.metrics) private var metrics

    var body: some View {
        let progress = model.progress
        let count = content.quiz.headlines.count
        let position = progress.finished ? count : min(progress.index + 1, count)

        ZStack {
            PanelBackground(story: story, seed: seed)
                .ignoresSafeArea()
            Theme.quizShade
                .ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Text("Dagens spill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button {
                        model.select(.feed)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(PressableStyle(scale: 0.88))
                    .accessibilityLabel("Lukk spillet og gå til forsiden")
                    .padding(.trailing, -10)
                }
                .padding(.horizontal, 22)
                .padding(.top, 14)

                HStack(spacing: 14) {
                    Text("\(position) av \(count)")
                        .monospacedDigit()
                    HStack(spacing: 6) {
                        ForEach(Array(progress.questions.enumerated()), id: \.offset) { index, question in
                            let current = index == progress.index && !progress.finished
                            Capsule()
                                .fill(current ? Color.white : question.isDone ? Color.white.opacity(0.7) : Color.white.opacity(0.3))
                                .frame(height: 4)
                        }
                    }
                    Text("\(progress.totalPoints) poeng")
                        .fontWeight(.bold)
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                .font(.system(size: 14))
                .foregroundStyle(Color(hex: 0xE0E8EE))
                .padding(.horizontal, 22)
                .padding(.top, 6)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Spørsmål \(position) av \(count), \(progress.totalPoints) poeng")

                GeometryReader { geo in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            inner()
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 22)
                        .padding(.top, 20)
                        .padding(.bottom, metrics.safeClearance + 24)
                        .frame(minHeight: geo.size.height, alignment: .bottom)
                    }
                    .scrollIndicators(.hidden)
                    .scrollDismissesKeyboard(.interactively)
                }
            }
        }
    }
}

// MARK: - Question

private enum Pending {
    case guess, hint, giveUp
}

private struct QuestionView: View {
    let content: Content
    @Environment(AppModel.self) private var model
    @State private var input = ""
    @State private var pending: Pending?
    @State private var errorText: String?
    @FocusState private var focused: Bool

    var body: some View {
        let progress = model.progress
        let index = min(progress.index, content.quiz.headlines.count - 1)
        let headline = content.quiz.headlines[index]
        let q = progress.questions[index]
        let story = content.storiesById[headline.storyId]
        let done = q.isDone
        let isLast = index == content.quiz.headlines.count - 1
        let hintsLeft = content.quiz.maxHints - q.hints
        let stuck = !done && (!q.guesses.isEmpty || q.hints > 0)

        QuizFrame(content: content, story: story, seed: index + 1) {
            if let story { CategoryTag(story: story).padding(.bottom, 14) }

            headlineText(headline, q: q)
                .font(.headline(headlineSize(headline.text.count)))
                .tight(headlineSize(headline.text.count), em: 0.03)
                .lineSpacing(2)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 22)
                .accessibilityLabel(
                    headline.text.replacingOccurrences(of: blankMarker, with: q.answer ?? "ordet som mangler")
                )

            if done {
                Outcome(q: q, isLast: isLast) {
                    model.nextQuestion()
                }
            } else {
                Text("Hvilket ord mangler?")
                    .font(.system(size: 16))
                    .foregroundStyle(.white)
                    .padding(.bottom, 10)

                if let hint = q.hint {
                    HStack(spacing: 6) {
                        Text("Hint:")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.paleText)
                        Text(hint)
                            .font(.system(size: 18, weight: .bold, design: .monospaced))
                            .tracking(2.5)
                            .foregroundStyle(.white)
                    }
                    .padding(.bottom, 12)
                    .accessibilityLabel("Hint: \(hint.replacingOccurrences(of: " ", with: ""))")
                }

                VStack(spacing: 16) {
                    TextField("", text: $input, prompt: Text("Skriv svaret ditt").foregroundStyle(.white.opacity(0.6)))
                        .font(.system(size: 17))
                        .foregroundStyle(.white)
                        .tint(Theme.brandLight)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.send)
                        .focused($focused)
                        .onSubmit { submit(q: q, headline: headline) }
                        .padding(.horizontal, 16)
                        .frame(minHeight: 54)
                        .background(Color(rgba: 0x00101E59), in: RoundedRectangle(cornerRadius: 4))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(focused ? Theme.brandLight : Color.white.opacity(0.8), lineWidth: focused ? 3 : 1)
                        )

                    Button {
                        submit(q: q, headline: headline)
                    } label: {
                        HStack(spacing: 10) {
                            Text(pending == .guess ? "Sjekker …" : "Svar")
                            if pending == .guess {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "arrow.right").font(.system(size: 17, weight: .semibold))
                            }
                        }
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(Theme.submit, in: RoundedRectangle(cornerRadius: 4))
                        .opacity(pending == nil ? 1 : 0.7)
                    }
                    .buttonStyle(PressableStyle(scale: 0.98))
                    .disabled(pending != nil)
                }
                .frame(maxWidth: 560)

                HStack(spacing: 16) {
                    Button(hintsLeft > 0 ? "Vis hint" : "Ingen hint igjen") {
                        run(.hint) { try await model.hint() }
                    }
                    .disabled(pending != nil || hintsLeft <= 0)

                    Rectangle().fill(.white.opacity(0.6)).frame(width: 1, height: 20)

                    Button("Hopp over") {
                        run(.giveUp) { try await model.giveUp() }
                    }
                    .disabled(pending != nil)
                }
                .font(.system(size: 15))
                .foregroundStyle(.white)
                .padding(.top, 10)
            }

            if let errorText {
                Text(errorText)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.live)
                    .padding(.top, 12)
                    .transition(.opacity)
            }

            if !done, !q.guesses.isEmpty {
                VStack(spacing: 8) {
                    ForEach(q.guesses.sorted { $0.score > $1.score }, id: \.word) { guess in
                        GuessRow(guess: guess)
                    }
                }
                .frame(maxWidth: 560)
                .padding(.top, 14)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("Forsøkene dine, nærmest først")
            }

            if let story {
                StoryLink(story: story, stuck: stuck, hasRead: q.readStory) {
                    model.openStory(story.id, fromQuiz: true)
                }
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.85), value: q.guesses)
        .animation(.easeOut(duration: 0.2), value: errorText)
        .sensoryFeedback(.success, trigger: done)
        .sensoryFeedback(.impact(weight: .light), trigger: q.guesses.count)
        .onAppear {
            // Landing on the next question: bring the keyboard up, like the web game.
            if model.tab == .quiz, index > 0, !done { focused = true }
        }
    }

    // MARK: Actions

    private func submit(q: QuestionState, headline: Headline) {
        let word = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if word.isEmpty {
            focused = true
            return
        }
        if pending != nil || q.isDone { return }
        if q.guesses.contains(where: { normalize($0.word) == normalize(word) }) {
            errorText = "Du har allerede prøvd «\(word)»."
            return
        }
        run(.guess) {
            try await model.guess(word)
            input = ""
            focused = true
        }
    }

    private func run(_ kind: Pending, _ action: @escaping () async throws -> Void) {
        pending = kind
        errorText = nil
        Task {
            do {
                try await action()
            } catch is CancellationError {
                // Left the screen; nothing to report.
            } catch {
                errorText = error.localizedDescription
            }
            pending = nil
        }
    }

    /// Long sentences get a smaller headline so the answer field stays on screen.
    private func headlineSize(_ length: Int) -> CGFloat {
        switch length {
        case ..<55: return 38
        case ..<85: return 33
        case ..<115: return 29
        default: return 26
        }
    }

    /// The headline with a gap where the word goes, or the answer once it is known.
    private func headlineText(_ headline: Headline, q: QuestionState) -> Text {
        let parts = headline.text.components(separatedBy: blankMarker)
        let before = parts.first ?? ""
        let after = parts.dropFirst().joined(separator: blankMarker)

        var text = AttributedString(before)
        if let answer = q.answer {
            var filled = AttributedString("\u{202F}\(answer)\u{202F}")
            filled.backgroundColor = q.gaveUp ? Color.white.opacity(0.18) : Color(hex: 0x005379)
            text += filled
        } else {
            // A run of underscores reads as the blank line, and never collapses at a line start.
            var gap = AttributedString(String(repeating: "_", count: 5))
            gap.foregroundColor = Theme.blank
            text += gap
        }
        text += AttributedString(after)
        return Text(text)
    }
}

private struct GuessRow: View {
    let guess: Guess

    var body: some View {
        let heat = Heat(score: guess.score)
        let barColor: Color = switch heat {
        case .hot: Color(hex: 0x7ED6AA)
        case .warm: Color(hex: 0x1D8CC6)
        case .cold: Color(hex: 0x8A9AA6)
        }
        HStack(spacing: 12) {
            Text(guess.word)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: 112, alignment: .leading)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.15))
                    Capsule()
                        .fill(barColor)
                        .frame(width: max(geo.size.width * 0.03, geo.size.width * CGFloat(guess.score) / 100))
                }
            }
            .frame(height: 6)
            Text("\(guess.score)")
                .monospacedDigit()
                .foregroundStyle(Theme.paleText)
                .frame(width: 32, alignment: .trailing)
        }
        .font(.system(size: 14))
        .foregroundStyle(.white)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(guess.word), \(guess.score) av 100")
    }
}

private struct Outcome: View {
    let q: QuestionState
    let isLast: Bool
    let onNext: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 16) {
                Image(systemName: q.gaveUp ? "arrow.right" : "checkmark")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .background(q.gaveUp ? Color.white.opacity(0.2) : Theme.submit, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(q.gaveUp ? "Hoppet over" : "Riktig!")
                        .font(.system(size: 22, weight: .heavy))
                        .tracking(-0.55)
                        .foregroundStyle(.white)
                    Text(
                        q.gaveUp
                            ? "Ingen poeng denne gangen, men nå vet du det."
                            : "\(q.readStory ? "Du leste deg opp og fant svaret." : "Du husket nyheten.") +\(q.points) poeng"
                    )
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.paleText)
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.bottom, 22)
            .transition(.opacity.combined(with: .offset(y: 8)))

            Button(action: onNext) {
                HStack(spacing: 10) {
                    Text(isLast ? "Se resultatet" : "Neste spørsmål")
                    Image(systemName: "arrow.right").font(.system(size: 17, weight: .semibold))
                }
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 54)
                .background(Theme.submit, in: RoundedRectangle(cornerRadius: 4))
            }
            .buttonStyle(PressableStyle(scale: 0.98))
            .frame(maxWidth: 560)
        }
    }
}

/// The story behind the question. After a wrong guess it turns into a clear nudge to read it.
private struct StoryLink: View {
    let story: Story
    let stuck: Bool
    let hasRead: Bool
    let open: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(
                stuck && !hasRead
                    ? "Står du fast? Svaret står i saken"
                    : hasRead ? "Saken bak spørsmålet · lest" : "Saken bak spørsmålet"
            )
            .font(.system(size: stuck && !hasRead ? 14 : 13, weight: stuck && !hasRead ? .bold : .regular))
            .foregroundStyle(stuck && !hasRead ? Color(hex: 0x9FD8F2) : Theme.paleText)

            Button(action: open) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(story.title)
                        .font(.system(size: 17, weight: .bold))
                        .multilineTextAlignment(.leading)
                        .underline(stuck, color: Theme.blank)
                    Image(systemName: "arrow.up.right").font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(minHeight: 32, alignment: .leading)
            }
            .buttonStyle(PressableStyle(scale: 0.98))
        }
        .frame(maxWidth: 560, alignment: .leading)
        .padding(.top, 16)
        .overlay(alignment: .top) { Color.white.opacity(0.3).frame(height: 1) }
        .padding(.top, 26)
    }
}

// MARK: - Result

private struct ResultView: View {
    let content: Content
    @Environment(AppModel.self) private var model

    var body: some View {
        let progress = model.progress
        let points = progress.totalPoints
        let max = content.quiz.headlines.count * maxPoints
        let result = verdict(points: points, max: max)

        QuizFrame(content: content, story: nil, seed: 3) {
            Text("Dagens spill · Ferdig")
                .font(.system(size: 11, weight: .bold))
                .textCase(.uppercase)
                .tracking(0.3)
                .foregroundStyle(.white)
                .padding(.horizontal, 7)
                .padding(.vertical, 4)
                .background(Theme.brand, in: RoundedRectangle(cornerRadius: 3))
                .padding(.bottom, 14)

            Text(result.title)
                .font(.headline(40))
                .tight(40, em: 0.045)
                .foregroundStyle(.white)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 14)

            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(points)")
                    .font(.system(size: 40, weight: .heavy))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                Text("av \(max) poeng")
                    .font(.system(size: 20))
                    .foregroundStyle(Color(hex: 0xE0E8EE))
            }
            .padding(.bottom, 14)

            Text(highlighted(result.text, background: Color(rgba: 0x005379F5)))
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(.white)
                .lineSpacing(8)
                .frame(maxWidth: 560, alignment: .leading)

            VStack(spacing: 10) {
                ForEach(Array(content.quiz.headlines.enumerated()), id: \.element.id) { index, headline in
                    if progress.questions.indices.contains(index) {
                        ResultRow(
                            headline: headline,
                            question: progress.questions[index],
                            story: content.storiesById[headline.storyId]
                        ) {
                            model.openStory(headline.storyId, fromQuiz: true)
                        }
                    }
                }
            }
            .padding(.top, 24)
            .padding(.bottom, 28)

            VStack(spacing: 12) {
                Button {
                    model.scrollFeedToTools()
                } label: {
                    HStack(spacing: 10) {
                        Text("Utforsk ukens saker")
                        Image(systemName: "arrow.right").font(.system(size: 17, weight: .semibold))
                    }
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Theme.submit, in: RoundedRectangle(cornerRadius: 4))
                }
                .buttonStyle(PressableStyle(scale: 0.98))

                Button("Spill igjen") { model.restartQuiz() }
                    .font(.system(size: 15))
                    .foregroundStyle(.white)
                    .underline()
                    .frame(minHeight: 44)
            }
            .frame(maxWidth: 560)

            Text("Nytt spill i morgen, med nye spørsmål fra ukens nyheter. Følg med, så er du klar.")
                .font(.system(size: 11))
                .foregroundStyle(Color(hex: 0xC3CCD4))
                .padding(.top, 10)
        }
        .sensoryFeedback(.success, trigger: progress.finished)
    }
}

private struct ResultRow: View {
    let headline: Headline
    let question: QuestionState
    let story: Story?
    let readStory: () -> Void

    var body: some View {
        let points = question.points
        let parts = headline.text.components(separatedBy: blankMarker)
        let before = parts.first ?? ""
        let after = parts.dropFirst().joined(separator: blankMarker)

        var line = AttributedString(before)
        var answer = AttributedString(question.answer ?? blankMarker)
        answer.foregroundColor = Color(hex: 0x9FD8F2)
        answer.inlinePresentationIntent = .stronglyEmphasized
        line += answer
        line += AttributedString(after)

        return HStack(alignment: .top, spacing: 14) {
            Text(points == 0 ? "0" : "+\(points)")
                .font(.system(size: 14, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(.white)
                .frame(minWidth: 52)
                .padding(.vertical, 4)
                .background(points == 0 ? Color.white.opacity(0.18) : Theme.brand, in: RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 6) {
                Text(line)
                    .font(.system(size: 15))
                    .foregroundStyle(.white)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                if story != nil {
                    Button(action: readStory) {
                        Text("Les saken")
                            .font(.system(size: 13))
                            .underline()
                            .foregroundStyle(Theme.ice)
                            .frame(minHeight: 32, alignment: .leading)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(rgba: 0x07172399), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.18), lineWidth: 1))
    }
}
