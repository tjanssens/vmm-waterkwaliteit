import { describe, expect, it } from "vitest";
import { GRONDWATER, type Grondwaterfilter } from "../src/lagen/grondwater.js";

const filter = (onderkantM: number | null): Grondwaterfilter => ({
  laag: "grondwater",
  id: "2003-005059",
  code: "620/72/2-1",
  omschrijving: "Filter 1",
  gemeente: "Landen",
  lat: 50.75,
  lon: 5.08,
  aquifer: null,
  onderkantM,
  meetnet: null,
  beheerder: null,
  filterfiche: "https://example.invalid/filter/2003-005059",
  analyserapport: null,
  zoeksleutel: "620/72/2-1",
});

const filters = GRONDWATER.puntfilters ?? [];
const past = (id: string, diepte: number | null): boolean =>
  filters.find((f) => f.id === id)!.past(filter(diepte));

/** In welke klassen dit punt valt. Precies één is het juiste antwoord. */
const klassenVoor = (diepte: number | null): string[] =>
  filters.filter((f) => f.past(filter(diepte))).map((f) => f.id);

describe("diepteklassen van grondwaterfilters", () => {
  it("deelt elke diepte in precies één klasse in", () => {
    // De filters zijn een OR: zit een punt in twee klassen, dan verschijnt het
    // dubbel zodra de gebruiker beide aanzet.
    for (const diepte of [0, 0.5, 5, 9.9, 10, 10.1, 25, 50, 50.1, 120, 400, null]) {
      expect(klassenVoor(diepte)).toHaveLength(1);
    }
  });

  it("legt de grens op de bovengrens, niet op allebei", () => {
    // Precies 10 m hoort bij "tot 10 m".
    expect(klassenVoor(10)).toEqual(["ondiep"]);
    expect(klassenVoor(50)).toEqual(["middeldiep"]);
  });

  it("laat een filter zonder ingevulde diepte niet verdwijnen", () => {
    // 1.683 van de 14.303 filters hebben geen diepte. Zonder eigen klasse
    // zouden die onvindbaar worden zodra iemand op diepte filtert.
    expect(klassenVoor(null)).toEqual(["onbekend"]);
    expect(past("ondiep", null)).toBe(false);
    expect(past("diep", null)).toBe(false);
  });

  it("houdt een ondiepe filter uit de diepe klasse", () => {
    // Op 3 meter staat heel ander water dan op 80: het eerste volgt wat er nu
    // op het maaiveld gebeurt, het tweede is tientallen jaren oud.
    expect(past("ondiep", 3)).toBe(true);
    expect(past("diep", 3)).toBe(false);
    expect(past("diep", 80)).toBe(true);
  });

  it("houdt de labels leesbaar zonder de laag erbij", () => {
    expect(filters.map((f) => f.label)).toEqual([
      "tot 10 m",
      "10 – 50 m",
      "dieper dan 50 m",
      "diepte onbekend",
    ]);
  });
});
