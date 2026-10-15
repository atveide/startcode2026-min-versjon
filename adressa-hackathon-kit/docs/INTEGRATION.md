# Integrasjon og videreutvikling

Pakken er et uoffisielt hackathon-utgangspunkt for en nyhetsapp. Den inneholder en webprototype med React, TypeScript, lokale data, designressurser og dokumentasjon. Den er laget for å kunne åpnes som eget prosjekt eller brukes som referanse i et eksisterende prosjekt.

## Bruk hele prosjektet

Pakk ut ZIP-filen i en egen prosjektmappe og åpne mappen i Claude Code. Les `README.md` og `CLAUDE.md` først. Installer avhengighetene og bruk startkommandoene i README. Behold bildene, fontene, lisensene og kildeoversikten samlet når prosjektet flyttes.

En konkret videreutviklingsoppgave kan være: «Bruk komponentene, tokenrollene og innholdsmodellen i denne pakken. Videreutvikle nyhetsappen med forside, artikkelvisning, søk og lagrede saker. Behold tydelig demomerking og bytt kun ut fiktivt innhold når en godkjent datakilde foreligger.»

## Bruk ressursene i et eksisterende prosjekt

1. Les dokumentasjonen og kildeoversikten før du kopierer ressurser.
2. Kopier relevante logoer, bilder og fonter med tilhørende lisensfiler til prosjektets mappe for statiske ressurser.
3. Overfør tokenroller til prosjektets eget temasystem. Samkjør farger, avstand, typografi og fokusregler sentralt.
4. Tilpass komponentene til eksisterende navigasjon og kodekonvensjoner. Bruk semantiske lenker og knapper.
5. Importer demodataene eller lag en adapter til egen datakilde. Kontroller at bildestier fungerer på den valgte publiseringsadressen.
6. Verifiser mobilvisning, tastaturnavigasjon, søk, lagring og tomtilstander etter integrasjonen.

Kopier ikke `node_modules` eller en lokal byggecache. Bruk prosjektets eksisterende avhengigheter og oppsett dersom de allerede dekker behovet. Relativt adresserte bilder i `Story.image` må løses gjennom appens eksisterende basebane dersom løsningen publiseres under en undermappe.

## Datakontrakt

Demodataene eksporteres fra `src/data/stories.ts`. `categories` inneholder visningsfiltrene, der «Alle» betyr at ingen kategori filtreres bort.

```ts
export type Story = {
  id: string;
  category: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  imageCredit: string;
  publishedAt: string;
  readingMinutes: number;
  premium: boolean;
  author: string;
  body: string[];
};
```

| Felt | Forventning |
| --- | --- |
| `id` | Stabil og unik verdi; brukes også til å knytte lagring til saken |
| `category` | Visningsnavn som samsvarer med et kjent filter |
| `title`, `summary` | Ren tekst; ingen HTML |
| `image` | Lokal ressurssti uten innledende skråstrek (for eksempel `assets/images/trondheim.jpg`). Eksterne URL-er trenger en tilpasset asset-resolver. |
| `imageAlt` | Relevant beskrivelse av bildet; tom streng ved dekorativt bilde |
| `imageCredit` | Opphav/kreditering; erstatter ikke rettighetsavklaring |
| `publishedAt` | ISO 8601 med tidssone, for eksempel `2026-10-15T09:20:00+02:00` |
| `readingMinutes` | Positivt heltall; beregnes fra godkjent tekst i en ferdig løsning |
| `premium` | Presentasjonsmarkør i prototypen; gir ingen tilgangskontroll |
| `author` | Visningsnavn for byline |
| `body` | En liste med rene tekstavsnitt |

`PhotoCredit` henter kildeinformasjon fra pakkens assetmanifest. Hvis dere bytter bilder eller går over til eksterne bilder, må dere oppdatere både manifest/kreditering og asset-resolveren i `src/components/editorial.tsx`. Den medfølgende resolveren forventer lokale stier.

En CMS-adapter bør oversette rådata til denne kontrakten før komponentene bruker dem. Valider nødvendige felt, bruk et definert reservebilde ved manglende bilde, og vis egne lastende-, tom- og feiltilstander. Manglende saker må ikke erstattes lydløst med fiktive demosaker i et publisert produkt.

For rikere redaksjonelt innhold kan `body` senere byttes til en eksplisitt blokkmodell for tekst, mellomtitler, bilder og sitater. Render bare kjente blokker. Ikke sett ukontrollert HTML fra en datakilde direkte inn i siden.

## Lagring og personlige funksjoner

Lagrede saker i demoen er en lokal nettleserfunksjon. Oppbevar stabile artikkel-ID-er fremfor hele kopier av teksten. Håndter slettede ID-er og utilgjengelig lokal lagring uten at appen krasjer. Synkronisering mellom enheter krever en reell konto- og lagringstjeneste.

«Min side», Pluss-merker og eventuelle innstillingsvalg skal beskrive demoens faktiske oppførsel. Pakken inkluderer ingen ekte innlogging, betalingsmur, betaling, pushvarsler eller abonnementskontroll. Slike funksjoner krever en avtalt tjeneste og en separat implementasjon.

## CMS, API og hemmeligheter

Pakken inneholder ingen API-nøkler eller skjulte tilganger. Sett eventuelle hemmeligheter i en servertjeneste og konfigurerbare miljøvariabler. Verdier bygget inn i klientappen er synlige for brukeren og egner seg ikke for hemmelige nøkler. Ikke hent eller kopier abonnementsinnhold gjennom en uavklart tilkobling.

Bytt data via et avtalt API, et godkjent CMS eller et kontrollert demodatasett. Tilgangsrettigheter, abonnementskontroll og håndtering av personopplysninger må avgjøres av tjenesten som faktisk eier disse oppgavene. Vis bare den informasjonen appen har rett til å presentere.

## Overføring til React Native

Dette prosjektet er en React-webapp. CSS, HTML-elementer, nettleserens navigasjon og lokal lagring kan ikke kopieres direkte inn i React Native. Designverdier, innholdskontrakt og komponentenes hensikt kan brukes som referanse.

| Webkonsept | Konseptuell native-motpart |
| --- | --- |
| CSS-variabler | Delte TypeScript-tokens og en native temaløsning |
| `button` og lenker | `Pressable` med navn, rolle og riktige tilstander |
| Tekst og avsnitt | `Text` med eksplisitte tekststiler |
| Responsivt CSS-grid | Native layout med Flexbox og skjermbredde |
| Statiske webbilder | Pakkede native-ressurser eller godkjente bilde-URL-er |
| Nettlesernavigasjon | Plattformtilpasset navigasjonsbibliotek |
| `localStorage` | Egnet native-lagring for ikke-sensitive ID-er |
| Lokale webfonter | Fonter registrert gjennom valgt native-rammeverk |

Tilpass navigasjon, safe areas, tekstskalering, fokus, tilgjengelighetsroller og berøringsflater på ekte enheter. Native-overføringen er et eget utviklingsarbeid; pakken lover ikke at webkomponentene kjører uendret i React Native.

## Før en større demonstrasjon eller publisering

Kontroller at riktig logo, kildeoversikt og lisensfiler følger med. Behold synlig demomerking og fiktive innholdsmerknader. Prøv appen ved smal bredde og med tastatur, og bekreft at søk, lagring og tilbake-navigasjon fungerer. Les gjennom alle handlingstekster slik at prototypen bare lover funksjoner som faktisk er implementert.
