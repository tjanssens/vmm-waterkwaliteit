/** Eén analyseresultaat zoals de VMM-databank het teruggeeft. */
export interface Meting {
  /** Meetplaatscode inclusief matrixprefix, bv. "OW65000". */
  meetplaats: string;
  /** ISO-datum, bv. "2024-11-07". */
  datum: string;
  jaar: number;
  /** Labo-identificatie van het staal. */
  staalId: string;
  /** "09:41:00", of null wanneer niet geregistreerd. */
  tijdstip: string | null;
  /** Korte parametercode, bv. "oPO4 f". */
  symbool: string;
  /** Voluit, bv. "Orthofosfaat". */
  omschrijving: string;
  eenheid: string;
  waarde: number;
  /**
   * True wanneer het labo `<` rapporteerde: de stof is niet aangetoond en
   * `waarde` is de detectielimiet, niet de werkelijke concentratie.
   */
  onderDetectielimiet: boolean;
}

/** Samenvatting van één parameter over één meetjaar. */
export interface ParameterJaar {
  symbool: string;
  omschrijving: string;
  eenheid: string;
  jaar: number;
  /** Aantal metingen in dit jaar. */
  aantal: number;
  /** Hoeveel daarvan onder de detectielimiet lagen. */
  aantalOnderLimiet: number;
  gemiddelde: number;
  minimum: number;
  maximum: number;
  /** Datum van de recentste meting in dit jaar. */
  laatsteDatum: string;
  /**
   * True wanneer élke meting onder de detectielimiet lag. Het gemiddelde is
   * dan een bovengrens en moet als "< x" getoond worden.
   */
  volledigOnderLimiet: boolean;
}

/**
 * "buiten-norm" dekt zowel een overschrijding (fosfor te hoog) als een
 * onderschrijding (zuurstof te laag) — beide zijn een probleem.
 */
export type OordeelKlasse = "buiten-norm" | "op-grens" | "conform" | "geen-norm";

export interface Oordeel {
  klasse: OordeelKlasse;
  /** Korte weergave voor de statuskolom, bv. "boven norm" of "dipt onder". */
  label: string;
  /** Uitleg wanneer er niet getoetst kon worden. */
  toelichting?: string;
}
