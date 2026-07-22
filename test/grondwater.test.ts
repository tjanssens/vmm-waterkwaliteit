import { describe, expect, it } from "vitest";
import { normaliseerEenheid, splitsParameternaam } from "../src/data/grondwater.js";
import { categorieVan } from "../src/data/categorieen.js";
import { NORMEN } from "../src/data/normen.js";
import type { ParameterSamenvatting } from "../src/data/types.js";

const parameter = (symbool: string, omschrijving = symbool): ParameterSamenvatting => ({
  symbool,
  omschrijving,
  eenheid: "ng/L",
  bucket: "2025",
  aantal: 1,
  aantalOnderLimiet: 0,
  gemiddelde: 1,
  minimum: 1,
  maximum: 1,
  laatsteDatum: "2025-06-01",
  volledigOnderLimiet: false,
});

describe("normaliseerEenheid", () => {
  it("trekt de kleine liter van DOV gelijk met onze normen", () => {
    // Zonder dit faalt élke eenheidsvergelijking stil en krijgt alles
    // "niet toetsbaar".
    expect(normaliseerEenheid("µg/l")).toBe("µg/L");
    expect(normaliseerEenheid("mg/l")).toBe("mg/L");
    expect(normaliseerEenheid("ng/l")).toBe("ng/L");
  });

  it("laat eenheden zonder liter met rust", () => {
    expect(normaliseerEenheid("µS/cm")).toBe("µS/cm");
    expect(normaliseerEenheid("Sörensen")).toBe("Sörensen");
  });
});

describe("splitsParameternaam", () => {
  it("haalt de dubbel geschreven code bij PFAS weg", () => {
    // DOV schrijft de code achteraan nog eens: zonder splitsen staat er
    // "perfluoroctaansulfonzuur (PFOS) (PFOS)" in de tabel.
    expect(splitsParameternaam("perfluoroctaansulfonzuur (PFOS) (PFOS)")).toEqual({
      omschrijving: "perfluoroctaansulfonzuur (PFOS)",
      symbool: "PFOS",
    });
  });

  it("gaat om met haakjes binnen de code", () => {
    expect(splitsParameternaam("PFAS (EU DWRL-20) (PFAS (EU DWRL-20))")).toEqual({
      omschrijving: "PFAS (EU DWRL-20)",
      symbool: "PFAS (EU DWRL-20)",
    });
  });

  it("laat een naam met de code er maar één keer in ongemoeid", () => {
    // Hierop zijn de normen en de categorie-indeling gesleuteld.
    expect(splitsParameternaam("Arseen (As)")).toEqual({
      omschrijving: "Arseen (As)",
      symbool: "Arseen (As)",
    });
  });

  it("laat een naam zonder haakjes ongemoeid", () => {
    expect(splitsParameternaam("Nitraat").symbool).toBe("Nitraat");
  });
});

describe("PFAS herkennen", () => {
  it.each([
    ["PFOS", "perfluoroctaansulfonzuur (PFOS)"],
    ["PFBS", "perfluorbutaansulfonzuur (PFBS)"],
    ["4:2 FTS", "4:2 fluortelomeersulfonzuur (4:2 FTS)"],
    ["6:2/8:2 diPAP", "6:2/8:2 fluortelomeerfosfaat diester (6:2/8:2 diPAP)"],
    ["HFPO-DA", "perfluor-2-propoxypropaanzuur (HFPO-DA)"],
    ["DONA", "4,8-dioxa-3H-perfluornonaanzuur (DONA)"],
    ["MePFOSAA", "N-methylperfluoroctaansulfonamidoazijnzuur (MePFOSAA)"],
    ["PFAS (EU DWRL-20)", "PFAS (EU DWRL-20)"],
  ])("deelt %s in bij PFAS", (symbool, omschrijving) => {
    expect(categorieVan(parameter(symbool, omschrijving))).toBe("pfas");
  });

  it("verwart fluoride niet met PFAS", () => {
    // "fluor" alleen zou te grof zijn; fluoride is een gewoon anion.
    expect(categorieVan(parameter("Fluoride (F)", "Fluoride (F)"))).not.toBe("pfas");
  });
});

describe("PFAS-norm voor grondwater", () => {
  it("toetst alleen de som, niet de losse stoffen", () => {
    // De drinkwaterrichtlijn stelt geen norm per PFAS-verbinding.
    expect(NORMEN["grondwater"]["PFAS (EU DWRL-20)"]?.bovengrens).toBe(100);
    expect(NORMEN["grondwater"]["PFOS"]).toBeUndefined();
  });

  it("staat in ng/L, zoals DOV rapporteert", () => {
    expect(NORMEN["grondwater"]["PFAS (EU DWRL-20)"]?.eenheid).toBe("ng/L");
  });
});

describe("indelen op de groep van de bron", () => {
  const metGroep = (groep: string, symbool = "Onbekende stof X"): ParameterSamenvatting => ({
    ...parameter(symbool),
    groep,
  });

  it.each([
    ["Zware metalen", "metalen"],
    ["Grondwater_chemisch_PFAS", "pfas"],
    ["Pesticiden: actieve stoffen", "pesticiden"],
    ["Pesticiden: relevante metabolieten", "pesticiden"],
    ["Niet-relevante metabolieten van pesticiden", "pesticiden"],
    ["Bacteriologische parameters", "bacteriologie"],
    ["Farmaceutische stoffen", "farmaceutisch"],
    ["Organische verbindingen", "organisch"],
    ["Anionen", "fysisch"],
    ["Kationen", "fysisch"],
    ["Fysico-chemische  parameters", "fysisch"],
    ["Onbekend", "overige"],
  ])("deelt de groep %s in bij %s", (groep, verwacht) => {
    // Alle twaalf groepen die DOV daadwerkelijk gebruikt hebben een plek;
    // zonder dat zou de lange staart aan pesticiden in "Overige" belanden.
    expect(categorieVan(metGroep(groep))).toBe(verwacht);
  });

  it("laat een bekende naam voorgaan op de groep", () => {
    // Nitraat is een anion, maar hoort bij de nutriënten.
    expect(categorieVan(metGroep("Anionen", "Nitraat (NO3)"))).toBe("nutrienten");
  });

  it("valt terug op overige bij een groep die we niet kennen", () => {
    expect(categorieVan(metGroep("Iets Nieuws Van DOV"))).toBe("overige");
  });
});
