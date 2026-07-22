import type { Oordeel, ParameterJaar } from "./types.js";

/**
 * Waar de drempelwaarden vandaan komen. Elke norm verwijst naar één bron,
 * zodat het rapport nooit een getal toont zonder herkomst.
 */
export const BRONNEN = {
  vlarem: {
    naam: "VLAREM II, bijlage 2.3.1 — basismilieukwaliteitsnormen oppervlaktewater",
    url: "https://navigator.emis.vito.be/detail?woId=10071",
  },
  vlaremGevaarlijk: {
    naam: "VLAREM II, bijlage 2.3.1 — milieukwaliteitsnormen gevaarlijke stoffen",
    url: "https://navigator.emis.vito.be/detail?woId=10071",
  },
  drinkwater: {
    naam: "Richtlijn (EU) 2020/2184 over water bestemd voor menselijke consumptie, bijlage I",
    url: "https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32020L2184",
  },
  drinkwaterVlaanderen: {
    naam:
      "Besluit van de Vlaamse Regering van 20 januari 2023 over de kwaliteit, kwantiteit en levering van water bestemd voor menselijke consumptie",
    url: "https://vmm.vlaanderen.be/beleid/waterbeleid/drinkwater/kwaliteit",
  },
} as const;

export type BronId = keyof typeof BRONNEN;

/** Welke normen we tegen de metingen leggen. */
export type Normenset = "oppervlaktewater" | "drinkwater";

export const NORMENSETTEN: Readonly<Record<Normenset, { naam: string; uitleg: string }>> = {
  oppervlaktewater: {
    naam: "Oppervlaktewater",
    uitleg:
      "De milieukwaliteitsnormen die voor deze waterloop zelf gelden. Dit is de toetsing die hoort bij een meetpunt in een beek of rivier.",
  },
  drinkwater: {
    naam: "Drinkwater",
    uitleg:
      "De normen voor kraantjeswater, ter vergelijking. Let op: deze gelden voor water aan de kraan, ná zuivering. Een waterloop is geen drinkwater en hoeft hier niet aan te voldoen — de vergelijking geeft alleen een gevoel voor de grootte-orde.",
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
  /** Idem voor een ondergrens die per type verschilt. */
  soepelsteOndergrens?: number;
  /** Eenheid waarin de norm geldt, exact zoals de databank hem schrijft. */
  eenheid: string;
  /** Weergave in de normkolom. */
  label: string;
  /** Op welke statistiek de norm slaat. */
  toets: string;
  bron: BronId;
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
  "Fe t": { bovengrens: 200, eenheid: "µg/L", label: "≤ 200 µg/L", toets: "indicatorparameter", bron: "drinkwater" },
  "Mn t": { bovengrens: 50, eenheid: "µg/L", label: "≤ 50 µg/L", toets: "indicatorparameter", bron: "drinkwater" },

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

export const NORMEN: Readonly<Record<Normenset, Readonly<Record<string, Norm>>>> = {
  oppervlaktewater: OPPERVLAKTEWATER,
  drinkwater: DRINKWATER,
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

export function beoordeel(
  parameter: ParameterJaar,
  set: Normenset = "oppervlaktewater",
): Oordeel {
  const norm = NORMEN[set][parameter.symbool];

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

  // Een jaargemiddelde kan conform zijn terwijl er tussentijds dips waren —
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
 * Bronnen die bij een set horen zonder aan één norm te hangen — de Vlaamse
 * omzetting bijvoorbeeld, die de Europese waarden overneemt.
 */
const EXTRA_BRONNEN: Readonly<Record<Normenset, BronId[]>> = {
  oppervlaktewater: [],
  drinkwater: ["drinkwaterVlaanderen"],
};

/** De bronnen die in deze normenset gebruikt worden. */
export function bronnenVoor(set: Normenset): { naam: string; url: string }[] {
  const ids = new Set([
    ...Object.values(NORMEN[set]).map((n) => n.bron),
    ...EXTRA_BRONNEN[set],
  ]);
  return [...ids].map((id) => BRONNEN[id]);
}
