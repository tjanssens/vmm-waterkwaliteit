import type { Meting } from "./types.js";
import { haalOp } from "./fouten.js";

/**
 * IRCELINE, het Belgische Interregionale Milieuagentschap, publiceert de
 * luchtmetingen via een open SOS-API. Die stuurt wél CORS-headers, dus hier is
 * geen proxy nodig, anders dan bij de VMM-waterdatabank.
 */
const BASIS = "https://geo.irceline.be/sos/api/v1";

/** Eén meetstation zoals de API het teruggeeft. */
interface RuwStation {
  properties: { id: number | string; label: string };
  geometry: { coordinates: [number, number, ...unknown[]] };
}

interface RuweReeks {
  id: string;
  uom: string;
  parameters?: { phenomenon?: { label?: string } };
}

/**
 * IRCELINE noemt de stoffen in het Engels en met een lange omschrijving.
 * Hier staan ze onder de code die een lezer herkent, met een Nederlandse naam.
 * Wat hier niet in staat, komt onder zijn eigen label door, beter een ruwe
 * naam tonen dan een meting laten vallen.
 */
export const STOFFEN: Readonly<Record<string, { symbool: string; naam: string }>> = {
  "Nitrogen dioxide": { symbool: "NO2", naam: "Stikstofdioxide" },
  "Nitrogen monoxide": { symbool: "NO", naam: "Stikstofmonoxide" },
  Ozone: { symbool: "O3", naam: "Ozon" },
  "Sulphur dioxide": { symbool: "SO2", naam: "Zwaveldioxide" },
  "Carbon Monoxide": { symbool: "CO", naam: "Koolstofmonoxide" },
  "Carbon Dioxide": { symbool: "CO2", naam: "Koolstofdioxide" },
  "Particulate Matter < 10 µm": { symbool: "PM10", naam: "Fijn stof (PM10)" },
  "Particulate Matter < 2.5 µm": { symbool: "PM2.5", naam: "Fijn stof (PM2,5)" },
  "Particulate Matter < 1 µm": { symbool: "PM1", naam: "Fijn stof (PM1)" },
  "Black Carbon": { symbool: "BC", naam: "Roet (black carbon)" },
  Benzene: { symbool: "C6H6", naam: "Benzeen" },
  Toluene: { symbool: "C7H8", naam: "Tolueen" },
  Ethylbenzene: { symbool: "C8H10", naam: "Ethylbenzeen" },
  "M+P-xylene": { symbool: "MPX", naam: "Meta- en paraxyleen" },
  "1,2-XYLENE O-XYLENE": { symbool: "OX", naam: "Orthoxyleen" },
  Ammonia: { symbool: "NH3", naam: "Ammoniak" },
  "Elemental gaseous mercury": { symbool: "Hg", naam: "Kwik, gasvormig" },
  "Particle number concentration 10-800 nm": {
    symbool: "PNC",
    naam: "Aantal deeltjes (10–800 nm)",
  },
  Temperature: { symbool: "T", naam: "Temperatuur" },
  "Relative Humidity": { symbool: "RV", naam: "Relatieve vochtigheid" },
  "Atmospheric  Pressure": { symbool: "P", naam: "Luchtdruk" },
  "Wind Direction": { symbool: "WR", naam: "Windrichting" },
  "Wind Speed (scalar)": { symbool: "WS", naam: "Windsnelheid" },
};

export interface Luchtstation {
  /** Interne id van de API, nodig om de tijdreeksen op te vragen. */
  stationId: string;
  /** De officiële stationscode, bv. "42R801". */
  code: string;
  /** De plaatsaanduiding, bv. "Borgerhout". */
  plaats: string;
  lat: number;
  lon: number;
}

