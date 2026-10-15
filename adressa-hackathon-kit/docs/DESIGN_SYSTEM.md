# Adressa – uoffisielt designsystem for hackathon

Dette er et selvstendig forslag til et designsystem for en mobiltilpasset nyhetsapp inspirert av Adresseavisen. Det er ikke Adresseavisens profilmanual, et godkjent produkt eller en rekonstruksjon av interne retningslinjer. Enkelte farger og logogeometrien er hentet fra det offentlige nettstedet. Systemet, typografihierarkiet, komponentreglene og skjermoppsettet er våre valg for denne prototypen. Kildeoversikten skiller observasjoner og innhentede merkevarefiler fra materialet vi har laget.

## Designidé

Appen skal kjennes som en troverdig lokalavis: tydelige overskrifter, god plass til journalistikken og korte veier til det leseren er opptatt av. Det visuelle uttrykket kombinerer en tung serif i redaksjonelle titler med en nøktern sans serif i navigasjon og kontroller. Hvite kort, varmgrå bakgrunn og blå aksenter gir et rolig hierarki.

Prioriter én tydelig hovedsak, deretter en variert strøm med lokale saker. Tittel, kategori og ingress skal forklare hvorfor en sak er interessant før leseren åpner den. Bruk små metadata med måte. Tomrom, linjer og typografi skal organisere innholdet; dekorasjon skal ha en tydelig oppgave.

## Farger og tokenroller

