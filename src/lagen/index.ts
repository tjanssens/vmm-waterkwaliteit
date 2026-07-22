import { OPPERVLAKTEWATER } from "./oppervlaktewater.js";
import type { Laagprofiel, LaagId } from "./types.js";

/**
 * Alle databronnen die de kaart kent, in de volgorde waarin ze in de
 * linkerkolom staan. Een laag toevoegen hoort hier één regel te kosten.
 */
export const LAGEN: readonly Laagprofiel[] = [OPPERVLAKTEWATER as Laagprofiel];

export function laagprofiel(id: LaagId): Laagprofiel | undefined {
  return LAGEN.find((laag) => laag.id === id);
}

export * from "./types.js";
