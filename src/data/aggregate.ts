import type { Meting, ParameterSamenvatting } from "./types.js";

/** Hoe metingen over perioden verdeeld worden. */
export type Bucket = (meting: Meting) => string;

/** Per meetjaar — de indeling voor oppervlaktewater en grondwater. */
export const PER_JAAR: Bucket = (meting) => String(meting.jaar);

/**
 * Dicht losse metingen samen tot één regel per parameter per periode.
 * Een meetpunt levert al snel honderden metingen; de gebruiker leest liever
 * 46 parameters dan 466 staalnames.
 */
export function vatSamen(metingen: Meting[], bucket: Bucket = PER_JAAR): ParameterSamenvatting[] {
  const groepen = new Map<string, { bucket: string; metingen: Meting[] }>();

  for (const meting of metingen) {
    const emmer = bucket(meting);
    // Samengestelde sleutel: symbolen bevatten zelf spaties ("oPO4 f"), dus
    // aaneenplakken met een scheidingsteken zou kunnen botsen.
    const sleutel = JSON.stringify([meting.symbool, emmer]);
    const groep = groepen.get(sleutel);
    if (groep) groep.metingen.push(meting);
    else groepen.set(sleutel, { bucket: emmer, metingen: [meting] });
  }

  return [...groepen.values()]
    .map(({ bucket: emmer, metingen: groep }) => samenvattenGroep(groep, emmer))
    .sort(
      (a, b) => a.bucket.localeCompare(b.bucket, "nl") || a.symbool.localeCompare(b.symbool, "nl"),
    );
}

function samenvattenGroep(groep: Meting[], bucket: string): ParameterSamenvatting {
  const eerste = groep[0]!;
  const waarden = groep.map((m) => m.waarde);
  const onderLimiet = groep.filter((m) => m.onderDetectielimiet).length;

  return {
    symbool: eerste.symbool,
    omschrijving: eerste.omschrijving,
    eenheid: eerste.eenheid,
    bucket,
    aantal: groep.length,
    aantalOnderLimiet: onderLimiet,
    gemiddelde: waarden.reduce((som, w) => som + w, 0) / waarden.length,
    minimum: Math.min(...waarden),
    maximum: Math.max(...waarden),
    laatsteDatum: groep.reduce((laatst, m) => (m.datum > laatst ? m.datum : laatst), eerste.datum),
    volledigOnderLimiet: onderLimiet === groep.length,
  };
}

/** De jaren waarin dit meetpunt effectief bemonsterd is, recentste eerst. */
export function meetjaren(metingen: Meting[]): number[] {
  return [...new Set(metingen.map((m) => m.jaar))].sort((a, b) => b - a);
}
