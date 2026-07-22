import { describe, expect, it } from "vitest";
import {
  bouwPad,
  dagenTussen,
  kiesTicks,
  maakSchaal,
  opDatum,
  splitsInReeksen,
  type Punt,
} from "../src/ui/grafiek.js";
import type { Meting } from "../src/data/types.js";

const meting = (datum: string, waarde = 1): Meting => ({
  meetplaats: "OW65000",
  datum,
  jaar: Number(datum.slice(0, 4)),
  staalId: "1",
  tijdstip: null,
  symbool: "O2",
  omschrijving: "Zuurstof",
  eenheid: "mg/L",
  waarde,
  onderDetectielimiet: false,
});

const punt = (datum: string, x = 0, y = 0): Punt => ({ x, y, meting: meting(datum) });

describe("maakSchaal", () => {
  it("zet de minimumwaarde op nul en de maximumwaarde op de volle lengte", () => {
    const schaal = maakSchaal([0, 10], 100);

    expect(schaal.naar(0)).toBe(0);
    expect(schaal.naar(10)).toBe(100);
    expect(schaal.naar(5)).toBe(50);
  });

  it("keert de as om voor schermcoördinaten, waar y omlaag loopt", () => {
    const schaal = maakSchaal([0, 10], 100, true);

    expect(schaal.naar(0)).toBe(100);
    expect(schaal.naar(10)).toBe(0);
  });

  it("geeft een reeks met één waarde toch een bruikbaar bereik", () => {
    // Waterbodem levert soms één meting per parameter; delen door nul mag niet.
    const schaal = maakSchaal([5], 100);

    expect(schaal.min).toBeLessThan(5);
    expect(schaal.max).toBeGreaterThan(5);
    expect(Number.isFinite(schaal.naar(5))).toBe(true);
  });

  it("gaat om met waarden van nul", () => {
    const schaal = maakSchaal([0], 100);
    expect(Number.isFinite(schaal.naar(0))).toBe(true);
  });

  it("houdt met lucht de uiterste punten van de rand af", () => {
    const schaal = maakSchaal([0, 10], 100, false, 0.1);

    expect(schaal.naar(0)).toBeGreaterThan(0);
    expect(schaal.naar(10)).toBeLessThan(100);
    expect(schaal.min).toBeLessThan(0);
    expect(schaal.max).toBeGreaterThan(10);
  });
});

describe("kiesTicks", () => {
  it("kiest ronde waarden", () => {
    expect(kiesTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("werkt ook op kleine concentraties", () => {
    // Orthofosfaat loopt van 0,02 tot 0,33 mgP/L.
    const ticks = kiesTicks(0, 0.35, 5);

    expect(ticks[0]).toBe(0);
    expect(ticks.every((t) => Number.isFinite(t))).toBe(true);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(0.35);
  });

  it("laat geen drijvendekommaruis achter", () => {
    for (const tick of kiesTicks(0, 1, 5)) {
      expect(String(tick).length).toBeLessThan(8);
    }
  });

  it("geeft één tick terug voor een leeg bereik", () => {
    expect(kiesTicks(5, 5)).toEqual([5]);
  });
});

describe("dagenTussen", () => {
  it("telt de dagen tussen twee datums", () => {
    expect(dagenTussen("2024-01-01", "2024-01-31")).toBe(30);
  });
});

describe("splitsInReeksen", () => {
  it("houdt metingen binnen één meetjaar aan elkaar", () => {
    const reeksen = splitsInReeksen([
      punt("2024-01-11"),
      punt("2024-03-05"),
      punt("2024-06-18"),
    ]);

    expect(reeksen).toHaveLength(1);
    expect(reeksen[0]).toHaveLength(3);
  });

  it("breekt de lijn bij een gat van jaren", () => {
    // OW65000 heeft data in 2017 en pas weer in 2024. Een lijn daartussen zou
    // een verloop suggereren dat nooit gemeten is.
    const reeksen = splitsInReeksen([
      punt("2017-05-01"),
      punt("2017-11-01"),
      punt("2024-01-11"),
      punt("2024-06-01"),
    ]);

    expect(reeksen).toHaveLength(2);
    expect(reeksen[0]).toHaveLength(2);
    expect(reeksen[1]).toHaveLength(2);
  });

  it("geeft een lege lijst terug zonder punten", () => {
    expect(splitsInReeksen([])).toEqual([]);
  });

  it("kan overweg met één punt", () => {
    expect(splitsInReeksen([punt("2024-01-01")])).toHaveLength(1);
  });
});

describe("bouwPad", () => {
  it("begint met M en gaat verder met L", () => {
    expect(bouwPad([punt("2024-01-01", 0, 10), punt("2024-02-01", 50, 20)])).toBe("M0.0 10.0 L50.0 20.0");
  });

  it("geeft een lege string zonder punten", () => {
    expect(bouwPad([])).toBe("");
  });
});

describe("opDatum", () => {
  it("sorteert oplopend op datum", () => {
    const gesorteerd = opDatum([meting("2024-06-01"), meting("2024-01-01"), meting("2024-03-01")]);

    expect(gesorteerd.map((m) => m.datum)).toEqual(["2024-01-01", "2024-03-01", "2024-06-01"]);
  });

  it("laat de oorspronkelijke lijst ongemoeid", () => {
    const origineel = [meting("2024-06-01"), meting("2024-01-01")];
    opDatum(origineel);

    expect(origineel[0]!.datum).toBe("2024-06-01");
  });
});
