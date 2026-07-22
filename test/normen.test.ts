import { describe, expect, it } from "vitest";
import {
  beoordeel,
  bronnenVoor,
  isTotaalgehalte,
  NORMEN,
  NORMENSETTEN,
  type Normenset,
} from "../src/data/normen.js";
import type { ParameterJaar } from "../src/data/types.js";

/** Neemt standaard de eenheid waarin de norm geldt. */
function samenvatting(
  over: Partial<ParameterJaar> = {},
  set: Normenset = "oppervlaktewater",
): ParameterJaar {
  const symbool = over.symbool ?? "P t";
  return {
    symbool,
    omschrijving: "Fosfor, totaal",
    eenheid: NORMEN[set][symbool]?.eenheid ?? "mgP/L",
    jaar: 2024,
    aantal: 6,
    aantalOnderLimiet: 0,
    gemiddelde: 0.1,
    minimum: 0.05,
    maximum: 0.2,
    laatsteDatum: "2024-11-07",
    volledigOnderLimiet: false,
    ...over,
  };
}

describe("beoordeel — oppervlaktewater", () => {
  it("noemt een jaargemiddelde boven de grens buiten norm", () => {
    // OW65000 zat in 2024 op 0,328 mgP/L, norm 0,14.
    expect(beoordeel(samenvatting({ symbool: "P t", gemiddelde: 0.328 })).klasse).toBe("buiten-norm");
  });

  it("noemt een gemiddelde ruim onder de grens conform", () => {
    expect(beoordeel(samenvatting({ symbool: "P t", gemiddelde: 0.05 })).klasse).toBe("conform");
  });

  it("signaleert een zuurstofdip ook als het jaargemiddelde conform is", () => {
    const oordeel = beoordeel(samenvatting({ symbool: "O2", gemiddelde: 6.82, minimum: 2.36 }));

    expect(oordeel.klasse).toBe("op-grens");
    expect(oordeel.label).toBe("dipt onder");
  });

  it("noemt een zuurstofgemiddelde onder de norm buiten norm", () => {
    expect(beoordeel(samenvatting({ symbool: "O2", gemiddelde: 4.1, minimum: 2.4 })).klasse).toBe(
      "buiten-norm",
    );
  });

  describe("typeafhankelijke normen", () => {
    it("weigert te oordelen tussen de strengste en de soepelste grens", () => {
      // Nitraat: 5,65 tot 10 mgN/L naargelang het waterlooptype.
      const oordeel = beoordeel(samenvatting({ symbool: "NO3-", gemiddelde: 7 }));

      expect(oordeel.klasse).toBe("op-grens");
      expect(oordeel.label).toBe("hangt van type af");
      expect(oordeel.toelichting).toMatch(/waterlooptype/i);
    });

    it("noemt boven de soepelste grens wél buiten norm", () => {
      expect(beoordeel(samenvatting({ symbool: "NO3-", gemiddelde: 12 })).klasse).toBe("buiten-norm");
    });

    it("noemt onder de strengste grens conform", () => {
      expect(beoordeel(samenvatting({ symbool: "NO3-", gemiddelde: 1.9 })).klasse).toBe("conform");
    });
  });

  describe("PFOS", () => {
    it("toetst PFOS in ng/L, de eenheid van de databank", () => {
      // De norm staat in VLAREM als 0,00065 µg/L = 0,65 ng/L.
      expect(NORMEN.oppervlaktewater["PFOS"]?.eenheid).toBe("ng/L");
      expect(beoordeel(samenvatting({ symbool: "PFOS", gemiddelde: 3.3 })).klasse).toBe("buiten-norm");
    });

    it("noemt PFOS onder de norm conform", () => {
      expect(beoordeel(samenvatting({ symbool: "PFOS", gemiddelde: 0.2 })).klasse).toBe("conform");
    });
  });

  describe("metalen", () => {
    it("toetst een totaalgehalte niet tegen de norm voor de opgeloste fractie", () => {
      const oordeel = beoordeel(samenvatting({ symbool: "Zn t", gemiddelde: 33.9 }));

      expect(oordeel.klasse).toBe("geen-norm");
      expect(oordeel.toelichting).toMatch(/opgeloste fractie/i);
    });

    it("blijft fosfor en stikstof totaal wél toetsen", () => {
      expect(isTotaalgehalte("P t")).toBe(false);
      expect(isTotaalgehalte("N t")).toBe(false);
      expect(isTotaalgehalte("Cd t")).toBe(true);
    });
  });

  it("heeft geen norm voor ammonium — die stond niet in de bron", () => {
    // Eerder stond hier een onjuiste 0,5 mgN/L die nergens op gebaseerd was.
    expect(NORMEN.oppervlaktewater["NH4+"]).toBeUndefined();
    expect(beoordeel(samenvatting({ symbool: "NH4+", eenheid: "mgN/L", gemiddelde: 0.77 })).klasse).toBe(
      "geen-norm",
    );
  });
});

