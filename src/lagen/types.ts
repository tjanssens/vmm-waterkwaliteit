import type { Meting } from "../data/types.js";
import type { Normenset } from "../data/normen.js";

/** De databronnen die de kaart naast elkaar kan tonen. */
export type LaagId = "oppervlaktewater" | "lucht" | "grondwater";

/**
 * Wat elk meetpunt gemeen heeft, ongeacht de bron. Lagen breiden dit uit met
 * hun eigen velden — een meetplaats draagt een matrix, een grondwaterfilter
 * een diepte — maar de kaart en de zoeklijst kennen alleen dit.
 */
export interface Meetpunt {
  laag: LaagId;
  /** Uniek binnen de laag. */
  id: string;
  /** Titel van het paneel, bv. "OW65000" of "42R801". */
  code: string;
  omschrijving: string;
  gemeente: string | null;
  lat: number;
  lon: number;
  /** Alles doorzoekbaar, in kleine letters. */
  zoeksleutel: string;
}

/**
 * Vorm draagt het onderscheid tussen de lagen, kleur versterkt het. Kleur
 * alleen zou onleesbaar zijn voor kleurenblinde gebruikers en op een afdruk.
 */
export interface Merk {
  vorm: "cirkel" | "vierkant" | "driehoek";
  kleur: string;
}

/** Kaartvenster, voor lagen die per venster laden. */
export interface Vak {
  zuid: number;
  west: number;
  noord: number;
  oost: number;
}

/**
 * Eén keuze op de tijdas: een meetjaar bij water, een tijdvenster bij lucht.
 * `id` is tevens de sleutel waarop de metingen samengevat worden.
 */
export interface Periode {
  id: string;
  label: string;
  /**
   * Hoeveel dagen de periode beslaat. Bepaalt of een norm met een
   * middelingstijd hier überhaupt op toegepast mag worden — een
   * jaargrenswaarde zegt niets over een week metingen.
   */
  dagen?: number;
}

/**
 * Waar de burger deze cijfers zelf kan raadplegen. Bij voorkeur een webpagina;
 * bestaat die niet, dan de URL die exact deze cijfers teruggeeft. Nooit een
 * verwijzing naar onze eigen proxy.
 */
export interface Bronverwijzing {
  url: string;
  tekst: string;
  /** Zin die de link inleidt en zegt wat de bezoeker er vindt. */
  uitleg: string;
  /** Optionele tweede link, bv. de databank waar het rapport onder valt. */
  context?: { url: string; tekst: string };
}

/**
 * Twee manieren waarop de tijdas kan werken, en het verschil is wezenlijk.
 *
 * Bij water halen we vijf jaargangen in één keer op en kiest de gebruiker
 * daarbinnen; wisselen kost geen aanroep. Bij lucht bepaalt de keuze juist
 * wélke data opgehaald wordt, want een jaar uurmetingen halen we niet op om
 * er dan twee dagen van te tonen.
 */
export type Tijdas<P extends Meetpunt> =
  | {
      soort: "uit-data";
      /** Haalt alles op; de perioden volgen uit wat er terugkomt. */
      haal(punt: P, signaal?: AbortSignal): Promise<Meting[]>;
      periodes(metingen: Meting[]): readonly Periode[];
      /** Onder welke periode een meting valt. */
      bucketVan(meting: Meting): string;
      ladenTekst(): string;
      /**
       * Optioneel: opnieuw ophalen over een langer bereik, zoals de knop
       * "Volledige historiek" bij oppervlaktewater.
       */
      uitbreiden?: {
        label: string;
        ladenTekst(): string;
        haal(punt: P, signaal?: AbortSignal): Promise<Meting[]>;
      };
    }
  | {
      soort: "per-periode";
      periodes(): readonly Periode[];
      standaard(): Periode;
      haal(punt: P, periode: Periode, signaal?: AbortSignal): Promise<Meting[]>;
      ladenTekst(periode: Periode): string;
    };

/**
 * Een knop in de filterbalk die punten van deze laag weglaat. Wat er te
 * filteren valt, verschilt per bron: meetnetten bij oppervlaktewater,
 * aquifer bij grondwater, gemeten stof bij lucht. De schil hoeft daar niets
 * van te weten — anders staat er straks per laag een uitzondering in.
 */
export interface Puntfilter<P extends Meetpunt = Meetpunt> {
  id: string;
  label: string;
  past(punt: P): boolean;
}

/**
 * Alles wat één databron eigen is, achter één interface. Kaart en paneel
 * praten hiertegen en niet tegen Cognos, IRCELINE of DOV rechtstreeks — een
 * vierde laag toevoegen hoort daarom één bestand te kosten.
 */
export interface Laagprofiel<P extends Meetpunt = Meetpunt> {
  id: LaagId;
  /** Naam van de laag in de schakelaar, bv. "Grondwater". */
  naam: string;
  /** Aanduiding boven de titel in het paneel. */
  eyebrow: string;
  merk: Merk;

  /**
   * Punten ophalen. Lagen met veel punten laden per kaartvenster; dan is
   * `venster` gevuld en `perVenster` waar.
   */
  perVenster: boolean;
  /** Vanaf welk zoomniveau het venster klein genoeg is om te laden. */
  minimumZoom?: number;
  laadPunten(venster: Vak | null, signaal?: AbortSignal): Promise<P[]>;
  /**
   * Eén punt op zijn id. Een laag die per venster laadt kan niet eerst alles
   * ophalen, en de rapportweergave en de deelbare link kennen alleen een id.
   */
  puntOpId?(id: string, signaal?: AbortSignal): Promise<P | null>;

  tijdas: Tijdas<P>;

  /** Knoppen in de filterbalk; ze verschijnen alleen als deze laag aanstaat. */
  puntfilters?: readonly Puntfilter<P>[];

  normensetten: readonly Normenset[];
  standaardNormenset: Normenset;

  /** Regels voor de feitenlijst in de paneelkop. */
  feiten(punt: P): Array<[string, string]>;
  bron(punt: P, periode: Periode): Bronverwijzing;
  /** Alinea onder "Over deze cijfers", eigen aan deze bron. */
  toelichting(periode: Periode): string;
  /**
   * Hoe er gemeten wordt, en wat dat betekent voor de toetsing. Staat onder
   * "Over deze cijfers" met de bron erbij: wie een oordeel leest, hoort te
   * kunnen nagaan waarop het rust.
   */
  meetwijze?: { tekst: string; bron: { naam: string; url: string } };
  /** Zin wanneer er niets gemeten is. */
  leegTekst(uitgebreid: boolean): string;
  /** Optionele toelichting daaronder, in de woorden van deze bron. */
  leegHint?: string;
}
