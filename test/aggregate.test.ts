import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAnalyseresultaten } from "../src/data/csv.js";
import { vatSamen, meetjaren } from "../src/data/aggregate.js";
import type { Meting } from "../src/data/types.js";

const echteMetingen = parseAnalyseresultaten(
  readFileSync(fileURLToPath(new URL("./fixtures/ow65000.tsv", import.meta.url)), "utf8"),
);

function meting(over: Partial<Meting> = {}): Meting {
  return {
    meetplaats: "OW1",
    datum: "2024-03-01",
    jaar: 2024,
    staalId: "1",
    tijdstip: null,
    symbool: "P t",
    omschrijving: "Fosfor, totaal",
    eenheid: "mgP/L",
    waarde: 0.2,
    onderDetectielimiet: false,
    ...over,
  };
}

describe("vatSamen", () => {
  it("berekent aantal, gemiddelde, minimum en maximum per parameter en jaar", () => {
    const samenvatting = vatSamen([
      meting({ waarde: 0.1, datum: "2024-01-01" }),
      meting({ waarde: 0.3, datum: "2024-06-01" }),
      meting({ waarde: 0.2, datum: "2024-03-01" }),
    ]);

    expect(samenvatting).toHaveLength(1);
    expect(samenvatting[0]).toMatchObject({
      symbool: "P t",
      bucket: "2024",
      aantal: 3,
      minimum: 0.1,
      maximum: 0.3,
    });
    // Afronden hoort bij de weergave, niet bij de berekening.
    expect(samenvatting[0]!.gemiddelde).toBeCloseTo(0.2, 10);
  });

  it("neemt de recentste datum, ongeacht de volgorde van binnenkomst", () => {
    const samenvatting = vatSamen([
      meting({ datum: "2024-06-01" }),
      meting({ datum: "2024-12-03" }),
      meting({ datum: "2024-01-11" }),
    ]);

    expect(samenvatting[0]!.laatsteDatum).toBe("2024-12-03");
  });

  it("splitst dezelfde parameter over verschillende jaren", () => {
    const samenvatting = vatSamen([
      meting({ jaar: 2017, datum: "2017-05-01", waarde: 0.9 }),
      meting({ jaar: 2024, datum: "2024-05-01", waarde: 0.1 }),
    ]);

    expect(samenvatting).toHaveLength(2);
    expect(samenvatting.map((s) => s.bucket)).toEqual(["2017", "2024"]);
  });

  it("houdt parameters met dezelfde naam maar een andere eenheid uit elkaar", () => {
    // O2 wordt zowel in mg/L als in verzadigingspercentage gerapporteerd,
    // onder verschillende symbolen.
    const samenvatting = vatSamen([
      meting({ symbool: "O2", eenheid: "mg/L", waarde: 6 }),
      meting({ symbool: "O2 verz", eenheid: "%", waarde: 55 }),
    ]);

    expect(samenvatting).toHaveLength(2);
  });

  describe("detectielimieten", () => {
    it("telt hoeveel metingen onder de limiet lagen", () => {
      const samenvatting = vatSamen([
        meting({ onderDetectielimiet: true, waarde: 0.1 }),
        meting({ onderDetectielimiet: false, waarde: 0.3 }),
      ]);

      expect(samenvatting[0]!.aantalOnderLimiet).toBe(1);
      expect(samenvatting[0]!.volledigOnderLimiet).toBe(false);
    });

    it("markeert het gemiddelde als bovengrens wanneer élke meting onder de limiet lag", () => {
      const samenvatting = vatSamen([
        meting({ onderDetectielimiet: true, waarde: 0.1 }),
        meting({ onderDetectielimiet: true, waarde: 0.1 }),
      ]);

      expect(samenvatting[0]!.volledigOnderLimiet).toBe(true);
    });
  });

  it("geeft een lege lijst terug voor een meetpunt zonder resultaten", () => {
    expect(vatSamen([])).toEqual([]);
  });

  describe("op de echte respons voor OW65000", () => {
    const samenvatting = vatSamen(echteMetingen);

    it("dicht 466 metingen samen tot 71 parameter-jaarcombinaties", () => {
      expect(samenvatting).toHaveLength(71);
    });

    it("vat 2024 samen in 46 parameters", () => {
      expect(samenvatting.filter((s) => s.bucket === "2024")).toHaveLength(46);
    });

    it("berekent het jaargemiddelde voor orthofosfaat in 2024", () => {
      const opo4 = samenvatting.find((s) => s.symbool === "oPO4 f" && s.bucket === "2024")!;

      expect(opo4.aantal).toBe(6);
      expect(opo4.gemiddelde).toBeCloseTo(0.0984, 4);
      expect(opo4.minimum).toBeCloseTo(0.0214, 4);
      expect(opo4.maximum).toBeCloseTo(0.325, 4);
    });

    it("ziet dat cadmium in 2024 nooit is aangetoond", () => {
      const cadmium = samenvatting.find((s) => s.symbool === "Cd t" && s.bucket === "2024")!;

      expect(cadmium.aantalOnderLimiet).toBe(6);
      expect(cadmium.volledigOnderLimiet).toBe(true);
    });
  });
});

describe("meetjaren", () => {
  it("geeft de jaren met resultaten, recentste eerst", () => {
    expect(meetjaren(echteMetingen)).toEqual([2024, 2017, 2016]);
  });

  it("geeft een lege lijst voor een meetpunt zonder resultaten", () => {
    expect(meetjaren([])).toEqual([]);
  });
});
