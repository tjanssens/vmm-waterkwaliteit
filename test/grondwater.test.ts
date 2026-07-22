import { describe, expect, it } from "vitest";
import { normaliseerEenheid, splitsParameternaam } from "../src/data/grondwater.js";
import { categorieVan } from "../src/data/categorieen.js";
import { beoordeel, NORMEN, normVoor } from "../src/data/normen.js";
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

describe("VLAREM-grondwaternormen naast de drinkwaternormen", () => {
  const gemeten = (symbool: string, gemiddelde: number, eenheid: string) => ({
    ...parameter(symbool),
    eenheid,
    gemiddelde,
    minimum: gemiddelde,
    maximum: gemiddelde,
  });

  it("is bij mangaan twintig keer soepeler dan drinkwater", () => {
    // Dit is waarom beide sets er zijn. 0,065 mg/L mangaan is ruim boven de
    // drinkwaterindicator van 0,05 maar ver onder de VLAREM-richtwaarde van 1.
    const mangaan = gemeten("Mangaan (Mn)", 0.065, "mg/L");

    expect(beoordeel(mangaan, "grondwater").klasse).toBe("buiten-norm");
    expect(beoordeel(mangaan, "grondwater-vlarem").klasse).toBe("conform");
  });

  it("is bij nikkel juist strenger dan drinkwater", () => {
    // Niet elke VLAREM-waarde is soepeler: nikkel mag 40 µg/L in grondwater
    // maar 20 aan de kraan... andersom dus. Hier controleren we dat we ze
    // niet door elkaar halen.
    expect(NORMEN["grondwater-vlarem"]["Nikkel (Ni)"]?.bovengrens).toBe(40);
    expect(NORMEN["grondwater"]["Nikkel (Ni)"]?.bovengrens).toBe(20);
  });

  it("toetst pesticiden via hun groep, niet per stof", () => {
    // VLAREM stelt 0,1 µg/L per afzonderlijke stof; DOV kent er honderden.
    const bentazon = { ...gemeten("Bentazon (Bentaz)", 0.25, "µg/L"), groep: "Pesticiden: actieve stoffen" };

    const oordeel = beoordeel(bentazon, "grondwater-vlarem");
    expect(oordeel.klasse).toBe("buiten-norm");
  });

  it("laat niet-relevante metabolieten buiten de pesticidennorm", () => {
    // Die tellen ook in de drinkwaterwetgeving niet mee.
    const metaboliet = {
      ...gemeten("Iets (X)", 0.25, "µg/L"),
      groep: "Niet-relevante metabolieten van pesticiden",
    };

    expect(beoordeel(metaboliet, "grondwater-vlarem").klasse).toBe("geen-norm");
  });

  it("laat een stofnorm voorgaan op de groepsnorm", () => {
    // Arseen zit in "Zware metalen" zonder groepsnorm, maar heeft een eigen.
    const arseen = { ...gemeten("Arseen (As)", 30, "µg/L"), groep: "Zware metalen" };

    expect(beoordeel(arseen, "grondwater-vlarem").klasse).toBe("buiten-norm");
  });
});

describe("normVoor", () => {
  it("geeft de groepsnorm terug voor een pesticide zonder eigen norm", () => {
    // Zonder deze functie toonde de tabel wél een oordeel maar niet de norm
    // waarop het rust: het paneel zocht alleen op stofnaam.
    const norm = normVoor(
      { symbool: "Atrazine (Atraz)", groep: "Pesticiden: actieve stoffen" },
      "grondwater-vlarem",
    );

    expect(norm?.bovengrens).toBe(0.1);
    expect(norm?.label).toContain("per stof");
  });

  it("geeft niets terug wanneer noch de stof noch de groep een norm heeft", () => {
    expect(normVoor({ symbool: "Cobalt (Co)", groep: "Zware metalen" }, "grondwater-vlarem"))
      .toBeUndefined();
  });
});
