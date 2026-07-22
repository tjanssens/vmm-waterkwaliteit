import type { ParameterSamenvatting } from "./types.js";
import { isTotaalgehalte } from "./normen.js";

export interface Categorie {
  id: string;
  naam: string;
  /** Waarschuwing bovenaan de categorie, bv. over de opgeloste fractie. */
  waarschuwing?: string;
}

export interface IngedeeldeCategorie extends Categorie {
  parameters: ParameterSamenvatting[];
}

const CATEGORIEEN = [
  { id: "zuurstof", naam: "Zuurstofhuishouding" },
  { id: "nutrienten", naam: "Nutriënten" },
  { id: "fysisch", naam: "Algemeen fysisch-chemisch" },
  { id: "bacteriologie", naam: "Bacteriologie" },
  { id: "metalen", naam: "Metalen en sporenelementen",
    waarschuwing:
      "Deze stoffen zijn als totaalgehalte gemeten, terwijl de normen op de opgeloste fractie slaan. Ze zijn hier niet tegen een norm getoetst." },
  { id: "pfas", naam: "PFAS" },
  { id: "fijnstof", naam: "Fijn stof en roet" },
  { id: "gassen", naam: "Gassen" },
  { id: "vos", naam: "Vluchtige organische stoffen" },
  { id: "weer", naam: "Weersomstandigheden",
    waarschuwing:
      "Deze waarden beschrijven het weer op het meetstation. Ze zeggen niets over de luchtkwaliteit, maar helpen die wel verklaren." },
  { id: "pesticiden", naam: "Pesticiden" },
  { id: "overige", naam: "Overige parameters" },
] as const satisfies readonly Categorie[];

type CategorieId = (typeof CATEGORIEEN)[number]["id"];

const VAST: Readonly<Record<string, CategorieId>> = {
  "O2": "zuurstof",
  "O2 verz": "zuurstof",
  "BZV5": "zuurstof",
  "CZV": "zuurstof",
  "DOC": "zuurstof",
  "TOC": "zuurstof",

  "N t": "nutrienten",
  "NO3-": "nutrienten",
  "NO2-": "nutrienten",
  "NH4+": "nutrienten",
  "KjN": "nutrienten",
  "N+N": "nutrienten",
  "N+N+N": "nutrienten",
  "oPO4 f": "nutrienten",
  "P t": "nutrienten",

  "T": "fysisch",
  "pH": "fysisch",
  "EC 20": "fysisch",
  "EC 25": "fysisch",
  "Cl-": "fysisch",
  "SO4=": "fysisch",
  "ZS": "fysisch",
  "TAM": "fysisch",
  "Secchi": "fysisch",

  // --- luchtkwaliteit (IRCELINE) ---
  "PM10": "fijnstof",
  "PM2.5": "fijnstof",
  "PM1": "fijnstof",
  "BC": "fijnstof",
  "PNC": "fijnstof",

  "NO2": "gassen",
  "NO": "gassen",
  "O3": "gassen",
  "SO2": "gassen",
  "CO": "gassen",
  "CO2": "gassen",
  "NH3": "gassen",

  "C6H6": "vos",
  "C7H8": "vos",
  "C8H10": "vos",
  "MPX": "vos",
  "OX": "vos",

  "RV": "weer",
  "P": "weer",
  "WR": "weer",
  "WS": "weer",

  "EColi": "bacteriologie",
  "TColi": "bacteriologie",
  "FColi": "bacteriologie",
  "FStrep": "bacteriologie",
  "IEntero": "bacteriologie",
  "Salm": "bacteriologie",
};

/** PFAS-symbolen zijn te talrijk om op te sommen; ze delen een vorm. */
const PFAS = /^(PF[A-Z]{2,4}|\d+:\d+\s?FT[SA]|[A-Za-z]*PFOS|[A-Za-z]*PFOA)/;

export function categorieVan(parameter: ParameterSamenvatting): CategorieId {
  const vast = VAST[parameter.symbool];
  if (vast) return vast;
  if (PFAS.test(parameter.symbool)) return "pfas";
  if (isTotaalgehalte(parameter.symbool) || /\s[ot]$/.test(parameter.symbool)) return "metalen";
  return "overige";
}

/** Deelt de parameters in, en laat lege categorieën weg. */
export function deelIn(parameters: ParameterSamenvatting[]): IngedeeldeCategorie[] {
  return CATEGORIEEN.map((categorie) => ({
    ...categorie,
    parameters: parameters
      .filter((p) => categorieVan(p) === categorie.id)
      .sort((a, b) => a.omschrijving.localeCompare(b.omschrijving, "nl")),
  })).filter((categorie) => categorie.parameters.length > 0);
}
