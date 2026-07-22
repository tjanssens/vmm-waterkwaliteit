import { describe, expect, it } from "vitest";
import { beoordeel, isTotaalgehalte, NORMEN } from "../src/data/normen.js";
import type { ParameterJaar } from "../src/data/types.js";

/**
 * Neemt standaard de eenheid waarin de norm geldt, zodat een test over de
 * drempelwaarde niet per ongeluk de eenheidscontrole test.
 */
function samenvatting(over: Partial<ParameterJaar> = {}): ParameterJaar {
  const symbool = over.symbool ?? "P t";
  return {
    symbool,
    omschrijving: "Fosfor, totaal",
    eenheid: NORMEN[symbool]?.eenheid ?? "mgP/L",
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

describe("beoordeel", () => {
  describe("bovengrens (hoe lager hoe beter)", () => {
    it("noemt een jaargemiddelde boven de grens buiten norm", () => {
      // Fosfor totaal: norm 0,14 mgP/L. OW65000 zat in 2024 op 0,328.
      expect(beoordeel(samenvatting({ symbool: "P t", gemiddelde: 0.328 })).klasse).toBe(
        "buiten-norm",
      );
    });

    it("noemt een gemiddelde net onder de grens op-grens", () => {
      // Orthofosfaat: norm 0,1 mgP/L. OW65000 zat op 0,0984 — nipt conform.
      expect(beoordeel(samenvatting({ symbool: "oPO4 f", gemiddelde: 0.0984 })).klasse).toBe(
        "op-grens",
      );
    });

    it("noemt een gemiddelde ruim onder de grens conform", () => {
      expect(beoordeel(samenvatting({ symbool: "NO3-", gemiddelde: 1.92 })).klasse).toBe("conform");
    });
  });

  describe("ondergrens (hoe hoger hoe beter)", () => {
    it("noemt een zuurstofgemiddelde onder de norm buiten norm", () => {
      expect(beoordeel(samenvatting({ symbool: "O2", gemiddelde: 4.1, minimum: 2.4 })).klasse).toBe(
        "buiten-norm",
      );
    });

    it("signaleert een zuurstofdip ook als het jaargemiddelde conform is", () => {
      // OW65000 in 2024: gemiddeld 6,82 mg/L maar met een dip tot 2,36.
      const oordeel = beoordeel(samenvatting({ symbool: "O2", gemiddelde: 6.82, minimum: 2.36 }));

      expect(oordeel.klasse).toBe("op-grens");
      expect(oordeel.label).toBe("dipt onder");
    });

    it("noemt zuurstof conform wanneer ook het minimum boven de norm blijft", () => {
      expect(beoordeel(samenvatting({ symbool: "O2", gemiddelde: 9, minimum: 7.2 })).klasse).toBe(
        "conform",
      );
    });
  });

  describe("bandbreedte", () => {
    it("noemt een pH onder de ondergrens buiten norm", () => {
      expect(beoordeel(samenvatting({ symbool: "pH", gemiddelde: 6.44, minimum: 6.2 })).klasse).toBe(
        "buiten-norm",
      );
    });

    it("noemt een pH boven de bovengrens buiten norm", () => {
      expect(beoordeel(samenvatting({ symbool: "pH", gemiddelde: 8.9, minimum: 8.6 })).klasse).toBe(
        "buiten-norm",
      );
    });

    it("noemt een pH binnen de band conform", () => {
      expect(beoordeel(samenvatting({ symbool: "pH", gemiddelde: 7.4, minimum: 7.1 })).klasse).toBe(
        "conform",
      );
    });
  });

  describe("metalen als totaalgehalte", () => {
    it("toetst een totaalgehalte niet tegen een norm voor de opgeloste fractie", () => {
      const oordeel = beoordeel(samenvatting({ symbool: "Zn t", omschrijving: "Zink", gemiddelde: 33.9 }));

      expect(oordeel.klasse).toBe("geen-norm");
      expect(oordeel.label).toBe("niet toetsbaar");
      expect(oordeel.toelichting).toMatch(/opgeloste fractie/i);
    });

    it("herkent het totaalgehalte aan het achtervoegsel t", () => {
      expect(isTotaalgehalte("Cd t")).toBe(true);
      expect(isTotaalgehalte("Ag t")).toBe(true);
      // De opgeloste fractie draagt het achtervoegsel o.
      expect(isTotaalgehalte("Cd o")).toBe(false);
      // Fosfor en stikstof totaal zijn nutriënten, geen metalen.
      expect(isTotaalgehalte("P t")).toBe(false);
      expect(isTotaalgehalte("N t")).toBe(false);
    });

    it("blijft fosfor totaal wél toetsen", () => {
      expect(beoordeel(samenvatting({ symbool: "P t", gemiddelde: 0.328 })).klasse).toBe(
        "buiten-norm",
      );
    });
  });

  describe("andere eenheid", () => {
    it("toetst een waterbodemwaarde niet tegen een norm voor oppervlaktewater", () => {
      // WB124 rapporteert stikstof in mg/kg droge stof. Zonder deze controle
      // werd 1200 mg/kg vergeleken met 6 mgN/L en "boven norm" genoemd.
      const oordeel = beoordeel(
        samenvatting({ symbool: "N t", eenheid: "mg/kg ds", gemiddelde: 1200 }),
      );

      expect(oordeel.klasse).toBe("geen-norm");
      expect(oordeel.label).toBe("andere eenheid");
      expect(oordeel.toelichting).toContain("mg/kg ds");
    });

    it("toetst wél wanneer de eenheid overeenkomt", () => {
      expect(
        beoordeel(samenvatting({ symbool: "N t", eenheid: "mgN/L", gemiddelde: 8 })).klasse,
      ).toBe("buiten-norm");
    });
  });

  describe("zonder norm", () => {
    it("geeft geen oordeel over een parameter die niet in de normtabel staat", () => {
      const oordeel = beoordeel(samenvatting({ symbool: "DOC", gemiddelde: 14 }));

      expect(oordeel.klasse).toBe("geen-norm");
      expect(oordeel.label).toBe("geen norm");
    });

    it("toetst niet wanneer élke meting onder de detectielimiet lag", () => {
      // Het gemiddelde is dan de limiet, niet de concentratie: toetsen zou
      // een strengere limiet als "overschrijding" kunnen tonen.
      const oordeel = beoordeel(
        samenvatting({ symbool: "NH4+", gemiddelde: 0.6, volledigOnderLimiet: true, aantalOnderLimiet: 6 }),
      );

      expect(oordeel.klasse).toBe("geen-norm");
      expect(oordeel.toelichting).toMatch(/detectielimiet/i);
    });
  });
});

describe("NORMEN", () => {
  it("draagt bij elke norm een bronvermelding, label en eenheid", () => {
    for (const [symbool, norm] of Object.entries(NORMEN)) {
      expect(norm.bron, `norm voor ${symbool}`).toBeTruthy();
      expect(norm.label, `label voor ${symbool}`).toBeTruthy();
      expect(norm.eenheid, `eenheid voor ${symbool}`).toBeTruthy();
    }
  });

  it("heeft voor elke norm minstens een onder- of bovengrens", () => {
    for (const [symbool, norm] of Object.entries(NORMEN)) {
      expect(
        norm.ondergrens !== undefined || norm.bovengrens !== undefined,
        `norm voor ${symbool}`,
      ).toBe(true);
    }
  });
});
