import type { Oordeel, ParameterSamenvatting } from "./types.js";

/**
 * Waar de drempelwaarden vandaan komen. Elke norm verwijst naar één bron,
 * zodat het rapport nooit een getal toont zonder herkomst.
 */
export const BRONNEN = {
  vlarem: {
    naam: "VLAREM II, bijlage 2.3.1, basismilieukwaliteitsnormen oppervlaktewater",
    url: "https://navigator.emis.vito.be/detail?woId=10071",
  },
  vlaremGevaarlijk: {
    naam: "VLAREM II, bijlage 2.3.1, milieukwaliteitsnormen gevaarlijke stoffen",
    url: "https://navigator.emis.vito.be/detail?woId=10071",
  },
  drinkwater: {
    naam: "Richtlijn (EU) 2020/2184 over water bestemd voor menselijke consumptie, bijlage I",
    url: "https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32020L2184",
  },
  luchtEu: {
    naam:
      "Richtlijn 2008/50/EG betreffende de luchtkwaliteit en schonere lucht voor Europa, bijlagen VII, XI en XIV",
    url: "https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32008L0050",
  },
  luchtWho: {
    naam: "WHO global air quality guidelines (2021): tabel 0.1, aanbevolen AQG-waarden",
    url: "https://www.who.int/publications/i/item/9789240034228",
  },
  vlaremGrondwater: {
    naam: "VLAREM II, bijlage 2.4.1, milieukwaliteitsnormen voor grondwater",
    url: "https://navigator.emis.vito.be/mijn-navigator?woId=10076",
  },
  wac: {
    naam:
      "WAC/I/A/005, Monstername van water via een peilput (Compendium voor de monsterneming, meting en analyse van water, versie mei 2019), §5.4.4.1",
    url: "https://reflabos.vito.be/2020/WAC_I_A_005.pdf",
  },
  drinkwaterVlaanderen: {
    naam:
      "Kwaliteitseisen van het drinkwater (VMM, oktober 2024), bijlage I van het Vlaamse drinkwaterbesluit van 20 januari 2023",
    url: "https://vmm.vlaanderen.be/beleid/waterbeleid/drinkwater/kwaliteit",
  },
} as const;

export type BronId = keyof typeof BRONNEN;

/** Welke normen we tegen de metingen leggen. */
export type Normenset = "oppervlaktewater" | "drinkwater" | "lucht-eu" | "lucht-who" | "grondwater" | "grondwater-vlarem";

/**
 * De periode waarover het gemiddelde genomen wordt waarop een norm slaat.
 * Bij water is dat altijd het meetjaar en staat het er niet bij; bij lucht is
 * het wezenlijk: een jaargrenswaarde zegt niets over een week metingen.
 */
export type Middeling = "8-uur" | "dag" | "jaar";

/**
 * Hoeveel dagen het getoonde venster beslaat. Nodig om te bepalen of een
 * norm überhaupt toetsbaar is op wat er in beeld staat.
 */
export interface Venster {
  dagen: number;
}

/** Vanaf hoeveel dagen we een venster een jaar durven noemen. */
const JAAR_DREMPEL = 300;

export const NORMENSETTEN: Readonly<Record<Normenset, { naam: string; uitleg: string }>> = {
  oppervlaktewater: {
    naam: "Oppervlaktewater",
    uitleg:
      "De milieukwaliteitsnormen die voor deze waterloop zelf gelden. Dit is de toetsing die hoort bij een meetpunt in een beek of rivier.",
  },
  "grondwater-vlarem": {
    naam: "Grondwaternormen",
    uitleg:
      "De milieukwaliteitsnormen die voor het grondwater zelf gelden, uit VLAREM II. Dit is de toetsing die bij een grondwaterfilter hoort; de wet noemt ze richtwaarden.",
  },
  grondwater: {
    naam: "Drinkwaternormen",
    uitleg:
      "Grondwater vergeleken met de normen voor kraantjeswater. Wie een eigen put heeft, drinkt dit water of geeft het aan zijn dieren, dus die vergelijking is hier zinnig. Streng blijft ze wel: de norm geldt aan de kraan, ná zuivering, en onbehandeld grondwater hoeft er niet aan te voldoen.",
  },
  "lucht-eu": {
    naam: "EU-grenswaarden",
    uitleg:
      "De Europese grenswaarden voor luchtkwaliteit. Een deel ervan geldt op het jaargemiddelde; over een korter venster valt daar niets zinnigs over te zeggen.",
  },
  "lucht-who": {
    naam: "WHO-advieswaarden",
    uitleg:
      "De advieswaarden van de Wereldgezondheidsorganisatie uit 2021. Fors strenger dan de Europese grenswaarden, en geen wetgeving: niemand is verplicht ze te halen. Ze laten zien wat gezondheidskundig wenselijk is.",
  },
  drinkwater: {
    naam: "Drinkwater",
    uitleg:
      "De normen voor kraantjeswater, ter vergelijking. Let op: deze gelden voor water aan de kraan, ná zuivering. Een waterloop is geen drinkwater en hoeft hier niet aan te voldoen, de vergelijking geeft alleen een gevoel voor de grootte-orde.",
  },
};

