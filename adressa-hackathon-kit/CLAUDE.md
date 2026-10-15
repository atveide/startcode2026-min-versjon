# Adressa Hackathon Kit — project instructions

Build a mobile-first Norwegian news app using this local design system. This is an unofficial hackathon prototype, not an approved Adresseavisen product.

## Read first

1. `docs/DESIGN_SYSTEM.md` — visual principles and component rules.
2. `design-system/tokens.json` and `design-system/tokens.css` — token source and generated CSS.
3. `docs/CONTENT_GUIDE.md` — Norwegian product language and demo-content conventions.
4. `docs/ASSET_SOURCES.md` and `assets-manifest.json` — provenance, attribution and asset status.
5. `docs/INTEGRATION.md` — data boundary and integration guidance.

## Stack and commands

- React + TypeScript + Vite; local CSS, no UI framework.
- `npm ci`, `npm run dev`, `npm run build`.
- `npm run check:assets`, `npm run test:e2e`.
- `npm run tokens` regenerates `design-system/tokens.css` from JSON.
- `src/data/stories.ts` is the replaceable demo-data layer. Keep its type boundary when connecting a CMS.
- Hash navigation is deliberate: the demo works on simple static hosting without rewrite rules.
- Use `import.meta.env.BASE_URL` for public asset paths so subdirectory deployments work.

## Design constraints

- Use the real vector masthead under `public/assets/brand/`; do not recreate it as styled text. `app-icon.svg` is a proposed hackathon monogram, not an official icon.
- Primary blue `#005379`, secondary accent `#28AAE2`; only source-marked values are observed brand evidence. All remaining UI choices are proposed.
- Bitter for editorial headlines, Inter for UI and short metadata. Both are self-hosted via `public/assets/fonts/fonts.css`.
- Keep a newspaper rhythm: large editorial headlines, strong lead image, clear sections, compact metadata, thin separators, generous reading whitespace.
- Prefer flat surfaces and 4–8 px corner radii; reserve 16 px for exceptional containers. Avoid generic dashboard styling, giant pill cards, gradients and excessive shadows.
- Reuse the components under `src/components/`. Colors, typography and spacing come from tokens. Document any deliberate new token.
- Mobile touch targets at least 44×44 px. Keep mobile bottom navigation visible without covering content or safe areas.
- Maintain keyboard navigation, visible focus, semantic headings, descriptive button labels, accessible form labels, image alt text and reduced-motion behavior.
- Dark mode must use semantic values; do not invert photos or the logo blindly.
- Keep the demo label and fictional-content notices during the hackathon. Do not imply that sample articles report real events.

## Product behavior

- Start with the existing home, article, search, saved and account/settings flows.
- Saved items and theme are local to the browser. No real authentication, payments, notifications or network API are implemented.
- Do not add inert buttons. Implement an action, an honest demo explanation or a disabled state with a reason.
- Never introduce secrets into the client. API integration must be explicit, configurable and documented.
- Keep image author/source/license links accessible in the app, and preserve the bundled licenses.
- Editorial demo text is original. Do not populate the app with scraped paywalled articles or invented quotes attributed to real people.

## Working in an existing project

If this kit is copied into a larger app, inspect that app first. Reuse its router and build setup rather than overwriting them. Port the tokens, assets and components deliberately. This starter is web code; React Native needs an explicit adaptation.

## Before handing over

Run the build and asset check. Run meaningful browser tests for changed flows. Check a narrow phone viewport and a desktop viewport, including focus, contrast, long headlines and empty search/saved states. Update `docs/VERIFICATION.md` with what was actually verified and any remaining limitations.
