import SwiftUI
import SafariServices

// MARK: - Glass

extension View {
    /// Liquid Glass on iOS 26, a blurred dark material before that.
    @ViewBuilder
    func glassCapsule(tint: Color = Theme.navBackground) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(.regular.tint(tint.opacity(0.55)), in: Capsule())
        } else {
            self
                .background(.ultraThinMaterial, in: Capsule())
                .background(tint, in: Capsule())
                .overlay(Capsule().stroke(Theme.navLine, lineWidth: 1))
        }
    }

    @ViewBuilder
    func glassCircle(tint: Color = Color(rgba: 0x07172370)) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(.regular.tint(tint), in: Circle())
        } else {
            self
                .background(.ultraThinMaterial, in: Circle())
                .background(tint, in: Circle())
                .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 1))
        }
    }
}

// MARK: - Brand

struct Wordmark: View {
    var size: CGFloat = 32

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text("Opplyst")
                .font(.headline(size, weight: .heavy))
                .tracking(-size * 0.055)
                .foregroundStyle(.white)
            Circle()
                .fill(Theme.accent)
                .frame(width: size * 0.24, height: size * 0.24)
                .shadow(color: Theme.accent, radius: size * 0.22)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Opplyst")
    }
}

struct BrandBadge: View {
    var size: CGFloat = 48

    var body: some View {
        Image("BrandMark")
            .resizable()
            .scaledToFit()
            .frame(width: size * 0.6, height: size * 0.72)
            .frame(width: size, height: size)
            .background(Theme.brand, in: Circle())
            .accessibilityHidden(true)
    }
}

/// The photo-less background: a deep blue wash with a giant quotation mark and a tilted
/// ring. `seed` moves the pieces a little so a feed of them doesn't look copy-pasted.
struct NewsGraphic: View {
    var seed: Int = 0

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let variant = Double(abs(seed) % 5)
            let rotation = -25.0 + (variant - 2) * 9
            ZStack {
                RadialGradient(
                    stops: [
                        .init(color: Color(hex: 0x126083), location: 0),
                        .init(color: Color(hex: 0x063B57), location: 0.3),
                        .init(color: Color(hex: 0x001A2D), location: 0.75),
                    ],
                    center: UnitPoint(x: 0.85 - variant * 0.06, y: 0.10 + variant * 0.03),
                    startRadius: 0,
                    endRadius: hypot(w, h) * 0.95
                )

                Ellipse()
                    .fill(Color(rgba: 0x74BCDF08))
                    .frame(width: w * 0.8 + 320, height: h * 1.05 + 320)
                    .rotationEffect(.degrees(rotation))
                    .position(x: w * (0.8 + variant * 0.03), y: h * 0.67)
                Ellipse()
                    .stroke(Color(rgba: 0x74BCDF20), lineWidth: 1)
                    .frame(width: w * 0.8, height: h * 1.05)
                    .rotationEffect(.degrees(rotation))
                    .position(x: w * (0.8 + variant * 0.03), y: h * 0.67)

                Text("\u{201C}")
                    .font(.system(size: 620, weight: .bold, design: .serif))
                    .foregroundStyle(Color.white.opacity(0.055))
                    .position(x: w * (0.78 - variant * 0.05), y: 170 + variant * 18)
            }
            .frame(width: w, height: h)
            .clipped()
        }
        .drawingGroup()
        .accessibilityHidden(true)
    }
}

/// A full-bleed panel photo, with the news graphic when there is none (or it fails).
struct PanelBackground: View {
    let story: Story?
    var seed: Int = 0
    var maxPixel: CGFloat = 1600
    @Environment(AppModel.self) private var model

    var body: some View {
        if let image = story?.image, let url = model.api.resolve(image.src) {
            RemoteImage(url: url, maxPixel: maxPixel) { NewsGraphic(seed: seed) }
        } else {
            NewsGraphic(seed: seed)
        }
    }
}

// MARK: - Small pieces

struct CategoryTag: View {
    let story: Story
    var body: some View {
        Text(story.category)
            .font(.system(size: 11, weight: .bold))
            .textCase(.uppercase)
            .tracking(0.3)
            .foregroundStyle(.white)
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(Theme.category(story.category), in: RoundedRectangle(cornerRadius: 3))
    }
}

struct ReadBadge: View {
    var body: some View {
        HStack(spacing: 5) {
            Text("Lest")
            Image(systemName: "checkmark").font(.system(size: 9, weight: .bold))
        }
        .font(.system(size: 10, weight: .semibold))
        .foregroundStyle(Color(hex: 0xB1EED2))
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(rgba: 0x102E2ACC), in: RoundedRectangle(cornerRadius: 4))
        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color(rgba: 0x60CFA64D), lineWidth: 1))
    }
}

struct SaveButton: View {
    let story: Story
    @Environment(AppModel.self) private var model

    var body: some View {
        let isSaved = model.isSaved(story.id)
        Button {
            model.toggleSaved(story.id)
        } label: {
            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .glassCircle(tint: isSaved ? Theme.brand.opacity(0.9) : Color(rgba: 0x07172370))
                .contentShape(Circle())
        }
        .buttonStyle(PressableStyle())
        .sensoryFeedback(.selection, trigger: isSaved)
        .accessibilityLabel(isSaved ? "Fjern fra lagrede" : "Lagre sak")
    }
}

/// A subtle press-down, so taps feel physical.
struct PressableStyle: ButtonStyle {
    var scale: CGFloat = 0.94

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scale : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct SearchField: View {
    @Binding var text: String
    var placeholder = "Søk i saker"
    @FocusState private var focused: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Theme.muted)
            TextField("", text: $text, prompt: Text(placeholder).foregroundStyle(Theme.muted))
                .font(.system(size: 16))
                .foregroundStyle(.white)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)
                .focused($focused)
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 36, height: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Tøm søk")
            }
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 50)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(focused ? Theme.brandLight : Theme.line, lineWidth: focused ? 2 : 1))
        .accessibilityElement(children: .contain)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .bold))
            .foregroundStyle(Color(hex: 0x010101))
            .padding(.horizontal, 20)
            .frame(minHeight: 46)
            .background(Theme.brandLight, in: RoundedRectangle(cornerRadius: 8))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

/// «Text» with a solid highlight behind each line, the way the web prototype sets
/// summaries and headlines on top of photos.
func highlighted(_ text: String, background: Color, padding: Bool = true) -> AttributedString {
    var run = AttributedString(padding ? "\u{00A0}\(text)\u{00A0}" : text)
    run.backgroundColor = background
    return run
}

// MARK: - Safari

struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(Theme.brandLight)
        controller.preferredBarTintColor = UIColor(Theme.surface)
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}

// MARK: - Swipe back

// Hiding the navigation bar switches off the edge-swipe-back gesture. This puts it back.
extension UINavigationController: @retroactive UIGestureRecognizerDelegate {
    override open func viewDidLoad() {
        super.viewDidLoad()
        interactivePopGestureRecognizer?.delegate = self
    }

    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        viewControllers.count > 1
    }
}
