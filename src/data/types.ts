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
  /**
   * Indeling zoals de bron die zelf geeft, bv. "Zware metalen" of
   * "Pesticiden: actieve stoffen". Betrouwbaarder dan namen opsommen: DOV kent
   * duizenden pesticiden die we nooit allemaal in een lijst krijgen.
   */
  groep?: string;
}

/**
 * Samenvatting van één parameter over één periode. Wat een periode is, bepaalt
 * de laag: een meetjaar bij oppervlakte- en grondwater, een tijdvenster bij
 * lucht. Vandaar een sleutel en geen jaartal.
 */
export interface ParameterSamenvatting {
  symbool: string;
  omschrijving: string;
  eenheid: string;
  /** Sleutel van de periode, gelijk aan `Periode.id`. */
  bucket: string;
  /** Aantal metingen in deze periode. */
  aantal: number;
  /** Hoeveel daarvan onder de detectielimiet lagen. */
  aantalOnderLimiet: number;
  gemiddelde: number;
  minimum: number;
  maximum: number;
  /** Datum van de recentste meting in deze periode. */
  laatsteDatum: string;
  /**
   * True wanneer élke meting onder de detectielimiet lag. Het gemiddelde is
   * dan een bovengrens en moet als "< x" getoond worden.
   */
  volledigOnderLimiet: boolean;
  /** Indeling zoals de bron die geeft; zie Meting.groep. */
  groep?: string;
}

/**
 * "buiten-norm" dekt zowel een overschrijding (fosfor te hoog) als een
 * onderschrijding (zuurstof te laag), beide zijn een probleem.
 */
export type OordeelKlasse = "buiten-norm" | "op-grens" | "conform" | "geen-norm";

export interface Oordeel {
  klasse: OordeelKlasse;
  /** Korte weergave voor de statuskolom, bv. "boven norm" of "dipt onder". */
  label: string;
  /** Uitleg wanneer er niet getoetst kon worden. */
  toelichting?: string;
}
