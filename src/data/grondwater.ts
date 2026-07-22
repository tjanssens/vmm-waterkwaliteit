import { DatabankFout } from "./client.js";
import type { Meting } from "./types.js";
import type { Vak } from "../lagen/types.js";

/**
 * Databank Ondergrond Vlaanderen publiceert de grondwatermeetnetten via een
 * WFS die CORS wél toestaat. Er komt dus geen proxy aan te pas.
 */
const WFS = "https://www.dov.vlaanderen.be/geoserver/gw_meetnetten/wfs";

const LOCATIES = "gw_meetnetten:grondwaterlocaties_met_metingen";
const MONSTERS = "gw_meetnetten:grondwatermonsters";
const OBSERVATIES = "gw_meetnetten:grondwaterobservaties";

/** Hoeveel punten we hoogstens per kaartvenster tekenen. */
const MAX_PUNTEN = 600;
/** Hoeveel gelijktijdige aanroepen; DOV doet ongeveer drie seconden per monster. */
const GELIJKTIJDIG = 6;

export interface Grondwaterpunt {
  /** Id van de filter zoals in de fiche-URL, bv. "1980-013427". */
  filterId: string;
  /** Putnaam plus filternummer, bv. "KALP312-1". */
  code: string;
  omschrijving: string;
  gemeente: string | null;
  lat: number;
  lon: number;
  /** Watervoerende laag waarin deze filter staat. */
  aquifer: string | null;
  onderkantM: number | null;
  meetnet: string | null;
  beheerder: string | null;
  /** Webpagina van deze filter bij DOV. */
  filterfiche: string;
  /** PDF met de analyseresultaten van deze filter. */
  analyserapport: string | null;
}

interface RuwePunt {
  properties: Record<string, string | number | null>;
  geometry: { coordinates: [number, number, ...unknown[]] } | null;
}

/**
 * Haalt de meetputten binnen een kaartvenster.
 *
 * Twee vallen zitten hierin. De BBOX gaat als lengte-, breedtegraad; met de
 * omgekeerde volgorde geeft de server nul punten zónder foutmelding. En
 * `bbox=` naast `CQL_FILTER=` mag niet, dus het venster staat ín de CQL.
 *
 * Alleen putten met kwaliteitsmetingen: van de 19.024 filters meten er 14.303
 * daadwerkelijk chemie, de rest houdt enkel het waterpeil bij. Een punt
 * aanklikken dat nooit iets te tonen heeft, is een lege belofte.
 */
export async function haalGrondwaterpunten(
  venster: Vak,
  signaal?: AbortSignal,
): Promise<Grondwaterpunt[]> {
  const cql =
    `BBOX(geom,${venster.west},${venster.zuid},${venster.oost},${venster.noord},'EPSG:4326')` +
    " AND kwaliteitsmetingen_van IS NOT NULL";

  const antwoord = await haal<{ features?: RuwePunt[] }>(
    LOCATIES,
    { CQL_FILTER: cql, count: String(MAX_PUNTEN) },
    signaal,
  );

  return (antwoord.features ?? [])
    .map(naarPunt)
    .filter((p): p is Grondwaterpunt => p !== null);
}

function naarPunt(ruw: RuwePunt): Grondwaterpunt | null {
  const [lon, lat] = ruw.geometry?.coordinates ?? [];
  const fiche = tekst(ruw.properties["filterfiche"]);
  if (typeof lat !== "number" || typeof lon !== "number" || !fiche) return null;

  const filterId = fiche.split("/").pop() ?? "";
  const put = tekst(ruw.properties["GW_ID"]) ?? filterId;
  const nummer = tekst(ruw.properties["filternummer"]);
  const diepte = getal(ruw.properties["onderkant_filter_m"]);

  return {
    filterId,
    code: nummer ? `${put}-${nummer}` : put,
    omschrijving: omschrijf(nummer, diepte),
    gemeente: tekst(ruw.properties["gemeente"]),
    lat,
    lon,
    aquifer: tekst(ruw.properties["Aquifer_HCOVv2"]),
    onderkantM: diepte,
    meetnet: tekst(ruw.properties["meetnet"]),
    beheerder: tekst(ruw.properties["beheerder"]),
    filterfiche: fiche,
    analyserapport: tekst(ruw.properties["analyserapport"]),
  };
}

/**
 * Eén filter op zijn id. Nodig voor de rapportweergave en de deelbare link:
 * die kennen alleen een id en kunnen niet eerst 19.024 punten ophalen.
 */
export async function haalGrondwaterpunt(
  filterId: string,
  signaal?: AbortSignal,
): Promise<Grondwaterpunt | null> {
  const antwoord = await haal<{ features?: RuwePunt[] }>(
    LOCATIES,
    { CQL_FILTER: `filterfiche LIKE '%filter/${veilig(filterId)}'`, count: "1" },
    signaal,
  );
  return (antwoord.features ?? []).map(naarPunt).find((p): p is Grondwaterpunt => p !== null) ?? null;
}

function omschrijf(nummer: string | null, diepte: number | null): string {
  const delen = [nummer ? `Filter ${nummer}` : "Filter"];
  if (diepte !== null) delen.push(`tot ${diepte.toString().replace(".", ",")} m diepte`);
  return delen.join(", ");
}

