import type { Oordeel, ParameterJaar } from "./types.js";

export interface Norm {
  /** Ondergrens: hieronder is problematisch (zuurstof). */
  ondergrens?: number;
  /** Bovengrens: hierboven is problematisch (fosfor). */
  bovengrens?: number;
  /**
   * Eenheid waarin de norm geldt, exact zoals de databank hem schrijft.
   * Waterbodem rapporteert dezelfde parameters in mg/kg ds; die tegen een
   * norm in mgN/L leggen zou een verzonnen oordeel opleveren.
   */
  eenheid: string;
  /** Weergave in de normkolom, bv. "≤ 0,14 mgP/L". */
  label: string;
  bron: string;
}

/**
 * Waar de drempelwaarden vandaan komen. Eén bron van waarheid, zodat de
 * verwijzing in het rapport niet uit de pas kan lopen met de tabel.
 */
export const NORMBRON = {
  naam: "VLAREM II, bijlage 2.3.1 — basismilieukwaliteitsnormen oppervlaktewater",
  url: "https://navigator.emis.vito.be/detail?woId=10071",
} as const;

const BASISKWALITEIT = NORMBRON.naam;

/**
 * LET OP — deze drempels zijn nog niet één voor één geverifieerd tegen de
 * VLAREM II-bijlage. Ze dienen als indicatieve duiding; typespecifieke normen
 * per waterlooptype kunnen strenger of soepeler zijn. Zie README.
 */
export const NORMEN: Readonly<Record<string, Norm>> = {
  "O2": { ondergrens: 6, eenheid: "mg/L", label: "≥ 6 mg/L", bron: BASISKWALITEIT },
  "pH": { ondergrens: 6.5, bovengrens: 8.5, eenheid: "-", label: "6,5 – 8,5", bron: BASISKWALITEIT },
  "T": { bovengrens: 25, eenheid: "°C", label: "≤ 25 °C", bron: BASISKWALITEIT },
  "EC 20": { bovengrens: 1000, eenheid: "µS/cm", label: "≤ 1000 µS/cm", bron: BASISKWALITEIT },
  "Cl-": { bovengrens: 150, eenheid: "mg/L", label: "≤ 150 mg/L", bron: BASISKWALITEIT },
  "SO4=": { bovengrens: 100, eenheid: "mg/L", label: "≤ 100 mg/L", bron: BASISKWALITEIT },
  "ZS": { bovengrens: 50, eenheid: "mg/L", label: "≤ 50 mg/L", bron: BASISKWALITEIT },
  "BZV5": { bovengrens: 6, eenheid: "mgO2/L", label: "≤ 6 mgO₂/L", bron: BASISKWALITEIT },
  "CZV": { bovengrens: 30, eenheid: "mgO2/L", label: "≤ 30 mgO₂/L", bron: BASISKWALITEIT },
  "N t": { bovengrens: 6, eenheid: "mgN/L", label: "≤ 6 mgN/L", bron: BASISKWALITEIT },
  "NO3-": { bovengrens: 11.3, eenheid: "mgN/L", label: "≤ 11,3 mgN/L", bron: BASISKWALITEIT },
  "NH4+": { bovengrens: 0.5, eenheid: "mgN/L", label: "≤ 0,5 mgN/L", bron: BASISKWALITEIT },
  "oPO4 f": { bovengrens: 0.1, eenheid: "mgP/L", label: "≤ 0,1 mgP/L", bron: BASISKWALITEIT },
  "P t": { bovengrens: 0.14, eenheid: "mgP/L", label: "≤ 0,14 mgP/L", bron: BASISKWALITEIT },
};

/** Binnen deze marge van de grens spreken we van een grensgeval. */
const GRENSMARGE = 0.1;

/**
 * Nutriënten die toevallig ook op " t" eindigen zijn geen metalen; hun norm
 * geldt wél op het totaalgehalte.
 */
const TOTAAL_MAAR_GEEN_METAAL = new Set(["P t", "N t"]);

/**
 * Metalen worden hier als totaalgehalte gerapporteerd (achtervoegsel "t"),
 * terwijl de milieukwaliteitsnormen op de opgeloste fractie ("o") slaan.
 * Rechtstreeks toetsen zou een vals oordeel opleveren.
 */
export function isTotaalgehalte(symbool: string): boolean {
  return symbool.endsWith(" t") && !TOTAAL_MAAR_GEEN_METAAL.has(symbool);
}

export function beoordeel(parameter: ParameterJaar): Oordeel {
  if (isTotaalgehalte(parameter.symbool)) {
    return {
      klasse: "geen-norm",
      label: "niet toetsbaar",
      toelichting:
        "De norm geldt op de opgeloste fractie; hier is het totaalgehalte gemeten.",
    };
  }

  const norm = NORMEN[parameter.symbool];
  if (!norm) return { klasse: "geen-norm", label: "geen norm" };

  // Waterbodem meet dezelfde parameters in mg/kg droge stof. Die tegen een
  // norm voor oppervlaktewater leggen zou een verzonnen oordeel opleveren.
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

  // Een jaargemiddelde kan conform zijn terwijl er tussentijds dips waren —
  // bij zuurstof is precies dát wat vissen doodt.
  if (norm.ondergrens !== undefined && minimum < norm.ondergrens) {
    return { klasse: "op-grens", label: "dipt onder" };
  }
  if (
    norm.bovengrens !== undefined &&
    gemiddelde > norm.bovengrens * (1 - GRENSMARGE)
  ) {
    return { klasse: "op-grens", label: "grenswaarde" };
  }

  return { klasse: "conform", label: "conform" };
}