export interface Norm {
  /** Hieronder is problematisch (zuurstof). */
  ondergrens?: number;
  /** Hierboven is problematisch (fosfor). */
  bovengrens?: number;
  /**
   * Sommige normen verschillen per waterlooptype. Dan is `bovengrens` het
   * soepelste eind en dit het strengste; daartussen hangt het oordeel af van
   * het type, dat wij niet kennen.
   */
  strengsteBovengrens?: number;
  /** Eenheid waarin de norm geldt, exact zoals de databank hem schrijft. */
  eenheid: string;
  /** Weergave in de normkolom. */
  label: string;
  /** Op welke statistiek de norm slaat. */
  toets: string;
  bron: BronId;
  /**
   * Middelingstijd. Staat die op "jaar", dan is de norm alleen zinvol te
   * toetsen wanneer het venster ook ongeveer een jaar beslaat.
   */
  middeling?: Middeling;
  /**
   * Aantal overschrijdingen dat per kalenderjaar is toegestaan. Zo'n norm is
   * geen drempel op een gemiddelde maar een telling, en die kunnen wij op een
   * willekeurig venster niet eerlijk uitvoeren.
   */
  toegestaneOverschrijdingen?: number;
}

const OPPERVLAKTEWATER: Readonly<Record<string, Norm>> = {
  // --- zuurstofhuishouding ---
  "O2": {
    ondergrens: 6,
    eenheid: "mg/L",
    label: "≥ 6 mg/L",
    toets: "10-percentiel",
    bron: "vlarem",
  },
  "BZV5": {
    bovengrens: 6,
    eenheid: "mgO2/L",
    label: "≤ 6 mgO₂/L",
    toets: "90-percentiel",
    bron: "vlarem",
  },
  "CZV": {
    bovengrens: 30,
    eenheid: "mgO2/L",
    label: "≤ 30 mgO₂/L",
    toets: "90-percentiel",
    bron: "vlarem",
  },

  // --- nutriënten ---
  "N t": {
    bovengrens: 4,
    eenheid: "mgN/L",
    label: "≤ 4 mgN/L",
    toets: "zomerhalfjaargemiddelde",
    bron: "vlarem",
  },
  "NO3-": {
    bovengrens: 10,
    strengsteBovengrens: 5.65,
    eenheid: "mgN/L",
    label: "≤ 5,65 – 10 mgN/L",
    toets: "90-percentiel, afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "KjN": {
    bovengrens: 6,
    eenheid: "mgN/L",
    label: "≤ 6 mgN/L",
    toets: "90-percentiel",
    bron: "vlarem",
  },
  "oPO4 f": {
    bovengrens: 0.14,
    strengsteBovengrens: 0.07,
    eenheid: "mgP/L",
    label: "≤ 0,07 – 0,14 mgP/L",
    toets: "gemiddelde, afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "P t": {
    bovengrens: 0.14,
    eenheid: "mgP/L",
    label: "≤ 0,14 mgP/L",
    toets: "zomerhalfjaargemiddelde",
    bron: "vlarem",
  },

  // --- algemeen fysisch-chemisch ---
  "pH": {
    ondergrens: 5.5,
    bovengrens: 9,
    eenheid: "-",
    label: "5,5 – 9,0",
    toets: "afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "T": {
    bovengrens: 25,
    eenheid: "°C",
    label: "≤ 25 °C",
    toets: "maximum",
    bron: "vlarem",
  },
  "EC 20": {
    bovengrens: 1000,
    strengsteBovengrens: 600,
    eenheid: "µS/cm",
    label: "≤ 600 – 1000 µS/cm",
    toets: "90-percentiel, afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "Cl-": {
    bovengrens: 200,
    strengsteBovengrens: 120,
    eenheid: "mg/L",
    label: "≤ 120 – 200 mg/L",
    toets: "90-percentiel, afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "SO4=": {
    bovengrens: 150,
    strengsteBovengrens: 90,
    eenheid: "mg/L",
    label: "≤ 90 – 150 mg/L",
    toets: "gemiddelde, afhankelijk van het waterlooptype",
    bron: "vlarem",
  },
  "ZS": {
    bovengrens: 50,
    eenheid: "mg/L",
    label: "≤ 50 mg/L",
    toets: "90-percentiel",
    bron: "vlarem",
  },

  // --- gevaarlijke stoffen ---
  // De databank rapporteert PFOS in ng/L; de norm staat in VLAREM als
  // 0,00065 µg/L, wat hetzelfde is als 0,65 ng/L.
  "PFOS": {
    bovengrens: 0.65,
    eenheid: "ng/L",
    label: "≤ 0,65 ng/L",
    toets: "jaargemiddelde (JG-MKN)",
    bron: "vlaremGevaarlijk",
  },
};

