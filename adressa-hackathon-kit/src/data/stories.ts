/**
 * Originalt, fiktivt demoinnhold for hackathon-prototypen.
 * Ingen av sakene beskriver faktiske hendelser eller redaksjonell publisering.
 */
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

export const categories = ['Alle', 'Trondheim', 'Trøndelag', 'Sport', 'Kultur'];

export const stories: Story[] = [
  {
    id: 'byen-i-lomma',
    category: 'Trondheim',
    title: 'En ny måte å oppleve byen på',
    summary: 'Hva om de små historiene i nabolaget fikk like god plass som de store overskriftene? Vi utforsker en mer personlig lokalavis.',
    image: 'assets/images/trondheim.jpg',
    imageAlt: 'Arkivfoto av bryggene langs Nidelva i Trondheim. Illustrasjonsfoto.',
    imageCredit: 'Foto: Addrexoline · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T09:20:00+02:00',
    readingMinutes: 3,
    premium: false,
    author: 'Demo-redaksjonen',
    body: [
      'En omvei hjem, en ny møteplass eller en samtale ved bussholdeplassen. Byen består av mange små historier som sjelden havner øverst på en forside. I denne tenkte reportasjen ser vi på hvordan de kan få en tydeligere plass.',
      'Ideen er enkel: Leseren skal kunne finne saker fra nærområdet uten å miste oversikten over det som angår hele Trondheim. Et rolig grensesnitt og tydelige temaer skal gjøre det lettere å oppdage noe nytt.',
      'En lokal nyhetsapp kan også gi rom for pauser. En lagret sak kan vente til trikken, kaffekoppen eller sofaen. Det viktigste er at journalistikken er lett å finne igjen, og at leseren selv velger tempoet.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Den er ikke publisert av Adresseavisen og omtaler ingen faktisk lansering.',
    ],
  },
  {
    id: 'plass-til-en-pause',
    category: 'Trondheim',
    title: 'Et lite pusterom midt i hverdagen',
    summary: 'En tenkt møteplass viser hvordan en benk, litt grønt og god plass kan gjøre et byrom hyggeligere.',
    image: 'assets/images/bakklandet.jpg',
    imageAlt: 'Arkivfoto av trehus og uteservering på Bakklandet. Illustrasjonsfoto.',
    imageCredit: 'Foto: Guy Delsaut · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T08:40:00+02:00',
    readingMinutes: 2,
    premium: false,
    author: 'Demo-redaksjonen',
    body: [
      'Mellom dagens gjøremål kan det være nok med et sted å sette seg. I vårt tenkte nabolag har et lite, åpent byrom blitt utgangspunktet for en samtale om hva som gjør byen god å bruke.',
      'Forslaget trenger ikke være stort. En benk med ryggstøtte, et tre som gir skygge og en passasje som er enkel å komme gjennom, kan ha verdi for mange ulike mennesker.',
      'I en ekte reportasje ville beboere, gårdeier og kommunen fått komme til orde. Her bruker vi situasjonen til å vise hvordan korte lokale saker kan presenteres med tydelig tittel, god lesbarhet og et rolig bilde.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Møteplassen og forslaget er konstruert og beskriver ikke et faktisk byggeprosjekt.',
    ],
  },
  {
    id: 'en-tur-uten-klokke',
    category: 'Trøndelag',
    title: 'Ut på tur, uten å telle minuttene',
    summary: 'Denne tenkte helgeturen handler om å senke tempoet og finne sin egen rytme ute.',
    image: 'assets/images/bymarka.jpg',
    imageAlt: 'Arkivfoto av Vintervatnet med skog i Bymarka. Illustrasjonsfoto.',
    imageCredit: 'Foto: Cato Edvardsen · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T08:10:00+02:00',
    readingMinutes: 3,
    premium: true,
    author: 'Demo-redaksjonen',
    body: [
      'Noen turer begynner med en plan. Andre begynner med at man åpner døra og kjenner at det er godt å være ute. Denne tenkte helgehistorien følger en tur der målet får vente.',
      'Langs stien er det plass til både samtale og stillhet. Et sted å stoppe kan være like viktig som hvor langt man går. Den samme turen kan oppleves ulikt fra dag til dag.',
      'For en lokalavis kan slike historier gi et avbrekk i nyhetsbildet. I prototypen viser saken også hvordan lengre lesning kan merkes, lagres og finnes igjen uten at kortet blir fullt av detaljer.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Den er ikke en konkret turbeskrivelse eller en oppdatert anbefaling om forhold, rute eller tilgjengelighet.',
    ],
  },
  {
    id: 'plass-pa-laget',
    category: 'Sport',
    title: 'Det viktigste er å ha noen å spille med',
    summary: 'En oppdiktet treningskveld setter fellesskapet foran resultatet.',
    image: 'assets/images/lerkendal.jpg',
    imageAlt: 'Arkivfoto av banen og tomme tribuner på Lerkendal. Illustrasjonsfoto, ikke fra demohistorien.',
    imageCredit: 'Foto: Ssu · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T07:50:00+02:00',
    readingMinutes: 2,
    premium: false,
    author: 'Demo-redaksjonen',
    body: [
      'Lysene er på, ballen ligger klar, og det er plass til én til. I denne oppdiktede sportssaken møtes en liten gjeng til en treningsøkt der det sosiale betyr mer enn stillingen.',
      'De deler lag på nytt, justerer banestørrelsen og lar praten fortsette mellom pasningene. Ambisjonen er å få til en god kveld sammen, enten man har spilt lenge eller kommer for første gang.',
      'Sport i en lokalavis kan romme mer enn tabeller. Prototypen gir slike fortellinger samme tydelige inngang som andre nyheter, med egen kategori og en kort oppsummering før leseren åpner saken.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Laget, treningen og hendelsene er konstruert; saken omtaler ingen ekte klubb eller person.',
    ],
  },
  {
    id: 'en-scene-for-nye-ideer',
    category: 'Kultur',
    title: 'En liten scene for store ideer',
    summary: 'I vår tenkte kulturkveld får både uferdige tekster og nye melodier prøve seg foran publikum.',
    image: 'assets/images/kultur.svg',
    imageAlt: 'Illustrasjon av en scene med mikrofon og varme scenelys.',
    imageCredit: 'Original illustrasjon for hackathon',
    publishedAt: '2026-10-15T07:20:00+02:00',
    readingMinutes: 3,
    premium: true,
    author: 'Demo-redaksjonen',
    body: [
      'En mikrofon, noen stoler og tid til å lytte. Det er rammen rundt denne tenkte kulturkvelden i Trondheim, der nye ideer får møte et lite publikum.',
      'En sang kan være uferdig og likevel vekke noe. En tekst kan finne en ny retning når den leses høyt. I fortellingen er terskelen lav, og rommet gir plass til å prøve.',
      'Denne typen sak kan invitere leseren inn i kulturlivet gjennom stemning og nysgjerrighet. I en ferdig nyhetsapp bør opplysninger om tid, sted, arrangør og billetter alltid være kontrollert mot en aktuell kilde.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Kulturkvelden er oppdiktet og skal ikke brukes som en arrangementsoppføring.',
    ],
  },
  {
    id: 'nabolagets-lille-byttehylle',
    category: 'Trondheim',
    title: 'Hyllen som ga ting en ny runde',
    summary: 'En fiktiv byttehylle blir utgangspunkt for en historie om hverdagsvalg og naboskap.',
    image: 'assets/images/bakklandet.jpg',
    imageAlt: 'Arkivfoto av bebyggelse og uteservering på Bakklandet. Illustrasjonsfoto.',
    imageCredit: 'Foto: Guy Delsaut · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T06:55:00+02:00',
    readingMinutes: 2,
    premium: false,
    author: 'Demo-redaksjonen',
    body: [
      'På en hylle i et tenkt fellesrom står en bok, en vase og et puslespill. Lappen over sier at tingene gjerne kan få et nytt hjem. Slik begynner denne oppdiktede nabolagshistorien.',
      'Det som er overflødig for én, kan være akkurat det en annen trenger. Hyllen gir også en grunn til å stoppe opp og snakke sammen om noe så enkelt som en bok man likte.',
      'En ekte redaksjonell sak ville undersøkt hvem som drifter ordningen og hvilke erfaringer naboene har gjort. Demoteksten viser bare hvordan en liten hverdagshistorie kan få plass på forsiden.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Byttehyllen og beboerne er konstruert og viser ikke et faktisk lokalt tilbud.',
    ],
  },
  {
    id: 'utsikten-fra-stien',
    category: 'Trøndelag',
    title: 'Et lite stopp på veien videre',
    summary: 'En oppdiktet fortelling om et utsiktspunkt, en termos og en pause som får ta den tiden den tar.',
    image: 'assets/images/bymarka.jpg',
    imageAlt: 'Arkivfoto av Vintervatnet og åsene rundt i Bymarka. Illustrasjonsfoto.',
    imageCredit: 'Foto: Cato Edvardsen · CC BY-SA 4.0 · Illustrasjonsfoto',
    publishedAt: '2026-10-15T06:30:00+02:00',
    readingMinutes: 4,
    premium: true,
    author: 'Demo-redaksjonen',
    body: [
      'Termosen åpnes før turen er halvveis. Det finnes ingen avtale om hvor lenge pausen skal vare. I denne oppdiktede fortellingen er det utsikten og samtalen som bestemmer.',
      'Det er lett å gjøre fritiden til enda en liste med mål. Her lar vi i stedet historien bli værende ved det lille stoppet: en varm kopp, lyden av skogen og tiden til å se seg rundt.',
      'Saken illustrerer et roligere format for helgelesning. Tittel og ingress gir leseren en tydelig forventning, mens en enkel artikkelside lar teksten få plass uten mange avbrytelser.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Stedet og turen er konstruert, og teksten gir ingen opplysninger om aktuelle turforhold.',
    ],
  },
  {
    id: 'lyden-av-en-ny-ide',
    category: 'Kultur',
    title: 'Når en ny idé får en egen lyd',
    summary: 'I et oppdiktet øvingsrom finner et lite musikkprosjekt formen sin, én skisse om gangen.',
    image: 'assets/images/kultur.svg',
    imageAlt: 'Illustrasjon av en mikrofon på en scene med fargede lys.',
    imageCredit: 'Original illustrasjon for hackathon',
    publishedAt: '2026-10-15T06:10:00+02:00',
    readingMinutes: 3,
    premium: false,
    author: 'Demo-redaksjonen',
    body: [
      'Før en låt blir ferdig, er den gjerne mange forskjellige ting. I denne tenkte fortellingen begynner musikkprosjektet med noen få toner og en rytme som stadig skifter.',
      'Skissene spilles inn, lyttes til og prøves på nytt. Det er rom for både store tanker og små justeringer. Noen ganger er det en enkel idé som blir stående igjen.',
      'Kultursaken gir et eksempel på originalt demoinnhold som kan brukes i søk og lagrede saker. Teksten skal vise samspillet mellom typografi, bilde og leseflyt, uten å gi inntrykk av en faktisk anmeldelse eller artistprofil.',
      'Dette er en fiktiv demoartikkel laget for en hackathon. Musikkprosjektet og personene er oppdiktet; ingen ekte artist omtales.',
    ],
  },
];
