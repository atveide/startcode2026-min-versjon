# Kontroll av leveransen

Kontrollert 15. oktober 2026.

| Kontroll | Resultat |
| --- | --- |
| Ren installasjon (`npm ci` fra låsefil i separat mappe) | Bestått, deretter nytt bygg og assetkontroll |
| TypeScript + produksjonsbygg (`npm run build`) | Bestått |
| Lokale assets og lisens-/noticefiler (`npm run check:assets`) | 15 assets + 5 notices verifisert mot SHA-256 |
| Nettlesertester (`npm run test:e2e`) | 20 av 20 bestått |
| Mobil og desktop | Testet ved 390 × 844 og 1440 × 1000 px |
| Ekstra smal visning | Ingen horisontal sideoverflyt ved 320 px på fem sentrale ruter |
| Lange søk | 150 tegn uten mellomrom gir ingen horisontal sideoverflyt |
| Produksjonsbygg i nettleser | Lokale fonter lastet, ingen JavaScript-feil eller HTTP-feil |
| Lokal designoversikt | `DESIGN_PREVIEW.html` åpnet direkte som fil, fonter/bilder/mørkt tema virker |

Nettlesertestene dekker oppstart, lokale fonter og bilder, fravær av eksterne kjøringsforespørsler, kategorivalg, søk/filter/nullstilling, lagrede saker over omstart, sletting, artikkelrute, lenkede fotokilder, deling med utklippstavle-fallback, temavalg over omstart, skjematilstander, ukjent artikkel og korrupt lagringsdata.

Automatiske axe-kontroller mot WCAG 2.1 A/AA rapporterte ingen avvik på forside, søk, artikkel og designsystem, både i lyst og mørkt tema og på begge skjermstørrelser. Dette er en automatisk kontroll av utvalgte tilstander, ikke en full tilgjengelighetssertifisering. Fysiske telefoner, full skjermlesertesting og alle nettleserfamilier er ikke kontrollert.

Skjermbildene i `docs/previews/` viser den testede appen. Nettlesertestene kan gjenskape bildene. Testmiljøet brukte en allerede installert Chromium-nettleser via `PLAYWRIGHT_CHROMIUM_PATH`; på en ny maskin brukes `npx playwright install chromium` og deretter `npm run test:e2e`.

Pakken inneholder ingen backend. Innlogging, betalingsmur, pushvarsler, offline artikkelcache og CMS-integrasjon er ikke implementert. Lagring og tema huskes lokalt i nettleseren, uten synkronisering mellom enheter.
