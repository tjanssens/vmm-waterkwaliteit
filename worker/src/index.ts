/**
 * Doorgeefluik naar de VMM-waterkwaliteitsdatabank.
 *
 * De Cognos-server stuurt geen CORS-header, waardoor een statische pagina de
 * resultaten niet mag lezen. Deze Worker haalt ze op en geeft ze door.
 *
 * Bewust streng: enkel dit ene rapport, enkel gevalideerde parameters, enkel
 * de toegelaten origins. Zo is dit geen open proxy die anderen kunnen misbruiken.
 */

import { bouwCognosUrl, leesAanvraag, ValidatieFout } from "../../shared/cognos.js";

/** Antwoorden een etmaal bewaren: VMM vult de databank hoogstens dagelijks aan. */
const CACHE_SECONDEN = 86_400;
const TIJDSLIMIET_MS = 60_000;

export interface Env {
  /** Kommagescheiden lijst, bv. "https://tom.github.io,http://localhost:5173". */
  TOEGELATEN_ORIGINS?: string;
}

export default {
  async fetch(verzoek: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const cors = corsHeaders(verzoek.headers.get("Origin"), env);

    if (verzoek.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (verzoek.method !== "GET") return fout(405, "Alleen GET wordt ondersteund.", cors);

    let doelUrl: string;
    try {
      doelUrl = bouwCognosUrl(leesAanvraag(new URL(verzoek.url).searchParams));
    } catch (reden) {
      if (reden instanceof ValidatieFout) return fout(400, reden.message, cors);
      throw reden;
    }

    const cache = caches.default;
    const cacheSleutel = new Request(doelUrl, { method: "GET" });

    const bewaard = await cache.match(cacheSleutel);
    if (bewaard) return metHeaders(bewaard, cors, "HIT");

    let antwoord: Response;
    try {
      antwoord = await fetch(doelUrl, {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(TIJDSLIMIET_MS),
      });
    } catch {
      return fout(504, "De VMM-databank antwoordde niet op tijd. Probeer het later opnieuw.", cors);
    }

    if (!antwoord.ok) return fout(502, `De VMM-databank gaf status ${antwoord.status}.`, cors);

    const tekst = await antwoord.text();

    // Cognos meldt fouten met status 200 en een XML-body.
    if (tekst.startsWith("<")) {
      return fout(502, "De VMM-databank gaf een foutmelding in plaats van resultaten.", cors);
    }

    const resultaat = new Response(tekst, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDEN}`,
      },
    });

    ctx.waitUntil(cache.put(cacheSleutel, resultaat.clone()));
    return metHeaders(resultaat, cors, "MISS");
  },
} satisfies ExportedHandler<Env>;

function corsHeaders(origin: string | null, env: Env): Headers {
  const toegelaten = (env.TOEGELATEN_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const headers = new Headers({
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  });

  if (origin && toegelaten.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function metHeaders(antwoord: Response, cors: Headers, cacheStatus: string): Response {
  const resultaat = new Response(antwoord.body, antwoord);
  cors.forEach((waarde, naam) => resultaat.headers.set(naam, waarde));
  resultaat.headers.set("X-Cache", cacheStatus);
  return resultaat;
}

function fout(status: number, boodschap: string, cors: Headers): Response {
  const headers = new Headers(cors);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({ fout: boodschap }), { status, headers });
}
