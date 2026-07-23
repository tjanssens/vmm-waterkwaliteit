import { PER_JAAR, meetjaren } from "../data/aggregate.js";
import { bronUrls, haalResultaten } from "../data/client.js";
import { MEETNET_NAMEN, laadMeetplaatsen, type Meetplaats } from "../geo/meetplaatsen.js";
import { sommMaakOp } from "../ui/format.js";
import type { Bronverwijzing, Laagprofiel, Periode } from "./types.js";

/** Hoeveel jaargangen we standaard ophalen; alles ophalen duurt ~12 s. */
const STANDAARD_JAREN = 5;
/** Wat "volledige historiek" dekt. Verder terug levert de databank niets op. */
const VOLLEDIG_JAREN = 20;

const laatsteJaren = (aantal: number): number[] => {
  const nu = new Date().getFullYear();
  return Array.from({ length: aantal }, (_, i) => nu - i);
};

/**
 * De laag waarmee deze app begon: de meetplaatsen oppervlaktewater van de VMM,
 * met de analyseresultaten uit de Cognos-databank.
 */
export const OPPERVLAKTEWATER: Laagprofiel<Meetplaats> = {
  id: "oppervlaktewater",
  naam: "Oppervlaktewater",
  eyebrow: "Meetplaats oppervlaktewater",
  // Kleuren van de drie lagen zijn samen door de palletvalidator gehaald:
  // lichtheid, chroma, onderling contrast en kleurenblindheid. Het paneelaccent
  // (#0b5f63) is te grijs voor een kaartmerk, net als bij de grafiekreeks.
  merk: { vorm: "cirkel", kleur: "#0090a8" },

  perVenster: false,
  laadPunten: () => laadMeetplaatsen(document.baseURI),

  tijdas: {
    soort: "uit-data",
    haal: (punt, signaal) =>
      haalResultaten(
        { meetplaats: punt.code, matrix: punt.matrix, jaren: laatsteJaren(STANDAARD_JAREN) },
        signaal,
      ),
    // meetjaren geeft recentste eerst; de knoppenrij loopt oplopend.
    periodes: (metingen) =>
      meetjaren(metingen)
        .reverse()
        .map((jaar) => ({ id: String(jaar), label: String(jaar) })),
    bucketVan: PER_JAAR,
    ladenTekst: () =>
      `Resultaten van de laatste ${STANDAARD_JAREN} jaar ophalen bij de VMM-databank…`,
    uitbreiden: {
      label: "Volledige historiek",
      ladenTekst: () =>
        `Resultaten van de laatste ${VOLLEDIG_JAREN} jaar ophalen bij de VMM-databank…`,
      haal: (punt, signaal) =>
        haalResultaten(
          { meetplaats: punt.code, matrix: punt.matrix, jaren: laatsteJaren(VOLLEDIG_JAREN) },
          signaal,
        ),
    },
  },

  // Meetnetten waarop filteren zinvol is; de rest zit in de details.
  puntfilters: [
    ...(["FYSICOCHEM", "BACTERIO", "WATBODEM", "MACROINV"] as const).map((net) => ({
      id: net,
      label: MEETNET_NAMEN[net],
      past: (punt: Meetplaats) => punt.meetnetten.includes(net),
    })),
    // PFAS is geen meetnet maar een stofgroep. Het staat hier omdat het de
    // vraag is die mensen werkelijk stellen, en omdat de resultatendatabank
    // ze niet kan beantwoorden: daarvoor zou je alle 7.534 punten moeten
    // bevragen. De PFAS-laag van DOV geeft het antwoord in één keer.
    {
      id: "PFAS",
      label: "Meet PFAS",
      past: (punt: Meetplaats) => punt.meetPfas,
    },
  ],

  normensetten: ["oppervlaktewater", "drinkwater"],
  standaardNormenset: "oppervlaktewater",

  feiten(punt) {
    const regels: Array<[string, string]> = [];
    if (punt.gemeente) regels.push(["Gemeente", punt.gemeente]);
    regels.push(["Meetplaatsnummer", punt.nummer]);
    if (punt.meetnetten.length) {
      regels.push(["Meetnetten", sommMaakOp(punt.meetnetten.map((n) => MEETNET_NAMEN[n]))]);
    }
    return regels;
  },

  bron(punt, periode): Bronverwijzing {
    const links = bronUrls(punt.code, punt.matrix, [Number(periode.id)]);
    return {
      url: links.rapport,
      tekst: `Analyseresultaten voor ${punt.code} in ${periode.label}`,
      uitleg:
        "het rapport van de VMM zelf, waarop deze cijfers gepubliceerd staan. " +
        "Het opent rechtstreeks op dit meetpunt en meetjaar.",
      context: { url: links.databank, tekst: "databank waterkwaliteit" },
    };
  },

  toelichting: (periode: Periode) =>
    `Per parameter tonen we het gemiddelde over ${periode.label} en de laagste en hoogste ` +
    "gemeten waarde — niet elke afzonderlijke staalname.",

  leegHint: "Meetplaatsen blijven op de kaart staan nadat ze uit een meetnet zijn gehaald.",

  leegTekst: (uitgebreid) =>
    `Voor deze meetplaats zijn geen analyseresultaten beschikbaar ${
      uitgebreid ? `over de laatste ${VOLLEDIG_JAREN} jaar` : `over de laatste ${STANDAARD_JAREN} jaar`
    }.`,
};