/**
 * Drinkwaternormen gelden aan de kraan. Ze staan hier ter vergelijking, niet
 * als eis aan een waterloop.
 *
 * Waar de richtlijn een andere chemische vorm hanteert dan de databank, is de
 * waarde omgerekend en staat de omrekening in het label.
 */
const DRINKWATER: Readonly<Record<string, Norm>> = {
  // Nitraat: 50 mg NO3/L ÷ 4,4266 (massaverhouding NO3/N) = 11,3 mg N/L.
  "NO3-": {
    bovengrens: 11.3,
    eenheid: "mgN/L",
    label: "≤ 11,3 mgN/L (= 50 mg NO₃/L)",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  // Nitriet: 0,50 mg NO2/L ÷ 3,2845 = 0,152 mg N/L.
  "NO2-": {
    bovengrens: 0.152,
    eenheid: "mgN/L",
    label: "≤ 0,152 mgN/L (= 0,50 mg NO₂/L)",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  // Ammonium: 0,50 mg NH4/L ÷ 1,2878 = 0,388 mg N/L.
  "NH4+": {
    bovengrens: 0.388,
    eenheid: "mgN/L",
    label: "≤ 0,388 mgN/L (= 0,50 mg NH₄/L)",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  // De Vlaamse tabel noemt zowel "> 6,5 en < 9,2" als "≥ 6,5 en ≤ 9,5"; we
  // nemen de ruimste, die ook in de Europese richtlijn staat. Vlaams
  // oppervlaktewater komt nergens in de buurt van die bovengrens, dus het
  // verschil verandert geen enkel oordeel.
  "pH": {
    ondergrens: 6.5,
    bovengrens: 9.5,
    eenheid: "-",
    label: "6,5 – 9,5",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "EC 20": {
    bovengrens: 2500,
    eenheid: "µS/cm",
    label: "≤ 2500 µS/cm",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Cl-": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "SO4=": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },

  // Metalen: de drinkwaternorm slaat op het totaalgehalte in het monster,
  // en dat is precies wat de databank rapporteert.
  "Sb t": { bovengrens: 10, eenheid: "µg/L", label: "≤ 10 µg/L", toets: "parameterwaarde", bron: "drinkwater" },
  "As t": { bovengrens: 10, eenheid: "µg/L", label: "≤ 10 µg/L", toets: "parameterwaarde", bron: "drinkwater" },
  "B t": { bovengrens: 1500, eenheid: "µg/L", label: "≤ 1500 µg/L (= 1,5 mg/L)", toets: "parameterwaarde", bron: "drinkwater" },
  "Cd t": { bovengrens: 5, eenheid: "µg/L", label: "≤ 5,0 µg/L", toets: "parameterwaarde", bron: "drinkwater" },
  // Vanaf 12 januari 2036 wordt de norm 25 µg/L; tot dan geldt 50.
  "Cr t": { bovengrens: 50, eenheid: "µg/L", label: "≤ 50 µg/L (wordt 25 in 2036)", toets: "parameterwaarde", bron: "drinkwater" },
  "Cu t": { bovengrens: 2000, eenheid: "µg/L", label: "≤ 2000 µg/L (= 2,0 mg/L)", toets: "parameterwaarde", bron: "drinkwater" },
  // Vanaf 12 januari 2036 wordt de norm 5 µg/L; tot dan geldt 10.
  "Pb t": { bovengrens: 10, eenheid: "µg/L", label: "≤ 10 µg/L (wordt 5 in 2036)", toets: "parameterwaarde", bron: "drinkwater" },
  "Ni t": { bovengrens: 20, eenheid: "µg/L", label: "≤ 20 µg/L", toets: "parameterwaarde", bron: "drinkwater" },
  "Se t": { bovengrens: 20, eenheid: "µg/L", label: "≤ 20 µg/L", toets: "parameterwaarde", bron: "drinkwater" },
  "Hg t": { bovengrens: 1, eenheid: "µg/L", label: "≤ 1,0 µg/L", toets: "parameterwaarde", bron: "drinkwaterVlaanderen" },
  "U t": { bovengrens: 30, eenheid: "µg/L", label: "≤ 30 µg/L", toets: "parameterwaarde", bron: "drinkwaterVlaanderen" },
  "Fe t": { bovengrens: 200, eenheid: "µg/L", label: "≤ 200 µg/L", toets: "indicatorparameter", bron: "drinkwater" },
  "Mn t": { bovengrens: 50, eenheid: "µg/L", label: "≤ 50 µg/L", toets: "indicatorparameter", bron: "drinkwater" },
  "Al t": { bovengrens: 200, eenheid: "µg/L", label: "≤ 200 µg/L", toets: "indicatorparameter", bron: "drinkwaterVlaanderen" },
  // De leverancier streeft naar 200 µg/L bij de uitgang van de installatie.
  "Zn t": { bovengrens: 5000, eenheid: "µg/L", label: "≤ 5000 µg/L", toets: "indicatorparameter", bron: "drinkwaterVlaanderen" },
  "T": { bovengrens: 25, eenheid: "°C", label: "≤ 25 °C", toets: "indicatorparameter", bron: "drinkwaterVlaanderen" },

  // PFAS: 0,10 µg/L voor de som van twintig PFAS = 100 ng/L.
  "PFAS-20": {
    bovengrens: 100,
    eenheid: "ng/L",
    label: "≤ 100 ng/L (= 0,10 µg/L)",
    toets: "som van 20 PFAS, geldt vanaf 12 januari 2026",
    bron: "drinkwater",
  },
  // 0,50 µg/L voor PFAS totaal = 500 ng/L.
  "PFAS-43": {
    bovengrens: 500,
    eenheid: "ng/L",
    label: "≤ 500 ng/L (= 0,50 µg/L)",
    toets: "PFAS totaal, geldt vanaf 12 januari 2026",
    bron: "drinkwater",
  },

  "EColi": { bovengrens: 0, eenheid: "/100mL", label: "0 per 100 mL", toets: "parameterwaarde", bron: "drinkwater" },
  "IEntero": { bovengrens: 0, eenheid: "/100mL", label: "0 per 100 mL", toets: "parameterwaarde", bron: "drinkwater" },
};

/**
 * Grenswaarden uit richtlijn 2008/50/EG, bijlage XI (SO₂, NO₂, benzeen, CO,
 * PM10), bijlage XIV (PM2,5) en bijlage VII (ozon). Letterlijk overgenomen uit
 * de Nederlandse tekst op EUR-Lex en nagerekend tegen de tabel van IRCELINE.
 *
 * Twee dingen om in de gaten te houden. Ten eerste dragen deze normen een
 * middelingstijd: de jaargrenswaarde voor NO₂ zegt niets over een week
 * metingen. Ten tweede zijn de dag- en uurgrenswaarden geen drempel op een
 * gemiddelde maar een telling met een toegestaan aantal overschrijdingen,
 * die tonen we wel, maar we vellen er geen oordeel over.
 *
 * Richtlijn (EU) 2024/2881 verstrengt deze waarden, maar die gelden pas vanaf
 * 1 januari 2030. We toetsen aan wat vandaag geldt.
 */
const LUCHT_EU: Readonly<Record<string, Norm>> = {
  "NO2": {
    bovengrens: 40,
    eenheid: "µg/m³",
    label: "≤ 40 µg/m³ per jaar",
    toets: "jaargemiddelde; daarnaast geldt 200 µg/m³ per uur, maximaal 18 keer per jaar",
    middeling: "jaar",
    bron: "luchtEu",
  },
  "PM10": {
    bovengrens: 40,
    eenheid: "µg/m³",
    label: "≤ 40 µg/m³ per jaar",
    toets: "jaargemiddelde; daarnaast geldt 50 µg/m³ per dag, maximaal 35 keer per jaar",
    middeling: "jaar",
    bron: "luchtEu",
  },
  "PM2.5": {
    bovengrens: 25,
    eenheid: "µg/m³",
    label: "≤ 25 µg/m³ per jaar",
    toets: "jaargemiddelde",
    middeling: "jaar",
    bron: "luchtEu",
  },
  "C6H6": {
    bovengrens: 5,
    eenheid: "µg/m³",
    label: "≤ 5 µg/m³ per jaar",
    toets: "jaargemiddelde",
    middeling: "jaar",
    bron: "luchtEu",
  },
  "SO2": {
    bovengrens: 125,
    eenheid: "µg/m³",
    label: "≤ 125 µg/m³ per dag, max. 3× per jaar",
    toets: "daggemiddelde met een toegestaan aantal overschrijdingen",
    middeling: "dag",
    toegestaneOverschrijdingen: 3,
    bron: "luchtEu",
  },
  "O3": {
    bovengrens: 120,
    eenheid: "µg/m³",
    label: "≤ 120 µg/m³ (8 uur), max. 25 dagen per jaar",
    toets: "hoogste 8-uurgemiddelde van een dag, gemiddeld over drie jaar",
    middeling: "8-uur",
    toegestaneOverschrijdingen: 25,
    bron: "luchtEu",
  },
  "CO": {
    bovengrens: 10,
    eenheid: "mg/m³",
    label: "≤ 10 mg/m³ (8 uur)",
    toets: "hoogste 8-uurgemiddelde van een dag",
    middeling: "8-uur",
    bron: "luchtEu",
  },
};

/**
 * De advieswaarden van de Wereldgezondheidsorganisatie uit 2021, tabel 0.1.
 * Ze zijn fors strenger dan de Europese grenswaarden, PM2,5 mag jaarlijks
 * 5 in plaats van 25 µg/m³, en juist dat verschil maakt zichtbaar dat
 * "voldoet aan de EU-norm" niet hetzelfde is als "gezond".
 *
 * Dit zijn advieswaarden en geen wetgeving; niemand is ze verplicht te halen.
 *
 * De waarden voor 24 uur zijn 99-percentielen, wat neerkomt op 34
 * overschrijdingsdagen per jaar. Dat is een telling en geen drempel op een
 * gemiddelde, dus daar vellen we geen oordeel over.
 */
const LUCHT_WHO: Readonly<Record<string, Norm>> = {
  "PM2.5": {
    bovengrens: 5,
    eenheid: "µg/m³",
    label: "≤ 5 µg/m³ per jaar",
    toets: "jaargemiddelde; de EU-grenswaarde ligt op 25",
    middeling: "jaar",
    bron: "luchtWho",
  },
  "PM10": {
    bovengrens: 15,
    eenheid: "µg/m³",
    label: "≤ 15 µg/m³ per jaar",
    toets: "jaargemiddelde; de EU-grenswaarde ligt op 40",
    middeling: "jaar",
    bron: "luchtWho",
  },
  "NO2": {
    bovengrens: 10,
    eenheid: "µg/m³",
    label: "≤ 10 µg/m³ per jaar",
    toets: "jaargemiddelde; de EU-grenswaarde ligt op 40",
    middeling: "jaar",
    bron: "luchtWho",
  },
  "O3": {
    bovengrens: 100,
    eenheid: "µg/m³",
    label: "≤ 100 µg/m³ (8 uur, 99-percentiel)",
    toets: "hoogste 8-uurgemiddelde van een dag, 99-percentiel",
    middeling: "8-uur",
    toegestaneOverschrijdingen: 34,
    bron: "luchtWho",
  },
  "SO2": {
    bovengrens: 40,
    eenheid: "µg/m³",
    label: "≤ 40 µg/m³ per dag (99-percentiel)",
    toets: "daggemiddelde, 99-percentiel",
    middeling: "dag",
    toegestaneOverschrijdingen: 34,
    bron: "luchtWho",
  },
  "CO": {
    bovengrens: 4,
    eenheid: "mg/m³",
    label: "≤ 4 mg/m³ per dag (99-percentiel)",
    toets: "daggemiddelde, 99-percentiel",
    middeling: "dag",
    toegestaneOverschrijdingen: 34,
    bron: "luchtWho",
  },
};

/**
 * Grondwater getoetst aan de drinkwaternormen.
 *
 * Dat is hier een zinniger vergelijking dan bij een beek: wie een eigen put
 * heeft, drinkt dit water of geeft het aan zijn dieren. Streng blijft het wel,
 * de norm geldt aan de kraan, ná zuivering, en onbehandeld grondwater hoeft er
 * niet aan te voldoen.
 *
 * De waarden komen uit richtlijn (EU) 2020/2184, bijlage I, in de eenheid die
 * de richtlijn zelf hanteert. Anders dan bij oppervlaktewater is er dus geen
 * omrekening naar stikstof nodig: DOV rapporteert nitraat óók als NO₃.
 *
 * Wel omgerekend, omdat DOV daar in mg/l meet waar de richtlijn µg/L geeft:
 * ijzer, mangaan en aluminium.
 *
 * De sleutels zijn de parameternamen van DOV, inclusief hun eigen schrijfwijze
 * ("Ijzer", "Chloriden"). Wijkt die af, dan sluit de norm niet aan en toont de
 * app "geen norm", geen fout oordeel.
 */
const GRONDWATER: Readonly<Record<string, Norm>> = {
  "Nitraat (NO3)": {
    bovengrens: 50,
    eenheid: "mg/L",
    label: "≤ 50 mg/L",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Nitriet (NO2)": {
    bovengrens: 0.5,
    eenheid: "mg/L",
    label: "≤ 0,50 mg/L",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Ammonium (NH4)": {
    bovengrens: 0.5,
    eenheid: "mg/L",
    label: "≤ 0,50 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Sulfaat (SO4)": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Chloriden (Cl)": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Natrium (Na)": {
    bovengrens: 200,
    eenheid: "mg/L",
    label: "≤ 200 mg/L",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Zuurtegraad (pH)": {
    ondergrens: 6.5,
    bovengrens: 9.5,
    eenheid: "Sörensen",
    label: "6,5 – 9,5",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Elektrische geleidbaarheid (EC)": {
    bovengrens: 2500,
    eenheid: "µS/cm",
    label: "≤ 2500 µS/cm",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },

  // --- PFAS ---
  // DOV rekent de som van de twintig PFAS uit de drinkwaterrichtlijn zelf uit
  // en rapporteert die in ng/L; de richtlijn geeft 0,10 µg/L, wat 100 ng/L is.
  // Losse PFAS krijgen geen norm: de richtlijn stelt er geen per stof, alleen
  // op de som.
  "PFAS (EU DWRL-20)": {
    bovengrens: 100,
    eenheid: "ng/L",
    label: "≤ 100 ng/L (= 0,10 µg/L)",
    toets: "som van de twintig PFAS uit de drinkwaterrichtlijn",
    bron: "drinkwater",
  },

  // --- metalen, in de eenheid waarin DOV ze rapporteert ---
  "Arseen (As)": {
    bovengrens: 10,
    eenheid: "µg/L",
    label: "≤ 10 µg/L",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Cadmium (Cd)": {
    bovengrens: 5,
    eenheid: "µg/L",
    label: "≤ 5,0 µg/L",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  // Vanaf 12 januari 2036 wordt de norm 25 µg/L; tot dan geldt 50.
  "Chroom (Cr)": {
    bovengrens: 50,
    eenheid: "µg/L",
    label: "≤ 50 µg/L (wordt 25 in 2036)",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Koper (Cu)": {
    bovengrens: 2000,
    eenheid: "µg/L",
    label: "≤ 2000 µg/L (= 2,0 mg/L)",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  // Vanaf 12 januari 2036 wordt de norm 5 µg/L; tot dan geldt 10.
  "Lood (Pb)": {
    bovengrens: 10,
    eenheid: "µg/L",
    label: "≤ 10 µg/L (wordt 5 in 2036)",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Nikkel (Ni)": {
    bovengrens: 20,
    eenheid: "µg/L",
    label: "≤ 20 µg/L",
    toets: "parameterwaarde",
    bron: "drinkwater",
  },
  "Kwik (Hg)": {
    bovengrens: 1,
    eenheid: "µg/L",
    label: "≤ 1,0 µg/L",
    toets: "parameterwaarde",
    bron: "drinkwaterVlaanderen",
  },
  "Zink (Zn)": {
    bovengrens: 5000,
    eenheid: "µg/L",
    label: "≤ 5000 µg/L",
    toets: "indicatorparameter",
    bron: "drinkwaterVlaanderen",
  },
  // DOV meet deze drie in mg/l; de richtlijn geeft ze in µg/L.
  "Ijzer (Fe)": {
    bovengrens: 0.2,
    eenheid: "mg/L",
    label: "≤ 0,2 mg/L (= 200 µg/L)",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Mangaan (Mn)": {
    bovengrens: 0.05,
    eenheid: "mg/L",
    label: "≤ 0,05 mg/L (= 50 µg/L)",
    toets: "indicatorparameter",
    bron: "drinkwater",
  },
  "Aluminium (Al)": {
    bovengrens: 0.2,
    eenheid: "mg/L",
    label: "≤ 0,2 mg/L (= 200 µg/L)",
    toets: "indicatorparameter",
    bron: "drinkwaterVlaanderen",
  },
};

/**
 * De milieukwaliteitsnormen voor grondwater uit VLAREM II, bijlage 2.4.1.
 * Dit is de norm die op het grondwater zélf slaat, anders dan de
 * drinkwaternormen die pas aan de kraan gelden.
 *
 * Letterlijk overgenomen uit de tekst op EMIS en nagerekend tegen de
 * geconsolideerde versie in de Vlaamse Codex; die twee komen op elke waarde
 * overeen. Enig verschil: EMIS schrijft de zuurtegraad als "5 < pH < 8,5", de
 * Codex als "5 ≤ pH ≤ 8,5". We volgen de Codex.
 *
 * De bijlage noemt ook barium, antimoon, seleen, cyanide, minerale oliën,
 * fenolen, PAK's en gechloreerde ethenen. Die staan hier niet: DOV rapporteert
 * ze niet onder een naam die we hebben kunnen vaststellen, en een norm op een
 * gegokte sleutel sluit nooit aan.
 *
 * De sleutels zijn de parameternamen van DOV, in de eenheid waarin DOV meet.
 */
const GRONDWATER_VLAREM: Readonly<Record<string, Norm>> = {
  // --- A. fysisch-chemische parameters ---
  "Temperatuur (T)": {
    bovengrens: 25,
    eenheid: "°C",
    label: "≤ 25 °C",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Zuurtegraad (pH)": {
    ondergrens: 5,
    bovengrens: 8.5,
    eenheid: "Sörensen",
    label: "5 – 8,5",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Elektrische geleidbaarheid (EC)": {
    bovengrens: 1600,
    eenheid: "µS/cm",
    label: "≤ 1600 µS/cm",
    toets: "richtwaarde bij 20 °C",
    bron: "vlaremGrondwater",
  },
  "Chloriden (Cl)": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Sulfaat (SO4)": {
    bovengrens: 250,
    eenheid: "mg/L",
    label: "≤ 250 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Calcium (Ca)": {
    bovengrens: 270,
    eenheid: "mg/L",
    label: "≤ 270 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Magnesium (Mg)": {
    bovengrens: 50,
    eenheid: "mg/L",
    label: "≤ 50 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Natrium (Na)": {
    bovengrens: 150,
    eenheid: "mg/L",
    label: "≤ 150 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Kalium (K)": {
    bovengrens: 12,
    eenheid: "mg/L",
    label: "≤ 12 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Aluminium (Al)": {
    bovengrens: 0.2,
    eenheid: "mg/L",
    label: "≤ 0,2 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },

  // --- B. ongewenste stoffen ---
  "Nitraat (NO3)": {
    bovengrens: 50,
    eenheid: "mg/L",
    label: "≤ 50 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Nitriet (NO2)": {
    bovengrens: 0.1,
    eenheid: "mg/L",
    label: "≤ 0,1 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Ammonium (NH4)": {
    bovengrens: 0.5,
    eenheid: "mg/L",
    label: "≤ 0,5 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Boor (B)": {
    bovengrens: 1000,
    eenheid: "µg/L",
    label: "≤ 1000 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Ijzer (Fe)": {
    bovengrens: 20,
    eenheid: "mg/L",
    label: "≤ 20 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Mangaan (Mn)": {
    bovengrens: 1,
    eenheid: "mg/L",
    label: "≤ 1 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Koper (Cu)": {
    bovengrens: 100,
    eenheid: "µg/L",
    label: "≤ 100 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Zink (Zn)": {
    bovengrens: 500,
    eenheid: "µg/L",
    label: "≤ 500 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Fosfaat (PO4)": {
    bovengrens: 1.34,
    eenheid: "mg/L",
    label: "≤ 1,34 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Fluoride (F)": {
    bovengrens: 1.5,
    eenheid: "mg/L",
    label: "≤ 1,5 mg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },

  // --- C. toxische stoffen ---
  "Arseen (As)": {
    bovengrens: 20,
    eenheid: "µg/L",
    label: "≤ 20 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Cadmium (Cd)": {
    bovengrens: 5,
    eenheid: "µg/L",
    label: "≤ 5 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Chroom (Cr)": {
    bovengrens: 50,
    eenheid: "µg/L",
    label: "≤ 50 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Kwik (Hg)": {
    bovengrens: 1,
    eenheid: "µg/L",
    label: "≤ 1 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Nikkel (Ni)": {
    bovengrens: 40,
    eenheid: "µg/L",
    label: "≤ 40 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
  "Lood (Pb)": {
    bovengrens: 20,
    eenheid: "µg/L",
    label: "≤ 20 µg/L",
    toets: "richtwaarde",
    bron: "vlaremGrondwater",
  },
};

/**
 * Normen die niet op één stof slaan maar op een hele groep. VLAREM stelt voor
 * pesticiden 0,1 µg/L per afzonderlijke stof, dat zijn er honderden, en die
 * gaan we niet stuk voor stuk opsommen.
 *
 * Niet-relevante metabolieten vallen er bewust buiten: die tellen ook in de
 * drinkwaterwetgeving niet mee onder de pesticidennorm.
 */
/** Eén norm voor honderden stoffen: dat is precies de bedoeling ervan. */
const PESTICIDENORM: Norm = {
  bovengrens: 0.1,
  eenheid: "µg/L",
  label: "≤ 0,1 µg/L per stof",
  toets: "richtwaarde per afzonderlijke stof; voor alle pesticiden samen geldt 0,5 µg/L",
  bron: "vlaremGrondwater",
};

const GROEPSNORMEN: Readonly<Partial<Record<Normenset, Readonly<Record<string, Norm>>>>> = {
  "grondwater-vlarem": {
    "Pesticiden: actieve stoffen": PESTICIDENORM,
    "Pesticiden: relevante metabolieten": PESTICIDENORM,
  },
};

export const NORMEN: Readonly<Record<Normenset, Readonly<Record<string, Norm>>>> = {
  oppervlaktewater: OPPERVLAKTEWATER,
  drinkwater: DRINKWATER,
  grondwater: GRONDWATER,
  "grondwater-vlarem": GRONDWATER_VLAREM,
  "lucht-eu": LUCHT_EU,
  "lucht-who": LUCHT_WHO,
};

/** Binnen deze marge van de grens spreken we van een grensgeval. */
const GRENSMARGE = 0.1;

/**
 * Nutriënten die toevallig ook op " t" eindigen zijn geen metalen; hun norm
 * geldt wél op het totaalgehalte.
 */
const TOTAAL_MAAR_GEEN_METAAL = new Set(["P t", "N t"]);

/**
 * Metalen worden als totaalgehalte gerapporteerd (achtervoegsel "t"), terwijl
 * de milieukwaliteitsnormen voor oppervlaktewater op de opgeloste fractie
 * ("o") slaan. De drinkwaternorm slaat wél op het totaalgehalte, dus daar is
 * toetsen juist wel verantwoord.
 */
export function isTotaalgehalte(symbool: string): boolean {
  return symbool.endsWith(" t") && !TOTAAL_MAAR_GEEN_METAAL.has(symbool);
}

/**
 * De norm die op deze parameter van toepassing is: eerst die voor de stof
 * zelf, anders die van haar groep: zoals de ene pesticidennorm die voor
 * honderden stoffen tegelijk geldt.
 *
 * Zowel het oordeel als het normlabel in de tabel gebruiken deze functie, want
 * anders zou de tabel een oordeel tonen zonder de norm waarop het rust.
 */
export function normVoor(
  parameter: Pick<ParameterSamenvatting, "symbool" | "groep">,
  set: Normenset,
): Norm | undefined {
  return (
    NORMEN[set][parameter.symbool] ??
    (parameter.groep ? GROEPSNORMEN[set]?.[parameter.groep] : undefined)
  );
}

export function beoordeel(
  parameter: ParameterSamenvatting,
  set: Normenset = "oppervlaktewater",
  venster?: Venster,
): Oordeel {
  const norm = normVoor(parameter, set);

  if (set === "oppervlaktewater" && isTotaalgehalte(parameter.symbool)) {
    return {
      klasse: "geen-norm",
      label: "niet toetsbaar",
      toelichting:
        "De milieukwaliteitsnorm geldt op de opgeloste fractie; hier is het totaalgehalte gemeten.",
    };
  }

  if (!norm) return { klasse: "geen-norm", label: "geen norm" };

  // Waterbodem meet dezelfde parameters in mg/kg droge stof.
  if (parameter.eenheid !== norm.eenheid) {
    return {
      klasse: "geen-norm",
      label: "andere eenheid",
      toelichting: `De norm geldt in ${norm.eenheid}; hier is gemeten in ${parameter.eenheid}.`,
    };
  }

  // Een norm met een toegestaan aantal overschrijdingen is geen drempel op een
  // gemiddelde maar een telling over een volledig kalenderjaar. Die kunnen wij
  // op een zelfgekozen venster niet eerlijk uitvoeren.
  if (norm.toegestaneOverschrijdingen !== undefined) {
    return {
      klasse: "geen-norm",
      label: "telt overschrijdingen",
      toelichting:
        `De norm staat ${norm.toegestaneOverschrijdingen} overschrijdingen per kalenderjaar toe. ` +
        "Dat is een telling over een volledig jaar en geen drempel op een gemiddelde, dus toetsen we hier niet.",
    };
  }

  // Een jaargrenswaarde zegt niets over een week metingen.
  if (norm.middeling === "jaar" && venster && venster.dagen < JAAR_DREMPEL) {
    return {
      klasse: "geen-norm",
      label: "jaarnorm",
      toelichting:
        "Deze norm geldt op het jaargemiddelde. Het gekozen venster is daarvoor te kort; " +
        "kies een jaar om te kunnen toetsen.",
    };
  }

  if (parameter.volledigOnderLimiet) {
    return {
      klasse: "geen-norm",
      label: "niet aangetoond",
      toelichting:
        "Alle metingen lagen onder de detectielimiet; het gemiddelde is een bovengrens en geen concentratie.",
    };
  }

  const { gemiddelde, minimum } = parameter;

  if (norm.bovengrens !== undefined && gemiddelde > norm.bovengrens) {
    return { klasse: "buiten-norm", label: "boven norm" };
  }
  if (norm.ondergrens !== undefined && gemiddelde < norm.ondergrens) {
    return { klasse: "buiten-norm", label: "onder norm" };
  }

  // Tussen het strengste en het soepelste eind van een typeafhankelijke norm
  // kunnen we niets besluiten zonder het waterlooptype te kennen.
  if (norm.strengsteBovengrens !== undefined && gemiddelde > norm.strengsteBovengrens) {
    return {
      klasse: "op-grens",
      label: "hangt van type af",
      toelichting: `Boven de strengste norm (${norm.strengsteBovengrens}) maar onder de soepelste (${norm.bovengrens}). Welke geldt, hangt af van het waterlooptype.`,
    };
  }

  // Een jaargemiddelde kan conform zijn terwijl er tussentijds dips waren,
  // bij zuurstof is precies dát wat vissen doodt.
  if (norm.ondergrens !== undefined && minimum < norm.ondergrens) {
    return { klasse: "op-grens", label: "dipt onder" };
  }
  if (norm.bovengrens !== undefined && norm.bovengrens > 0 && gemiddelde > norm.bovengrens * (1 - GRENSMARGE)) {
    return { klasse: "op-grens", label: "grenswaarde" };
  }

  return { klasse: "conform", label: "conform" };
}

/**
 * Bronnen die bij een set horen zonder aan één norm te hangen, de Vlaamse
 * omzetting bijvoorbeeld, die de Europese waarden overneemt.
 */
const EXTRA_BRONNEN: Readonly<Record<Normenset, BronId[]>> = {
  oppervlaktewater: [],
  drinkwater: ["drinkwaterVlaanderen"],
  grondwater: ["drinkwaterVlaanderen", "wac"],
  "grondwater-vlarem": ["wac"],
  "lucht-eu": [],
  "lucht-who": [],
};

/** De bronnen die in deze normenset gebruikt worden. */
export function bronnenVoor(set: Normenset): { naam: string; url: string }[] {
  const ids = new Set([
    ...Object.values(NORMEN[set]).map((n) => n.bron),
    ...EXTRA_BRONNEN[set],
  ]);
  return [...ids].map((id) => BRONNEN[id]);
}