describe("beoordeel — drinkwater", () => {
  const drink = (over: Partial<ParameterJaar>) =>
    beoordeel(samenvatting(over, "drinkwater"), "drinkwater");

  it("toetst nitraat tegen de omgerekende drinkwaternorm", () => {
    // 50 mg NO3/L komt overeen met 11,3 mg N/L; de databank meet in mgN/L.
    expect(drink({ symbool: "NO3-", gemiddelde: 12 }).klasse).toBe("buiten-norm");
    expect(drink({ symbool: "NO3-", gemiddelde: 1.9 }).klasse).toBe("conform");
  });

  it("toetst metalen hier wél, want de drinkwaternorm slaat op het totaalgehalte", () => {
    const oordeel = drink({ symbool: "Pb t", gemiddelde: 15 });

    expect(oordeel.klasse).toBe("buiten-norm");
  });

  describe("waarden uit richtlijn 2020/2184, niet uit de ingetrokken 98/83", () => {
    it.each([
      ["Sb t", 10],
      ["B t", 1500],
      ["Se t", 20],
    ])("gebruikt voor %s de waarde %i", (symbool, verwacht) => {
      expect(NORMEN.drinkwater[symbool]?.bovengrens).toBe(verwacht);
    });

    it("hanteert voor lood en chroom de waarde die nu geldt, met de latere erbij vermeld", () => {
      // De richtlijn zet lood op 5 µg/L, maar pas vanaf 12 januari 2036;
      // tot dan geldt 10. Idem chroom: 25 vanaf 2036, tot dan 50.
      expect(NORMEN.drinkwater["Pb t"]?.bovengrens).toBe(10);
      expect(NORMEN.drinkwater["Pb t"]?.label).toContain("2036");
      expect(NORMEN.drinkwater["Cr t"]?.bovengrens).toBe(50);
      expect(NORMEN.drinkwater["Cr t"]?.label).toContain("2036");
    });
  });

  it("vermeldt ook de Vlaamse omzetting als bron", () => {
    expect(bronnenVoor("drinkwater").some((b) => b.naam.includes("Vlaamse Regering"))).toBe(true);
  });

  it("toetst de som van PFAS tegen 100 ng/L", () => {
    expect(drink({ symbool: "PFAS-20", gemiddelde: 150 }).klasse).toBe("buiten-norm");
    expect(drink({ symbool: "PFAS-20", gemiddelde: 20 }).klasse).toBe("conform");
  });

  it("kent geen norm voor parameters die alleen in het oppervlaktewaterrecht staan", () => {
    expect(NORMEN.drinkwater["CZV"]).toBeUndefined();
  });

  it("waarschuwt in de uitleg dat een waterloop geen drinkwater is", () => {
    expect(NORMENSETTEN.drinkwater.uitleg).toMatch(/geen drinkwater/i);
  });
});

describe("normtabellen", () => {
  it.each(["oppervlaktewater", "drinkwater"] as Normenset[])(
    "draagt in %s bij elke norm een eenheid, label, toets en bron",
    (set) => {
      for (const [symbool, norm] of Object.entries(NORMEN[set])) {
        expect(norm.eenheid, `eenheid voor ${symbool}`).toBeTruthy();
        expect(norm.label, `label voor ${symbool}`).toBeTruthy();
        expect(norm.toets, `toets voor ${symbool}`).toBeTruthy();
        expect(norm.bron, `bron voor ${symbool}`).toBeTruthy();
      }
    },
  );

  it.each(["oppervlaktewater", "drinkwater"] as Normenset[])(
    "heeft in %s voor elke norm minstens een onder- of bovengrens",
    (set) => {
      for (const [symbool, norm] of Object.entries(NORMEN[set])) {
        expect(
          norm.ondergrens !== undefined || norm.bovengrens !== undefined,
          `grens voor ${symbool}`,
        ).toBe(true);
      }
    },
  );

  it("zet bij een typeafhankelijke norm de strengste grens onder de soepelste", () => {
    for (const [set, tabel] of Object.entries(NORMEN)) {
      for (const [symbool, norm] of Object.entries(tabel)) {
        if (norm.strengsteBovengrens === undefined) continue;
        expect(norm.strengsteBovengrens, `${set}/${symbool}`).toBeLessThan(norm.bovengrens!);
      }
    }
  });
});

describe("bronnenVoor", () => {
  it("geeft de bronnen die in de set gebruikt worden, met naam en link", () => {
    for (const bron of bronnenVoor("oppervlaktewater")) {
      expect(bron.naam).toBeTruthy();
      expect(bron.url).toMatch(/^https:\/\//);
    }
    expect(bronnenVoor("drinkwater").some((b) => b.url.includes("eur-lex"))).toBe(true);
  });
});
