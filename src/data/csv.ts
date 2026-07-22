import type { Meting } from "./types.js";

/**
 * Het endpoint bij de VMM is ongedocumenteerd. Wanneer het formaat verandert
 * willen we luid falen in plaats van stilzwijgend verkeerde cijfers tonen.
 */
export class FormaatFout extends Error {
  constructor(reden: string) {
    super(`Onverwacht antwoord van de VMM-databank: ${reden}`);
    this.name = "FormaatFout";
  }
}

const KOLOMMEN = [
  "Sample Point",
  "Datum",
  "Sample ID",
  "Tijdstip",
  "Parameter Symbool",
  "Parameter omschrijving",
  "Teken",
  "Resultaat",
  "Eenheid",
] as const;

/** Cognos levert tab-gescheiden tekst met een decimale komma. */
export function parseAnalyseresultaten(tekst: string): Meting[] {
  const regels = tekst.split(/\r?\n/).filter((r) => r.trim() !== "");
  if (regels.length === 0) throw new FormaatFout("leeg antwoord");

  const kop = regels[0]!.split("\t").map((k) => k.trim());
  if (kop.length !== KOLOMMEN.length || !KOLOMMEN.every((k, i) => kop[i] === k)) {
    throw new FormaatFout(`onbekende kolommen (${kop.slice(0, 3).join(", ")}…)`);
  }

  return regels.slice(1).map((regel, i) => leesRegel(regel, i + 2));
}

function leesRegel(regel: string, regelnummer: number): Meting {
  const velden = regel.split("\t");
  if (velden.length !== KOLOMMEN.length) {
    throw new FormaatFout(`regel ${regelnummer} heeft ${velden.length} kolommen`);
  }

  const [meetplaats, datum, staalId, tijdstip, symbool, omschrijving, teken, resultaat, eenheid] =
    velden as [string, string, string, string, string, string, string, string, string];

  const jaar = Number.parseInt(datum.slice(0, 4), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(jaar)) {
    throw new FormaatFout(`regel ${regelnummer} heeft geen geldige datum ("${datum}")`);
  }

  const waarde = Number(resultaat.trim().replace(",", "."));
  if (resultaat.trim() === "" || Number.isNaN(waarde)) {
    throw new FormaatFout(`regel ${regelnummer} heeft een onleesbaar resultaat ("${resultaat}")`);
  }

  return {
    meetplaats: meetplaats.trim(),
    datum,
    jaar,
    staalId: staalId.trim(),
    tijdstip: tijdstip.trim() === "" ? null : tijdstip.trim(),
    symbool: symbool.trim(),
    omschrijving: omschrijving.trim(),
    eenheid: eenheid.trim(),
    waarde,
    onderDetectielimiet: teken.trim() === "<",
  };
}
