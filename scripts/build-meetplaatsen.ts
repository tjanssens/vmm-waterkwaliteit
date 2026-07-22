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

const WFS = "https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs";
const GEMEENTEN_WFS = "https://geo.api.vlaanderen.be/VRBG/wfs";

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
}

const MEETNETTEN = [
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
  console.log("Meetplaatsen ophalen…");
  const punten = await haal<MeetplaatsEigenschappen>(WFS, "MeetplOppervlwaterkwal:Mtploppw");
  console.log(`  ${punten.features.length} meetplaatsen`);

  console.log("Gemeentegrenzen ophalen…");
  const gemeenten = await haal<{ NAAM: string }>(GEMEENTEN_WFS, "VRBG:Refgem");
  console.log(`  ${gemeenten.features.length} gemeenten`);

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
    };
  });

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
