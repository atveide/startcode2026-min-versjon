# Adressa · Hackathon Kit

Et komplett, uoffisielt designsystem og en fungerende startapp for en mobiltilpasset Adressa-nyhetsapp. Laget 15. oktober 2026.

## Bruk i Claude Code

1. Klon repoet og gå inn i mappen `adressa-hackathon-kit/`.
2. Åpne mappen `adressa-hackathon-kit` som prosjekt i Claude Code (eller start Claude Code fra den), slik at `CLAUDE.md` i denne mappen blir lest.
3. Lim inn teksten i `START_HERE_PROMPT.md` og legg til hackathon-idéen deres.

`CLAUDE.md` blir prosjektets faste instruksjoner. Alle logoer, fonter, bilder, tokens, eksempeltekster og komponenter ligger lokalt i pakken.

## Se designet uten å installere noe

Åpne `DESIGN_PREVIEW.html` i en nettleser. Der ser dere farger, typografi, logo, knapper og et mobilutkast. For den fungerende appen:

```sh
npm ci
npm run dev
```

Åpne adressen terminalen viser. Bruk Node.js 22.12 eller nyere. Appen bruker React, TypeScript og Vite; nøyaktige pakkeversjoner ligger i låsefilen.

## Dette følger med

| Fil/mappe | Innhold |
| --- | --- |
| `docs/adressa-pakkeoversikt.pdf` | PDF med innholdsliste, skjermbilder og bruksoversikt |
| `CLAUDE.md` | Instruksjoner og designregler for Claude Code |
| `START_HERE_PROMPT.md` | Ferdig startprompt |
| `DESIGN_PREVIEW.html` | Visuell, lokal designoversikt |
| `design-system/` | Farger, typografi, avstander og andre tokens i JSON, CSS og TypeScript |
| `src/components/` | Gjenbrukbare React-komponenter |
| `src/App.tsx` | Nyhetsapp med forside, artikkel, søk, lagrede saker, innstillinger og komponentgalleri |
| `src/data/stories.ts` | Originale, fiktive demoartikler på norsk |
| `public/assets/brand/` | Faktisk masthead, fargevarianter og foreslått appikon |
| `public/assets/fonts/` | Lokale Bitter- og Inter-fonter |
| `public/assets/images/` | Foto fra Trondheim med kreditering og originale illustrasjoner |
| `docs/` | Designmanual, innholdsguide, integrasjon og kildeoversikt |
| `assets-manifest.json` | Maskinlesbare kilder, endringer og lisensopplysninger |
| `licenses/` | Font-, foto- og ikonlisenser |

Komponentgalleriet finnes også på `#designsystem` i appen.

## Hva som virker

Kategorifiltrering, fritekstsøk, artikkellesing, lagring lokalt i nettleseren, deling/kopiering av artikkellenker og valg av lyst/mørkt tema. Appen sender ingen brukerdata til en server. Hver demosak er fiktiv, og bilder er arkiv-/illustrasjonsbilder.

Innlogging, abonnement, CMS, pushvarsler og betalingsløsninger må kobles til egne tjenester senere. «Pluss» er en visuell demomarkør; det er ingen ekte betalingsmur.

## Verifisering og videre arbeid

```sh
npm run build
npm run check:assets
npm run test:e2e
```

For første kjøring av nettlesertestene: `npx playwright install chromium`. Se `docs/VERIFICATION.md` for kontrollene som faktisk er kjørt på denne leveransen.

Endre først `design-system/tokens.json`, og kjør `npm run tokens` for å oppdatere CSS. Bruk eksisterende komponenter før dere lager nye.

## Kilder og bruksstatus

Dette er vårt forslag for hackathon, ikke Adresseavisens offisielle profilmanual. Masthead og enkelte farger er hentet fra offentlig `adressa.no`. UI-fonten, layouten, komponentene og øvrige regler er våre valg. Ikke bruk teksten i pakken som dokumentasjon på at Adresseavisen har godkjent en løsning.

Egenprodusert kode, dokumentasjon og illustrasjoner er under MIT. Logo og tredjepartsfiler er unntatt MIT; se `docs/ASSET_SOURCES.md`, `assets-manifest.json` og `licenses/`. Behold fotokreditering og lisenslenker ved videre bruk.
