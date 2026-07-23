import type { ParameterSamenvatting } from "./types.js";
import type { LaagId } from "../lagen/types.js";

/**
 * Duiding bij de stoffen: wat is dit, waar komt het vandaan, wat doet het.
 *
 * Bewust los van `normen.ts`. Een norm zegt of een waarde te hoog is; deze
 * teksten zeggen waaróm dat uitmaakt, en die staan er ook als er niets
 * overschreden wordt — juist dan wil een lezer weten wat er gemeten is.
 *
 * Elke gezondheidsuitspraak draagt de bron waarin ze staat. Waar de uitspraak
 * zwaar weegt, staan er twee: het oordeel van een gezondheidsinstantie is geen
 * plaats om uit het hoofd te schrijven.
 */

export const STOFBRONNEN = {
  whoLucht: {
    naam: "WHO global air quality guidelines (2021)",
    url: "https://www.who.int/publications/i/item/9789240034228",
  },
  whoDrinkwater: {
    naam:
      "WHO, Guidelines for drinking-water quality, vierde editie met het eerste en tweede addendum (2022)",
    url: "https://www.who.int/publications/i/item/9789240045064",
  },
  whoLood: {
    naam: "WHO, factsheet Lead poisoning and health",
    url: "https://www.who.int/news-room/fact-sheets/detail/lead-poisoning-and-health",
  },
  whoArseen: {
    naam: "WHO, factsheet Arsenic",
    url: "https://www.who.int/news-room/fact-sheets/detail/arsenic",
  },
  whoLuchtvervuiling: {
    naam: "WHO, factsheet Ambient (outdoor) air pollution",
    url: "https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health",
  },
  efsaPfas: {
    naam: "EFSA, Risk to human health related to the presence of perfluoroalkyl substances in food (2020)",
    url: "https://www.efsa.europa.eu/en/efsajournal/pub/6223",
  },
  stockholm: {
    naam: "Verdrag van Stockholm — lijst van persistente organische verontreinigende stoffen",
    url: "https://www.pops.int/TheConvention/ThePOPs/AllPOPs/tabid/2509/Default.aspx",
  },
  rivmGenx: {
    naam: "RIVM over GenX",
    url: "https://www.rivm.nl/genx",
  },
  echa: {
    naam: "ECHA — kandidaatslijst van zeer zorgwekkende stoffen",
    url: "https://echa.europa.eu/candidate-list-table",
  },
  euPesticiden: {
    naam: "Europese Commissie — EU-databank gewasbeschermingsmiddelen",
    url: "https://ec.europa.eu/food/plant/pesticides/eu-pesticides-database/start/screen/active-substances",
  },
  verordeningChloorthalonil: {
    naam:
      "Uitvoeringsverordening (EU) 2019/677 — niet-verlenging van de goedkeuring van chloorthalonil",
    url: "https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32019R0677",
  },
  ecGlyfosaat: {
    naam: "Europese Commissie — hernieuwing van de goedkeuring van glyfosaat",
    url: "https://food.ec.europa.eu/plants/pesticides/approval-active-substances/renewal-approval/glyphosate_en",
  },
  iarcPfas: {
    naam: "IARC — evaluatie van de kankerverwekkendheid van PFOA en PFOS (2023)",
    url: "https://www.iarc.who.int/news-events/iarc-monographs-evaluate-the-carcinogenicity-of-perfluorooctanoic-acid-pfoa-and-perfluorooctanesulfonic-acid-pfos/",
  },
  vlaanderenPfas: {
    naam: "Vlaanderen — blootstelling aan PFAS beperken",
    url: "https://www.vlaanderen.be/pfas-vervuiling/blootstelling-aan-pfas-beperken",
  },
  iarc: {
    naam: "IARC Monographs — lijst van geclassificeerde stoffen",
    url: "https://monographs.iarc.who.int/list-of-classifications",
  },
  eea: {
    naam: "Europees Milieuagentschap — Europe's air quality status",
    url: "https://www.eea.europa.eu/publications/europes-air-quality-status-2024",
  },
  vmmWater: {
    naam: "VMM — Toestand van het watersysteem",
    url: "https://www.vmm.be/water",
  },
  vmmLucht: {
    naam: "VMM — Luchtkwaliteit in Vlaanderen",
    url: "https://www.vmm.be/lucht",
  },
  vmmMest: {
    naam: "VMM — Nutriënten in oppervlaktewater en het mestbeleid",
    url: "https://www.vmm.be/water/kwaliteit-waterlopen/nutrienten",
  },
} as const;

export type StofbronId = keyof typeof STOFBRONNEN;

export interface Stofprofiel {
  /** Wat de stof is, in gewone taal. */
  wat: string;
  /** Waar ze vandaan komt. Ontbreekt bij weersparameters en labocontroles. */
  herkomst?: string;
  /** Wat ze doet met de gezondheid of het watersysteem. */
  risico?: string;
  /**
   * Eén zin voor in de tabelrij bij een overschrijding. Ontbreekt hij, dan
   * wordt de eerste zin van `risico` genomen — die gaat per definitie over het
   * risico, maar staat er niet altijd even scherp. Vul dit veld waar dat
   * uitmaakt, in het bijzonder waar een lage waarde het probleem is.
   */
  kort?: string;
  /** De bronnen waarin dit staat; twee waar de uitspraak zwaar weegt. */
  bronnen: readonly StofbronId[];
}

/**
 * De profielen zelf, onder een eigen sleutel. Dezelfde stof heet bij elke bron
 * anders — nitraat is "NO3-" bij de VMM en "Nitraat (NO3)" bij DOV — dus de
 * tekst hangt aan een eigen naam en de bronsleutels wijzen daarheen.
 */
