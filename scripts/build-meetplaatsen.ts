/**
 * Haalt de meetplaatsen op bij Digitaal Vlaanderen en slankt ze af tot een
 * bestand dat de app in één keer kan inladen.
 *
 * Draait bij de build en periodiek via GitHub Actions — niet per bezoeker.
 * De ruwe WFS-respons is ~2,6 MB; wat we bewaren is een fractie daarvan.
 *
 *   npm run data:meetplaatsen
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
// Uit de app geïmporteerd en niet overgetypt: de volgorde ís het
// bestandsformaat. Het script schrijft bitvlaggen (net |= 1 << i) die de app
// terugleest; herschikt iemand een van beide lijsten, dan wordt "Waterbodem"
// stilzwijgend "Macrofyten" en faalt er geen enkele test.
import { MEETNETTEN } from "../src/geo/meetplaatsen.js";

const WFS = "https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs";
const GEMEENTEN_WFS = "https://geo.api.vlaanderen.be/VRBG/wfs";
/** DOV publiceert de PFAS-metingen in oppervlaktewater als aparte laag. */
const PFAS_WFS = "https://www.dov.vlaanderen.be/geoserver/pfas/wfs";
/** GeoServer levert er nooit meer dan tienduizend per aanroep. */
const PAGINA = 10_000;

interface WfsAntwoord<T> {
  features: { geometry: { type: string; coordinates: unknown }; properties: T }[];
}

interface MeetplaatsEigenschappen {
  MEETPLNR: string;
  OMSCHR: string;
  FYSICOCHEM: number;
  BACTERIO: number;
  ZUURSTOF: number;
  WATBODEM: number;
  MACROINV: number;
  MACROFYT: number;
  FYTOBENT: number;
  FYTOPLANKT: number;
  MAP_MEETNT: number;
}

/** Compacte vorm: arrays in plaats van objecten schelen ruim de helft. */
interface Meetplaats {
  /** Meetplaatsnummer zoals op de kaart, bv. "65000". */
  nr: string;
  /** Omschrijving van de locatie. */
  oms: string;
  /** Lengte- en breedtegraad, afgerond op ~1 m. */
  lon: number;
  lat: number;
  /** Gemeentenaam, ruimtelijk bepaald. */
  gem: string | null;
  /** Meetnetten waarin dit punt zit, als bitvlag — zie MEETNETTEN. */
  net: number;
  /** 1 als hier PFAS gemeten is. Ontbreekt bij de overige 7.255 punten. */
  pfas?: 1;
}

async function haal<T>(basis: string, laag: string, extra: Record<string, string> = {}) {
  const url = new URL(basis);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", laag);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  for (const [sleutel, waarde] of Object.entries(extra)) url.searchParams.set(sleutel, waarde);

  const antwoord = await fetch(url, { signal: AbortSignal.timeout(180_000) });
  if (!antwoord.ok) throw new Error(`${laag}: WFS gaf status ${antwoord.status}`);
  return (await antwoord.json()) as WfsAntwoord<T>;
}

/**
 * De meetplaatsen waar PFAS in oppervlaktewater gemeten is.
 *
 * De laag bevat één rij per meting — ruim 92.000 — maar slechts een paar
 * honderd verschillende meetplaatsen. Die nummers zijn dezelfde als in het
 * meetplaatsenbestand, dus ze zijn zo aan elkaar te knopen.
 *
 * Er wordt gepagineerd omdat GeoServer stilzwijgend op tienduizend afkapt:
 * zonder paginering zou de lijst er compleet uitzien en dat niet zijn.
 */
async function haalPfasMeetplaatsen(): Promise<Set<string>> {
  const nummers = new Set<string>();

  for (let start = 0; ; start += PAGINA) {
    const pagina = await haal<{ meetplaats: number | string }>(PFAS_WFS, "pfas:pfas_oppwater", {
      propertyName: "meetplaats",
      count: String(PAGINA),
      startIndex: String(start),
    });

    for (const rij of pagina.features) nummers.add(String(rij.properties.meetplaats));
    if (pagina.features.length < PAGINA) break;
  }

  return nummers;
}

