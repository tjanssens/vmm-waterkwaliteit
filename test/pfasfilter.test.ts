import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { OPPERVLAKTEWATER } from "../src/lagen/oppervlaktewater.js";
import type { Meetplaats } from "../src/geo/meetplaatsen.js";

const punt = (meetPfas: boolean): Meetplaats => ({
  laag: "oppervlaktewater",
  id: "834900",
  nummer: "834900",
  code: "OW834900",
  matrix: "OW",
  omschrijving: "Einde Sionkloosterlaan",
  gemeente: "Brasschaat",
  lat: 51.32898,
  lon: 4.49392,
  meetnetten: ["FYSICOCHEM"],
  meetPfas,
  zoeksleutel: "834900",
});

const pfasFilter = (OPPERVLAKTEWATER.puntfilters ?? []).find((f) => f.id === "PFAS")!;

interface Bestand {
  meetplaatsen: { nr: string; pfas?: 1 }[];
}

const bestand = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../public/data/meetplaatsen.json", import.meta.url)),
    "utf8",
  ),
) as Bestand;

describe("filter op punten die PFAS meten", () => {
  it("laat alleen punten met PFAS-metingen door", () => {
    expect(pfasFilter.label).toBe("Meet PFAS");
    expect(pfasFilter.past(punt(true))).toBe(true);
    expect(pfasFilter.past(punt(false))).toBe(false);
  });

  it("staat naast de meetnetten en niet ertussen", () => {
    // PFAS is een stofgroep, geen meetnet. Het hoort achteraan zodat de
    // meetnetknoppen bij elkaar blijven staan.
    const ids = (OPPERVLAKTEWATER.puntfilters ?? []).map((f) => f.id);
    expect(ids).toEqual(["FYSICOCHEM", "BACTERIO", "WATBODEM", "MACROINV", "PFAS"]);
  });
});

describe("de ingebakken PFAS-index", () => {
  const gemarkeerd = bestand.meetplaatsen.filter((m) => m.pfas === 1);

  it("markeert de meetplaatsen die DOV als PFAS-meetplaats kent", () => {
    // DOV telt er 279. Zakt dit getal naar 26 of 10.000, dan is de paginering
    // stuk: GeoServer kapt stilzwijgend op tienduizend rijen af, en de eerste
    // tienduizend metingen beslaan maar 26 meetplaatsen.
    expect(gemarkeerd.length).toBe(279);
  });

  it("bevat het punt bij het fort van Brasschaat", () => {
    // 834900, waar in 2022 vijftig PFAS-parameters gemeten zijn. Ligt drie
    // meter van een punt uit een ander meetnet, dus juist hier helpt het
    // filter de bezoeker het goede punt te vinden.
    expect(gemarkeerd.some((m) => m.nr === "834900")).toBe(true);
  });

  it("markeert een kleine minderheid, niet zowat alles", () => {
    // Een filter dat 7.000 van de 7.534 punten overhoudt filtert niets.
    expect(gemarkeerd.length).toBeLessThan(bestand.meetplaatsen.length / 10);
  });
});
