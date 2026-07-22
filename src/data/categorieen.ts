import type { ParameterSamenvatting } from "./types.js";
import { isTotaalgehalte } from "./normen.js";

export interface Categorie {
  id: string;
  naam: string;
  /**
   * Waarschuwingen bovenaan de categorie. Welke er geldt, hangt af van de
   * normenset: metalen worden bij oppervlaktewater als totaalgehalte gemeten
   * terwijl de norm op de opgeloste fractie slaat, en bij grondwater is het
   * precies andersom. Eén vaste tekst zou dus in de helft van de gevallen
   * onjuist zijn.
   */
  waarschuwingen?: readonly { readonly voor?: string; readonly tekst: string }[];
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
    waarschuwingen: [
      {
        voor: "oppervlaktewater",
        tekst:
          "Deze stoffen zijn als totaalgehalte gemeten, terwijl de normen op de opgeloste fractie slaan. Ze zijn hier niet tegen een norm getoetst.",
      },
      {
        voor: "grondwater",
        tekst:
          "Grondwatermonsters voor metalen worden ter plaatse over 0,45 µm gefiltreerd. Wat hier staat is dus de opgeloste fractie, terwijl een drinkwaternorm het water als geheel bedoelt. Een overschrijding telt daarom zeker; een vinkje betekent alleen dat het opgeloste deel binnen de norm blijft. Kwik kan bovendien onderschat zijn, doordat het aan het filter blijft kleven.",
      },
    ] },
  { id: "pfas", naam: "PFAS" },
  { id: "fijnstof", naam: "Fijn stof en roet" },
  { id: "gassen", naam: "Gassen" },
  { id: "vos", naam: "Vluchtige organische stoffen" },
  { id: "weer", naam: "Weersomstandigheden",
    waarschuwingen: [
      {
        tekst:
          "Deze waarden beschrijven het weer op het meetstation. Ze zeggen niets over de luchtkwaliteit, maar helpen die wel verklaren.",
      },
    ] },
  { id: "pesticiden", naam: "Pesticiden" },
  { id: "farmaceutisch", naam: "Geneesmiddelenresten" },
  { id: "organisch", naam: "Organische verbindingen" },
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

  // --- grondwater; DOV schrijft de parameternaam voluit ---
  "Opgeloste zuurstof (O2)": "zuurstof",
  "Totaal organische koolstof (TOC)": "zuurstof",

  "Nitraat (NO3)": "nutrienten",
  "Nitriet (NO2)": "nutrienten",
  "Ammonium (NH4)": "nutrienten",
  "Fosfaat (PO4)": "nutrienten",

  "Zuurtegraad (pH)": "fysisch",
  "Temperatuur (T)": "fysisch",
  "Elektrische geleidbaarheid (EC)": "fysisch",
  "Redoxpotentiaal (Eh°)": "fysisch",
  "Chloriden (Cl)": "fysisch",
  "Sulfaat (SO4)": "fysisch",
  "Bicarbonaat (HCO3)": "fysisch",
  "Carbonaat (CO3)": "fysisch",
  "Calcium (Ca)": "fysisch",
  "Magnesium (Mg)": "fysisch",
  "Natrium (Na)": "fysisch",
  "Kalium (K)": "fysisch",

  "Arseen (As)": "metalen",
  "Cadmium (Cd)": "metalen",
  "Chroom (Cr)": "metalen",
  "Koper (Cu)": "metalen",
  "Lood (Pb)": "metalen",
  "Nikkel (Ni)": "metalen",
  "Zink (Zn)": "metalen",
  "Kwik (Hg)": "metalen",
  "Aluminium (Al)": "metalen",
  "Mangaan (Mn)": "metalen",
  "Ijzer (Fe)": "metalen",
  "Ijzer II (Fe2+)": "metalen",

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

  // Gasvormig kwik is een metaal, ook al meten we het in de lucht. De
  // waarschuwing bij deze categorie gaat over water en verschijnt hier niet,
  // want die hangt aan de normenset.
  "Hg": "metalen",

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

/**
 * PFAS zijn te talrijk om op te sommen — DOV alleen al rapporteert er 62 — maar
 * ze delen een vorm in hun code en een woordstam in hun naam.
 */
const PFAS_SYMBOOL =
  /^(PF[A-Z]|\d+:\d+[\s/]|[A-Za-z]*PFOS|[A-Za-z]*PFOA|HFPO|DONA|\d*Cl-PF|\d+H-PF|P\d+DMOA|Me?PF|Et?PF)/;
/**
 * "Fluoride" mag hier niet in trappen, vandaar de stam en niet enkel "fluor":
 * per-, poly- en fluortelomeerverbindingen zijn PFAS, fluoride is dat niet.
 */
const PFAS_NAAM = /(perfluor|polyfluor|fluortelomeer|fluoroctaan|fluorbutaan)/i;

/**
 * Indeling zoals de bron die zelf geeft. Betrouwbaarder dan namen opsommen:
 * DOV kent 998 parameters, waaronder honderden pesticiden die we nooit
 * allemaal in een lijst krijgen.
 *
 * De twaalf groepen zijn exact opgehaald bij DOV. Een referentie-endpoint
 * bestaat er niet — `parametergroep` is in het WFS-schema een vrije string —
 * dus dat ging door de waarden alfabetisch af te lopen. Een steekproef van
 * 10.000 observaties miste er drie, waaronder PFAS.
 */
const GROEPEN: Readonly<Record<string, CategorieId>> = {
  "Zware metalen": "metalen",
  Grondwater_chemisch_PFAS: "pfas",
  "Pesticiden: actieve stoffen": "pesticiden",
  "Pesticiden: relevante metabolieten": "pesticiden",
  "Niet-relevante metabolieten van pesticiden": "pesticiden",
  "Bacteriologische parameters": "bacteriologie",
  "Farmaceutische stoffen": "farmaceutisch",
  "Organische verbindingen": "organisch",
  Anionen: "fysisch",
  Kationen: "fysisch",
  // DOV schrijft hier twee spaties; overnemen zoals het is.
  "Fysico-chemische  parameters": "fysisch",
  Onbekend: "overige",
};

export function categorieVan(parameter: ParameterSamenvatting): CategorieId {
  // Een naam die we kennen is het nauwkeurigst: nitraat is een anion, maar
  // hoort bij de nutriënten en niet bij "algemeen fysisch-chemisch".
  const vast = VAST[parameter.symbool];
  if (vast) return vast;
  if (PFAS_SYMBOOL.test(parameter.symbool) || PFAS_NAAM.test(parameter.omschrijving)) return "pfas";

  const uitGroep = parameter.groep ? GROEPEN[parameter.groep] : undefined;
  if (uitGroep) return uitGroep;
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
