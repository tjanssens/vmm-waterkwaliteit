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
    wat: "Ozon op leefniveau — hetzelfde gas dat hoog in de atmosfeer beschermt, maar hier beneden een probleem is.",
    herkomst:
      "Wordt niet uitgestoten maar gevormd: stikstofoxiden en vluchtige organische stoffen reageren onder zonlicht. Vandaar dat de hoogste waarden op warme, zonnige zomerdagen vallen, en eerder buiten de stad dan erin.",
    risico:
      "Prikkelt de luchtwegen en vermindert de longfunctie, vooral bij inspanning buiten. Tijdens zomersmogperiodes stijgt het aantal luchtwegklachten en sterfgevallen. Ozon beschadigt daarnaast gewassen en bossen.",
    bronnen: ["whoLucht", "eea"],
  },
  so2: {
    wat: "Een scherp ruikend gas dat ontstaat bij het verbranden van zwavelhoudende brandstof.",
    herkomst:
      "Industrie, raffinaderijen en scheepvaart. In Vlaanderen sterk gedaald sinds zwavel uit brandstoffen is gehaald.",
    risico:
      "Prikkelt de luchtwegen en kan bij astmapatiënten binnen minuten een aanval uitlokken. Draagt ook bij aan verzuring van bodem en water.",
    bronnen: ["whoLucht"],
  },
  co: {
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
    wat: "Zwevende deeltjes kleiner dan 2,5 micrometer — ongeveer dertig keer dunner dan een haar.",
    herkomst:
      "Verkeer, houtstook, industrie en landbouw. Een groot deel ontstaat pas in de lucht zelf, wanneer ammoniak uit de landbouw reageert met stikstof- en zwaveloxiden.",
    risico:
      "Klein genoeg om tot in de longblaasjes en het bloed te dringen. Hangt samen met hart- en vaatziekten, longziekten en longkanker, en is van alle luchtvervuiling de grootste oorzaak van vroegtijdige sterfte. Er is geen concentratie waaronder geen effect meer optreedt.",
    bronnen: ["whoLucht", "whoLuchtvervuiling"],
  },
  pm10: {
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
    wat: "Ammoniak, een scherp ruikend stikstofgas.",
    herkomst: "Overwegend landbouw: mest in stallen en op het land.",
    risico:
      "Reageert in de lucht tot fijne deeltjes en levert zo een flink deel van de PM2,5. Slaat daarnaast neer op natuurgebieden, waar de stikstof de bodem verrijkt en soorten verdringt die van schrale grond leven.",
    bronnen: ["eea", "vmmLucht"],
  },
  kwikGas: {
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
    wat: "De hoeveelheid zuurstof die in het water is opgelost.",
    herkomst:
      "Komt uit de lucht en uit waterplanten en algen. Verdwijnt wanneer bacteriën organisch materiaal afbreken, en warm water houdt minder zuurstof vast dan koud.",
    risico:
      "De belangrijkste levensvoorwaarde in een waterloop. Zakt de zuurstof te laag, dan sterven vissen en verdwijnt het bodemleven. Anders dan bij vrijwel alle andere parameters is hier een hoge waarde goed en een lage slecht.",
    bronnen: ["vmmWater"],
  },
  zuurstofverzadiging: {
    wat: "Hoeveel zuurstof het water bevat ten opzichte van wat er bij deze temperatuur in kán.",
    risico:
      "Ver boven honderd procent wijst op een algenbloei die overdag zuurstof produceert — 's nachts keert dat om en kan de zuurstof juist wegzakken.",
    bronnen: ["vmmWater"],
  },
  bzv: {
    wat: "Biochemisch zuurstofverbruik: hoeveel zuurstof bacteriën in vijf dagen opgebruiken om het aanwezige organisch materiaal af te breken.",
    herkomst: "Huishoudelijk afvalwater, mest en afspoeling van landbouwgrond.",
    risico:
      "Een maat voor de belasting met afbreekbaar vuil. Hoe hoger, hoe meer zuurstof er aan de waterloop onttrokken wordt.",
    bronnen: ["vmmWater"],
  },
  czv: {
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
    wat: "De meest voorkomende opgeloste vorm van stikstof in water.",
    herkomst:
      "Overwegend bemesting van landbouwgrond. Nitraat spoelt makkelijk uit de bodem en zakt door naar het grondwater, waar het jaren later nog opduikt.",
    risico:
      "Voedt algengroei in beken, rivieren en uiteindelijk de zee. In drinkwater is de norm gezet op zuigelingen: te veel nitraat verstoort het zuurstoftransport in hun bloed, wat methemoglobinemie of blauwezuchtsyndroom heet.",
    bronnen: ["whoDrinkwater", "vmmMest"],
  },
  nitriet: {
    wat: "Een tussenvorm in de omzetting van ammonium naar nitraat.",
    herkomst: "Ontstaat in het water zelf, en komt uit afvalwater.",
    risico:
      "Werkt op dezelfde manier als nitraat op het zuurstoftransport in het bloed, maar is daarin een stuk krachtiger; de norm ligt daarom veel lager. Ook giftig voor vissen.",
    bronnen: ["whoDrinkwater"],
  },
  ammonium: {
    wat: "De gereduceerde vorm van stikstof, kenmerkend voor water met weinig zuurstof.",
    herkomst: "Huishoudelijk afvalwater, mest en de afbraak van organisch materiaal.",
    risico:
      "Bij afbraak verbruikt ammonium zuurstof. Het staat bovendien in evenwicht met ammoniak, dat giftig is voor vissen — en dat evenwicht verschuift naar de giftige kant naarmate het water warmer en basischer is.",
    bronnen: ["vmmWater"],
  },
  stikstofTotaal: {
    wat: "Alle stikstofvormen samen: nitraat, nitriet, ammonium en de stikstof die in organisch materiaal vastzit.",
    herkomst: "Landbouw, afvalwater en neerslag van stikstof uit de lucht.",
    risico:
      "De maat waarop het beleid tegen vermesting stuurt. Te veel stikstof leidt tot algenbloei, zuurstoftekort en soortenverlies.",
    bronnen: ["vmmMest"],
  },
  fosfaat: {
    wat: "De opgeloste vorm van fosfor die planten en algen direct kunnen opnemen.",
    herkomst: "Mest, afvalwater en historisch ook wasmiddelen.",
    risico:
      "In zoet water is fosfor meestal de stof die de groei begrenst: een klein beetje extra volstaat om een algenbloei op gang te brengen. Die algen ontnemen het water later zijn zuurstof.",
    bronnen: ["vmmMest"],
  },
  fosforTotaal: {
    wat: "Alle fosfor samen, opgelost én gebonden aan zwevend materiaal.",
    herkomst: "Mest, afvalwater en erosie van landbouwgrond.",
    risico:
      "Fosfor die aan bodemdeeltjes gebonden is, komt later alsnog vrij. Daarom is dit totaal een betere maat voor de lange termijn dan het opgeloste fosfaat alleen.",
    bronnen: ["vmmMest"],
  },

  // ---- water: algemeen fysisch-chemisch ----
  zuurtegraad: {
    wat: "De zuurtegraad van het water, op een schaal van 0 tot 14.",
    herkomst: "Bepaald door de bodem, door algengroei en door lozingen.",
    risico:
      "Waterleven verdraagt maar een beperkt bereik. De zuurtegraad stuurt bovendien hoe giftig andere stoffen zijn: ammonium wordt schadelijker naarmate het water basischer is, en metalen lossen juist beter op in zuur water.",
    bronnen: ["vmmWater"],
  },
  temperatuurWater: {
    wat: "De temperatuur van het water.",
    herkomst: "Weer en seizoen, en plaatselijk lozingen van koelwater.",
    risico:
      "Warm water bevat minder zuurstof en versnelt tegelijk de afbraakprocessen die zuurstof verbruiken. Koudeminnende soorten verdwijnen als het structureel warmer wordt.",
    bronnen: ["vmmWater"],
  },
  geleidbaarheid: {
    wat: "Hoe goed het water stroom geleidt — een maat voor de hoeveelheid opgeloste zouten.",
    herkomst: "Natuurlijk uit de ondergrond; daarnaast wegenzout, lozingen en zeewaterinvloed.",
    risico:
      "Op zich geen gifstof, maar een snelle aanwijzing dat er iets in het water zit. Een plotse sprong wijst op een lozing of op indringend zout water.",
    bronnen: ["vmmWater"],
  },
  chloride: {
    wat: "Het zoutbestanddeel dat het water brak maakt.",
    herkomst: "Zeewater, strooizout, en lozingen van industrie.",
    risico:
      "Zoet water met veel chloride verliest zijn soorten. In drinkwater vooral een smaakkwestie; de norm is daarop gezet, niet op giftigheid.",
    bronnen: ["whoDrinkwater"],
  },
  sulfaat: {
    wat: "Een zoutbestanddeel dat van nature in de bodem voorkomt.",
    herkomst: "Uitspoeling van de ondergrond, bemesting en industrie.",
    risico:
      "In hoge concentraties werkt sulfaat laxerend en smaakt het water bitter. In waterbodems zet sulfaat bovendien processen in gang die fosfaat losmaken, wat de vermesting versterkt.",
    bronnen: ["whoDrinkwater"],
  },
  zwevendeStof: {
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
    wat: "Een halfmetaal dat van nature in de ondergrond zit.",
    herkomst:
      "Vooral natuurlijk, uit gesteente en bodemlagen; daarnaast uit oude houtverduurzaming en industrie. In grondwater kan het zonder menselijk toedoen hoog liggen.",
    risico:
      "De WHO noemt langdurige blootstelling via drinkwater de grootste bedreiging: het geeft huidafwijkingen en verhoogt het risico op kanker van blaas, longen en huid. De richtwaarde van 10 µg/L is uitdrukkelijk voorlopig, omdat lager zuiveren technisch moeilijk is — niet omdat het veilig zou zijn.",
    bronnen: ["whoArseen", "whoDrinkwater"],
  },
  lood: {
    wat: "Een zwaar metaal dat vroeger volop in leidingen, verf en benzine zat.",
    herkomst:
      "Oude loden waterleidingen en huisaansluitingen, historische bodemvervuiling en industrie. Sinds lood uit benzine verdween, is de blootstelling via lucht sterk gedaald.",
    risico:
      "De WHO stelt dat er geen blootstellingsniveau bekend is dat zonder schadelijk effect is. Bij kinderen tast lood de hersenontwikkeling blijvend aan, met een lager IQ en gedragsproblemen tot gevolg; bij volwassenen verhoogt het de bloeddruk en belast het de nieren. Kinderen nemen vier tot vijf keer meer op van eenzelfde hoeveelheid dan volwassenen.",
    bronnen: ["whoLood", "whoDrinkwater"],
  },
  cadmium: {
    wat: "Een zwaar metaal dat zich in het lichaam opstapelt.",
    herkomst:
      "Kunstmest, zinkindustrie, batterijen en historische vervuiling. In de Kempen zit het van oudsher in de bodem door de zinkfabrieken.",
    risico:
      "Hoopt zich tientallen jaren op in de nieren en beschadigt die op termijn. Verzwakt ook de botten. Het IARC classificeert cadmium als kankerverwekkend voor de mens.",
    bronnen: ["whoDrinkwater", "iarc"],
  },
  chroom: {
    wat: "Een metaal dat in twee vormen voorkomt, met heel verschillende gevaren.",
    herkomst: "Metaalbewerking, leerlooierij, verf en roestvast staal.",
    risico:
      "Driewaardig chroom is een noodzakelijk spoorelement; zeswaardig chroom is kankerverwekkend bij inademing. Een analyse van totaal chroom maakt dat onderscheid niet, en de norm gaat daarom uit van het ongunstigste geval.",
    bronnen: ["whoDrinkwater", "iarc"],
  },
  nikkel: {
    wat: "Een metaal dat veel in legeringen en kranen wordt gebruikt.",
    herkomst: "Kraanwerk en leidingen, metaalindustrie en natuurlijke ondergrond.",
    risico:
      "De bekendste reactie is contactallergie. Wie daarvoor gevoelig is, kan ook via drinkwater klachten krijgen. Het eerste water uit een kraan die lang stilstond bevat er het meest van.",
    bronnen: ["whoDrinkwater"],
  },
  koper: {
    wat: "Een metaal dat het lichaam in kleine hoeveelheden nodig heeft.",
    herkomst: "Koperen waterleidingen, en in landbouwgebied ook gewasbescherming en veevoeder.",
    risico:
      "In het drinkwater vooral een smaak- en maagkwestie bij hoge gehalten. In oppervlaktewater is koper wél problematisch: het is giftig voor waterorganismen bij concentraties die voor mensen onschadelijk zijn.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  zink: {
    wat: "Een metaal dat het lichaam als spoorelement nodig heeft.",
    herkomst: "Gegalvaniseerd metaal, dakgoten, banden en historische zinkindustrie.",
    risico:
      "Voor mensen weinig problematisch — de norm gaat over smaak. Voor waterorganismen is zink wel schadelijk, en in de Kempen is de bodem er van oudsher mee belast.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  kwikWater: {
    wat: "Een zwaar metaal dat zich opstapelt in de voedselketen.",
    herkomst: "Industrie, afvalverbranding en historische vervuiling.",
    risico:
      "Bacteriën zetten kwik in waterbodems om in methylkwik, dat zich ophoopt in vis en zo bij de mens terechtkomt. Het tast het zenuwstelsel aan en is het gevaarlijkst voor het ongeboren kind. Daarom slaat de norm voor oppervlaktewater op wat er in vis zit, niet enkel op wat er in het water drijft.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  mangaan: {
    wat: "Een metaal dat vrijwel overal in de ondergrond zit.",
    herkomst:
      "Vrijwel altijd natuurlijk. In grondwater zonder zuurstof lost mangaan makkelijk op, waardoor het daar hoog kan liggen zonder dat er iets vervuild is.",
    risico:
      "Geeft bruinzwarte aanslag en een metaalsmaak; daarop is de gebruikelijke drinkwaternorm gezet. Bij zeer hoge en langdurige inname zijn effecten op het zenuwstelsel beschreven. De VLAREM-norm voor grondwater ligt bewust een stuk hoger dan die voor drinkwater, omdat grondwater nog gezuiverd wordt.",
    bronnen: ["whoDrinkwater"],
  },
  ijzer: {
    wat: "Een van de meest voorkomende metalen in de bodem.",
    herkomst: "Vrijwel altijd natuurlijk, en net als mangaan goed oplosbaar in zuurstofarm grondwater.",
    risico:
      "Geen gezondheidsrisico bij de gehalten die in water voorkomen. Het geeft roestbruine verkleuring, vlekken op wasgoed en een metaalsmaak.",
    bronnen: ["whoDrinkwater"],
  },
  aluminium: {
    wat: "Het meest voorkomende metaal in de aardkorst.",
    herkomst:
      "Natuurlijk uit klei en bodem. Lost sterker op naarmate het water zuurder is, wat het aan verzuring koppelt. Wordt ook gebruikt bij de zuivering van drinkwater.",
    risico:
      "In zuur water is opgelost aluminium giftig voor vissen — het beschadigt hun kieuwen. Voor mensen is de drinkwaternorm gebaseerd op de zuiveringstechniek en op verkleuring, niet op een aangetoond gezondheidseffect.",
    bronnen: ["whoDrinkwater"],
  },

  antimoon: {
    wat: "Een halfmetaal dat lijkt op arseen, maar minder giftig is.",
    herkomst: "Soldeer, legeringen, brandvertragers en de productie van kunststof flessen.",
    risico:
      "Bij hoge inname maag- en darmklachten. De drinkwaternorm is in de huidige richtlijn versoepeld van 5 naar 10 µg/L, op basis van herzien onderzoek.",
    bronnen: ["whoDrinkwater"],
  },
  barium: {
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
    wat: "Een spoorelement dat noodzakelijk is, maar met een smalle marge tussen te weinig en te veel.",
    herkomst: "Natuurlijk uit gesteente; daarnaast verbranding en industrie.",
    risico:
      "Overmaat geeft haaruitval, broze nagels en zenuwklachten. De drinkwaternorm ging in de huidige richtlijn van 10 naar 20 µg/L.",
    bronnen: ["whoDrinkwater"],
  },
  thallium: {
    wat: "Een zwaar metaal dat vroeger als rattengif werd gebruikt.",
    herkomst: "Verbranding van steenkool, cementproductie en metaalwinning.",
    risico:
      "Zeer giftig bij inname: het tast het zenuwstelsel aan en veroorzaakt haaruitval. In water komt het gelukkig zelden in meetbare hoeveelheden voor.",
    bronnen: ["whoDrinkwater"],
  },
  uranium: {
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
    wat: "Bacteriën die van nature in de darm van mens en dier leven.",
    herkomst:
      "Ongezuiverd huishoudelijk afvalwater, overstorten bij hevige regen, mest en watervogels.",
    risico:
      "Ze maken zelf meestal niemand ziek, maar verraden dat er uitwerpselen in het water zitten — en daarmee mogelijk ziekteverwekkers die veel moeilijker te meten zijn. Dit is de reden dat zwemwater in de zomer wordt opgevolgd.",
    bronnen: ["whoDrinkwater"],
  },

  // ---- PFAS en pesticiden ----
  pfas: {
    wat: "Een familie van duizenden door de mens gemaakte fluorverbindingen, bekend als de eeuwige chemicaliën omdat ze in de natuur nauwelijks afbreken.",
    herkomst:
      "Antiaanbaklagen, waterafstotende kleding, verpakkingen, en vooral blusschuim — dat laatste is de oorzaak van de bekendste vervuilingen in Vlaanderen.",
    risico:
      "EFSA stelde in 2020 een gezamenlijke tolereerbare inname vast van 4,4 nanogram per kilogram lichaamsgewicht per week voor vier PFAS samen. Doorslaggevend daarbij was niet kanker of cholesterol, maar dat het afweersysteem minder goed reageert op vaccinatie. PFAS stapelen zich op in het lichaam en verlaten het maar traag.",
    bronnen: ["efsaPfas", "whoDrinkwater"],
  },
  pesticiden: {
    wat: "Stoffen om onkruid, insecten of schimmels te bestrijden, en de resten waarin ze in de bodem uiteenvallen.",
    herkomst:
      "Landbouw, en daarnaast openbaar groen, spoorwegen en particuliere tuinen. Metabolieten kunnen nog jaren opduiken nadat een middel verboden is.",
    risico:
      "De norm van 0,1 µg/L per stof is geen gezondheidsgrens maar een beleidskeuze: bestrijdingsmiddelen horen niet in drinkwater thuis, ongeacht welke. Wat een concrete overschrijding betekent, verschilt sterk van stof tot stof.",
    bronnen: ["whoDrinkwater"],
  },
  atrazine: {
    wat: "Een onkruidbestrijder die decennialang in de maïsteelt werd gebruikt.",
    herkomst:
      "In de Europese Unie sinds 2004 niet meer toegelaten. Wat er nu nog gemeten wordt, is een erfenis: atrazine breekt traag af en zakt langzaam door naar het grondwater.",
    risico:
      "Verstoort de hormoonhuishouding van waterdieren; bij amfibieën is dat het uitvoerigst beschreven. Dat het twintig jaar na het verbod nog opduikt, laat zien hoe traag grondwater zich herstelt.",
    bronnen: ["whoDrinkwater"],
  },

  geneesmiddelen: {
    wat: "Resten van medicijnen en hun afbraakproducten.",
    herkomst:
      "Wat mensen en dieren innemen, verlaat het lichaam grotendeels weer. Waterzuivering is er niet op gebouwd deze stoffen te verwijderen, dus komen ze via het riool in het water terecht. Ook mest van behandeld vee draagt bij.",
    risico:
      "De aangetroffen gehalten liggen ver onder een medicinale dosis. De zorg gaat over blootstelling van waterleven gedurende het hele leven, en over resten van antibiotica, die resistentie in de hand kunnen werken. Voor de meeste van deze stoffen bestaat nog geen norm.",
    bronnen: ["whoDrinkwater", "vmmWater"],
  },
  organisch: {
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
  PFOS: "pfas",
  PFOA: "pfas",

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
  Atrazine: "atrazine",
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
  "Niet-relevante metabolieten van pesticiden": "pesticiden",
  Grondwater_chemisch_PFAS: "pfas",
  "Bacteriologische parameters": "fecaleBacterien",
  "Farmaceutische stoffen": "geneesmiddelen",
  "Organische verbindingen": "organisch",
};

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

  const stam = parameter.symbool.match(/^(.+?) [to]$/)?.[1];
  const metaal = stam ? METAALSTAM[stam] : undefined;
  if (metaal) return PROFIELEN[metaal];

  if (PFAS_SYMBOOL.test(parameter.symbool) || PFAS_NAAM.test(parameter.omschrijving)) {
    return PROFIELEN.pfas;
  }

  const groep = parameter.groep ? GROEPEN[parameter.groep] : undefined;
  return groep ? PROFIELEN[groep] : undefined;
}
