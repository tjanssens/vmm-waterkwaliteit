import { parseAnalyseresultaten } from "./csv.js";
import { DatabankFout, isAfgebroken } from "./fouten.js";
import { rapportUrl } from "../../shared/cognos.js";
import type { Meting } from "./types.js";

/**
 * In productie wijst dit naar de Cloudflare Worker, tijdens ontwikkeling naar
 * de dev-middleware in vite.config.ts. Zet VITE_PROXY_URL bij de build.
 */
const DEV_PAD = "/api/resultaten";
// Een niet-ingestelde GitHub-variabele komt als lege string binnen, niet als
// undefined; ?? zou daar overheen kijken.
const PROXY = import.meta.env.VITE_PROXY_URL?.trim() || DEV_PAD;

/**
 * Zonder VITE_PROXY_URL valt de app terug op het dev-pad, dat alleen bestaat
 * terwijl de ontwikkelserver draait. Dat willen we uitleggen in plaats van de
 * bezoeker op een onbegrijpelijke netwerkfout te laten lopen.
 */
function proxyOntbreekt(): boolean {
  return PROXY === DEV_PAD && !["localhost", "127.0.0.1"].includes(location.hostname);
}

// Blijft hier geëxporteerd zodat bestaande imports blijven werken; de
// definitie staat in fouten.ts, naast de andere bronnen.
export { DatabankFout } from "./fouten.js";

/**
 * Waar de getoonde cijfers vandaan komen: het VMM-rapport voor dit meetpunt,
 * met de keuzes al ingevuld. Dat is de pagina waarop de VMM deze cijfers
 * publiceert, en dus de bron om naar te verwijzen.
 */
export function bronUrls(meetplaats: string, matrix: string, jaren: number[]) {
  return {
    rapport: rapportUrl({ meetplaats, matrix, jaren: jaren.map(String) }),
    databank:
      "https://vmm.vlaanderen.be/feiten-cijfers/water/kwaliteit-waterlopen/databank-waterkwaliteit",
  };
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
  if (proxyOntbreekt()) {
    throw new DatabankFout(
      "De resultatenservice is voor deze installatie nog niet ingesteld. " +
        "De kaart en het zoeken werken wel; meetresultaten opvragen nog niet. " +
        "Zie de README onder 'Uitrollen'.",
      false,
    );
  }

  const url = new URL(PROXY, location.origin);
  url.searchParams.set("meetplaats", meetplaats);
  url.searchParams.set("matrix", matrix);
  url.searchParams.set("jaren", jaren.join(","));

  // Niet via haalOp: deze proxy stuurt bij een fout een eigen boodschap mee in
  // een JSON-body, en die is bruikbaarder dan de statuscode.
  let antwoord: Response;
  try {
    antwoord = await fetch(url, { signal: signaal });
  } catch (reden) {
    if (isAfgebroken(reden)) throw reden;
    throw new DatabankFout(
      "Geen verbinding met de databank. Controleer je internetverbinding.",
      true,
    );
  }

  if (!antwoord.ok) {
    throw new DatabankFout(await leesFout(antwoord), antwoord.status >= 500);
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
