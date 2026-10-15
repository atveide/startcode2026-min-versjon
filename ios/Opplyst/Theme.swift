import SwiftUI
import UIKit

// Adressa tokens from frontend/src/tokens.css (dark values) and styles.css.

extension Color {
    /// 0xRRGGBB
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }

    /// 0xRRGGBBAA, the way the CSS writes 8-digit hex.
    init(rgba: UInt32) {
        self.init(
            .sRGB,
            red: Double((rgba >> 24) & 0xFF) / 255,
            green: Double((rgba >> 16) & 0xFF) / 255,
            blue: Double((rgba >> 8) & 0xFF) / 255,
            opacity: Double(rgba & 0xFF) / 255
        )
    }
}

enum Theme {
    static let brand = Color(hex: 0x005379)
    static let brandLight = Color(hex: 0x83C9ED)
    static let accent = Color(hex: 0x28AAE2)
    static let canvas = Color(hex: 0x1A1A1A)
    static let surface = Color(hex: 0x010101)
    static let soft = Color(hex: 0x14384B)
    static let line = Color(hex: 0x333333)
    static let muted = Color(hex: 0xAAAAAA)
    static let success = Color(hex: 0x7ED6AA)
    static let live = Color(hex: 0xFFABA4)

    static let submit = Color(hex: 0x0B6A9A)
    static let blank = Color(hex: 0x1D8CC6)
    static let panelBase = Color(hex: 0x0B1E2B)
    static let ice = Color(hex: 0xC9E8F7)
    static let paleText = Color(hex: 0xDBE4EA)

    static let navBackground = Color(rgba: 0x0A1925D9)
    static let navLine = Color(hex: 0x355368)
    static let navText = Color(hex: 0xA6B4BF)

    static func category(_ name: String) -> Color {
        switch name {
        case "Sport": return Color(hex: 0x4E9D2D)
        case "Kultur": return Color(hex: 0xC3002F)
        default: return brand
        }
    }

    static let panelShade = LinearGradient(
        stops: [
            .init(color: Color(rgba: 0x001523B3), location: 0),
            .init(color: Color(rgba: 0x00152300), location: 0.22),
            .init(color: Color(rgba: 0x00152360), location: 0.5),
            .init(color: Color(rgba: 0x00101EE6), location: 0.9),
            .init(color: Color(rgba: 0x000E1BF5), location: 1),
        ],
        startPoint: .top,
        endPoint: .bottom
    )

    static let quizShade = LinearGradient(
        stops: [
            .init(color: Color(rgba: 0x001523B3), location: 0),
            .init(color: Color(rgba: 0x00152326), location: 0.22),
            .init(color: Color(rgba: 0x001523A6), location: 0.48),
            .init(color: Color(rgba: 0x000E1BF7), location: 0.78),
            .init(color: Color(rgba: 0x000E1BFF), location: 1),
        ],
        startPoint: .top,
        endPoint: .bottom
    )
}

extension Font {
    /// Heavy Inter-style headline weight (the CSS uses 750 to 850).
    static func headline(_ size: CGFloat, weight: Font.Weight = .heavy) -> Font {
        .system(size: size, weight: weight)
    }
}

extension View {
    /// Tight headline tracking, written in em like the CSS.
    func tight(_ size: CGFloat, em: CGFloat = 0.04) -> some View {
        tracking(-size * em)
    }
}

// MARK: - Device metrics

/// Portrait-only app, so the screen size and safe areas are stable. They are read from the
/// window (not from GeometryReader) so the keyboard never makes the feed panels resize.
struct DeviceMetrics: Equatable {
    var size: CGSize
    var top: CGFloat
    var bottom: CGFloat

    static let fallback = DeviceMetrics(size: CGSize(width: 393, height: 852), top: 59, bottom: 34)

    /// The floating bar is 66 pt tall. On phones with a home indicator it sits right on the
    /// safe area; on others it floats 20 pt above the edge.
    static let barHeight: CGFloat = 66

    /// Gap between the bottom safe area and the bar.
    var barGap: CGFloat { bottom > 0 ? 2 : 20 }

    /// Space from the very bottom of the screen to the top of the bar, for full-bleed content.
    var barClearance: CGFloat { bottom + barGap + Self.barHeight }

    /// The same, measured from the bottom safe area, for content that respects it.
    var safeClearance: CGFloat { barGap + Self.barHeight }

    @MainActor
    static var current: DeviceMetrics {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let window = scenes.first?.keyWindow ?? scenes.first?.windows.first, window.bounds.width > 0 else {
            return fallback
        }
        return DeviceMetrics(size: window.bounds.size, top: window.safeAreaInsets.top, bottom: window.safeAreaInsets.bottom)
    }
}

private struct MetricsKey: EnvironmentKey {
    static let defaultValue = DeviceMetrics.fallback
}

extension EnvironmentValues {
    var metrics: DeviceMetrics {
        get { self[MetricsKey.self] }
        set { self[MetricsKey.self] = newValue }
    }
}