/** Straalmethode: telt hoe vaak een horizontale lijn de rand kruist. */
function inRing(lon: number, lat: number, ring: number[][]): boolean {
  let binnen = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      binnen = !binnen;
    }
  }
  return binnen;
}

async function main() {
  // De drie ophalingen hangen niet van elkaar af; achter elkaar wachten zou
  // de twee kortste er nodeloos bij optellen.
  console.log("Meetplaatsen, gemeentegrenzen en PFAS-meetplaatsen ophalen…");
  const [punten, gemeenten, pfas] = await Promise.all([
    haal<MeetplaatsEigenschappen>(WFS, "MeetplOppervlwaterkwal:Mtploppw"),
    haal<{ NAAM: string }>(GEMEENTEN_WFS, "VRBG:Refgem"),
    haalPfasMeetplaatsen(),
  ]);
  console.log(`  ${punten.features.length} meetplaatsen`);
  console.log(`  ${gemeenten.features.length} gemeenten`);
  console.log(`  ${pfas.size} meetplaatsen met PFAS-metingen`);

  // Buitenste ring per gemeente, met omhullende doos als snelle voorselectie.
  const grenzen = gemeenten.features.map((gemeente) => {
    const ringen =
      gemeente.geometry.type === "MultiPolygon"
        ? (gemeente.geometry.coordinates as number[][][][]).map((p) => p[0] as number[][])
        : [(gemeente.geometry.coordinates as number[][][])[0] as number[][]];
    const alle = ringen.flat();
    const lons = alle.map((p) => p[0] as number);
    const lats = alle.map((p) => p[1] as number);
    return {
      naam: gemeente.properties.NAAM,
      ringen,
      doos: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as const,
    };
  });

  console.log("Gemeente per meetplaats bepalen…");
  const meetplaatsen: Meetplaats[] = punten.features.map((punt) => {
    const [lon, lat] = punt.geometry.coordinates as [number, number];
    const eigen = punt.properties;

    let gemeente: string | null = null;
    for (const grens of grenzen) {
      const [minLon, minLat, maxLon, maxLat] = grens.doos;
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      if (grens.ringen.some((ring) => inRing(lon, lat, ring))) {
        gemeente = grens.naam;
        break;
      }
    }

    let net = 0;
    MEETNETTEN.forEach((sleutel, i) => {
      if (eigen[sleutel] === 1) net |= 1 << i;
    });

    return {
      nr: eigen.MEETPLNR,
      oms: eigen.OMSCHR,
      lon: Number(lon.toFixed(5)),
      lat: Number(lat.toFixed(5)),
      gem: gemeente,
      net,
      ...(pfas.has(eigen.MEETPLNR) ? { pfas: 1 as const } : {}),
    };
  });

  const metPfas = meetplaatsen.filter((m) => m.pfas).length;
  console.log(`  ${metPfas} van de ${pfas.size} PFAS-meetplaatsen teruggevonden`);

  const zonderGemeente = meetplaatsen.filter((m) => m.gem === null).length;
  console.log(`  ${meetplaatsen.length - zonderGemeente} toegewezen, ${zonderGemeente} buiten Vlaanderen of op de grens`);

  const doel = fileURLToPath(new URL("../public/data/meetplaatsen.json", import.meta.url));
  mkdirSync(dirname(doel), { recursive: true });
  writeFileSync(
    doel,
    JSON.stringify({ meetnetten: MEETNETTEN, opgehaald: new Date().toISOString().slice(0, 10), meetplaatsen }),
    "utf8",
  );

  const kb = Math.round(Buffer.byteLength(JSON.stringify(meetplaatsen)) / 1024);
  console.log(`Geschreven naar public/data/meetplaatsen.json (${kb} kB)`);
}

main().catch((reden) => {
  console.error(reden);
  process.exit(1);
});