/**
 * Haalt de meetwaarden van één filter. Dat gaat in twee stappen, want een
 * observatie hangt aan een monster en een monster aan de filter; er is geen
 * laag die ze samenvoegt.
 *
 * DOV doet ongeveer drie seconden over de observaties van één monster, dus we
 * halen alleen de recentste staalnames op en doen dat parallel.
 */
export async function haalGrondwatermetingen(
  punt: Grondwaterpunt,
  maximaalMonsters: number,
  signaal?: AbortSignal,
): Promise<Meting[]> {
  const monsters = await haal<{ features?: RuwePunt[] }>(
    MONSTERS,
    {
      CQL_FILTER: `gekoppeld_aan_link LIKE '%filter/${veilig(punt.filterId)}%'`,
      count: "500",
      sortBy: "bemonsteringsdatum D",
    },
    signaal,
  );

  const links = (monsters.features ?? [])
    .map((m) => tekst(m.properties["monster_link"]))
    .filter((l): l is string => l !== null)
    .slice(0, maximaalMonsters);

  if (links.length === 0) return [];

  const stukken = await parallel(links, GELIJKTIJDIG, (link) =>
    haalObservaties(punt.code, link, signaal),
  );
  return stukken.flat();
}

async function haalObservaties(
  code: string,
  monsterLink: string,
  signaal?: AbortSignal,
): Promise<Meting[]> {
  const id = monsterLink.split("/").pop() ?? "";
  const antwoord = await haal<{ features?: RuwePunt[] }>(
    OBSERVATIES,
    { CQL_FILTER: `gekoppeld_aan_link LIKE '%monster/${veilig(id)}%'`, count: "500" },
    signaal,
  );

  return (antwoord.features ?? []).flatMap((ruw) => {
    const p = ruw.properties;
    const datum = tekst(p["fenomeentijd"])?.slice(0, 10);
    const naam = tekst(p["parameter"]);
    const waarde = getal(p["resultaat"]);
    if (!datum || !naam || waarde === null) return [];

    return [
      {
        meetplaats: code,
        datum,
        jaar: Number(datum.slice(0, 4)),
        staalId: id,
        tijdstip: null,
        symbool: naam,
        omschrijving: naam,
        eenheid: normaliseerEenheid(tekst(p["eenheid"]) ?? ""),
        waarde,
        // DOV noteert "<" wanneer de stof niet is aangetoond.
        onderDetectielimiet: tekst(p["detectieconditie"]) === "<",
      },
    ];
  });
}

/**
 * DOV schrijft de liter met een kleine letter ("µg/l"), onze normen met een
 * hoofdletter. Zonder gelijktrekken faalt élke eenheidsvergelijking stil en
 * krijgt alles "niet toetsbaar".
 */
export function normaliseerEenheid(eenheid: string): string {
  return eenheid.trim().replace(/\/l\b/i, "/L");
}

/** De pagina bij DOV waar deze cijfers te raadplegen zijn. */
export function grondwaterBron(punt: Grondwaterpunt): { fiche: string; rapport: string | null } {
  return { fiche: punt.filterfiche, rapport: punt.analyserapport };
}

// ---- gereedschap ----

/** Enkele aanhalingstekens zouden de CQL-expressie kunnen openbreken. */
function veilig(waarde: string): string {
  return waarde.replace(/[^A-Za-z0-9-]/g, "");
}

function tekst(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde.trim() !== "" ? waarde.trim() : null;
}

function getal(waarde: unknown): number | null {
  if (typeof waarde === "number") return Number.isFinite(waarde) ? waarde : null;
  if (typeof waarde !== "string") return null;
  const n = Number.parseFloat(waarde.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Draait taken in golfjes, zodat we DOV niet met honderd aanroepen bestoken. */
async function parallel<T, R>(
  items: readonly T[],
  breedte: number,
  taak: (item: T) => Promise<R>,
): Promise<R[]> {
  const uit: R[] = [];
  for (let i = 0; i < items.length; i += breedte) {
    uit.push(...(await Promise.all(items.slice(i, i + breedte).map(taak))));
  }
  return uit;
}

async function haal<T>(
  laag: string,
  extra: Record<string, string>,
  signaal?: AbortSignal,
): Promise<T> {
  const url = new URL(WFS);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("typeNames", laag);
  for (const [sleutel, waarde] of Object.entries(extra)) url.searchParams.set(sleutel, waarde);

  let antwoord: Response;
  try {
    antwoord = await fetch(url, { signal: signaal });
  } catch (reden) {
    if (reden instanceof DOMException && reden.name === "AbortError") throw reden;
    throw new DatabankFout(
      "Geen verbinding met Databank Ondergrond Vlaanderen. Controleer je internetverbinding.",
      true,
    );
  }

  if (!antwoord.ok) {
    throw new DatabankFout(
      `Databank Ondergrond Vlaanderen gaf een onverwachte status (${antwoord.status}).`,
      antwoord.status >= 500,
    );
  }

  // Bij een fout antwoordt GeoServer met XML, ook als je JSON vraagt.
  const tekstinhoud = await antwoord.text();
  if (tekstinhoud.startsWith("<")) {
    throw new DatabankFout(
      "Databank Ondergrond Vlaanderen gaf een antwoord in een onbekend formaat.",
      false,
    );
  }
  return JSON.parse(tekstinhoud) as T;
}