/** Haalt alle meetstations op. Het zijn er ongeveer 137. */
export async function haalStations(signaal?: AbortSignal): Promise<Luchtstation[]> {
  const ruw = await haalJson<RuwStation[]>(`${BASIS}/stations?format=json`, signaal);

  return ruw.flatMap((station) => {
    const [lon, lat] = station.geometry?.coordinates ?? [];
    if (typeof lat !== "number" || typeof lon !== "number") return [];

    // Het label heeft de vorm "42R801 - Borgerhout".
    const label = station.properties.label ?? "";
    const streep = label.indexOf(" - ");
    const code = streep > 0 ? label.slice(0, streep).trim() : label.trim();
    const plaats = streep > 0 ? label.slice(streep + 3).trim() : "";

    return [{ stationId: String(station.properties.id), code, plaats, lat, lon }];
  });
}

/**
 * Haalt de metingen van één station over een tijdvenster. Twee aanroepen: eerst
 * welke reeksen dit station heeft, dan de waarden. Niet elk station meet alles.
 */
export async function haalLuchtmetingen(
  station: Luchtstation,
  vanaf: Date,
  tot: Date,
  signaal?: AbortSignal,
): Promise<Meting[]> {
  const reeksen = await haalReeksen(station, signaal);
  if (reeksen.length === 0) return [];

  const perId = new Map(reeksen.map((r) => [String(r.id), r]));
  const waarden = await haalJson<Record<string, { values?: { timestamp: number; value: number | null }[] }>>(
    `${BASIS}/timeseries/getData`,
    signaal,
    {
      timeseries: [...perId.keys()],
      timespan: `${vanaf.toISOString()}/${tot.toISOString()}`,
    },
  );

  const metingen: Meting[] = [];
  for (const [id, reeks] of Object.entries(waarden)) {
    const beschrijving = perId.get(id);
    if (!beschrijving) continue;

    const label = beschrijving.parameters?.phenomenon?.label ?? id;
    const stof = STOFFEN[label] ?? { symbool: label, naam: label };

    for (const punt of reeks.values ?? []) {
      // Een ontbrekende waarde is geen nul.
      if (punt.value === null || typeof punt.value !== "number") continue;

      const tijd = new Date(punt.timestamp);
      metingen.push({
        meetplaats: station.code,
        datum: tijd.toISOString().slice(0, 10),
        jaar: tijd.getUTCFullYear(),
        staalId: String(punt.timestamp),
        tijdstip: tijd.toISOString().slice(11, 19),
        symbool: stof.symbool,
        omschrijving: stof.naam,
        eenheid: beschrijving.uom ?? "",
        waarde: punt.value,
        // De API rapporteert geen detectielimieten.
        onderDetectielimiet: false,
      });
    }
  }

  return metingen;
}

/**
 * De URL die exact deze cijfers teruggeeft; dat is de bronvermelding bij lucht.
 *
 * Zonder expanded=true komen de stofnaam en de eenheid niet mee en heten de
 * parameters naar hun interne reeksnummer. Die val staat hier op een plek.
 */
export function luchtBronUrl(station: Luchtstation): string {
  return `${BASIS}/timeseries?station=${encodeURIComponent(station.stationId)}&expanded=true&format=json`;
}

/**
 * Welke reeksen dit station meet. Onthouden per station: die lijst hangt niet
 * van het tijdvenster af, terwijl de bezoeker wel van 48 uur naar 7 dagen naar
 * een jaar klikt. Zonder dit ging dezelfde aanroep bij elke klik opnieuw uit.
 */
const REEKSEN = new Map<string, RuweReeks[]>();

async function haalReeksen(station: Luchtstation, signaal?: AbortSignal): Promise<RuweReeks[]> {
  const onthouden = REEKSEN.get(station.stationId);
  if (onthouden) return onthouden;

  const reeksen = await haalJson<RuweReeks[]>(luchtBronUrl(station), signaal);
  REEKSEN.set(station.stationId, reeksen);
  return reeksen;
}

async function haalJson<T>(url: string, signaal?: AbortSignal, body?: unknown): Promise<T> {
  const antwoord = await haalOp(url, "het luchtmeetnet van IRCELINE", {
    signal: signaal,
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  });

  return (await antwoord.json()) as T;
}
