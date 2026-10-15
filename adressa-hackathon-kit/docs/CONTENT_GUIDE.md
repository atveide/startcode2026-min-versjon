# Innholdsguide

## Hva demoinnholdet er

Alle åtte artiklene i `src/data/stories.ts` er originale, fiktive tekster skrevet for denne hackathon-prototypen. Hendelser, tilbud, prosjekter og personer i tekstene er konstruert. Forfatternavnet «Demo-redaksjonen» viser ikke til en redaksjon hos Adresseavisen. Datoene er faste demodatoer fra 15. oktober 2026 og skal ikke presenteres som løpende nyhetsoppdateringer.

Hver artikkel har en synlig merknad i brødteksten. Behold denne ved demonstrasjon og deling. Ved reell publisering må hele demoteksten byttes ut med redaksjonelt godkjent innhold. Ingen av tekstene er kopiert fra Adresseavisens artikler.

Forslagene til tone, titler, navigasjon og mikrocopy er også våre egne. De er ikke Adresseavisens språklige profil.

## Redaksjonell tone

Skriv direkte og konkret på norsk bokmål. Forklar saken i tittelen og gi en grunn til å lese videre i ingressen. Hold lokale stedsnavn presise, og sjekk alle faktiske opplysninger før publisering. Unngå udokumenterte superlativer, kunstig hastverk og titler som lover mer enn saken leverer.

Skill mellom nyhet, kommentar, guide, annonse og demo. Ikke bruk «Nå skjer det», «Siste nytt» eller andre signaler om aktualitet på statisk, fiktivt innhold. En prototype kan vise struktur og tone uten å etterligne faktiske journalister eller finne på sitater fra ekte personer.

## Anbefalt innholdsstruktur

| Felt | Retningslinje |
| --- | --- |
| Kategori | Ett tydelig tema: Trondheim, Trøndelag, Sport eller Kultur |
| Tittel | Omtrent 35–75 tegn når mulig; naturlig språk uten hard lengdegrense |
| Ingress | Én eller to korte setninger som utfyller tittelen |
| Forfatter | «Demo-redaksjonen» i pakken; godkjent byline i produksjon |
| Tid | Gyldig ISO-tid med tidssone; presenteres lokalisert til norsk |
| Lesetid | En grov indikasjon; demoverdiene 2–4 minutter er illustrative |
| Bilde | Relevant motiv med alternativtekst og dokumentert kreditering |
| Brødtekst | Korte avsnitt med én tydelig tanke per avsnitt |

De korte demotekstene er laget for å prøve layouten. Lesetidene er eksempelverdier og er ikke beregnet fra tekstenes lengde.

## Bilder og merkevarefiler

Fotografiene fra Nidelva, Bakklandet, Bymarka og Lerkendal er ekte arkivbilder med åpne lisenser. De brukes som illustrasjonsfoto og dokumenterer ingen av de oppdiktede hendelsene. Bruk `docs/ASSET_SOURCES.md` for opphav, lisens, kilde og endringer. Fotograf, lenket bildekilde og lenket lisens skal vises i nærheten av bildene. Cato Edvardsen ber uttrykkelig om kreditering ved bildet. Eventuelle originale SVG-illustrasjoner i pakken beskriver temaer og dokumenterer heller ingen hendelse.

Behold filenes proporsjoner og kreditering. Adresseavisen-/Adressa-navn og innhentede logoer brukes for å vise konseptets avsender i hackathonen; de innebærer ingen godkjenning. Ved ekstern eller kommersiell bruk må dere avklare rettighetene til de faktiske merkevarefilene og eventuelt erstatte dem.

## Mikrocopy som kan brukes i appen

| Situasjon | Tekst |
| --- | --- |
| Søkefelt | «Søk i demosaker» |
| Ingen søkeresultater | «Ingen treff. Prøv et annet søkeord eller velg Alle.» |
| Ingen lagrede saker | «Ingen lagrede saker ennå. Trykk på bokmerket på en sak for å finne den igjen her.» |
| Lagrehandling | «Lagre sak» |
| Fjern lagring | «Fjern fra lagrede» |
| Bekreftet lagring | «Saken er lagret på denne enheten.» |
| Demoabonnement | «Pluss er en visuell demomarkør. Alle demosaker kan åpnes.» |
| Demokonto | «Dette er en demo. Konto og abonnement er ikke koblet til en tjeneste.» |
| Generell datainnhentingsfeil | «Vi kunne ikke hente sakene. Prøv igjen.» |

Ikke lov varsler, betaling, innlogging, synkronisering eller kundeservice hvis handlingen ikke er koblet til en reell tjeneste. Knyt bekreftelsestekst til det appen faktisk gjør. Lokal lagring gjelder samme nettleser/enhet og kan forsvinne hvis nettleserdata slettes.

## Når dere kobler til ekte innhold

Avtal datatilgang og rettigheter med riktig innholdseier. Bruk et dokumentert API eller et godkjent datasett. Faktasjekk titler, ingresser, forfattere, publiseringstid og bilder, og behandle tilgang til abonnementsinnhold på serveren. Fjern demomerknader først når den tilhørende saken faktisk er erstattet med kontrollert innhold.

Ikke presenter et bilde eller en sak som publisert av Adresseavisen bare fordi det passer i layouten. Logofiler, egenproduserte komponenter, åpne fonter og fiktive tekster har forskjellige rettighetsgrunnlag; kildeoversikten følger med for å gjøre dette synlig.
