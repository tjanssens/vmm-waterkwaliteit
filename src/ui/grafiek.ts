import type { Meting } from "../data/types.js";

/**
 * Als er meer dan een half jaar tussen twee staalnames zit, verbinden we ze
 * niet: een lijn over een gat van jaren suggereert een verloop dat niemand
 * gemeten heeft.
 */
export const MAX_GAT_DAGEN = 190;

export interface Punt {
  x: number;
  y: number;
  meting: Meting;
}

export interface Schaal {
  min: number;
  max: number;
  /** Zet een waarde om naar een positie binnen [0, lengte]. */
  naar(waarde: number): number;
}

/**
 * Lineaire schaal met wat lucht boven en onder, zodat punten niet tegen de
 * rand plakken. Een reeks met één waarde krijgt toch een zinnig bereik.
 */
export function maakSchaal(
  waarden: readonly number[],
  lengte: number,
  omgekeerd = false,
  /** Extra ruimte aan beide kanten, als fractie van het bereik. */
  lucht = 0,
): Schaal {
  let min = Math.min(...waarden);
  let max = Math.max(...waarden);

  if (min === max) {
    const marge = Math.abs(min) || 1;
    min -= marge * 0.5;
    max += marge * 0.5;
  }

  if (lucht > 0) {
    const speling = (max - min) * lucht;
    min -= speling;
    max += speling;
  }

  const bereik = max - min;
  return {
    min,
    max,
    naar(waarde) {
      const deel = (waarde - min) / bereik;
      return omgekeerd ? lengte - deel * lengte : deel * lengte;
    },
  };
}

/** Ronde tickwaarden binnen een bereik: 1, 2, 2.5 of 5 maal een macht van tien. */
export function kiesTicks(min: number, max: number, streefaantal = 5): number[] {
  if (!(max > min)) return [min];

  const ruweStap = (max - min) / streefaantal;
  const macht = 10 ** Math.floor(Math.log10(ruweStap));
  const genormaliseerd = ruweStap / macht;
  const factor = genormaliseerd <= 1 ? 1 : genormaliseerd <= 2 ? 2 : genormaliseerd <= 2.5 ? 2.5 : 5;
  const stap = factor * macht;

  const ticks: number[] = [];
  for (let t = Math.ceil(min / stap) * stap; t <= max + stap * 1e-9; t += stap) {
    // Drijvende komma laat 0.30000000000000004 achter; afronden op de stap.
    ticks.push(Number(t.toFixed(10)));
  }
  return ticks;
}

/** Aantal dagen tussen twee ISO-datums. */
export function dagenTussen(vroeger: string, later: string): number {
  const ms = Date.parse(later) - Date.parse(vroeger);
  return ms / 86_400_000;
}

/**
 * Splitst de reeks in aaneengesloten stukken. Elk stuk wordt één lijn; tussen
 * de stukken blijft de grafiek leeg.
 */
export function splitsInReeksen(punten: readonly Punt[]): Punt[][] {
  const reeksen: Punt[][] = [];
  let huidig: Punt[] = [];

  for (const punt of punten) {
    const vorige = huidig[huidig.length - 1];
    if (vorige && dagenTussen(vorige.meting.datum, punt.meting.datum) > MAX_GAT_DAGEN) {
      reeksen.push(huidig);
      huidig = [];
    }
    huidig.push(punt);
  }

  if (huidig.length > 0) reeksen.push(huidig);
  return reeksen;
}

export function bouwPad(punten: readonly Punt[]): string {
  return punten
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/** Metingen op volgorde van datum, oplopend. */
export function opDatum(metingen: readonly Meting[]): Meting[] {
  return [...metingen].sort((a, b) => a.datum.localeCompare(b.datum));
}
