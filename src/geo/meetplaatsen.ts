import type { Meetpunt } from "../lagen/types.js";

/** Meetnetten in de volgorde waarin het bouwscript de bitvlaggen zet. */
export const MEETNETTEN = [
  "FYSICOCHEM",
  "BACTERIO",
  "ZUURSTOF",
  "WATBODEM",
  "MACROINV",
  "MACROFYT",
  "FYTOBENT",
  "FYTOPLANKT",
  "MAP_MEETNT",
] as const;

export type Meetnet = (typeof MEETNETTEN)[number];

export const MEETNET_NAMEN: Readonly<Record<Meetnet, string>> = {
  FYSICOCHEM: "Fysisch-chemisch",
  BACTERIO: "Bacteriologisch",
  ZUURSTOF: "Zuurstof",
  WATBODEM: "Waterbodem",
  MACROINV: "Macro-invertebraten",
  MACROFYT: "Macrofyten",
  FYTOBENT: "Fytobenthos",
  FYTOPLANKT: "Fytoplankton",
  MAP_MEETNT: "MAP-meetnet",
};

/** Compacte vorm zoals scripts/build-meetplaatsen.ts hem wegschrijft. */
interface RuweMeetplaats {
  nr: string;
  oms: string;
  lon: number;
  lat: number;
  gem: string | null;
  net: number;
  pfas?: 1;
}

export type Matrix = "OW" | "WB" | "BI";

export interface Meetplaats extends Meetpunt {
  laag: "oppervlaktewater";
  /** Meetplaatsnummer zoals op de kaart, bv. "65000". */
  nummer: string;
  /**
   * Meetnet waarin het rapport dit punt kent. Moet bij de prefix passen:
   * een OW-code opvragen met matrix WB levert nul resultaten op.
   */
  matrix: Matrix;
  meetnetten: Meetnet[];
  /**
   * Of hier PFAS gemeten is. Komt uit de PFAS-laag van DOV en wordt bij de
   * build ingebakken; de resultatendatabank zelf kan die vraag niet
   * beantwoorden zonder alle 7.534 punten te bevragen.
   */
  meetPfas: boolean;
}

/**
 * Vertaalt een meetplaatsnummer naar de code die het rapport verwacht.
 * Waterbodempunten krijgen de WB-prefix, al de rest OW.
 */
export function codeVoor(nummer: string, meetnetten: readonly Meetnet[]): string {
  const enkelWaterbodem =
    meetnetten.includes("WATBODEM") &&
    !meetnetten.some((net) => net !== "WATBODEM" && net !== "MACROINV");
  return (enkelWaterbodem ? "WB" : "OW") + nummer;
}

/**
 * Leidt het meetnet af uit de prefix van de code. Het rapport filtert hierop:
 * met een verkeerde matrix komen er stilzwijgend nul resultaten terug.
 */
export function matrixVanCode(code: string): Matrix {
  if (code.startsWith("WB")) return "WB";
  // Biota draagt een eigen reeks, bv. B1000243.
  if (/^B\d/.test(code)) return "BI";
  return "OW";
}

export async function laadMeetplaatsen(basis: string): Promise<Meetplaats[]> {
  const antwoord = await fetch(new URL("data/meetplaatsen.json", basis));
  if (!antwoord.ok) {
    throw new Error(`Kon de meetplaatsen niet laden (status ${antwoord.status}).`);
  }

  const bestand = (await antwoord.json()) as { meetplaatsen: RuweMeetplaats[] };

  return bestand.meetplaatsen.map((ruw) => {
    const meetnetten = MEETNETTEN.filter((_, i) => (ruw.net & (1 << i)) !== 0);
    const code = codeVoor(ruw.nr, meetnetten);
    return {
      laag: "oppervlaktewater",
      id: ruw.nr,
      nummer: ruw.nr,
      code,
      matrix: matrixVanCode(code),
      omschrijving: ruw.oms,
      gemeente: ruw.gem,
      lon: ruw.lon,
      lat: ruw.lat,
      meetnetten,
      meetPfas: ruw.pfas === 1,
      zoeksleutel: `${ruw.nr} ${ruw.oms} ${ruw.gem ?? ""}`.toLowerCase(),
    };
  });
}

/** Hemelsbrede afstand in meter. */
export function afstand(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface LatLon {
  lat: number;
  lon: number;
}

export function formatteerAfstand(meter: number): string {
  if (meter < 1000) return `${Math.round(meter / 10) * 10} m`;
  return `${(meter / 1000).toFixed(meter < 10_000 ? 1 : 0).replace(".", ",")} km`;
}

/**
 * Zoekt op nummer, omschrijving en gemeente tegelijk — de gebruiker hoeft niet
 * te weten welk van de drie hij in handen heeft. Met een positie erbij komen de
 * dichtstbijzijnde punten eerst.
 */
export function zoek<T extends Meetpunt>(
  punten: readonly T[],
  term: string,
  vanaf?: LatLon,
  maximum = 50,
): T[] {
  const genormaliseerd = term.trim().toLowerCase().replace(/^ow|^wb/, "");
  const treffers = genormaliseerd
    ? punten.filter((m) => m.zoeksleutel.includes(genormaliseerd))
    : [...punten];

  if (vanaf) {
    treffers.sort((a, b) => afstand(vanaf, a) - afstand(vanaf, b));
  } else {
    // Zonder positie: exacte treffers eerst, dan op nummer. Sorteren gebeurt
    // op `id` en niet op de code, want het nummer uit de prefix terugrekenen
    // gaat mis bij codes als "OWTimbers 15" — daar blijft " 15" over, en een
    // spatie sorteert vóór elk cijfer.
    treffers.sort((a, b) => {
      const exactA = a.id.toLowerCase() === genormaliseerd ? 0 : 1;
      const exactB = b.id.toLowerCase() === genormaliseerd ? 0 : 1;
      return exactA - exactB || a.id.localeCompare(b.id, "nl", { numeric: true });
    });
  }

  return treffers.slice(0, maximum);
}

