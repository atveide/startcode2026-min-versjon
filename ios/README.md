# Opplyst for iPhone (SwiftUI)

Samme app som web-versjonen i `frontend/`, bygget som en ren iPhone-app i SwiftUI. Ingen
Flutter, ingen CocoaPods, ingen pakker: bare Xcode.

- Snakker med samme backend (`https://startcode-august-api.onrender.com`) og bruker samme API,
  spillregler, tekster og design som nettsiden.
- iOS 17 eller nyere, bare iPhone, bare stående, bare mørk.
- Spill, lagrede saker og «lest» lagres på telefonen (UserDefaults), på samme måte som
  localStorage på nettsiden.

## Kjøre den på telefonen

1. Åpne `ios/Opplyst.xcodeproj` i Xcode.
2. Koble til iPhonen med kabel, lås den opp og trykk «Stol på denne datamaskinen».
3. På iPhonen: **Innstillinger → Personvern og sikkerhet → Utviklermodus → på** (telefonen
   starter på nytt). Gjøres bare første gang.
4. I Xcode: velg iPhonen din øverst (ved siden av «Opplyst»), og trykk ▶︎ (⌘R).
5. Første gang: på iPhonen, **Innstillinger → Generelt → VPN og enhetsadministrasjon →** velg
   utviklerprofilen din → **Stol på**. Åpne appen igjen.

Signeringsteamet er allerede satt til Augusts personlige team (`7G6GPXJC9Q`). Hvis Xcode klager
på «Signing», gå til **Opplyst → Signing & Capabilities** og velg ditt eget Team. Hvis
bundle-ID-en `no.augusttveide.opplyst` er tatt, bytt til en annen.

En personlig (gratis) signering varer i 7 dager. Etter det må du trykke ▶︎ på nytt.

### Simulator

Velg en simulator (f.eks. iPhone 17 Pro) i stedet for telefonen og trykk ▶︎.

## Fart

Run-skjemaet er satt til **Release**, ikke Debug. SwiftUI i Debug-bygg scroller merkbart
dårligere, og det er ikke det du vil teste. Vil du feilsøke, bytt til Debug med
**Product → Scheme → Edit Scheme → Run → Build Configuration**.

## Annen backend (f.eks. på Macen din)

Standard er Render-serveren (gratisinstansen kan bruke opptil et minutt på å våkne etter å ha
vært urørt). For å bruke backend på egen maskin:

```sh
make backend   # kjører på http://localhost:8000
```

Sett så `OpplystAPIBase` i `ios/Config/Info.plist` til Macens adresse på nettverket
(f.eks. `http://192.168.1.20:8000`), eller sett miljøvariabelen `OPPLYST_API_BASE` i
**Edit Scheme → Run → Arguments**. Lokalt nettverk er tillatt uten HTTPS. Telefonen og Macen
må være på samme Wi-Fi. Med lokal backend og `ADRESSA_CACHE_DIR` satt får du bilder og full
artikkeltekst i appen.

## Oppbygging

```
ios/
  Opplyst.xcodeproj    Prosjektet (mappen Opplyst/ legges til automatisk, ingen filliste)
  Config/Info.plist    Backend-adresse, mørk/stående, nettverkstillatelse
  Opplyst/
    OpplystApp.swift   Inngang
    RootView.swift     Faner, flytende meny, toast, «Om Opplyst»
    FeedView.swift     Forsiden og feeden (én sak per skjerm, snapper som på mobilweb)
    StoryView.swift    Saken, med «tilbake til spørsmålet» fra quizen
    QuizView.swift     Dagens spill og resultat
    SavedView.swift    Lagrede saker
    AppModel.swift     Tilstand, lagring, spilllogikk
    QuizLogic.swift    Poeng, dom, søk (port av quiz.ts og logic.ts)
    APIClient.swift    Samme endepunkter som frontend/src/api.ts
    RemoteImage.swift  Bilder: nedlasting, nedskalering og hurtigbuffer utenfor hovedtråden
    Theme.swift        Adressa-tokens
    Assets.xcassets    App-ikon, Adressa-merket
```

## Hva som er annerledes enn nettsiden

- Fullskjerm-forespørselen finnes ikke (appen er allerede fullskjerm).
- «Del» bruker iOS sitt delingsark, og «Les saken hos Adresseavisen» åpnes i en innebygd
  Safari-visning.
- Tilbake-sveip fra kanten, haptikk, og Liquid Glass-meny på iOS 26.
