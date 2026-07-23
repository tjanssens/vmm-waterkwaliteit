import { PER_JAAR, meetjaren } from "../data/aggregate.js";
import {
  haalGrondwatermetingen,
  haalGrondwaterpunt,
  haalGrondwaterpunten,
  type Grondwaterpunt,
} from "../data/grondwater.js";
import type { Bronverwijzing, Laagprofiel, Meetpunt } from "./types.js";

/** Hoeveel staalnames we standaard ophalen; DOV doet ~3 s per staalname. */
const STANDAARD_MONSTERS = 8;
/** Wat "volledige historiek" dekt. Verder terug is zelden nog iets te vinden. */
const VOLLEDIG_MONSTERS = 40;

/** Vanaf dit zoomniveau is het kaartvenster klein genoeg om te laden. */
const MINIMUM_ZOOM = 11;

/**
 * Diepteklassen voor het filteren op de kaart.
 *
 * De grenzen komen uit de verdeling zelf, geteld over de 14.303 filters die
 * chemie meten: 8.062 zitten op tien meter of ondieper, 2.757 tussen tien en
 * vijftig, 1.801 dieper, en van 1.683 is de diepte niet ingevuld.
 *
 * De indeling is niet cosmetisch. Een ondiepe filter meet water dat kort
 * geleden is ingesijpeld en volgt wat er vandaag op het maaiveld gebeurt; op
 * vijftig meter kan het water tientallen jaren oud zijn. Nitraat en pesticiden
 * uit dezelfde akker duiken daar pas veel later op; wie beide door elkaar
 * bekijkt, vergelijkt twee verschillende tijdvakken.
 *
 * Filters zonder diepte krijgen een eigen knop in plaats van stil weg te
 * vallen: het zijn er 1.683, en die zouden anders onvindbaar worden zodra
 * iemand op diepte filtert.
 */
const DIEPTEKLASSEN = [
  { id: "ondiep", label: "tot 10 m", tot: 10 },
  { id: "middeldiep", label: "10 – 50 m", van: 10, tot: 50 },
  { id: "diep", label: "dieper dan 50 m", van: 50 },
  { id: "onbekend", label: "diepte onbekend" },
] as const satisfies readonly {
  id: string;
  label: string;
  van?: number;
  tot?: number;
}[];

/** Of een filter in deze diepteklasse valt. */
function inKlasse(diepte: number | null, klasse: (typeof DIEPTEKLASSEN)[number]): boolean {
  const van = "van" in klasse ? klasse.van : undefined;
  const tot = "tot" in klasse ? klasse.tot : undefined;
  // De klasse zonder grenzen is die voor de filters zonder ingevulde diepte.
  if (van === undefined && tot === undefined) return diepte === null;
  if (diepte === null) return false;
  // Ondergrens exclusief, bovengrens inclusief: precies 10 m hoort bij "tot
  // 10 m" en niet bij allebei, anders telt de kaart hetzelfde punt dubbel.
  return (van === undefined || diepte > van) && (tot === undefined || diepte <= tot);
}

export interface Grondwaterfilter extends Meetpunt {
  laag: "grondwater";
  aquifer: string | null;
  onderkantM: number | null;
  meetnet: string | null;
  beheerder: string | null;
  filterfiche: string;
  analyserapport: string | null;
}

function naarFilter(p: Grondwaterpunt): Grondwaterfilter {
  return {
    laag: "grondwater",
    id: p.filterId,
    code: p.code,
    omschrijving: p.omschrijving,
    gemeente: p.gemeente,
    lat: p.lat,
    lon: p.lon,
    aquifer: p.aquifer,
    onderkantM: p.onderkantM,
    meetnet: p.meetnet,
    beheerder: p.beheerder,
    filterfiche: p.filterfiche,
    analyserapport: p.analyserapport,
    zoeksleutel: [p.code, p.omschrijving, p.gemeente ?? ""].join(" ").toLowerCase(),
  };
}

function alsPunt(filter: Grondwaterfilter): Grondwaterpunt {
  return {
    filterId: filter.id,
    code: filter.code,
    omschrijving: filter.omschrijving,
    gemeente: filter.gemeente,
    lat: filter.lat,
    lon: filter.lon,
    aquifer: filter.aquifer,
    onderkantM: filter.onderkantM,
    meetnet: filter.meetnet,
    beheerder: filter.beheerder,
    filterfiche: filter.filterfiche,
    analyserapport: filter.analyserapport,
  };
}

/**
 * Grondwaterkwaliteit uit Databank Ondergrond Vlaanderen.
 *
 * Deze laag laadt per kaartvenster in plaats van vooraf: 19.024 filters
 * inbakken zou het puntenbestand van de app ruim verdubbelen, terwijl DOV
 * CORS toestaat en server-side op een venster kan filteren.
 *
 * Het meetpunt is de *filter*, niet de put. Eén put kan meerdere filters op
 * verschillende dieptes hebben, elk met eigen metingen. Op 3 meter staat heel
 * ander water dan op 80 meter.
 */