const PROFIELEN = {
  // ---- lucht ----
  no2: {
    kort:
      "Prikkelt de luchtwegen en hangt samen met astma en meer luchtweginfecties bij kinderen.",
    wat: "Een prikkelend gas dat vrijkomt bij verbranding op hoge temperatuur.",
    herkomst:
      "Vooral wegverkeer, en dan in het bijzonder dieselmotoren. Daarnaast verwarming, industrie en energieproductie. Langs drukke straten ligt het merkbaar hoger dan een paar honderd meter verderop.",
    risico:
      "Prikkelt de luchtwegen. Langdurige blootstelling hangt samen met astma en met meer luchtweginfecties bij kinderen. De WHO verstrengde haar advieswaarde in 2021 fors, omdat effecten optreden bij lagere concentraties dan eerder gedacht.",
    bronnen: ["whoLucht", "whoLuchtvervuiling"],
  },
  no: {
    wat: "Stikstofmonoxide, het gas dat bij verbranding als eerste ontstaat en in de lucht snel verder reageert tot stikstofdioxide.",
    herkomst: "Verse uitstoot van verkeer en verbranding, vlak bij de bron.",
    risico:
      "Zelf veel minder schadelijk dan stikstofdioxide. Vooral bruikbaar als aanwijzing dat de gemeten lucht net uit een uitlaat of schoorsteen komt.",
    bronnen: ["vmmLucht"],
  },
  o3: {
    kort:
      "Vermindert de longfunctie en prikkelt de luchtwegen, vooral bij inspanning buiten.",
    wat: "Ozon op leefniveau — hetzelfde gas dat hoog in de atmosfeer beschermt, maar hier beneden een probleem is.",
    herkomst:
      "Wordt niet uitgestoten maar gevormd: stikstofoxiden en vluchtige organische stoffen reageren onder zonlicht. Vandaar dat de hoogste waarden op warme, zonnige zomerdagen vallen, en eerder buiten de stad dan erin.",
    risico:
      "Prikkelt de luchtwegen en vermindert de longfunctie, vooral bij inspanning buiten. Tijdens zomersmogperiodes stijgt het aantal luchtwegklachten en sterfgevallen. Ozon beschadigt daarnaast gewassen en bossen.",
    bronnen: ["whoLucht", "eea"],
  },
  so2: {
    kort:
      "Prikkelt de luchtwegen en kan bij astmapatiënten binnen minuten een aanval uitlokken.",
    wat: "Een scherp ruikend gas dat ontstaat bij het verbranden van zwavelhoudende brandstof.",
    herkomst:
      "Industrie, raffinaderijen en scheepvaart. In Vlaanderen sterk gedaald sinds zwavel uit brandstoffen is gehaald.",
    risico:
      "Prikkelt de luchtwegen en kan bij astmapatiënten binnen minuten een aanval uitlokken. Draagt ook bij aan verzuring van bodem en water.",
    bronnen: ["whoLucht"],
  },
  co: {
    kort:
      "Verdringt zuurstof in het bloed, waardoor het lichaam minder zuurstof krijgt.",
    wat: "Koolstofmonoxide, een reukloos gas uit onvolledige verbranding.",
    herkomst: "Verkeer, houtkachels en open verbranding.",
    risico:
      "Bindt zich aan hemoglobine en verdringt daar de zuurstof, waardoor het bloed minder zuurstof vervoert. In de buitenlucht zijn de concentraties zelden gevaarlijk; binnenshuis, bij een slecht werkende kachel of geiser, is het dat wel degelijk.",
    bronnen: ["whoLucht"],
  },
  co2: {
    wat: "Koolstofdioxide, het broeikasgas dat bij elke verbranding vrijkomt.",
    herkomst: "Verkeer, verwarming, industrie en ademhaling.",
    risico:
      "Bij de concentraties die buiten voorkomen niet schadelijk om in te ademen. Het wordt gemeten als maat voor verbranding en als klimaatindicator, niet als gezondheidsrisico.",
    bronnen: ["vmmLucht"],
  },
  pm25: {
    kort:
      "Dringt door tot in de longblaasjes en het bloed; van alle luchtvervuiling de grootste oorzaak van vroegtijdige sterfte.",
    wat: "Zwevende deeltjes kleiner dan 2,5 micrometer — ongeveer dertig keer dunner dan een haar.",
    herkomst:
      "Verkeer, houtstook, industrie en landbouw. Een groot deel ontstaat pas in de lucht zelf, wanneer ammoniak uit de landbouw reageert met stikstof- en zwaveloxiden.",
    risico:
      "Klein genoeg om tot in de longblaasjes en het bloed te dringen. Hangt samen met hart- en vaatziekten, longziekten en longkanker, en is van alle luchtvervuiling de grootste oorzaak van vroegtijdige sterfte. Er is geen concentratie waaronder geen effect meer optreedt.",
    bronnen: ["whoLucht", "whoLuchtvervuiling"],
  },
  pm10: {
    kort:
      "Dringt door tot in de luchtwegen en verergert astma en chronische longziekten.",
    wat: "Zwevende deeltjes kleiner dan 10 micrometer, inclusief de fijnere fractie PM2,5.",
    herkomst:
      "Naast verbranding ook opwaaiend stof, slijtage van banden en remmen, bouw en landbouw.",
    risico:
      "Dringt door tot in de luchtwegen en verergert astma en chronische longziekten. De grovere deeltjes komen minder diep dan PM2,5, maar de gezondheidseffecten zijn ook hier duidelijk aangetoond.",
    bronnen: ["whoLucht", "eea"],
  },
  pm1: {
    wat: "De allerkleinste gemeten stoffractie, deeltjes onder één micrometer.",
    herkomst: "Vrijwel volledig uit verbranding: verkeer, houtstook en industrie.",
    risico:
      "Dringt nog dieper door dan PM2,5. Er bestaat geen norm voor; de metingen dienen om te begrijpen waar het fijn stof vandaan komt.",
    bronnen: ["eea"],
  },
  bc: {
    wat: "Roet: de zwarte, koolstofrijke kern van verbrandingsdeeltjes.",
    herkomst: "Dieselmotoren en houtstook.",
    risico:
      "Wordt gemeten als merker voor verse verbrandingsuitstoot, die schadelijker blijkt dan fijn stof van andere herkomst. Roet warmt bovendien de atmosfeer op.",
    bronnen: ["whoLucht", "eea"],
  },
  pnc: {
    wat: "Het aantal ultrafijne deeltjes per kubieke centimeter, niet hun gewicht.",
    herkomst: "Verse verbranding, vooral verkeer en luchtvaart.",
    risico:
      "Ultrafijne deeltjes wegen bijna niets en tellen daarom nauwelijks mee in PM2,5, terwijl ze wel het diepst doordringen. Er is geen norm; de WHO beveelt aan ze te blijven meten.",
    bronnen: ["whoLucht"],
  },
  benzeen: {
    kort:
      "Kankerverwekkend voor de mens en oorzaak van leukemie, zonder veilige ondergrens.",
    wat: "Een vluchtige organische stof uit aardolie.",
    herkomst: "Benzinedampen, uitlaatgassen en tanken. Ook tabaksrook binnenshuis.",
    risico:
      "Kankerverwekkend voor de mens: het IARC deelt benzeen in groep 1 in en het veroorzaakt leukemie. Er is geen drempel waaronder blootstelling veilig is, daarom is de norm een zo laag mogelijk haalbaar niveau.",
    bronnen: ["iarc", "whoLucht"],
  },
  tolueen: {
    wat: "Een vluchtige organische stof, verwant aan benzeen maar zonder de kankerverwekkende werking.",
    herkomst: "Brandstof, verf, lijm en oplosmiddelen.",
    risico:
      "Bij de concentraties in de buitenlucht vooral van belang omdat het meehelpt ozon te vormen. Hoge blootstelling, zoals beroepsmatig, werkt in op het zenuwstelsel.",
    bronnen: ["whoLucht"],
  },
  xyleen: {
    wat: "Vluchtige organische stoffen uit dezelfde familie als benzeen en tolueen.",
    herkomst: "Brandstof, verf en oplosmiddelen.",
    risico:
      "Dragen bij aan de vorming van ozon en zomersmog. Bij hoge blootstelling prikkeling van ogen en luchtwegen.",
    bronnen: ["whoLucht"],
  },
  nh3: {
    kort:
      "Vormt fijn stof in de lucht en verrijkt natuurgebieden met stikstof, waardoor soorten van schrale grond verdwijnen.",
    wat: "Ammoniak, een scherp ruikend stikstofgas.",
    herkomst: "Overwegend landbouw: mest in stallen en op het land.",
    risico:
      "Reageert in de lucht tot fijne deeltjes en levert zo een flink deel van de PM2,5. Slaat daarnaast neer op natuurgebieden, waar de stikstof de bodem verrijkt en soorten verdringt die van schrale grond leven.",
    bronnen: ["eea", "vmmLucht"],
  },
  kwikGas: {
    kort:
      "Slaat neer op water en land, waar het als methylkwik in vis terechtkomt en het zenuwstelsel aantast.",
    wat: "Kwik in gasvorm, het enige metaal dat bij kamertemperatuur verdampt.",
    herkomst: "Kolenverbranding, afvalverbranding en industrie. Verspreidt zich wereldwijd.",
    risico:
      "Slaat uiteindelijk neer op water en land, waar bacteriën het omzetten in methylkwik dat zich opstapelt in vis. Dat tast het zenuwstelsel aan; een ongeboren kind is er het gevoeligst voor.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- weer ----
  temperatuurLucht: {
    wat: "De luchttemperatuur op het meetstation.",
    risico:
      "Zegt niets over de luchtkwaliteit, maar verklaart die mee: warmte en zonlicht drijven de vorming van ozon aan, en windstille koude dagen laten fijn stof ophopen.",
    bronnen: ["vmmLucht"],
  },
  vochtigheid: {
    wat: "De relatieve luchtvochtigheid.",
    risico:
      "Beïnvloedt hoe deeltjes water opnemen en daardoor hoe groot ze meten.",
    bronnen: ["vmmLucht"],
  },
  luchtdruk: {
    wat: "De atmosferische druk.",
    risico:
      "Hoge druk gaat samen met windstil weer, waarbij vervuiling blijft hangen in plaats van weg te waaien.",
    bronnen: ["vmmLucht"],
  },
  wind: {
    wat: "Windrichting en windsnelheid op het meetstation.",
    risico:
      "Bepaalt waar de gemeten lucht vandaan komt en hoe snel vervuiling verdund wordt. Bij windstilte lopen de concentraties op zonder dat er meer uitgestoten wordt.",
    bronnen: ["vmmLucht"],
  },

  // ---- water: zuurstof en organische belasting ----
  zuurstof: {
    kort:
      "Te weinig zuurstof betekent vissterfte en verlies van bodemleven; hier is een lage waarde het probleem, niet een hoge.",
    wat: "De hoeveelheid zuurstof die in het water is opgelost.",
    herkomst:
      "Komt uit de lucht en uit waterplanten en algen. Verdwijnt wanneer bacteriën organisch materiaal afbreken, en warm water houdt minder zuurstof vast dan koud.",
    risico:
      "De belangrijkste levensvoorwaarde in een waterloop. Zakt de zuurstof te laag, dan sterven vissen en verdwijnt het bodemleven. Anders dan bij vrijwel alle andere parameters is hier een hoge waarde goed en een lage slecht.",
    bronnen: ["vmmWater"],
  },
  zuurstofverzadiging: {
    kort:
      "Sterke afwijkingen wijzen op een algenbloei, die het water ’s nachts zijn zuurstof ontneemt.",
    wat: "Hoeveel zuurstof het water bevat ten opzichte van wat er bij deze temperatuur in kán.",
    risico:
      "Ver boven honderd procent wijst op een algenbloei die overdag zuurstof produceert — 's nachts keert dat om en kan de zuurstof juist wegzakken.",
    bronnen: ["vmmWater"],
  },
  bzv: {
    kort:
      "Zoveel afbreekbaar vuil dat de afbraak ervan de waterloop zuurstof ontneemt.",
    wat: "Biochemisch zuurstofverbruik: hoeveel zuurstof bacteriën in vijf dagen opgebruiken om het aanwezige organisch materiaal af te breken.",
    herkomst: "Huishoudelijk afvalwater, mest en afspoeling van landbouwgrond.",
    risico:
      "Een maat voor de belasting met afbreekbaar vuil. Hoe hoger, hoe meer zuurstof er aan de waterloop onttrokken wordt.",
    bronnen: ["vmmWater"],
  },
  czv: {
    kort:
      "Wijst op een zware belasting met organisch materiaal, waarvan een deel moeilijk afbreekt.",
    wat: "Chemisch zuurstofverbruik: hetzelfde idee als BZV, maar chemisch gemeten en inclusief het materiaal dat bacteriën niet afbreken.",
    herkomst: "Afvalwater van huishoudens en industrie.",
    risico:
      "Ligt altijd hoger dan het BZV. Het verschil tussen beide geeft aan hoeveel van de vervuiling moeilijk afbreekbaar is.",
    bronnen: ["vmmWater"],
  },
  organischeKoolstof: {
    wat: "De totale hoeveelheid koolstof uit organisch materiaal in het water.",
    herkomst: "Natuurlijk uit veen, bladeren en bodem; daarnaast uit afvalwater.",
    risico:
      "Op zich niet schadelijk, maar bij de bereiding van drinkwater kan organische koolstof met chloor reageren tot ongewenste bijproducten.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- water: nutriënten ----
  nitraat: {
    kort:
      "Voedt algengroei in de waterloop, en verstoort in drinkwater het zuurstoftransport in het bloed van zuigelingen.",
    wat: "De meest voorkomende opgeloste vorm van stikstof in water.",
    herkomst:
      "Overwegend bemesting van landbouwgrond. Nitraat spoelt makkelijk uit de bodem en zakt door naar het grondwater, waar het jaren later nog opduikt.",
    risico:
      "Voedt algengroei in beken, rivieren en uiteindelijk de zee. In drinkwater is de norm gezet op zuigelingen: te veel nitraat verstoort het zuurstoftransport in hun bloed, wat methemoglobinemie of blauwezuchtsyndroom heet.",
    bronnen: ["whoDrinkwater", "vmmMest"],
  },
  nitriet: {
    kort:
      "Verstoort het zuurstoftransport in het bloed, krachtiger dan nitraat, en is giftig voor vissen.",
    wat: "Een tussenvorm in de omzetting van ammonium naar nitraat.",
    herkomst: "Ontstaat in het water zelf, en komt uit afvalwater.",
    risico:
      "Werkt op dezelfde manier als nitraat op het zuurstoftransport in het bloed, maar is daarin een stuk krachtiger; de norm ligt daarom veel lager. Ook giftig voor vissen.",
    bronnen: ["whoDrinkwater"],
  },
  ammonium: {
    kort:
      "Verbruikt zuurstof bij afbraak en gaat over in ammoniak, dat giftig is voor vissen — des te meer naarmate het water warmer en basischer is.",
    wat: "De gereduceerde vorm van stikstof, kenmerkend voor water met weinig zuurstof.",
    herkomst: "Huishoudelijk afvalwater, mest en de afbraak van organisch materiaal.",
    risico:
      "Bij afbraak verbruikt ammonium zuurstof. Het staat bovendien in evenwicht met ammoniak, dat giftig is voor vissen — en dat evenwicht verschuift naar de giftige kant naarmate het water warmer en basischer is.",
    bronnen: ["vmmWater"],
  },
  stikstofTotaal: {
    kort:
      "Te veel stikstof leidt tot algenbloei, zuurstoftekort en het verdwijnen van soorten.",
    wat: "Alle stikstofvormen samen: nitraat, nitriet, ammonium en de stikstof die in organisch materiaal vastzit.",
    herkomst: "Landbouw, afvalwater en neerslag van stikstof uit de lucht.",
    risico:
      "De maat waarop het beleid tegen vermesting stuurt. Te veel stikstof leidt tot algenbloei, zuurstoftekort en soortenverlies.",
    bronnen: ["vmmMest"],
  },
  fosfaat: {
    kort:
      "In zoet water is fosfor meestal de stof die algengroei begrenst; een teveel zet een bloei in gang die het water later zijn zuurstof ontneemt.",
    wat: "De opgeloste vorm van fosfor die planten en algen direct kunnen opnemen.",
    herkomst: "Mest, afvalwater en historisch ook wasmiddelen.",
    risico:
      "In zoet water is fosfor meestal de stof die de groei begrenst: een klein beetje extra volstaat om een algenbloei op gang te brengen. Die algen ontnemen het water later zijn zuurstof.",
    bronnen: ["vmmMest"],
  },
  fosforTotaal: {
    kort:
      "Voedt algenbloei, ook op termijn: fosfor die aan bodemdeeltjes hangt komt later alsnog vrij.",
    wat: "Alle fosfor samen, opgelost én gebonden aan zwevend materiaal.",
    herkomst: "Mest, afvalwater en erosie van landbouwgrond.",
    risico:
      "Fosfor die aan bodemdeeltjes gebonden is, komt later alsnog vrij. Daarom is dit totaal een betere maat voor de lange termijn dan het opgeloste fosfaat alleen.",
    bronnen: ["vmmMest"],
  },

  // ---- water: algemeen fysisch-chemisch ----
  zuurtegraad: {
    kort:
      "Buiten het bereik dat waterleven verdraagt, en het maakt andere stoffen giftiger — metalen lossen op in zuur water, ammonium wordt schadelijker in basisch water.",
    wat: "De zuurtegraad van het water, op een schaal van 0 tot 14.",
    herkomst: "Bepaald door de bodem, door algengroei en door lozingen.",
    risico:
      "Waterleven verdraagt maar een beperkt bereik. De zuurtegraad stuurt bovendien hoe giftig andere stoffen zijn: ammonium wordt schadelijker naarmate het water basischer is, en metalen lossen juist beter op in zuur water.",
    bronnen: ["vmmWater"],
  },
  temperatuurWater: {
    kort:
      "Warm water houdt minder zuurstof vast en versnelt tegelijk de processen die zuurstof verbruiken.",
    wat: "De temperatuur van het water.",
    herkomst: "Weer en seizoen, en plaatselijk lozingen van koelwater.",
    risico:
      "Warm water bevat minder zuurstof en versnelt tegelijk de afbraakprocessen die zuurstof verbruiken. Koudeminnende soorten verdwijnen als het structureel warmer wordt.",
    bronnen: ["vmmWater"],
  },
  geleidbaarheid: {
    kort:
      "Wijst op veel opgeloste zouten; een sprong verraadt een lozing of indringend zout water.",
    wat: "Hoe goed het water stroom geleidt — een maat voor de hoeveelheid opgeloste zouten.",
    herkomst: "Natuurlijk uit de ondergrond; daarnaast wegenzout, lozingen en zeewaterinvloed.",
    risico:
      "Op zich geen gifstof, maar een snelle aanwijzing dat er iets in het water zit. Een plotse sprong wijst op een lozing of op indringend zout water.",
    bronnen: ["vmmWater"],
  },
  chloride: {
    kort:
      "Zoet water met te veel chloride verliest zijn soorten; in drinkwater gaat het om de smaak.",
    wat: "Het zoutbestanddeel dat het water brak maakt.",
    herkomst: "Zeewater, strooizout, en lozingen van industrie.",
    risico:
      "Zoet water met veel chloride verliest zijn soorten. In drinkwater vooral een smaakkwestie; de norm is daarop gezet, niet op giftigheid.",
    bronnen: ["whoDrinkwater"],
  },
  sulfaat: {
    kort:
      "Smaakt bitter en werkt laxerend, en maakt in waterbodems fosfaat los waardoor de vermesting toeneemt.",
    wat: "Een zoutbestanddeel dat van nature in de bodem voorkomt.",
    herkomst: "Uitspoeling van de ondergrond, bemesting en industrie.",
    risico:
      "In hoge concentraties werkt sulfaat laxerend en smaakt het water bitter. In waterbodems zet sulfaat bovendien processen in gang die fosfaat losmaken, wat de vermesting versterkt.",
    bronnen: ["whoDrinkwater"],
  },
  zwevendeStof: {
    kort:
      "Houdt licht tegen zodat waterplanten verdwijnen, en bedekt de bodem waar vissen paaien.",
    wat: "Het materiaal dat in het water zweeft en het troebel maakt.",
    herkomst: "Erosie van akkers, opwerveling door stroming en scheepvaart, en lozingen.",
    risico:
      "Houdt licht tegen, waardoor waterplanten verdwijnen, en bedekt de bodem waar vissen paaien. Aan de deeltjes hechten zich bovendien fosfor en metalen.",
    bronnen: ["vmmWater"],
  },
  hardheid: {
    wat: "De hoeveelheid opgelost calcium en magnesium — hoe hard of zacht het water is.",
    herkomst: "De ondergrond waar het water doorheen gaat, vooral kalkrijke lagen.",
    risico:
      "Geen gezondheidsrisico. Hard water zet kalk af in leidingen en toestellen; zeer zacht water werkt eerder corrosief op leidingen, wat metalen kan losmaken.",
    bronnen: ["whoDrinkwater"],
  },
  hoofdionen: {
    wat: "Natrium en kalium: twee van de zouten die het water zijn samenstelling geven.",
    herkomst:
      "Vooral natuurlijk, uit het gesteente waar het water doorheen trekt. Natrium komt er in de kustvlakte bij uit zeewaterinvloed en uit strooizout; kalium uit bemesting.",
    risico:
      "Geen van beide is bij de gehalten in grondwater een gezondheidsprobleem. Ze worden gemeten om het watertype te bepalen en om te zien of er zout of mest in doordringt.",
    bronnen: ["whoDrinkwater"],
  },
  buffer: {
    wat: "Bicarbonaat en carbonaat, samen de buffer die de zuurtegraad van water stabiel houdt.",
    herkomst: "Het oplossen van kalk in de ondergrond.",
    risico:
      "Geen gezondheidsrisico. Water met weinig buffer verzuurt makkelijk bij zure neerslag, en dan lossen metalen uit de bodem op — daar zit het belang.",
    bronnen: ["whoDrinkwater"],
  },
  bromide: {
    wat: "Een zoutbestanddeel, verwant aan chloride.",
    herkomst: "Zeewater en natuurlijke ondergrond; daarnaast industriële lozingen.",
    risico:
      "Zelf onschadelijk in de voorkomende gehalten. Van belang bij drinkwaterbereiding: bij ontsmetting met ozon kan bromide omgezet worden in bromaat, en dát is wel ongewenst.",
    bronnen: ["whoDrinkwater"],
  },
  boor: {
    kort:
      "De norm rust op effecten op de voortplanting die in dierproeven zijn beschreven.",
    wat: "Een element dat van nature in de ondergrond en in zeewater zit.",
    herkomst: "Natuurlijk gesteente, en daarnaast wasmiddelen en industrieel afvalwater.",
    risico:
      "Bij hoge inname zijn effecten op de voortplanting beschreven in dierproeven; daarop is de drinkwaternorm gebaseerd. Boor is bovendien moeilijk uit water te zuiveren.",
    bronnen: ["whoDrinkwater"],
  },
  kobalt: {
    wat: "Een metaal dat het lichaam in sporen nodig heeft, als onderdeel van vitamine B12.",
    herkomst: "Natuurlijk uit gesteente; daarnaast metaalindustrie en batterijen.",
    risico:
      "Zelden aangetroffen in gehalten die er in water toe doen. Bij langdurige hoge inname zijn effecten op hart en schildklier beschreven.",
    bronnen: ["whoDrinkwater"],
  },
  redox: {
    wat: "De redoxpotentiaal: of het water eerder oxiderend of reducerend is.",
    herkomst: "Bepaald door de aanwezigheid van zuurstof en van afbreekbaar organisch materiaal.",
    risico:
      "Geen stof maar een toestand, en juist die toestand stuurt de rest. In zuurstofarm grondwater lossen ijzer, mangaan en arseen op, terwijl nitraat er net verdwijnt. Zonder deze waarde is een analyse van grondwater moeilijk te lezen.",
    bronnen: ["whoDrinkwater"],
  },
  ionensom: {
    wat: "De optelling van alle positieve of alle negatieve ionen in het monster.",
    risico:
      "Een rekenresultaat van het labo, geen gemeten stof. Samen met de ionenbalans dient het om na te gaan of de analyse volledig en consistent is.",
    bronnen: ["vmmWater"],
  },
  doorzicht: {
    wat: "Tot welke diepte een schijf onder water zichtbaar blijft.",
    risico:
      "Een eenvoudige maat voor troebelheid en algengroei. Weinig doorzicht wijst op zwevend slib of op een algenbloei.",
    bronnen: ["vmmWater"],
  },

  // ---- metalen ----
  arseen: {
    kort:
      "Langdurige blootstelling via drinkwater geeft huidafwijkingen en verhoogt het risico op kanker van blaas, longen en huid.",
    wat: "Een halfmetaal dat van nature in de ondergrond zit.",
    herkomst:
      "Vooral natuurlijk, uit gesteente en bodemlagen; daarnaast uit oude houtverduurzaming en industrie. In grondwater kan het zonder menselijk toedoen hoog liggen.",
    risico:
      "De WHO noemt langdurige blootstelling via drinkwater de grootste bedreiging: het geeft huidafwijkingen en verhoogt het risico op kanker van blaas, longen en huid. De richtwaarde van 10 µg/L is uitdrukkelijk voorlopig, omdat lager zuiveren technisch moeilijk is — niet omdat het veilig zou zijn.",
    bronnen: ["whoArseen", "whoDrinkwater"],
  },
  lood: {
    kort:
      "De WHO kent geen blootstellingsniveau dat zonder schadelijk effect is; bij kinderen tast lood de hersenontwikkeling blijvend aan.",
    wat: "Een zwaar metaal dat vroeger volop in leidingen, verf en benzine zat.",
    herkomst:
      "Oude loden waterleidingen en huisaansluitingen, historische bodemvervuiling en industrie. Sinds lood uit benzine verdween, is de blootstelling via lucht sterk gedaald.",
    risico:
      "De WHO stelt dat er geen blootstellingsniveau bekend is dat zonder schadelijk effect is. Bij kinderen tast lood de hersenontwikkeling blijvend aan, met een lager IQ en gedragsproblemen tot gevolg; bij volwassenen verhoogt het de bloeddruk en belast het de nieren. Kinderen nemen vier tot vijf keer meer op van eenzelfde hoeveelheid dan volwassenen.",
    bronnen: ["whoLood", "whoDrinkwater"],
  },
  cadmium: {
    kort:
      "Hoopt zich tientallen jaren op in de nieren en beschadigt die; het IARC noemt cadmium kankerverwekkend voor de mens.",
    wat: "Een zwaar metaal dat zich in het lichaam opstapelt.",
    herkomst:
      "Kunstmest, zinkindustrie, batterijen en historische vervuiling. In de Kempen zit het van oudsher in de bodem door de zinkfabrieken.",
    risico:
      "Hoopt zich tientallen jaren op in de nieren en beschadigt die op termijn. Verzwakt ook de botten. Het IARC classificeert cadmium als kankerverwekkend voor de mens.",
    bronnen: ["whoDrinkwater", "iarc"],
  },
  chroom: {
    kort:
      "Zeswaardig chroom is kankerverwekkend, en een analyse van totaal chroom kan die vorm niet uitsluiten.",
    wat: "Een metaal dat in twee vormen voorkomt, met heel verschillende gevaren.",
    herkomst: "Metaalbewerking, leerlooierij, verf en roestvast staal.",
    risico:
      "Driewaardig chroom is een noodzakelijk spoorelement; zeswaardig chroom is kankerverwekkend bij inademing. Een analyse van totaal chroom maakt dat onderscheid niet, en de norm gaat daarom uit van het ongunstigste geval.",
    bronnen: ["whoDrinkwater", "iarc"],
  },
  nikkel: {
    kort:
      "De bekendste reactie is contactallergie; wie daar gevoelig voor is kan ook via water klachten krijgen.",
    wat: "Een metaal dat veel in legeringen en kranen wordt gebruikt.",
    herkomst: "Kraanwerk en leidingen, metaalindustrie en natuurlijke ondergrond.",
    risico:
      "De bekendste reactie is contactallergie. Wie daarvoor gevoelig is, kan ook via drinkwater klachten krijgen. Het eerste water uit een kraan die lang stilstond bevat er het meest van.",
    bronnen: ["whoDrinkwater"],
  },
  koper: {
    kort:
      "Giftig voor waterorganismen bij gehalten die voor mensen onschadelijk zijn.",
    wat: "Een metaal dat het lichaam in kleine hoeveelheden nodig heeft.",
    herkomst: "Koperen waterleidingen, en in landbouwgebied ook gewasbescherming en veevoeder.",
    risico:
      "In het drinkwater vooral een smaak- en maagkwestie bij hoge gehalten. In oppervlaktewater is koper wél problematisch: het is giftig voor waterorganismen bij concentraties die voor mensen onschadelijk zijn.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  zink: {
    kort:
      "Schadelijk voor waterorganismen, ook waar het voor mensen geen probleem vormt.",
    wat: "Een metaal dat het lichaam als spoorelement nodig heeft.",
    herkomst: "Gegalvaniseerd metaal, dakgoten, banden en historische zinkindustrie.",
    risico:
      "Voor mensen weinig problematisch — de norm gaat over smaak. Voor waterorganismen is zink wel schadelijk, en in de Kempen is de bodem er van oudsher mee belast.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  kwikWater: {
    kort:
      "Wordt in waterbodems omgezet in methylkwik, dat zich ophoopt in vis en het zenuwstelsel aantast.",
    wat: "Een zwaar metaal dat zich opstapelt in de voedselketen.",
    herkomst: "Industrie, afvalverbranding en historische vervuiling.",
    risico:
      "Bacteriën zetten kwik in waterbodems om in methylkwik, dat zich ophoopt in vis en zo bij de mens terechtkomt. Het tast het zenuwstelsel aan en is het gevaarlijkst voor het ongeboren kind. Daarom slaat de norm voor oppervlaktewater op wat er in vis zit, niet enkel op wat er in het water drijft.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  mangaan: {
    kort:
      "Geeft bruinzwarte aanslag en een metaalsmaak; in grondwater is een hoge waarde meestal natuurlijk en geen vervuiling.",
    wat: "Een metaal dat vrijwel overal in de ondergrond zit.",
    herkomst:
      "Vrijwel altijd natuurlijk. In grondwater zonder zuurstof lost mangaan makkelijk op, waardoor het daar hoog kan liggen zonder dat er iets vervuild is.",
    risico:
      "Geeft bruinzwarte aanslag en een metaalsmaak; daarop is de gebruikelijke drinkwaternorm gezet. Bij zeer hoge en langdurige inname zijn effecten op het zenuwstelsel beschreven. De VLAREM-norm voor grondwater ligt bewust een stuk hoger dan die voor drinkwater, omdat grondwater nog gezuiverd wordt.",
    bronnen: ["whoDrinkwater"],
  },
  ijzer: {
    kort:
      "Geeft roestbruine verkleuring en een metaalsmaak, maar vormt geen gezondheidsrisico; in grondwater is het vrijwel altijd natuurlijk.",
    wat: "Een van de meest voorkomende metalen in de bodem.",
    herkomst: "Vrijwel altijd natuurlijk, en net als mangaan goed oplosbaar in zuurstofarm grondwater.",
    risico:
      "Geen gezondheidsrisico bij de gehalten die in water voorkomen. Het geeft roestbruine verkleuring, vlekken op wasgoed en een metaalsmaak.",
    bronnen: ["whoDrinkwater"],
  },
  aluminium: {
    kort:
      "In zuur water beschadigt opgelost aluminium de kieuwen van vissen.",
    wat: "Het meest voorkomende metaal in de aardkorst.",
    herkomst:
      "Natuurlijk uit klei en bodem. Lost sterker op naarmate het water zuurder is, wat het aan verzuring koppelt. Wordt ook gebruikt bij de zuivering van drinkwater.",
    risico:
      "In zuur water is opgelost aluminium giftig voor vissen — het beschadigt hun kieuwen. Voor mensen is de drinkwaternorm gebaseerd op de zuiveringstechniek en op verkleuring, niet op een aangetoond gezondheidseffect.",
    bronnen: ["whoDrinkwater"],
  },

  antimoon: {
    kort:
      "Geeft bij hoge inname maag- en darmklachten.",
    wat: "Een halfmetaal dat lijkt op arseen, maar minder giftig is.",
    herkomst: "Soldeer, legeringen, brandvertragers en de productie van kunststof flessen.",
    risico:
      "Bij hoge inname maag- en darmklachten. De drinkwaternorm is in de huidige richtlijn versoepeld van 5 naar 10 µg/L, op basis van herzien onderzoek.",
    bronnen: ["whoDrinkwater"],
  },
  barium: {
    kort:
      "Verhoogt bij langdurige inname de bloeddruk.",
    wat: "Een metaal dat van nature in gesteente voorkomt.",
    herkomst: "Natuurlijke ondergrond, boorindustrie en verf.",
    risico:
      "Oplosbaar barium verhoogt bij langdurige inname de bloeddruk; daarop is de WHO-richtwaarde gebaseerd. De vormen die in de bodem gebonden blijven, worden nauwelijks opgenomen.",
    bronnen: ["whoDrinkwater"],
  },
  beryllium: {
    wat: "Een zeer licht metaal, zeldzaam in water.",
    herkomst: "Legeringen, elektronica en verbranding van steenkool.",
    risico:
      "Kankerverwekkend bij inademing van stof, wat een beroepsrisico is. Via drinkwater worden zelden gehalten bereikt die er toe doen; er is dan ook geen richtwaarde voor.",
    bronnen: ["whoDrinkwater", "iarc"],
  },
  molybdeen: {
    wat: "Een spoorelement dat het lichaam in kleine hoeveelheden nodig heeft.",
    herkomst: "Natuurlijke ondergrond, staalindustrie en meststoffen.",
    risico:
      "Zelden een probleem in water. Bij zeer hoge inname zijn effecten op de gewrichten beschreven.",
    bronnen: ["whoDrinkwater"],
  },
  seleen: {
    kort:
      "Overmaat geeft haaruitval, broze nagels en zenuwklachten.",
    wat: "Een spoorelement dat noodzakelijk is, maar met een smalle marge tussen te weinig en te veel.",
    herkomst: "Natuurlijk uit gesteente; daarnaast verbranding en industrie.",
    risico:
      "Overmaat geeft haaruitval, broze nagels en zenuwklachten. De drinkwaternorm ging in de huidige richtlijn van 10 naar 20 µg/L.",
    bronnen: ["whoDrinkwater"],
  },
  thallium: {
    kort:
      "Zeer giftig bij inname: het tast het zenuwstelsel aan en veroorzaakt haaruitval.",
    wat: "Een zwaar metaal dat vroeger als rattengif werd gebruikt.",
    herkomst: "Verbranding van steenkool, cementproductie en metaalwinning.",
    risico:
      "Zeer giftig bij inname: het tast het zenuwstelsel aan en veroorzaakt haaruitval. In water komt het gelukkig zelden in meetbare hoeveelheden voor.",
    bronnen: ["whoDrinkwater"],
  },
  uranium: {
    kort:
      "Belast de nieren; in drinkwater telt de scheikundige giftigheid, niet de straling.",
    wat: "Een zwaar, licht radioactief metaal dat overal in gesteente voorkomt.",
    herkomst: "Vrijwel altijd natuurlijk, uit de ondergrond; daarnaast fosfaatmeststoffen.",
    risico:
      "In drinkwater telt niet de straling maar de scheikundige giftigheid: uranium belast de nieren. Daarop is de WHO-richtwaarde gebaseerd.",
    bronnen: ["whoDrinkwater"],
  },
  vanadium: {
    wat: "Een metaal dat in kleine hoeveelheden vrijwel overal voorkomt.",
    herkomst: "Verbranding van zware stookolie, staalindustrie en natuurlijke ondergrond.",
    risico:
      "Bij hoge inname maag- en darmklachten. In water zelden in gehalten die er toe doen.",
    bronnen: ["whoDrinkwater"],
  },
  zilver: {
    wat: "Een edelmetaal dat ook als ontsmettingsmiddel wordt gebruikt.",
    herkomst: "Fotografie, elektronica, en zilverhoudende producten met een antibacteriële werking.",
    risico:
      "Weinig giftig. Zeer langdurige hoge inname kan de huid blijvend grijsblauw kleuren, wat argyrie heet. Voor waterorganismen is zilver wél schadelijk.",
    bronnen: ["whoDrinkwater"],
  },
  tin: {
    wat: "Een metaal uit blik, soldeer en legeringen.",
    herkomst: "Conservenblik, soldeerverbindingen en industrie.",
    risico:
      "Anorganisch tin is weinig giftig; de norm gaat over maagklachten bij hoge inname uit blikvoeding. De organische tinverbindingen uit scheepsverf zijn wél zeer schadelijk voor waterleven, maar dat zijn andere stoffen dan wat hier gemeten wordt.",
    bronnen: ["whoDrinkwater"],
  },
  sporenmetaal: {
    wat: "Een metaal dat meekomt in de brede metalenscan van het labo.",
    herkomst: "Natuurlijke ondergrond en verspreid industrieel gebruik.",
    risico:
      "Er bestaat geen milieukwaliteits- of drinkwaternorm voor, omdat er in water zelden gehalten voorkomen die van belang zijn. De meting dient om het volledige beeld te hebben, niet omdat er een probleem verwacht wordt.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- bacteriologie ----
  fecaleBacterien: {
    kort:
      "Verraadt uitwerpselen in het water, en daarmee mogelijk ziekteverwekkers die veel moeilijker te meten zijn.",
    wat: "Bacteriën die van nature in de darm van mens en dier leven.",
    herkomst:
      "Ongezuiverd huishoudelijk afvalwater, overstorten bij hevige regen, mest en watervogels.",
    risico:
      "Ze maken zelf meestal niemand ziek, maar verraden dat er uitwerpselen in het water zitten — en daarmee mogelijk ziekteverwekkers die veel moeilijker te meten zijn. Dit is de reden dat zwemwater in de zomer wordt opgevolgd.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- PFAS en pesticiden ----
  // ---- PFAS per stof ----
  //
  // De familie deelt haar gedrag, maar niet haar herkomst: PFOS komt uit
  // blusschuim en PFBS is de vervanger die daarvoor in de plaats kwam. Wie
  // overal dezelfde tekst leest, kan een meting niet plaatsen.
  //
  // "Waarom het uitmaakt" noemt telkens een gevolg voor mens of natuur, niet
  // enkel het gedrag van de stof. Dat een stof mobiel is, zegt een lezer niets;
  // dat het putwater erdoor afgeraden wordt, wel. Waar het gevolg niet vaststaat,
  // staat dat er met zoveel woorden bij.
  pfos: {
    kort:
      "Verzwakt de reactie op vaccinatie en hoopt zich jarenlang op in het bloed; in vervuilde zones geldt daarom het advies van hoogstens twee eigen eieren per week.",
    wat: "Perfluoroctaansulfonzuur, de PFAS waar de bezorgdheid mee begon en waarnaar het meest gemeten wordt.",
    herkomst:
      "Blusschuim op brandweeroefenterreinen en luchthavens, impregneermiddel voor textiel en tapijt, en het verchromen van metaal. In Vlaanderen is het de stof achter de vervuiling rond de 3M-site in Zwijndrecht.",
    risico:
      "Opgenomen in bijlage B van het Verdrag van Stockholm, dat productie en gebruik wereldwijd aan banden legt. PFOS hoopt zich jarenlang op in bloed en lever; EFSA wees als doorslaggevend effect aan dat het afweersysteem minder goed reageert op vaccinatie. Het IARC deelde PFOS in 2023 in als mogelijk kankerverwekkend voor de mens. In vervuilde zones vertaalt dat zich in concrete adviezen: hoogstens twee eigen eieren per week, en geen putwater om te drinken of te koken.",
    bronnen: ["stockholm", "efsaPfas", "iarcPfas", "vlaanderenPfas"],
  },
  pfoa: {
    kort:
      "Door het IARC ingedeeld als kankerverwekkend voor de mens, met nierkanker en teelbalkanker als aangetoonde gevolgen.",
    wat: "Perfluoroctaanzuur, jarenlang de hulpstof bij het maken van antiaanbaklagen.",
    herkomst:
      "Productie van fluorpolymeren zoals teflon, waterafstotende kleding, en ouder blusschuim. Niet de coating in je pan zelf, maar wat er bij het maken ervan vrijkwam.",
    risico:
      "Het IARC deelde PFOA in 2023 in groep 1 in: kankerverwekkend voor de mens, met nierkanker en teelbalkanker. Daarmee is het de zwaarst ingedeelde PFAS. Het staat in bijlage A van het Verdrag van Stockholm, zonder uitzonderingen, en het is een van de vier stoffen achter de EFSA-norm voor het afweersysteem.",
    bronnen: ["iarcPfas", "stockholm", "efsaPfas"],
  },
  pfhxs: {
    kort:
      "Blijft van de vier EFSA-stoffen het langst in het lichaam en draagt zo het meeste bij aan de verzwakte reactie op vaccinatie.",
    wat: "Perfluorhexaansulfonzuur, een kortere neef van PFOS met zes koolstofatomen.",
    herkomst: "Blusschuim en impregneermiddelen; kwam vaak mee als bijproduct van PFOS.",
    risico:
      "Opgenomen in bijlage A van het Verdrag van Stockholm, zonder uitzonderingen. Van de vier stoffen waarop EFSA haar norm baseerde, verdwijnt deze het traagst uit het lichaam: wie er eenmaal aan blootgesteld is, draagt het jaren mee. Het effect waarop die norm rust, is een verzwakte reactie op vaccinatie.",
    bronnen: ["stockholm", "efsaPfas"],
  },
  pfna: {
    kort:
      "Telt mee in de EFSA-norm voor het afweersysteem, en klimt via vis op in de voedselketen.",
    wat: "Perfluornonaanzuur, een lange keten met negen koolstofatomen.",
    herkomst:
      "Productie van fluorpolymeren, en daarnaast het afbraakproduct van fluortelomeren uit coatings en verpakkingen.",
    risico:
      "De vierde stof achter de EFSA-norm, en dus mede verantwoordelijk voor het effect waarop die rust: een verzwakte reactie op vaccinatie. Lange ketens hechten aan eiwit, klimmen op in de voedselketen en komen zo via vis en eieren bij de mens terecht.",
    bronnen: ["efsaPfas"],
  },
  pfbs: {
    kort:
      "Zakt door tot in het grondwater en is er nauwelijks uit te zuiveren; in vervuilde zones wordt putwater als drinkwater daarom afgeraden.",
    wat: "Perfluorbutaansulfonzuur, met vier koolstofatomen de korte vervanger van PFOS.",
    herkomst:
      "Ingevoerd toen PFOS werd uitgefaseerd, onder meer in impregneermiddelen voor textiel.",
    risico:
      "Korte ketens hopen zich minder op in het lichaam dan PFOS. Het gevolg verschuift daardoor van de mens naar zijn watervoorziening: PFBS hecht slecht aan bodemdeeltjes, zakt door tot in het grondwater en is met de gangbare zuivering nauwelijks tegen te houden. Daarom raadt Vlaanderen in vervuilde zones af om putwater te drinken of ermee te koken. Over de gezondheidseffecten van de korte ketens is veel minder bekend dan over PFOS en PFOA — dat is een kennisleemte en geen vrijspraak.",
    bronnen: ["vlaanderenPfas", "efsaPfas"],
  },
  pfba: {
    kort:
      "Een van de meest aangetroffen PFAS in grondwater, en met de gangbare zuivering nauwelijks te verwijderen.",
    wat: "Perfluorbutaanzuur, met vier koolstofatomen een van de kortste PFAS die routinematig gemeten worden.",
    herkomst:
      "Deels rechtstreeks gebruikt, maar vooral het eindproduct waarin langere PFAS en fluortelomeren uiteenvallen.",
    risico:
      "Stapelt zich veel minder op in het lichaam dan PFOS of PFOA, maar spoelt juist daardoor ver mee met het water. Het is een van de meest aangetroffen PFAS in grondwater, en dat raakt de drinkwatervoorziening: zulke korte ketens zijn met actieve kool nauwelijks tegen te houden, waardoor vervuilde winningen moeilijk te herstellen zijn. Waar de bodem vervuild is, wordt putwater als drinkwater afgeraden.",
    bronnen: ["vlaanderenPfas", "whoDrinkwater"],
  },
  genx: {
    kort:
      "Ingevoerd als het veiligere alternatief, maar erkend als zeer zorgwekkende stof: proefdieren tonen effecten op de lever en aanwijzingen voor kankerverwekkendheid.",
    wat: "HFPO-DA, beter bekend als GenX: de stof achter de techniek die PFOA verving.",
    herkomst:
      "Sinds 2012 in gebruik bij de productie van fluorpolymeercoatings, onder meer bij Chemours in Dordrecht.",
    risico:
      "Ingevoerd als het veiligere alternatief, maar Europa nam GenX in juni 2019 op als zeer zorgwekkende stof. In proefdieren tast het de lever aan en zijn er aanwijzingen voor kankerverwekkendheid; het is minder schadelijk voor de voortplanting dan PFOA, maar daarmee niet onschadelijk. Net als PFOA breekt het niet af, dus wat in het grondwater zit, blijft er.",
    bronnen: ["rivmGenx", "echa"],
  },
  dona: {
    kort:
      "Een PFOA-vervanger waarvan de gevolgen nog niet vaststaan, terwijl ze net als PFOA niet meer uit het water verdwijnt.",
    wat: "DONA of ADONA, een etherverbinding die als alternatief voor PFOA werd ontwikkeld.",
    herkomst: "Productie van fluorpolymeren, als vervanger van PFOA.",
    risico:
      "Wat deze vervanger met de gezondheid doet, is veel minder onderzocht dan bij de stof die ze verving; er is geen norm en geen vastgesteld effect. Wat wél vaststaat is de persistentie: DONA breekt niet af, dus elke hoeveelheid die in het grondwater terechtkomt, blijft daar op menselijke tijdschaal. Onbekend gevolg plus onomkeerbaarheid is precies de combinatie waar het PFAS-dossier op stukliep.",
    bronnen: ["echa", "whoDrinkwater"],
  },
  fts: {
    kort:
      "Valt in het milieu uiteen tot PFOA en verwanten — en díe zijn kankerverwekkend en niet meer af te breken.",
    wat: "Fluortelomeersulfonzuren, aangeduid met twee getallen zoals 6:2 of 8:2 — die staan voor het aantal gefluoreerde en gewone koolstofatomen.",
    herkomst:
      "Het blusschuim dat na het verbod op PFOS in gebruik kwam, en coatings voor textiel en papier.",
    risico:
      "Ze werden gekozen omdat ze wél afbreken. Alleen: waar ze in uiteenvallen zijn perfluorcarbonzuren zoals PFOA, dat het IARC als kankerverwekkend voor de mens indeelde, en PFHxA, dat doorzakt naar het grondwater. Een meting hier betekent dus dat er later elders een blijvende stof bij komt. Een vondst wijst meestal op recenter gebruik van blusschuim.",
    bronnen: ["iarcPfas", "efsaPfas"],
  },
  dipap: {
    kort:
      "Komt via vetwerende voedselverpakking mee met het eten en valt daarna uiteen tot PFAS die het lichaam niet meer kwijtraakt.",
    wat: "Fluortelomeerfosfaatdiesters, een vetwerende coating.",
    herkomst:
      "Papier en karton dat vet en vocht moet tegenhouden: pizzadozen, popcornzakken, fastfoodverpakking. Ook in sommige cosmetica.",
    risico:
      "De blootstelling loopt hier via het bord: de coating komt in het voedsel terecht. In het milieu en in het lichaam vallen deze stoffen uiteen in perfluorcarbonzuren zoals PFOA, die niet meer afbreken en die het IARC als kankerverwekkend voor de mens indeelde. Vlaanderen raadt daarom aan verse, onbewerkte producten te verkiezen boven verpakte.",
    bronnen: ["iarcPfas", "vlaanderenPfas"],
  },
  sulfonamiden: {
    kort:
      "Verandert in het milieu alsnog in PFOS, met de opstapeling en het effect op het afweersysteem die daarbij horen.",
    wat: "Perfluorsulfonamiden: verbindingen die geen PFOS zijn, maar er wel in veranderen.",
    herkomst:
      "Grondstof en bijproduct bij het maken van impregneermiddelen en blusschuim. Ze zaten mee in de producten die met PFOS gemaakt werden.",
    risico:
      "Deze meting telt dubbel: wat vandaag als voorloper in het water zit, wordt op termijn PFOS of PFBS. De gevolgen zijn dus die van PFOS — opstapeling in bloed en lever, en een verzwakte reactie op vaccinatie — alleen later. Wie enkel naar PFOS kijkt, onderschat daardoor wat er uiteindelijk komt.",
    bronnen: ["efsaPfas", "stockholm"],
  },
  pfcaKort: {
    kort:
      "Zakt door tot in het grondwater en is er nauwelijks uit te zuiveren; daarom wordt putwater in vervuilde zones afgeraden.",
    wat: "Perfluorcarbonzuren met een korte keten, vijf tot zeven koolstofatomen.",
    herkomst:
      "Deels rechtstreeks gebruikt als vervanger van de lange ketens, deels het afbraakproduct van fluortelomeren uit coatings en blusschuim.",
    risico:
      "Ze verlaten het lichaam sneller dan PFOS of PFOA en stapelen zich minder op. Het gevolg verschuift daarmee naar het water: ze hechten slecht aan bodemdeeltjes, zakken door tot in het grondwater en zijn met actieve kool nauwelijks tegen te houden. Een winning die zo vervuild raakt, is niet zomaar te herstellen; waar de bodem belast is, raadt Vlaanderen putwater als drinkwater af. Over hun gezondheidseffecten is veel minder bekend dan over de lange ketens — een kennisleemte, geen vrijspraak.",
    bronnen: ["vlaanderenPfas", "whoDrinkwater"],
  },
  pfcaLang: {
    kort:
      "Klimt op in de voedselketen en belandt via vis en eieren bij de mens; vandaar het advies over zelfgeteeld voedsel.",
    wat: "Perfluorcarbonzuren met een lange keten, tien koolstofatomen of meer.",
    herkomst:
      "Productie van fluorpolymeren, impregneermiddelen, en het afbraakproduct van langere fluortelomeren.",
    risico:
      "Hoe langer de keten, hoe sterker de stof zich bindt aan eiwit en slib en hoe verder ze opklimt in de voedselketen. Het gevolg zie je daarom niet in het water maar op het bord: in vis en in eieren van eigen kippen lopen de gehalten op, en in vervuilde zones geldt het advies van hoogstens twee eigen eieren per week. Hun bekendste verwant, PFOA, is door het IARC als kankerverwekkend voor de mens ingedeeld.",
    bronnen: ["vlaanderenPfas", "iarcPfas"],
  },
  pfsaOverig: {
    kort:
      "Zelfde familie als PFOS: de langere hopen zich op in vis en in de mens, met dezelfde effecten op het afweersysteem.",
    wat: "Perfluorsulfonzuren van andere ketenlengte dan PFOS, PFHxS en PFBS.",
    herkomst: "Bijproducten en nevenbestanddelen van blusschuim en impregneermiddelen.",
    risico:
      "Ze horen tot dezelfde familie als PFOS en gedragen zich navenant: hoe langer de keten, hoe sterker de opstapeling in vis en in de mens, en hoe meer ze bijdragen aan het effect waarop de EFSA-norm rust — een verzwakte reactie op vaccinatie. Voor de meeste bestaat geen aparte norm, maar ze tellen wel mee in de som van twintig PFAS uit de drinkwaterrichtlijn.",
    bronnen: ["efsaPfas", "whoDrinkwater"],
  },
  pfechs: {
    kort:
      "Wijst op vervuiling door luchtvaart of verchromen; over de gevolgen voor de gezondheid is nog te weinig bekend om iets te beweren.",
    wat: "Perfluor-4-ethylcyclohexaansulfonzuur, een PFAS met een ringvorm in plaats van een rechte keten.",
    herkomst: "Hydraulische vloeistoffen in de luchtvaart, en verchroombaden.",
    risico:
      "Hier past terughoudendheid: er is geen norm en er zijn te weinig gegevens om een gezondheidseffect te benoemen. Wat het wél doet, is de bron aanwijzen — waar PFECHS opduikt, wijst het meestal naar luchtvaart of naar oppervlaktebehandeling van metaal, en dus naar de plek waar ook de beter onderzochte PFAS vandaan komen.",
    bronnen: ["whoDrinkwater"],
  },
  clPfesa: {
    kort:
      "Even persistent als PFOS en met dezelfde opstapeling in het lichaam; de vervanger verplaatste het probleem in plaats van het op te lossen.",
    wat: "Chloorpolyfluorether-sulfonzuren, samen bekend als F-53B.",
    herkomst:
      "Bij het verchromen van metaal gebruikt als vervanger van PFOS, vooral buiten Europa.",
    risico:
      "Even persistent als PFOS, en met een vergelijkbare opstapeling in bloed en lever. Daarmee horen er dezelfde zorgen bij als bij de stof die het verving, terwijl de regels van het Verdrag van Stockholm er niet op slaan. Een van de duidelijkste voorbeelden van een vervanger die het probleem verplaatst in plaats van oplost.",
    bronnen: ["stockholm", "whoDrinkwater"],
  },
  tfa: {
    kort:
      "Regent overal uit en is met geen enkele gangbare zuivering uit drinkwater te halen; de gehalten stijgen daardoor gestaag.",
    wat: "Trifluorazijnzuur, met twee koolstofatomen de kortste PFAS die gemeten wordt.",
    herkomst:
      "Grotendeels een afbraakproduct: koelmiddelen en drijfgassen vallen in de atmosfeer uiteen tot TFA, en ook een aantal gefluoreerde bestrijdingsmiddelen en geneesmiddelen eindigen zo. Het regent vervolgens uit.",
    risico:
      "TFA hoopt zich niet op in het lichaam en is veel minder giftig dan PFOS; een acuut gezondheidsrisico is er bij deze gehalten niet. Het gevolg zit in de onomkeerbaarheid: het lost volledig op, hecht nergens aan en is met actieve kool of omgekeerde osmose niet tegen te houden. Wat in het grondwater komt, gaat er niet meer uit, en omdat de bronnen nog in gebruik zijn, lopen de gehalten in drink- en oppervlaktewater gestaag op.",
    bronnen: ["whoDrinkwater", "echa"],
  },
  somEfsa4: {
    kort:
      "De som waarop de Europese tolereerbare inname slaat: 4,4 ng per kilo per week, gebaseerd op een verzwakte reactie op vaccinatie.",
    wat: "De som van vier PFAS: PFOA, PFNA, PFHxS en PFOS.",
    herkomst: "Een rekensom van het labo, geen stof op zich.",
    risico:
      "EFSA stelde in 2020 vast dat deze vier samen beoordeeld moeten worden en kwam op een tolereerbare inname van 4,4 nanogram per kilo lichaamsgewicht per week. Doorslaggevend was niet kanker of cholesterol, maar dat het afweersysteem van kinderen minder goed reageert op vaccinatie. Voor een volwassene van 70 kilo komt die norm neer op ongeveer 300 nanogram per week — uit álle voeding samen.",
    bronnen: ["efsaPfas"],
  },
  somPfas43: {
    kort:
      "De optelsom van alle afzonderlijk gemeten PFAS; bruikbaar om punten te vergelijken, maar er hangt geen norm aan.",
    wat: "De som van de 43 PFAS die de VMM in oppervlaktewater afzonderlijk bepaalt.",
    herkomst: "Een rekensom van het labo, geen stof op zich.",
    risico:
      "Handig om meetpunten te vergelijken, maar de som zegt niets over wélke stoffen erin zitten — en dat maakt uit, want PFOA en TFA hebben heel verschillende gevolgen. Er hangt geen norm aan: de milieukwaliteitsnorm voor oppervlaktewater geldt voor PFOS afzonderlijk.",
    bronnen: ["vmmWater"],
  },
  somDwrl20: {
    kort:
      "De som waarop de Europese drinkwaternorm van 100 ng/L slaat; erboven is het water niet geschikt om te drinken.",
    wat: "De som van de twintig PFAS die de Europese drinkwaterrichtlijn samen beoordeelt.",
    herkomst: "Een rekensom van het labo, geen stof op zich.",
    risico:
      "De richtlijn zet geen norm per stof maar op deze som: 0,1 µg/L, oftewel 100 nanogram per liter. Zo wordt vermeden dat twintig stoffen die elk net onder een drempel blijven, samen alsnog een probleem vormen. Boven die waarde is water niet geschikt om als drinkwater geleverd te worden; bij grondwater betekent een overschrijding dat de winning eerst gezuiverd moet worden.",
    bronnen: ["whoDrinkwater"],
  },

  pfas: {
    kort:
      "Stapelt zich op in het lichaam en verlaat het traag; EFSA wees als doorslaggevend effect aan dat het afweersysteem minder goed op vaccinatie reageert.",
    wat: "Een familie van duizenden door de mens gemaakte fluorverbindingen, bekend als de eeuwige chemicaliën omdat ze in de natuur nauwelijks afbreken.",
    herkomst:
      "Antiaanbaklagen, waterafstotende kleding, verpakkingen, en vooral blusschuim — dat laatste is de oorzaak van de bekendste vervuilingen in Vlaanderen.",
    risico:
      "EFSA stelde in 2020 een gezamenlijke tolereerbare inname vast van 4,4 nanogram per kilogram lichaamsgewicht per week voor vier PFAS samen. Doorslaggevend daarbij was niet kanker of cholesterol, maar dat het afweersysteem minder goed reageert op vaccinatie. Van de best onderzochte stof, PFOA, stelde het IARC in 2023 vast dat ze kankerverwekkend is voor de mens. PFAS stapelen zich op in het lichaam en verlaten het maar traag; in vervuilde zones vertaalt dat zich in adviezen over zelfgeteeld voedsel en putwater.",
    bronnen: ["efsaPfas", "iarcPfas", "vlaanderenPfas"],
  },
  // ---- pesticiden per stof ----
  //
  // Ook hier verschilt het verhaal per stof, en op één punt scherper dan bij
  // PFAS: sommige middelen zijn al twintig jaar verboden en duiken nog op,
  // andere mogen vandaag nog gebruikt worden. Dat onderscheid gaat verloren
  // in één gedeelde tekst, terwijl het juist bepaalt wat een meting betekent.
  simazine: {
    kort:
      "Al sinds 2004 niet meer toegelaten in de EU; wat er nu nog gemeten wordt, zakte decennia geleden weg en bereikt het grondwater pas nu.",
    wat: "Een triazineherbicide, verwant aan atrazine, tegen onkruid in maïs, fruit en op verhardingen.",
    herkomst:
      "Sinds 2004 niet meer toegelaten in de Europese Unie. Werd veel gebruikt op opritten, spoorwegen en in de fruitteelt.",
    risico:
      "Voor de mens gaat het bij deze gehalten niet om een acuut gevaar; de norm van 0,1 µg/L is een beleidsgrens en geen gezondheidsdrempel. Wat een vondst wél betekent, is dat een verbod van twintig jaar geleden nog niet in het grondwater is doorgewerkt. Voor waterleven is simazine schadelijk omdat het de fotosynthese van algen en waterplanten remt — de basis van de voedselketen in een beek.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  terbutylazine: {
    kort:
      "Anders dan atrazine en simazine nog wél toegelaten; een vondst wijst dus op gebruik van vandaag, niet op een erfenis.",
    wat: "Een triazineherbicide dat atrazine verving in de maïsteelt.",
    herkomst:
      "Nog steeds toegelaten in de Europese Unie, en juist ingevoerd toen atrazine verboden werd. In de sample van het grondwatermeetnet is het de meest gemeten pesticide.",
    risico:
      "Dat het nog toegelaten is, maakt een overschrijding niet minder ernstig — het maakt ze actueler. Waar atrazine een erfenis is, wijst terbutylazine op gebruik van nu, en dus op iets dat nog te veranderen valt. Voor waterleven geldt dezelfde werking als bij de andere triazines: het remt de fotosynthese van algen en waterplanten.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  triazineMetabolieten: {
    kort:
      "Afbraakproduct van atrazine of terbutylazine; het duikt op waar de moederstof zelf al is verdwenen en toont dus hoe traag grondwater zich herstelt.",
    wat: "Wat er van de triazineherbiciden overblijft nadat de bodem ze deels heeft afgebroken — desethylatrazine, desisopropylatrazine en desethylterbuthylazine.",
    herkomst:
      "Ontstaan in de bodem uit atrazine, simazine en terbutylazine. Ze zijn beweeglijker dan de moederstof en zakken dus verder door.",
    risico:
      "Deze metabolieten gelden als relevant: de norm van 0,1 µg/L slaat er onverkort op, en een drinkwaterwinning kan er onbruikbaar door worden zonder extra zuivering. Van desethylatrazine worden hogere gehalten gemeten dan van atrazine zelf — het afbraakproduct blijft langer hangen dan wat het verving. Het gevolg is er vooral een van tijd: waar dit opduikt, is de vervuiling van dertig jaar geleden nog steeds onderweg naar beneden, en daar valt vandaag niets meer aan te doen.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  fenylureum: {
    kort:
      "Geen van deze middelen is nog toegelaten; ze zijn giftig voor waterplanten en algen en spoelen makkelijk van verhardingen af.",
    wat: "Fenylureumherbiciden: diuron, isoproturon, chloortoluron en linuron.",
    herkomst:
      "Onkruidbestrijding op verhardingen, spoorwegen en in de akkerbouw. De toelating is voor deze stoffen in de Europese Unie ingetrokken.",
    risico:
      "Ze remmen de fotosynthese en zijn daardoor schadelijk voor algen en waterplanten — waar het waterleven in een beek op steunt. Omdat ze veel op verharding werden gebruikt, spoelden ze bij regen rechtstreeks de riolering en de waterloop in, zonder bodem die iets tegenhoudt. Dat verklaart waarom ze nog opduiken.",
    bronnen: ["euPesticiden", "vmmWater"],
  },
  bentazon: {
    kort:
      "Nog toegelaten en zeer beweeglijk in de bodem; het bereikt het grondwater sneller dan de meeste andere middelen.",
    wat: "Een herbicide tegen breedbladig onkruid in granen, maïs en bonen.",
    herkomst: "Nog toegelaten in de Europese Unie en breed gebruikt in de akkerbouw.",
    risico:
      "Bentazon hecht nauwelijks aan bodemdeeltjes en spoelt daardoor snel door naar het grondwater; het is een van de middelen die het vaakst in drinkwaterwinningen opduiken. De norm van 0,1 µg/L is geen gezondheidsdrempel: bentazon is minder giftig dan veel oudere middelen. Het probleem is dat een winning die vervuild raakt, gezuiverd moet worden of dicht moet.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  chlooracetanilide: {
    wat: "De chlooracetaniliden — metolachloor, metazachloor, alachloor en verwanten — herbiciden voor maïs, koolzaad en bieten.",
    herkomst:
      "Akkerbouw. Alachloor is niet meer toegelaten; S-metolachloor en metazachloor werden lang op grote schaal gebruikt.",
    risico:
      "De stoffen zelf worden in de bodem vrij snel afgebroken, maar wat er ontstaat — de ESA- en OA-metabolieten — zakt door naar het grondwater en blijft daar. Juist die afbraakproducten, en niet de moederstof, zijn de reden dat drinkwaterwinningen extra moeten zuiveren.",
    kort:
      "Breekt zelf snel af, maar de afbraakproducten zakken door naar het grondwater en dwingen winningen tot extra zuivering.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  chlooracetanilideMetaboliet: {
    kort:
      "Het afbraakproduct dat wél doorzakt naar het grondwater; het is meestal de reden dat een winning moet bijzuiveren.",
    wat: "ESA- en OA-metabolieten: wat er van metolachloor, metazachloor, alachloor of flufenacet overblijft na afbraak in de bodem.",
    herkomst: "Ontstaan in landbouwgrond uit de herbiciden die daar gebruikt zijn of werden.",
    risico:
      "Deze afbraakproducten zijn beweeglijker dan de stof waaruit ze ontstaan en veel stabieler: ze zakken door naar het grondwater en verdwijnen daar niet meer. Ze zijn doorgaans minder giftig dan de moederstof — een deel is als niet-relevant beoordeeld — maar het gevolg is praktisch: ze maken grondwater ongeschikt als drinkwaterbron zonder extra zuivering.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  glyfosaat: {
    kort:
      "In 2023 opnieuw toegelaten tot 2033, terwijl het IARC het als waarschijnlijk kankerverwekkend indeelt — een omstreden dossier.",
    wat: "Het meest gebruikte onkruidbestrijdingsmiddel ter wereld.",
    herkomst:
      "Landbouw, openbaar groen en particuliere tuinen. In Vlaanderen mogen openbare besturen het op de meeste terreinen niet meer gebruiken.",
    risico:
      "Het IARC deelde glyfosaat in 2015 in als waarschijnlijk kankerverwekkend voor de mens; EFSA en de Europese Commissie kwamen tot een andere weging en verlengden de goedkeuring in 2023 tot eind 2033. Die twee oordelen staan naast elkaar en dat is de kern van het debat. In water is het effect indirecter: glyfosaat hecht sterk aan bodemdeeltjes en spoelt vooral bij hevige regen mee van verhardingen.",
    bronnen: ["ecGlyfosaat", "iarc"],
  },
  ampa: {
    kort:
      "Het afbraakproduct van glyfosaat: schadelijk voor waterorganismen en de stof die het vaakst in Vlaamse waterlopen wordt gevonden.",
    wat: "AMPA, waar glyfosaat in uiteenvalt. Het ontstaat ook bij de afbraak van sommige waspoeders.",
    herkomst:
      "Grotendeels uit glyfosaat, maar niet uitsluitend — een deel komt uit fosfonaten in schoonmaakmiddelen via het riool.",
    risico:
      "AMPA is stabieler dan glyfosaat en hoopt zich daardoor op in waterbodems en oppervlaktewater; het is een van de meest aangetroffen stoffen in Vlaamse waterlopen. Het is schadelijk voor waterorganismen, en in waterlopen die als drinkwaterbron dienen dwingt het tot extra zuivering. Dat het deels uit waspoeder komt, maakt de aanpak lastiger: een hoge waarde wijst niet automatisch naar de landbouw, dus ook niet automatisch naar wie er iets aan kan doen.",
    bronnen: ["vmmWater", "euPesticiden"],
  },
  bam: {
    kort:
      "Afbraakproduct van een middel dat al sinds 2008 verboden is, en toch de bekendste vervuiler van drinkwaterwinningen.",
    wat: "2,6-dichloorbenzamide, het afbraakproduct van het onkruidmiddel dichlobenil.",
    herkomst:
      "Dichlobenil werd tot het verbod in 2008 gebruikt op opritten, paden en in de sierteelt — vaak op verharding, waar niets het tegenhoudt.",
    risico:
      "BAM breekt vrijwel niet af en is uitermate beweeglijk: het is in heel Noordwest-Europa de stof die het vaakst drinkwaterwinningen boven de norm brengt, en winningen zijn erdoor gesloten. Het is niet bijzonder giftig — het gevolg zit in de onbruikbaarheid van het water, niet in een gezondheidseffect bij deze gehalten.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  chloridazon: {
    kort:
      "Afbraakproduct van een bietenherbicide dat niet meer toegelaten is; het zakt sneller door dan de stof zelf.",
    wat: "Desphenyl-chloridazon en methyldesfenyl-chloridazon, de afbraakproducten van het bietenherbicide chloridazon.",
    herkomst:
      "Suikerbietenteelt. Chloridazon is in de Europese Unie niet meer toegelaten, maar de metabolieten zijn nog volop onderweg door de bodem.",
    risico:
      "Deze afbraakproducten zijn als niet-relevant beoordeeld, wat wil zeggen dat ze minder giftig zijn dan de moederstof; de strenge norm van 0,1 µg/L geldt er niet automatisch voor. Wat blijft, is dat ze massaal in het grondwater zitten en er niet uit verdwijnen: in bietenstreken bepalen ze mee of een winning nog bruikbaar is.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  dms: {
    kort:
      "Afbraakproduct van een verboden schimmelmiddel; bij ontsmetting met ozon kan er in de drinkwaterfabriek NDMA uit ontstaan.",
    wat: "Dimethylsulfamide, het afbraakproduct van het schimmelbestrijdingsmiddel tolylfluanide.",
    herkomst: "Fruit- en sierteelt. Tolylfluanide is in de Europese Unie niet meer toegelaten.",
    risico:
      "DMS zelf is weinig giftig, maar het is bekend geworden om iets anders: bij de bereiding van drinkwater met ozon kan eruit NDMA ontstaan, een stof die als kankerverwekkend geldt. Het gevolg ligt dus niet in het grondwater zelf maar in wat de zuivering ermee doet — waardoor waterbedrijven hun ozonstap moesten aanpassen.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  triazool: {
    kort:
      "Afbraakproduct van de triazoolfungiciden; verscheidene daarvan zijn ingedeeld als schadelijk voor de voortplanting.",
    wat: "1,2,4-triazool, het gemeenschappelijke afbraakproduct van de triazoolfungiciden.",
    herkomst:
      "Schimmelbestrijding in granen, fruit en sierteelt — een grote groep middelen die alle op deze ring uitkomen.",
    risico:
      "De moederstoffen uit deze groep zijn voor een deel ingedeeld als schadelijk voor de voortplanting, en dat is de reden dat het afbraakproduct opgevolgd wordt. 1,2,4-triazool is bovendien beweeglijk en zakt makkelijk door naar het grondwater, zodat het over een grote oppervlakte terugkomt in plaats van op de plek van gebruik.",
    bronnen: ["euPesticiden", "echa"],
  },
  chloorthalonilMetaboliet: {
    kort:
      "De metaboliet waarom chloorthalonil in 2019 van de markt ging: Europa kon niet uitsluiten dat de resten genotoxisch zorgwekkend zijn.",
    wat: "R471811, een afbraakproduct van het schimmelbestrijdingsmiddel chloorthalonil.",
    herkomst:
      "Chloorthalonil werd gebruikt tegen schimmels in granen, aardappelen en groenten, tot de goedkeuring in april 2019 niet verlengd werd.",
    risico:
      "Deze stof is geen bijkomstigheid van dat verbod maar de aanleiding ervan: de Europese Commissie noemt R471811 bij naam als een van de metabolieten waarvan voorspeld werd dat ze in álle scenario's boven 0,1 µg/L in het grondwater zouden voorkomen. Daarbij kon niet uitgesloten worden dat de resten waaraan consumenten worden blootgesteld genotoxisch zorgwekkend zijn, en voor amfibieën en vissen werd een hoog risico vastgesteld.",
    bronnen: ["verordeningChloorthalonil", "euPesticiden"],
  },
  ethofumesaat: {
    kort:
      "Nog toegelaten bietenherbicide dat vlot doorzakt naar het grondwater.",
    wat: "Een herbicide dat vooral in suikerbieten wordt gebruikt.",
    herkomst: "Bietenteelt en graszaadteelt; nog toegelaten in de Europese Unie.",
    risico:
      "Het spoelt makkelijk uit naar het grondwater, waardoor het regelmatig in meetnetten opduikt. Voor de mens is er bij deze gehalten geen aangetoond effect; de norm is een beleidsgrens. Voor waterorganismen is het wel schadelijk, en omdat het nog gebruikt wordt, gaat het om een actuele belasting en niet om een erfenis.",
    bronnen: ["euPesticiden", "vmmWater"],
  },
  fenoxy: {
    kort:
      "Klassieke onkruidbestrijders die vlot uitspoelen; ze zijn giftig voor waterplanten en verstoren zo de beek.",
    wat: "Fenoxyherbiciden zoals 2,4-D, 2,4-DB en MCPA, tegen breedbladig onkruid in grasland en granen.",
    herkomst: "Akkerbouw en weiland; een deel is nog toegelaten.",
    risico:
      "Ze hechten slecht aan de bodem en spoelen bij regen mee naar sloot en beek. Daar werken ze zoals ze bedoeld zijn: ze doden breedbladige planten, ook de waterplanten die schuil- en paaiplaats zijn voor het leven in de waterloop. Voor de mens ligt de norm ruim onder de dosis waarbij effecten optreden.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  nietRelevanteMetaboliet: {
    kort:
      "Een afbraakproduct dat als minder giftig beoordeeld is; het maakt water niet ongezond, maar wel moeilijker bruikbaar als drinkwaterbron.",
    wat: "Een afbraakproduct van een bestrijdingsmiddel dat als niet-relevant is beoordeeld: minder giftig dan de stof waaruit het ontstond.",
    herkomst: "Landbouwgrond, uit de middelen die daar gebruikt zijn of werden.",
    risico:
      "“Niet-relevant” betekent niet onschuldig maar minder giftig dan de moederstof; de strenge norm van 0,1 µg/L geldt er niet automatisch voor. Wat overblijft is een praktisch gevolg: deze stoffen zijn stabiel en beweeglijk, ze stapelen zich op in het grondwater en maken een winning duurder of onbruikbaar. Voor een aantal ervan is de beoordeling bovendien nooit afgerond, en dan is de indeling een tussenstand en geen vrijbrief.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },

  triazineOverig: {
    kort:
      "Remt de fotosynthese van algen en waterplanten, de basis van het leven in een beek; niet meer toegelaten in de EU.",
    wat: "De overige triazine- en verwante herbiciden: terbutryn, prometryn, cyanazine, sebuthylazine, hexazinon, bromacil en metamitron.",
    herkomst:
      "Onkruidbestrijding in akkerbouw, op spoorwegen en verhardingen. Voor het merendeel is de toelating in de Europese Unie ingetrokken.",
    risico:
      "Ze werken alle op dezelfde manier: ze leggen de fotosynthese stil. In een waterloop treft dat de algen en waterplanten waar het hele voedselweb op steunt. Voor de mens is de norm van 0,1 µg/L een beleidsgrens en geen gezondheidsdrempel; het gevolg zit in de waterloop en in de bruikbaarheid van het grondwater.",
    bronnen: ["euPesticiden", "vmmWater"],
  },
  groeistof: {
    kort:
      "Doodt breedbladige planten, ook de waterplanten die schuil- en paaiplaats zijn; spoelt vlot af naar sloot en beek.",
    wat: "Groeistofherbiciden: fenoxyzuren zoals 2,4-D, MCPA, mecoprop en dichloorprop, en verwanten als dicamba, fluroxypyr en triclopyr.",
    herkomst:
      "Grasland, granen en openbaar groen. Een deel is nog toegelaten, andere zoals 2,4,5-T al lang niet meer.",
    risico:
      "Ze ontregelen de groei van breedbladige planten. Spoelen ze af naar een sloot, dan doen ze daar precies hetzelfde: de waterplanten verdwijnen die schuilplaats en paaiplaats zijn voor vissen en insecten. Ze hechten slecht aan de bodem, dus een regenbui volstaat. Voor de mens ligt de norm ruim onder de dosis waarbij effecten optreden.",
    bronnen: ["euPesticiden", "vmmWater"],
  },
  carbamaat: {
    kort:
      "Oudere middelen waarvan de toelating is ingetrokken; ze blijven lang genoeg in de bodem om nu nog op te duiken.",
    wat: "Carbamaten zoals chloorprofam en carbetamide, gebruikt tegen onkruid en tegen het uitlopen van aardappelen.",
    herkomst:
      "Aardappelbewaring en akkerbouw. De toelating is in de Europese Unie ingetrokken.",
    risico:
      "Chloorprofam werd tot het verbod op grote schaal in aardappelbewaring gebruikt, waardoor residuen breed verspreid raakten. In water zijn deze stoffen schadelijk voor waterorganismen; voor de mens is bij de gemeten gehalten geen effect aangetoond en is de norm een beleidsgrens.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  carbendazim: {
    kort:
      "Niet meer toegelaten omdat het schadelijk is voor de voortplanting en erfelijk materiaal kan beschadigen.",
    wat: "Een schimmelbestrijdingsmiddel uit de benzimidazolen, ook het afbraakproduct van benomyl en thiofanaat-methyl.",
    herkomst:
      "Fruit, granen en sierteelt. De toelating is in de Europese Unie ingetrokken; het duikt ook op via geïmporteerde producten en via verf en coatings waarin het als conserveermiddel zat.",
    risico:
      "Carbendazim is ingedeeld als schadelijk voor de voortplanting en als stof die erfelijk materiaal kan beschadigen; dat is de reden dat de goedkeuring niet verlengd is. Het is bovendien zeer giftig voor waterorganismen en breekt in water traag af.",
    bronnen: ["euPesticiden", "echa"],
  },
  organofosfaat: {
    kort:
      "Legt het zenuwstelsel lam — bij insecten in bedoelde dosis, bij mens en vis bij hoge blootstelling; niet meer toegelaten.",
    wat: "Organofosfaat-insecticiden zoals triazofos.",
    herkomst: "Insectenbestrijding in land- en tuinbouw. Niet meer toegelaten in de Europese Unie.",
    risico:
      "Deze middelen blokkeren een enzym dat zenuwprikkels afbreekt; datzelfde enzym hebben mensen, vissen en insecten. Daardoor zijn ze zeer giftig voor waterinsecten en kreeftachtigen, en bij hoge blootstelling ook voor de mens. Ze zijn juist om die reden uit de markt genomen; een vondst wijst op ouder of niet-toegelaten gebruik.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  neonicotinoide: {
    kort:
      "Extreem giftig voor waterinsecten en bijen; buitengebruik is daarom sinds 2018 in de EU verboden.",
    wat: "Neonicotinoïden zoals imidacloprid, insecticiden die door de hele plant worden opgenomen.",
    herkomst:
      "Zaadbehandeling en gewasbescherming. Voor imidacloprid en verwanten is het gebruik in open lucht sinds 2018 in de Europese Unie verboden vanwege de gevolgen voor bijen.",
    risico:
      "Ze werken in op het zenuwstelsel van insecten en zijn daar buitengewoon giftig voor: concentraties ver onder wat voor de mens iets betekent, zijn al schadelijk voor haften, muggenlarven en kreeftachtigen. Verdwijnen die, dan verdwijnt het voedsel van vissen en vogels. De norm van 0,1 µg/L is voor deze stoffen dan ook niet streng genoeg om het waterleven te beschermen.",
    bronnen: ["euPesticiden", "vmmWater"],
  },
  fumigant: {
    kort:
      "Bodemontsmetters die massaal werden ingezet en waarvan er één berucht is om onvruchtbaarheid bij arbeiders; geen ervan is nog toegelaten.",
    wat: "Bodemontsmettingsmiddelen zoals 1,3-dichloorpropeen, broommethaan en 1,2-dibroom-3-chloorpropaan, en het afbraakproduct chlooracrylzuur.",
    herkomst:
      "Ontsmetting van landbouwgrond tegen aaltjes en schimmels, vooral in de sierteelt en groenteteelt. Geen van deze middelen is nog toegelaten.",
    risico:
      "Deze stoffen werden in grote hoeveelheden in de bodem gebracht en zakken van daaruit door naar het grondwater. 1,2-dibroom-3-chloorpropaan werd wereldwijd uit de markt genomen nadat het onvruchtbaarheid bleek te veroorzaken bij arbeiders die het produceerden. Broommethaan is bovendien onder het Montreal-protocol uitgefaseerd omdat het de ozonlaag aantast.",
    bronnen: ["euPesticiden", "whoDrinkwater"],
  },
  pentachloorfenol: {
    kort:
      "Wereldwijd verboden houtverduurzamingsmiddel dat kankerverwekkend is en zich ophoopt in de voedselketen.",
    wat: "Pentachloorfenol, gebruikt om hout te verduurzamen en als bestrijdingsmiddel.",
    herkomst:
      "Houtverduurzaming, leerlooierij en textiel. Opgenomen in bijlage A van het Verdrag van Stockholm, dus wereldwijd uitgefaseerd.",
    risico:
      "Het is door het IARC ingedeeld als kankerverwekkend voor de mens, hoopt zich op in de voedselketen en breekt traag af. Bij de productie ervan ontstonden bovendien dioxines. Een vondst wijst vrijwel altijd op historische verontreiniging, bijvoorbeeld bij een oude houtverduurzamingsplaats.",
    bronnen: ["stockholm", "iarc"],
  },
  somPesticiden: {
    kort:
      "De optelsom van alle gemeten bestrijdingsmiddelen; de drinkwaterrichtlijn hanteert hiervoor 0,5 µg/L.",
    wat: "De som van de afzonderlijk bepaalde bestrijdingsmiddelen in dit monster.",
    herkomst: "Een rekensom van het labo, geen stof op zich.",
    risico:
      "De Europese drinkwaterrichtlijn kent naast de 0,1 µg/L per stof een tweede grens: 0,5 µg/L voor alle bestrijdingsmiddelen samen. Zo wordt vermeden dat tien stoffen die elk netjes onder de drempel blijven, samen alsnog een probleem vormen. De som zegt niets over wélke middelen erin zitten, en dat maakt uit voor wat eraan te doen valt.",
    bronnen: ["whoDrinkwater", "euPesticiden"],
  },

  fungicideModern: {
    kort:
      "Nog toegelaten schimmelmiddelen; ze zijn giftig voor waterorganismen en een vondst wijst op gebruik van vandaag.",
    wat: "Moderne schimmelbestrijdingsmiddelen zoals trifloxystrobine en fluopicolide.",
    herkomst: "Fruit, granen, aardappelen en sierteelt; grotendeels nog toegelaten.",
    risico:
      "Anders dan de oude middelen zijn deze nog in gebruik, dus een vondst gaat over vandaag en niet over een erfenis. Ze zijn giftig voor waterorganismen, in het bijzonder voor algen en kreeftachtigen, en spoelen af bij regen kort na het spuiten. Voor de mens ligt de norm ruim onder de dosis waarbij effecten optreden.",
    bronnen: ["euPesticiden", "vmmWater"],
  },

  pesticiden: {
    kort:
      "Bestrijdingsmiddelen horen niet in drinkwater thuis — de norm van 0,1 µg/L is daarop gebaseerd en niet op een gezondheidsgrens per stof.",
    wat: "Stoffen om onkruid, insecten of schimmels te bestrijden, en de resten waarin ze in de bodem uiteenvallen.",
    herkomst:
      "Landbouw, en daarnaast openbaar groen, spoorwegen en particuliere tuinen. Metabolieten kunnen nog jaren opduiken nadat een middel verboden is.",
    risico:
      "De norm van 0,1 µg/L per stof is geen gezondheidsgrens maar een beleidskeuze: bestrijdingsmiddelen horen niet in drinkwater thuis, ongeacht welke. Wat een concrete overschrijding betekent, verschilt sterk van stof tot stof.",
    bronnen: ["whoDrinkwater"],
  },
  atrazine: {
    kort:
      "Verstoort de hormoonhuishouding van waterdieren, en duikt twintig jaar na het Europese verbod nog op.",
    wat: "Een onkruidbestrijder die decennialang in de maïsteelt werd gebruikt.",
    herkomst:
      "In de Europese Unie sinds 2004 niet meer toegelaten. Wat er nu nog gemeten wordt, is een erfenis: atrazine breekt traag af en zakt langzaam door naar het grondwater.",
    risico:
      "Verstoort de hormoonhuishouding van waterdieren; bij amfibieën is dat het uitvoerigst beschreven. Dat het twintig jaar na het verbod nog opduikt, laat zien hoe traag grondwater zich herstelt.",
    bronnen: ["whoDrinkwater"],
  },

  geneesmiddelen: {
    kort:
      "Blootstelling van waterleven gedurende het hele leven, en bij antibiotica het risico dat resistentie in de hand wordt gewerkt.",
    wat: "Resten van medicijnen en hun afbraakproducten.",
    herkomst:
      "Wat mensen en dieren innemen, verlaat het lichaam grotendeels weer. Waterzuivering is er niet op gebouwd deze stoffen te verwijderen, dus komen ze via het riool in het water terecht. Ook mest van behandeld vee draagt bij.",
    risico:
      "De aangetroffen gehalten liggen ver onder een medicinale dosis. De zorg gaat over blootstelling van waterleven gedurende het hele leven, en over resten van antibiotica, die resistentie in de hand kunnen werken. Voor de meeste van deze stoffen bestaat nog geen norm.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  organisch: {
    kort:
      "Wat een waarde betekent hangt sterk af van de stof: sommige zijn vooral hinderlijk van smaak, andere zijn kankerverwekkend.",
    wat: "Door de mens gemaakte koolstofverbindingen: oplosmiddelen, brandstofbestanddelen en industriële grondstoffen.",
    herkomst:
      "Vaak historische bodemvervuiling van tankstations, chemische reiniging en industrie. Zulke stoffen zakken door naar het grondwater en blijven daar lang.",
    risico:
      "Verschilt sterk per stof: sommige zijn vooral hinderlijk van smaak of geur, andere zijn kankerverwekkend. Wat een concrete waarde betekent, hangt dus af van welke stof het is.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- labocontrole ----
  ionenbalans: {
    wat: "Een controle van het labo, geen stof in het water.",
    risico:
      "De positieve en negatieve ionen in een analyse horen tegen elkaar op te wegen. Wijkt de balans te ver af, dan ontbreekt er iets in de analyse of zit er een meetfout in. Het zegt iets over de betrouwbaarheid van het monster, niet over de kwaliteit van het water.",
    bronnen: ["vmmWater"],
  },
} as const satisfies Readonly<Record<string, Stofprofiel>>;

type ProfielId = keyof typeof PROFIELEN;

/**
 * Van bronsleutel naar profiel. Elke bron benoemt de stoffen anders: de VMM
 * gebruikt korte symbolen, DOV schrijft de naam voluit en IRCELINE hanteert
 * weer eigen codes. Ze wijzen alle drie naar dezelfde tekst.
 */
const SLEUTELS: Readonly<Record<string, ProfielId>> = {
  // lucht
  NO2: "no2",
  NO: "no",
  O3: "o3",
  SO2: "so2",
  CO: "co",
  CO2: "co2",
  "PM2.5": "pm25",
  PM10: "pm10",
  PM1: "pm1",
  BC: "bc",
  PNC: "pnc",
  C6H6: "benzeen",
  C7H8: "tolueen",
  C8H10: "xyleen",
  MPX: "xyleen",
  OX: "xyleen",
  NH3: "nh3",
  Hg: "kwikGas",
  RV: "vochtigheid",
  P: "luchtdruk",
  WR: "wind",
  WS: "wind",

  // oppervlaktewater
  O2: "zuurstof",
  "O2 verz": "zuurstofverzadiging",
  BZV5: "bzv",
  CZV: "czv",
  DOC: "organischeKoolstof",
  TOC: "organischeKoolstof",
  "NO3-": "nitraat",
  "NO2-": "nitriet",
  "NH4+": "ammonium",
  "N t": "stikstofTotaal",
  KjN: "stikstofTotaal",
  "N+N": "stikstofTotaal",
  "N+N+N": "stikstofTotaal",
  "oPO4 f": "fosfaat",
  "P t": "fosforTotaal",
  pH: "zuurtegraad",
  "EC 20": "geleidbaarheid",
  "EC 25": "geleidbaarheid",
  "Cl-": "chloride",
  "SO4=": "sulfaat",
  ZS: "zwevendeStof",
  TAM: "hardheid",
  Secchi: "doorzicht",
  EColi: "fecaleBacterien",
  TColi: "fecaleBacterien",
  FColi: "fecaleBacterien",
  FStrep: "fecaleBacterien",
  IEntero: "fecaleBacterien",
  Salm: "fecaleBacterien",
  // --- PFAS ---
  // De varianten "totaal", "vertakt" en DOV's "PFOStotal" vallen weg in
  // pfasStam(); hier staan alleen de stamvormen.
  PFOS: "pfos",
  PFOA: "pfoa",
  PFHxS: "pfhxs",
  PFNA: "pfna",
  PFBS: "pfbs",
  PFBA: "pfba",
  "HFPO-DA": "genx",
  DONA: "dona",

  "4:2 FTS": "fts",
  "6:2 FTS": "fts",
  "8:2 FTS": "fts",
  "10:2 FTS": "fts",
  "8:2 FTUCA": "fts",

  "6:2 diPAP": "dipap",
  "8:2 diPAP": "dipap",
  "6:2/8:2 diPAP": "dipap",

  PFOSA: "sulfonamiden",
  MePFOSA: "sulfonamiden",
  EtPFOSA: "sulfonamiden",
  MePFOSAA: "sulfonamiden",
  EtPFOSAA: "sulfonamiden",
  PFBSA: "sulfonamiden",
  MePFBSA: "sulfonamiden",
  MePFBSAA: "sulfonamiden",
  PFHxSA: "sulfonamiden",

  PFPeA: "pfcaKort",
  PFHxA: "pfcaKort",
  PFHpA: "pfcaKort",
  HPFHpA: "pfcaKort",

  PFDA: "pfcaLang",
  PFUnDA: "pfcaLang",
  PFDoDA: "pfcaLang",
  PFTrDA: "pfcaLang",
  PFTeDA: "pfcaLang",
  PFHxDA: "pfcaLang",
  PFODA: "pfcaLang",
  PFPeDA: "pfcaLang",
  "4H-PFUnDA": "pfcaLang",
  P37DMOA: "pfcaLang",

  PFPeS: "pfsaOverig",
  PFHpS: "pfsaOverig",
  PFNS: "pfsaOverig",
  PFDS: "pfsaOverig",
  PFUnDS: "pfsaOverig",
  PFDoDS: "pfsaOverig",
  PFTrDS: "pfsaOverig",

  PFECHS: "pfechs",
  "9Cl-PF3ONS": "clPfesa",
  "11Cl-PF3OUnDS": "clPfesa",

  TFA: "tfa",
  "Trifluorazijnzuur (TFA)": "tfa",

  "PFAS (EFSA-4)": "somEfsa4",
  "PFAS (EU DWRL-20)": "somDwrl20",
  "PFAS-43": "somPfas43",

  // grondwater; DOV schrijft de naam voluit
  "Opgeloste zuurstof (O2)": "zuurstof",
  "Totaal organische koolstof (TOC)": "organischeKoolstof",
  "Nitraat (NO3)": "nitraat",
  "Nitriet (NO2)": "nitriet",
  "Ammonium (NH4)": "ammonium",
  "Fosfaat (PO4)": "fosfaat",
  "Zuurtegraad (pH)": "zuurtegraad",
  "Temperatuur (T)": "temperatuurWater",
  "Elektrische geleidbaarheid (EC)": "geleidbaarheid",
  "Chloriden (Cl)": "chloride",
  "Sulfaat (SO4)": "sulfaat",
  "Calcium (Ca)": "hardheid",
  "Magnesium (Mg)": "hardheid",
  "Natrium (Na)": "hoofdionen",
  "Kalium (K)": "hoofdionen",
  "Bicarbonaat (HCO3)": "buffer",
  "Carbonaat (CO3)": "buffer",
  "Bromide (Br)": "bromide",
  "Boor (B)": "boor",
  "Cobalt (Co)": "kobalt",
  "Redoxpotentiaal (Eh°)": "redox",
  "Som anionen (SomAN)": "ionensom",
  "Som kationen (SomKAT)": "ionensom",
  // DOV rapporteert geleidbaarheid en zuurtegraad twee keer: ter plaatse
  // gemeten en later in het labo. Dezelfde grootheid, dus dezelfde uitleg.
  "Geleidbaarheid in het labo (EC(Lab.))": "geleidbaarheid",
  "Zuurtegraad in het labo (pH(Lab.))": "zuurtegraad",
  "Arseen (As)": "arseen",
  "Lood (Pb)": "lood",
  "Cadmium (Cd)": "cadmium",
  "Chroom (Cr)": "chroom",
  "Nikkel (Ni)": "nikkel",
  "Koper (Cu)": "koper",
  "Zink (Zn)": "zink",
  "Kwik (Hg)": "kwikWater",
  "Mangaan (Mn)": "mangaan",
  "Ijzer (Fe)": "ijzer",
  "Ijzer II (Fe2+)": "ijzer",
  "Aluminium (Al)": "aluminium",
  // --- pesticiden ---
  // DOV schrijft "Atrazine (Atraz)"; de code achteraan valt weg in de
  // opzoeking, dus hier staan de gewone namen.
  Atrazine: "atrazine",
  Simazine: "simazine",
  Terbutylazine: "terbutylazine",
  Terbuthylazine: "terbutylazine",
  Propazine: "triazineMetabolieten",
  Bentazon: "bentazon",
  Ethofumesaat: "ethofumesaat",
  Diuron: "fenylureum",
  Isoproturon: "fenylureum",
  Chloortoluron: "fenylureum",
  Chlorotoluron: "fenylureum",
  Linuron: "fenylureum",
  Metazachloor: "chlooracetanilide",
  Metolachloor: "chlooracetanilide",
  "S-Metolachloor": "chlooracetanilide",
  Alachloor: "chlooracetanilide",
  Glyfosaat: "glyfosaat",
  Glyphosate: "glyfosaat",
  AMPA: "ampa",
  "2,6-Dichlorobenzamide": "bam",
  BAM: "bam",
  "Desphenyl-Chloridazon": "chloridazon",
  Methyldesfenylchloridazon: "chloridazon",
  dimethylsulfamide: "dms",
  DMS: "dms",
  "1,2,4-Triazool": "triazool",
  "Chloorthalonil metaboliet R471811": "chloorthalonilMetaboliet",
  R471811: "chloorthalonilMetaboliet",
  "2,4-D": "fenoxy",
  "2,4-DB": "fenoxy",
  MCPA: "fenoxy",
  MCPP: "fenoxy",
  "AfwijkingBalans% (%AfwijkBalans)": "ionenbalans",
};

/**
 * De metalen van de VMM dragen een achtervoegsel voor de fractie: " t" voor het
 * totaalgehalte en " o" voor het opgeloste deel. Voor de duiding maakt dat niet
 * uit — arseen blijft arseen — dus die staart gaat eraf vóór het opzoeken.
 */
const METAALSTAM: Readonly<Record<string, ProfielId>> = {
  As: "arseen",
  Pb: "lood",
  Cd: "cadmium",
  Cr: "chroom",
  Ni: "nikkel",
  Cu: "koper",
  Zn: "zink",
  Hg: "kwikWater",
  Mn: "mangaan",
  Fe: "ijzer",
  Al: "aluminium",
  Sb: "antimoon",
  Ba: "barium",
  Be: "beryllium",
  B: "boor",
  Co: "kobalt",
  Mo: "molybdeen",
  Se: "seleen",
  Tl: "thallium",
  U: "uranium",
  V: "vanadium",
  Ag: "zilver",
  Sn: "tin",
  // Telluur en titaan komen mee in de scan; er is voor geen van beide een norm
  // en er is niets bijzonders over te melden dat specifiek genoeg is.
  Te: "sporenmetaal",
  Ti: "sporenmetaal",
};

/**
 * Symbolen die in twee lagen iets anders betekenen.
 *
 * "T" is bij IRCELINE de luchttemperatuur en bij de VMM de watertemperatuur.
 * Op één sleutel zetten zou bij het ene meetpunt stilzwijgend de verkeerde
 * uitleg tonen — een fout die niemand opmerkt, want er staat gewoon een
 * verhaal over temperatuur.
 */
const PER_LAAG: Readonly<Record<LaagId, Readonly<Record<string, ProfielId>>>> = {
  lucht: { T: "temperatuurLucht" },
  oppervlaktewater: { T: "temperatuurWater" },
  grondwater: {},
};

/** Duiding die voor een hele parametergroep van DOV opgaat. */
const GROEPEN: Readonly<Record<string, ProfielId>> = {
  "Pesticiden: actieve stoffen": "pesticiden",
  "Pesticiden: relevante metabolieten": "pesticiden",
  "Niet-relevante metabolieten van pesticiden": "nietRelevanteMetaboliet",
  Grondwater_chemisch_PFAS: "pfas",
  "Bacteriologische parameters": "fecaleBacterien",
  "Farmaceutische stoffen": "geneesmiddelen",
  "Organische verbindingen": "organisch",
};

/**
 * Pesticiden die we op naam herkennen in plaats van op een sleutel.
 *
 * DOV verzint per metaboliet een eigen schrijfwijze: "Metazachloor ESA
 * (479M08)", "metolachlor-OA", "Dimethenamid-ESA". Die allemaal opsommen is
 * dweilen; het patroon erachter is stabiel. Wat hier niet in past, valt terug
 * op de tekst van zijn parametergroep — dat blijft de vangnetlaag.
 */
const PESTICIDE_PATRONEN: readonly (readonly [RegExp, ProfielId])[] = [
  // De ESA- en OA-metabolieten van de chlooracetaniliden.
  [
    /(metolachlo|metazachlo|alachlo|acetochlo|dimethenamid|flufenacet|propachlo)\w*[\s-]*(esa|oa\b|479m)/i,
    "chlooracetanilideMetaboliet",
  ],
  // Desethyl-, desisopropyl- en verwante afbraak van de triazines.
  [/^des(ethyl|isopropyl|fenyl)|desethyl|desisopropyl/i, "triazineMetabolieten"],
  [/chloorthalonil|chlorothalonil/i, "chloorthalonilMetaboliet"],
  [/chloridazon/i, "chloridazon"],
  [/glyfosaat|glyphosate/i, "glyfosaat"],
  [/triazool|triazole/i, "triazool"],
  // Namen die per bron anders gespeld worden; het patroon is stabieler dan
  // een lijst met varianten als "S-Metolachlor" naast "S-Metolachloor".
  [/metolachlo|metazachlo|alachlo|acetochlo|propachlo|flufenacet|dimethenamid/i, "chlooracetanilide"],
  [/terbutryn|prometry|cyanazin|sebuthylazin|hexazinon|bromacil|metamitron|simetryn/i, "triazineOverig"],
  [/metoxuron|methabenzthiazuron|metobromuron|monolinuron|\buron\b|fenuron/i, "fenylureum"],
  [/mecoprop|dichloorprop|dichlorprop|fenoprop|mcpb|mcpa|2,4,?5-t|2,4-d|dicamba|fluroxypyr|tri(ch)?lorpyr|triclopyr/i, "groeistof"],
  [/carbendazim|benomyl|thiofanaat/i, "carbendazim"],
  [/chloorprop?harm|chloorprofam|chlorproph|carbetamide|profam/i, "carbamaat"],
  [/imidacloprid|thiamethoxam|clothianidin|acetamiprid|thiacloprid/i, "neonicotinoide"],
  [/dichloorpropeen|dibroom-3-chloorpropaan|broommethaan|chlooracrylzuur/i, "fumigant"],
  [/strobilurin|strobin|fluopicolide|boscalid|azoxystrobin/i, "fungicideModern"],
  [/pentachloorfenol|pentachlorophenol/i, "pentachloorfenol"],
  [/^pesticiden\s*totaal|som.*pesticiden/i, "somPesticiden"],
  [/phos\b|fos\b|triazophos|parathion|malathion|dimethoaat/i, "organofosfaat"],
];

/**
 * PFAS zijn met duizenden en krijgen geen tekst per stof. Dezelfde vorm als in
 * `categorieen.ts`: de code verraadt de familie.
 */
const PFAS_SYMBOOL =
  /^(PF[A-Z]|\d+:\d+[\s/]|[A-Za-z]*PFOS|[A-Za-z]*PFOA|HFPO|DONA|\d*Cl-PF|\d+H-PF|P\d+DMOA|Me?PF|Et?PF)/;
const PFAS_NAAM = /(perfluor|polyfluor|fluortelomeer|fluoroctaan|fluorbutaan)/i;

/**
 * De duiding bij een parameter, of niets wanneer we ze niet kennen.
 *
 * Niets teruggeven is hier het juiste antwoord. Een vage tekst die op elke stof
 * zou passen, wekt de indruk dat er iets uitgelegd is terwijl de lezer niets
 * wijzer wordt — en bij gezondheidsinformatie is dat erger dan zwijgen.
 */
/**
 * Haalt de variantaanduiding van een PFAS-symbool af.
 *
 * Dezelfde stof komt in vier gedaanten binnen. De VMM schrijft "PFOS totaal"
 * en "PFOS vertakt"; DOV plakt het aan elkaar tot "PFOStotal" en
 * "PFOSbranched", met in twee gevallen een tikfout ("PFHxSbranchedl"). Het
 * gaat telkens om perfluoroctaansulfonzuur, dus om dezelfde uitleg.
 *
 * Zonder dit zou alleen de kale vorm zijn eigen tekst krijgen en zouden de
 * varianten terugvallen op het familieverhaal — zonder dat iemand ziet dat er
 * een preciezere tekst bestond.
 */
export function pfasStam(symbool: string): string {
  return symbool
    .replace(/\s+(totaal|vertakt|lineair)$/i, "")
    .replace(/(total|branchedl?|linear)$/, "")
    .trim();
}

/**
 * De ene zin die bij een overschrijding in de tabel komt: wat er misgaat, niet
 * wat de stof is. Wie hier leest, weet al dát de norm overschreden is.
 *
 * Zonder eigen `kort` valt hij terug op de eerste zin van `risico`. Dat gaat
 * over het risico en is dus nooit naast de kwestie, maar het is een terugval en
 * geen ontwerp — vandaar dat de stoffen die in de praktijk overschrijden hun
 * eigen zin dragen.
 */
export function korteRisicozin(profiel: Stofprofiel): string | undefined {
  if (profiel.kort) return profiel.kort;
  const eerste = profiel.risico?.match(/^.*?[.!?](?=\s|$)/)?.[0];
  return eerste ?? profiel.risico;
}

export function stofprofiel(
  parameter: Pick<ParameterSamenvatting, "symbool" | "omschrijving"> & { groep?: string },
  laag?: LaagId,
): Stofprofiel | undefined {
  const perLaag = laag ? PER_LAAG[laag][parameter.symbool] : undefined;
  if (perLaag) return PROFIELEN[perLaag];

  const direct = SLEUTELS[parameter.symbool];
  if (direct) return PROFIELEN[direct];

  // DOV schrijft "Atrazine (Atraz)": naam plus eigen code. Wie een stof onder
  // haar gewone naam opneemt, moet niet eerst die code achterhalen — anders
  // valt de tekst stil terug op de groep en merkt niemand dat de eigen,
  // preciezere uitleg nooit verschijnt.
  const zonderCode = parameter.symbool.replace(/\s*\([^()]*\)\s*$/, "");
  const opNaam = zonderCode === parameter.symbool ? undefined : SLEUTELS[zonderCode];
  if (opNaam) return PROFIELEN[opNaam];

  // "PFOS totaal" en "PFOSbranched" zijn allebei PFOS.
  const pfasVorm = pfasStam(parameter.symbool);
  const opPfasVorm = pfasVorm === parameter.symbool ? undefined : SLEUTELS[pfasVorm];
  if (opPfasVorm) return PROFIELEN[opPfasVorm];

  // Laatste redmiddel: de code tussen de haakjes achteraan. DOV's namen zijn
  // niet altijd netjes — "…(DONA)) (DONA)" heeft een haakje te veel en
  // "(EtPFOSAbranchedl) (EtPFOSAbranched)" een letter — waardoor het symbool
  // de hele naam blijft. De code zelf klopt dan nog wel.
  const code = parameter.symbool.match(/\(([^()]+)\)\s*$/)?.[1]?.trim();
  const opCode = code ? (SLEUTELS[code] ?? SLEUTELS[pfasStam(code)]) : undefined;
  if (opCode) return PROFIELEN[opCode];

  const metaalstam = parameter.symbool.match(/^(.+?) [to]$/)?.[1];
  const metaal = metaalstam ? METAALSTAM[metaalstam] : undefined;
  if (metaal) return PROFIELEN[metaal];

  if (PFAS_SYMBOOL.test(parameter.symbool) || PFAS_NAAM.test(parameter.omschrijving)) {
    return PROFIELEN.pfas;
  }

  for (const [patroon, id] of PESTICIDE_PATRONEN) {
    if (patroon.test(parameter.symbool) || patroon.test(parameter.omschrijving)) {
      return PROFIELEN[id];
    }
  }

  // Een niet-relevante metaboliet die we niet apart kennen, krijgt liever de
  // tekst over die beoordeling dan de algemene pesticidentekst: het verschil
  // tussen "relevant" en "niet-relevant" bepaalt of de norm van 0,1 µg/L geldt.
  const groep = parameter.groep ? GROEPEN[parameter.groep] : undefined;
  return groep ? PROFIELEN[groep] : undefined;
}
