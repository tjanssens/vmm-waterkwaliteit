import { haalLuchtmetingen, haalStations, luchtBronUrl, type Luchtstation } from "../data/lucht.js";
import type { Bronverwijzing, Laagprofiel, Meetpunt, Periode } from "./types.js";

export interface Luchtpunt extends Meetpunt {
  laag: "lucht";
  /** Interne id van de IRCELINE-API, nodig om de tijdreeksen op te vragen. */
  stationId: string;
}

/**
 * De vensters waaruit de bezoeker kiest. Anders dan bij water bepaalt deze
 * keuze wát er opgehaald wordt: een jaar uurmetingen halen we niet binnen om
 * er twee dagen van te tonen.
 */
const VENSTERS: readonly Periode[] = [
  { id: "48u", label: "48 uur", dagen: 2 },
  { id: "7d", label: "7 dagen", dagen: 7 },
  { id: "30d", label: "30 dagen", dagen: 30 },
  { id: "1j", label: "1 jaar", dagen: 365 },
];

const STANDAARD = VENSTERS[1]!;

function beginVan(periode: Periode, tot: Date): Date {
  const dagen = periode.dagen ?? STANDAARD.dagen!;
  return new Date(tot.getTime() - dagen * 24 * 60 * 60 * 1000);
}

/** Verzameld tijdens het laden, zodat `bron()` de stationId terugvindt. */
function alsStation(punt: Luchtpunt): Luchtstation {
  return {
    stationId: punt.stationId,
    code: punt.code,
    plaats: punt.omschrijving,
    lat: punt.lat,
    lon: punt.lon,
  };
}

/**
 * Luchtkwaliteit uit het meetnet van IRCELINE. Anders dan de VMM-databank
 * stuurt die API wel CORS-headers, dus hier komt geen proxy aan te pas.
 */
export const LUCHT: Laagprofiel<Luchtpunt> = {
  id: "lucht",
  naam: "Lucht",
  eyebrow: "Meetstation luchtkwaliteit",
  merk: { vorm: "driehoek", kleur: "#a85200" },

  perVenster: false,
  async laadPunten() {
    const stations = await haalStations();
    return stations.map((station) => ({
      laag: "lucht" as const,
      id: station.stationId,
      code: station.code,
      omschrijving: station.plaats,
      // IRCELINE geeft geen gemeente mee; de plaatsnaam in het stationslabel
      // is het dichtste dat we hebben en staat al in de omschrijving.
      gemeente: null,
      lat: station.lat,
      lon: station.lon,
      stationId: station.stationId,
      zoeksleutel: `${station.code} ${station.plaats}`.toLowerCase(),
    }));
  },

  tijdas: {
    soort: "per-periode",
    periodes: () => VENSTERS,
    standaard: () => STANDAARD,
    haal: (punt, periode, signaal) => {
      const tot = new Date();
      return haalLuchtmetingen(alsStation(punt), beginVan(periode, tot), tot, signaal);
    },
    ladenTekst: (periode) =>
      `Metingen van de laatste ${periode.label} ophalen bij het meetnet van IRCELINE…` +
      // Een jaar uurmetingen is voor elf stoffen al snel tienduizenden waarden.
      ((periode.dagen ?? 0) > 90 ? " Een heel jaar uurmetingen duurt ongeveer een minuut." : ""),
  },

  normensetten: ["lucht-eu"],
  standaardNormenset: "lucht-eu",

  feiten(punt) {
    const regels: Array<[string, string]> = [];
    if (punt.omschrijving) regels.push(["Plaats", punt.omschrijving]);
    regels.push(["Stationscode", punt.code]);
    return regels;
  },

  bron(punt): Bronverwijzing {
    return {
      url: luchtBronUrl(alsStation(punt)),
      tekst: `Meetreeksen van station ${punt.code} bij IRCELINE`,
      uitleg:
        "de gegevens zoals IRCELINE ze publiceert, met per stof de laatste meting. " +
        "Er is geen webpagina per station, dus dit is de bron zelf.",
      context: { url: "https://www.irceline.be/nl", tekst: "Belgische luchtkwaliteit" },
    };
  },

  toelichting: (periode) =>
    `Per stof tonen we het gemiddelde over de laatste ${periode.label}, met de laagste en ` +
    "hoogste gemeten waarde. De metingen zijn uurwaarden en niet definitief gevalideerd.",

  leegTekst: () => "Dit station heeft in het gekozen venster niets gemeten.",
  leegHint:
    "Niet elk station meet alle stoffen, en meetreeksen kunnen onderbroken zijn voor onderhoud of ijking.",
};