export const GRONDWATER: Laagprofiel<Grondwaterfilter> = {
  id: "grondwater",
  naam: "Grondwater",
  eyebrow: "Grondwaterfilter (DOV)",
  merk: { vorm: "vierkant", kleur: "#5b46c4" },

  perVenster: true,
  minimumZoom: MINIMUM_ZOOM,
  async laadPunten(venster, signaal) {
    if (!venster) return [];
    const punten = await haalGrondwaterpunten(venster, signaal);
    return punten.map(naarFilter);
  },

  async puntOpId(id, signaal) {
    const punt = await haalGrondwaterpunt(id, signaal);
    return punt ? naarFilter(punt) : null;
  },

  tijdas: {
    soort: "uit-data",
    haal: (punt, signaal) => haalGrondwatermetingen(alsPunt(punt), STANDAARD_MONSTERS, signaal),
    // meetjaren geeft recentste eerst; de knoppenrij loopt oplopend.
    periodes: (metingen) =>
      meetjaren(metingen)
        .reverse()
        .map((jaar) => ({ id: String(jaar), label: String(jaar) })),
    bucketVan: PER_JAAR,
    ladenTekst: () =>
      `De laatste ${STANDAARD_MONSTERS} staalnames ophalen bij Databank Ondergrond Vlaanderen…`,
    uitbreiden: {
      label: "Volledige historiek",
      ladenTekst: () => "Alle staalnames ophalen; dat duurt bij deze bron ongeveer een halve minuut…",
      haal: (punt, signaal) => haalGrondwatermetingen(alsPunt(punt), VOLLEDIG_MONSTERS, signaal),
    },
  },

  puntfilters: DIEPTEKLASSEN.map((klasse) => ({
    id: klasse.id,
    label: klasse.label,
    past: (punt: Grondwaterfilter) => inKlasse(punt.onderkantM, klasse),
  })),

  normensetten: ["grondwater-vlarem", "grondwater"],
  standaardNormenset: "grondwater-vlarem",

  feiten(punt) {
    const regels: Array<[string, string]> = [];
    if (punt.gemeente) regels.push(["Gemeente", punt.gemeente]);
    if (punt.onderkantM !== null) {
      regels.push(["Filterdiepte", `${punt.onderkantM.toString().replace(".", ",")} m`]);
    }
    if (punt.aquifer) regels.push(["Watervoerende laag", punt.aquifer]);
    if (punt.meetnet) regels.push(["Meetnet", punt.meetnet]);
    if (punt.beheerder) regels.push(["Beheerder", punt.beheerder]);
    return regels;
  },

  bron(punt): Bronverwijzing {
    return {
      url: punt.filterfiche,
      tekst: `Filterfiche ${punt.code} bij DOV`,
      uitleg:
        "de pagina van Databank Ondergrond Vlaanderen waarop deze filter en zijn metingen staan.",
      ...(punt.analyserapport
        ? { context: { url: punt.analyserapport, tekst: "analyserapport (PDF)" } }
        : {}),
    };
  },

  toelichting: (periode) =>
    `Per parameter tonen we het gemiddelde over ${periode.label} en de laagste en hoogste ` +
    "gemeten waarde. Grondwater wordt enkele keren per jaar bemonsterd.",

  meetwijze: {
    tekst:
      "Metalen worden bij de staalname ter plaatse over een filter van 0,45 µm geleid, om bodemdeeltjes en wat daaraan kleeft te verwijderen. Wat hier staat is dus de opgeloste fractie en niet het volledige gehalte. Voor de toetsing betekent dat: een overschrijding telt zeker, want het opgeloste deel alleen haalt de norm al niet; blijft een metaal eronder, dan zegt dat niets over de deeltjes die eruit gefilterd zijn. Kwik kan bovendien onderschat zijn, doordat het aan het filtermembraan blijft kleven. Voorgeschreven in",
    bron: {
      naam: "WAC/I/A/005, §5.4.4.1, Compendium voor de monsterneming, meting en analyse van water",
      url: "https://reflabos.vito.be/2020/WAC_I_A_005.pdf",
    },
  },

  leegTekst: (uitgebreid) =>
    uitgebreid
      ? "Voor deze filter zijn geen analyseresultaten gevonden."
      : `Voor deze filter leverden de laatste ${STANDAARD_MONSTERS} staalnames geen resultaten op.`,
  leegHint:
    "Een filter kan wel voor het waterpeil gebruikt worden zonder dat er water bemonsterd wordt.",
};
