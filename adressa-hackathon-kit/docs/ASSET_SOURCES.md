# Kilder, assets og lisenser

Kontrollert og lastet ned 15. oktober 2026. Dette er en uoffisiell hackathonpakke. Observasjoner fra den offentlige nettsiden er ikke en full profilmanual, og forslagene i demoen er ikke godkjent av Adresseavisen.

`assets-manifest.json` inneholder eksakte kildeadresser, SHA-256, filstørrelser, kildeklassifisering og lisenser. Fotoene og fontene er lagret lokalt; demoen trenger ingen eksterne bilde- eller fonttjenester.

## Masthead

| Lokal fil | Opphav | Endring |
| --- | --- | --- |
| `public/assets/brand/adresseavisen-original.svg` | Inline SVG i masthead på [adressa.no](https://www.adressa.no/) | SVG-elementet er tatt ut av HTML uten endring av geometri eller farge. `viewBox="0 0 120 24"`, original fill `#000`. |
| `public/assets/brand/adressa-blue.svg` | Avledet fra originalen over | Kun fill er endret til observert primærblå `#005379`. |
| `public/assets/brand/adressa-white.svg` | Avledet fra originalen over | Kun fill er endret til `#ffffff`. |

Den offisielle nettsiden oppgir ingen eksplisitt gjenbrukslisens for dette logoassetet. Logo og merkenavn inngår ikke i pakkens eventuelle lisens for original kode. [Commons-siden for Adresseavisen.svg](https://commons.wikimedia.org/wiki/File:Adresseavisen.svg) klassifiserer sin egen versjon av ordmerket som `PD-textlogo`; Commons-filen er ikke filen som er distribuert her. Blå og hvit variant er tekniske demovarianter, ikke dokumenterte offisielle logovarianter. Ingen logo-SVG inneholder script, event handlers, eksterne lenker eller `foreignObject`.

## Observerte farger

Kilde: den offisielle [CSS-filen for adressa.no](https://www.adressa.no/css/snowflake.adressa.2f7e1ff8a86e7c48a8e6.css), lest 15. oktober 2026. Følgende verdier var deklarert i nettstedets `:root`:

| CSS-variabel | Observert verdi |
| --- | --- |
| `--color-primary` | `#005379` |
| `--color-primary-dark-1` | `#004666` |
| `--color-primary-dark-2` | `#003852` |
| `--color-secondary` | `#28aae2` |
| `--color-background` | `#f9f9f9` |
| `--color-footer-background` | `#f1f1f1` |
| `--color-sport` | `#4e9d2d` |
| `--color-kultur` | `#c3002f` |
| `--color-krim` | `#0c212a` |
| `--color-black` | `#010101` |
| `--color-trdby` | `#ffa235` |
| `--color-rbk` | `#be9e55` |

Selve CSS-filen er ikke inkludert. Andre tokenverdier, komponentregler og tilgjengelighetsjusteringer i pakken er demoens egne forslag. CSS-observasjonen bekrefter ikke noen komplett trykk-, CMYK- eller Pantone-spesifikasjon.

## Fonter

| Lokal fil | Eksakt kilde | Lisens |
| --- | --- | --- |
| `public/assets/fonts/bitter-latin-wght-normal.woff2` | [Fontsource Variable Bitter 5.3.0](https://cdn.jsdelivr.net/npm/@fontsource-variable/bitter@5.3.0/files/bitter-latin-wght-normal.woff2) | SIL OFL 1.1, komplett tekst i `licenses/Bitter-OFL.txt` |
| `public/assets/fonts/inter-latin-wght-normal.woff2` | [Fontsource Variable Inter 5.3.0](https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/files/inter-latin-wght-normal.woff2) | SIL OFL 1.1, komplett tekst i `licenses/Inter-OFL.txt` |
| `public/assets/fonts/fonts.css` | Originalt innlastingsoppsett i denne pakken | Pakkens lisens for original kode |

Lisensfilene er hentet fra de samme versjonslåste Fontsource-pakkene: [Bitter LICENSE](https://cdn.jsdelivr.net/npm/@fontsource-variable/bitter@5.3.0/LICENSE) og [Inter LICENSE](https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/LICENSE). Prosjektenes opphav finnes også hos [Google Fonts/Bitter](https://github.com/google/fonts/tree/main/ofl/bitter) og [Google Fonts/Inter](https://github.com/google/fonts/tree/main/ofl/inter).

Begge lokale WOFF2-filer er kontrollert som variable fonter med `wght` fra 100 til 900. Latin-subsettene inneholder `æøåÆØÅ`. Filene er uendret etter nedlasting. `fonts.css` bruker `font-display: swap` og relative URL-er.

Bitter og Inter er åpne fontvalg for denne demoen. Inter er ikke verifisert som Adresseavisens profilfont. Omtale av redaksjonelle fonter i offentlige [annonseretningslinjer](https://ocast.com/no/adresseavisen-1/adspecs/digitale-retningslinjer-og-frister-for-direktekjop) er ikke tilstrekkelig til å fastslå en komplett offisiell typografihierarki.

## Fotoer

Alle fire er faktiske fotografier fra Trondheim, ikke AI-genererte bilder. Lokale filer er nedskalert til maksimalt 1600 piksler på lengste side og lagret som progressive JPEG-filer med kvalitet 82 for å holde demoen lett. Ingen motivendringer er gjort. Manifestet inneholder hash og dimensjoner både for kildenedlastingen og den lokale bearbeidede filen. Fotoene kan også få et utsnitt via CSS; de skal presenteres som illustrasjonsfoto, ikke som dokumentasjon på demoens oppdiktede hendelser.

| Lokal fil | Motiv og fotograf | Lisens og kilde |
| --- | --- | --- |
| `public/assets/images/trondheim.jpg` | Nidelva sett fra Gamle Bybro. Foto: Addrexoline, 14. juli 2021. | [Nidelv.jpg](https://commons.wikimedia.org/wiki/File:Nidelv.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/assets/images/bakklandet.jpg` | Nedre Bakklandet. Foto: Guy Delsaut, 27. august 2019. | [Nedre Bakklandet.jpg](https://commons.wikimedia.org/wiki/File:Nedre_Bakklandet.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/assets/images/bymarka.jpg` | Vintervatnet ved Gråkallen i Bymarka. Foto: Cato Edvardsen, 15. juni 2016. | [Vintervatnet Bymarka.jpg](https://commons.wikimedia.org/wiki/File:Vintervatnet_Bymarka.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `public/assets/images/lerkendal.jpg` | Lerkendal stadion. Foto: Ssu, 13. juli 2023. | [Lerkendal stadion, 2023.jpg](https://commons.wikimedia.org/wiki/File:Lerkendal_stadion,_2023.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

Krediter fotograf, lenk kildefilen og lisensen, og oppgi eventuelle endringer. Cato Edvardsen ber uttrykkelig om kreditering i umiddelbar nærhet av bildet. Bruk derfor en synlig bildetekst, for eksempel:

> Illustrasjonsfoto: Cato Edvardsen / Wikimedia Commons / CC BY-SA 4.0. Nedskalert og komprimert; utsnitt i visningen.

Samme mønster med respektiv fotograf brukes for de andre fotoene. Hvis et foto redigeres eller bearbeides, gjelder CC BY-SA 4.0 også for den bearbeidede bildefilen. Full lisens er inkludert i `licenses/CC-BY-SA-4.0.txt`. Lisensen for bildene endrer ikke i seg selv lisensen på uavhengig appkode.

## Kontroll

- Alle nedlastede filer har filhash i manifestet.
- WOFF2-filene er lest med fontverktøy; vektaksen og norske tegn er kontrollert.
- SVG-ene er parsbare XML-filer og inneholder bare det lokale ordmerket, uten aktive elementer.
- Alle fotoer er dekodet og sett visuelt. Kilden til `lerkendal.jpg` var JPEG med MPO-metadata; den distribuerte, nedskalerte filen er standard JPEG.
- Ingen avisartikler, artikkelbilder fra Adressa, betalvegginnhold eller lisensierte kommersielle fontfiler er distribuert.

## Originale illustrasjoner og ikoner

`byliv.svg`, `marka.svg`, `fotball.svg` og `kultur.svg` er originale vektorillustrasjoner laget for denne pakken, under MIT. `app-icon.svg` er et foreslått appikon for hackathon; det er ikke et offisielt Adressa-ikon.

UI-ikonene kommer fra Lucide React, med komplett lisens i `licenses/Lucide-LICENSE.txt`. Pakkeversjonen er låst i `package-lock.json`.
