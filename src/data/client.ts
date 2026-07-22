import { parseAnalyseresultaten } from "./csv.js";
import type { Meting } from "./types.js";

/**
 * In productie wijst dit naar de Cloudflare Worker, tijdens ontwikkeling naar
 * de dev-middleware in vite.config.ts. Zet VITE_PROXY_URL bij de build.
 */
const PROXY = import.meta.env.VITE_PROXY_URL ?? "/api/resultaten";

export class DatabankFout extends Error {
  constructor(
    boodschap: string,
    readonly herstelbaar: boolean,
  ) {
    super(boodschap);
    this.name = "DatabankFout";
  }
}

export interface Aanvraag {
  /** Meetplaatscode inclusief prefix, bv. "OW65000". */
  meetplaats: string;
  jaren: number[];
  matrix?: "OW" | "WB" | "BI";
}

/**
 * Haalt de analyseresultaten op. Eén aanroep kan meerdere jaren dekken; dat is
 * merkbaar sneller dan een aanroep per jaar (17 jaargangen duren ~12 s).
 */
export async function haalResultaten(
  { meetplaats, jaren, matrix = "OW" }: Aanvraag,
  signaal?: AbortSignal,
): Promise<Meting[]> {
  const url = new URL(PROXY, location.origin);
  url.searchParams.set("meetplaats", meetplaats);
  url.searchParams.set("matrix", matrix);
  url.searchParams.set("jaren", jaren.join(","));

  let antwoord: Response;
  try {
    antwoord = await fetch(url, { signal: signaal });
  } catch (reden) {
    if (reden instanceof DOMException && reden.name === "AbortError") throw reden;
    throw new DatabankFout(
      "Geen verbinding met de databank. Controleer je internetverbinding.",
      true,
    );
  }

  if (!antwoord.ok) {
    const boodschap = await leesFout(antwoord);
    throw new DatabankFout(boodschap, antwoord.status >= 500);
  }

  return parseAnalyseresultaten(await antwoord.text());
}

async function leesFout(antwoord: Response): Promise<string> {
  try {
    const body = (await antwoord.json()) as { fout?: string };
    if (body.fout) return body.fout;
  } catch {
    // Geen JSON-body; val terug op de status.
  }
  return `De databank gaf een onverwachte status (${antwoord.status}).`;
}