Den offisielle [CSS-filen for adressa.no](https://www.adressa.no/css/snowflake.adressa.2f7e1ff8a86e7c48a8e6.css) deklarerte følgende verdier da den ble kontrollert 15. oktober 2026. Dette er observasjoner fra nettstedet, ikke dokumentasjon på en full profilmanual:

| Observert nettstedsrolle | Verdi |
| --- | --- |
| Primær | `#005379` |
| Sekundær | `#28AAE2` |
| Bakgrunn | `#F9F9F9` |
| Sport | `#4E9D2D` |
| Kultur | `#C3002F` |
| Svart | `#010101` |

I appen bruker vi den observerte primærfargen som merkevareaksent og legger til egne støttefarger. Hele kombinasjonen og bruksreglene er vårt forslag. Bruk prosjektets sentrale tokens som fasit ved implementasjon, slik at senere justeringer følger hele appen.

| Rolle | Startverdi | Bruk |
| --- | --- | --- |
| Merkevare, observert verdi | `#005379` | Primærknapp, aktiv navigasjon, lenker og fokus |
| Merkevare ved hover, forslag | `#003E5B` | Tilbakemelding på primærknapp |
| Lys merkevareflate, forslag | `#E9F4F8` | Rolig utheving og valgte filtre |
| Hovedtekst | `#17212B` | Titler, brødtekst og viktige ikoner |
| Sekundærtekst | `#53616E` | Tid, bildetekst og støttetekst |
| Kantlinje | `#D6DCE0` | Delestreker og kortgrenser |
| Flate | `#FFFFFF` | Kort, leseflate og kontroller |
| Bakgrunn, forslag | `#F4F5F2` | Bakgrunn utenfor den redaksjonelle flaten |
| Varsel/feil, forslag | `#B42318` | Tekstlig forklart varsel eller feil |
| Bekreftelse, forslag | `#17734E` | Tekstlig forklart bekreftelse |

Ikke bruk blått som eneste signal for valgt tilstand: legg også til strek, fyll, tekst eller ikon. Med startpaletten gir hovedtekst på hvitt omtrent 16,3:1, sekundærtekst på hvitt omtrent 6,4:1 og hvit tekst på merkevareblått omtrent 8,4:1 i WCAG-kontrast. Kontroller alltid kontrast på den faktiske kombinasjonen ved endringer. Kantfargen er en svak separator; den er ikke tilstrekkelig som eneste kontur for en viktig interaktiv kontroll.

Semantiske roller skal være atskilt fra rå farger: `brand`, `ink`, `muted`, `paper`, `canvas`, `border`, `focus`, `live` og `success`. Feil, bekreftelse og lagret tilstand skal ha et forståelig tekstsignal. Farger for slike tilstander er prototypevalg, ikke dokumenterte Adresseavisen-farger.

## Typografi

**Bitter** brukes i redaksjonelle titler via `--font-editorial` og gir prototypen et tydelig avispreg. **Inter** brukes i ingress, brødtekst, menyer, skjema og metadata via `--font-ui`. Begge er lokale fonter med åpen lisens; lisensfiler følger pakken. Offentlige annonseretningslinjer omtaler redaksjonelle skrifter, men beskriver ikke et komplett apphierarki. Inter er vårt eget UI-valg. Kommersielle Acta-filer følger ikke med; offentlig omtale av en font gir ingen rett til å distribuere den.

| Rolle | Veiledende størrelse | Vekt | Linjehøyde |
| --- | --- | --- | --- |
| Hovedsak, stor skjerm | 44–56 px | 700–800 | 1,04–1,12 |
| Hovedsak, mobil | 32–40 px | 700–800 | 1,08–1,16 |
| Artikkeltittel | 36–56 px, flytende | 700–800 | 1,08–1,16 |
| Korttittel | 22–30 px | 700 | 1,15–1,25 |
| Seksjonstittel | 24–32 px | 700 | 1,2 |
| Ingress | 18–22 px | 400–500 | 1,45–1,6 |
| Brødtekst | 17–19 px | 400 | 1,6–1,75 |
| UI-tekst | 14–16 px | 500–700 | 1,3–1,5 |
| Metadata | 12–14 px | 400–600 | 1,4–1,5 |

Unngå lange tekstlinjer på artikkelsiden; omtrent 60–75 tegn per linje er et godt mål. Bruk flytende overskriftsstørrelser med fornuftige minimums- og maksimumsverdier. Teksten skal tåle nettleserzoom på 200 % og økt systemtekst uten at kontroller forsvinner.

## Avstand, form og struktur

Bruk en 4 px-grunnskala gjennom `--space-1` til `--space-12`: **4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44 og 48 px**. Små avstander binder kategori, tittel og metadata sammen. Større avstander skiller saker og seksjoner. Unngå tilfeldige mellomverdier dersom skalaen dekker behovet.

Vanlige nyhetskort er flate, med rette bildekanter og tynne skillelinjer. Knapper og skjemafelt bruker 4–8 px avrunding. Små statusmerker bruker vanligvis 2–4 px, mens filterknapper kan bruke en mild avrunding. Subtile skygger kan løfte flytende navigasjon og dialoger; bruk kantlinje og luft for vanlige kort.

Bildene skal ha stabile sideforhold og `object-fit: cover`. Et vanlig kort kan bruke 16:10 eller 16:9. Gi hovedsaken mer plass, men hold tittel og inngang tydelige på små skjermer. Ikke legg nødvendig tekst inne i et bilde.

## Komponentregler

### Button

Primærknappen viser én viktig handling per område. Sekundærknapper bruker lys flate eller tydelig kontur. Tekstknapper passer til mindre handlinger. Bruk handlingsord: «Lagre sak», «Vis alle» og «Fjern fra lagrede». Ikonknapper trenger et tilgjengelig navn som beskriver handlingen.

Mål for trykkflate er minst 44 × 44 px. Vis standard, hover, trykket, tastaturfokus og deaktivert tilstand. Fokus skal være tydelig mot både hvite og blå flater. Deaktivert tilstand skal ha faktisk deaktivert oppførsel og må ikke brukes til å skjule en forklaring på manglende tilgang.

### Badge og metadata

Kategorien er en inngang til temaet. «Pluss» er en visuell abonnementsmarkør i demoen og aktiverer ingen betalingsmur. Status må alltid uttrykkes i tekst, ikke bare i farge. Hold tidspunkt, lesetid og forfatter på en rolig linje, og la linjen brytes på små skjermer.

### StoryCard

Anbefalt rekkefølge: bilde, kategori eller merke, tittel, valgfri ingress, metadata. Hovedsaken får større tittel og tydeligere bilde. Vanlige kort skal fungere uten ingress. Lagreknappen skal kunne brukes uten at artikkelen åpnes; ikke legg interaktive knapper inni en annen lenke eller knapp.

Tittelen skal være en forståelig lenke. Unngå flere identiske «Les mer»-lenker. Bildets alternativtekst beskriver relevant visuelt innhold; et rent dekorativt bilde kan ha tom alternativtekst. Kreditering vises på artikkelsiden og i kildeoversikten.

### Artikkelskjerm

Gi leseren en tydelig vei tilbake, kategori, tittel, ingress, forfatter og tidspunkt. Vis bildekreditering ved hovedbildet. Brødteksten skal ha tydelig avsnittsrytme. Demomerknaden skal være synlig. «Lagre» bytter forståelig mellom lagret og ikke lagret, og status gjenspeiles i oversikten over lagrede saker.

### Søk, filtre og tomtilstander

Søkefeltet har et synlig navn og en tydelig mulighet til å tømme søket. Kategorivalg skal formidle hvilket filter som er aktivt. Resultater skal oppdatere seg uten å flytte tastaturfokus. En tomtilstand forklarer situasjonen og neste mulighet: «Ingen treff. Prøv et annet søkeord eller velg Alle.»

En tom liste over lagrede saker bør fortelle hvordan man lagrer, og tilby en vei til forsiden. Ikke vis en teknisk feilmelding som tomtilstand. Ved ekte datatilkobling skal lastende, tom og mislykket forespørsel være egne tilstander.

### Navigasjon og Min side

Forside, Søk, Lagret og Min side har korte, stabile navn. Vis aktiv destinasjon med både tekst/ikon og en formendring. Skjermen «Min side» er en demonstrasjon; handlinger uten tjenestetilkobling må forklares som demo. Designsystemvisningen fungerer som en intern oversikt over farger, typografi og komponenter.

## Responsivt oppsett

Start med én kolonne og omtrent 16–20 px sidemarg på mobil. Navigasjon og felt skal være lette å nå med berøring. På nettbrett kan nyhetsstrømmen bruke to kolonner. På store skjermer kan hovedsaken og støttesaker få et bredere redaksjonelt oppsett innen en sentrert maksimumsbredde.

Bruk innholdet som grunnlag for bruddpunkter; omtrent 640 og 1024 px er fornuftige startpunkter. Enhetene er ikke separate produkter. Kort, hierarki og handlinger skal beholde samme mening når layouten endres. La kategoriraden brytes eller rulles med synlig tilgjengelig navigasjon, og unngå horisontal sidescrolling ved 320 px visningsbredde.

## Tema, bevegelse og tilgjengelighet

Det lyse temaet er hovedreferansen. Pakken leverer også et foreslått mørkt tema med egne semantiske fargeverdier i `tokens.json` og `tokens.css`, aktivert med `data-theme="dark"`. Tekst-, handlings- og fokuskontrast kontrolleres i demoen; nye komponenter og bilder må fortsatt vurderes når appen utvides. Temaet bytter fargeverdier og logovariant, uten å invertere fotoene.

Bruk korte overganger, omtrent 120–200 ms, til tilbakemelding på handlinger. Respekter `prefers-reduced-motion`, og unngå at automatisk bevegelse stjeler oppmerksomhet fra lesingen.

Bevar semantiske overskrifter, lenker, knapper og skjemafelt. Vis tastaturfokus. Dialoger trenger fokusstyring og en forståelig lukkemulighet. Ikke flytt fokus ved filtrering. Lagret status og søkeresultater kan kunngjøres kort og høflig til skjermleser. Klikkbare kort skal fungere med tastatur og ikke være avhengige av hover.

Ved videreutvikling bør dere kontrollere tastaturflyt, skjermlesernavn, 200 % zoom, 320 px bredde, redusert bevegelse og kontrast på alle reelle tilstander. Dette er et implementasjonsmål og en praktisk sjekkliste, ikke en sertifisering av prototypen.

## Komponent-API i pakken

`src/components/primitives.tsx` eksporterer `Button`, `IconButton` og `Badge`. `Button` har `variant="primary" | "secondary" | "text"`, `loading` og native knappeattributter. `IconButton` krever `label`. `Badge` har `variant="category" | "demo" | "success"`.

`src/components/editorial.tsx` eksporterer `PremiumBadge`, `StoryMeta`, `SaveButton`, `StoryCard`, `CategoryFilter` og `EmptyState`. `src/AssetCredits.tsx` sørger for lenkede fotokilder og kreditering uten nestede interaktive elementer.

```tsx
import { Button, IconButton, Badge } from './components/primitives';

<Button variant="primary" onClick={handleSave}>Lagre sak</Button>
<IconButton label="Åpne søk" onClick={openSearch}><SearchIcon /></IconButton>
<Badge variant="demo">Fiktiv demosak</Badge>
```

`handleSave`, `openSearch` og `SearchIcon` er plassholdere for funksjoner/ikoner i prosjektet. Bruk en lenke for navigasjon og en knapp for handlinger.
