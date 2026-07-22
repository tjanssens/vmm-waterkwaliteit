import { describe, expect, it } from "vitest";
import { beoordeel, NORMEN } from "../src/data/normen.js";
import type { ParameterSamenvatting } from "../src/data/types.js";

const parameter = (over: Partial<ParameterSamenvatting> = {}): ParameterSamenvatting => ({
  symbool: "NO2",
  omschrijving: "Stikstofdioxide",
  eenheid: "µg/m³",
  bucket: "7d",
  aantal: 168,
  aantalOnderLimiet: 0,
  gemiddelde: 60,
  minimum: 10,
  maximum: 120,
  laatsteDatum: "2026-07-22",
  volledigOnderLimiet: false,
  ...over,
});

describe("luchtnormen", () => {
  it("kent de Europese grenswaarden voor de stoffen die IRCELINE meet", () => {
    const set = NORMEN["lucht-eu"];
    expect(set["NO2"]?.bovengrens).toBe(40);
    expect(set["PM10"]?.bovengrens).toBe(40);
    expect(set["PM2.5"]?.bovengrens).toBe(25);
    expect(set["C6H6"]?.bovengrens).toBe(5);
  });

  it("houdt koolstofmonoxide in mg/m³ en niet in µg/m³", () => {
    // IRCELINE's eigen normenpagina schrijft 10 µg/m³; de richtlijn zegt
    // 10 mg/m³. Dat scheelt een factor duizend.
    expect(NORMEN["lucht-eu"]["CO"]?.eenheid).toBe("mg/m³");
    expect(NORMEN["lucht-eu"]["CO"]?.bovengrens).toBe(10);
  });
});

describe("beoordeel met een venster", () => {
  it("toetst een jaarnorm niet op een week metingen", () => {
    // 60 µg/m³ ligt boven de jaargrenswaarde van 40, maar een weekgemiddelde
    // zegt daar niets over. Dit is precies de stille fout die we willen
    // voorkomen.
    const oordeel = beoordeel(parameter({ gemiddelde: 60 }), "lucht-eu", { dagen: 7 });

    expect(oordeel.klasse).toBe("geen-norm");
    expect(oordeel.label).toBe("jaarnorm");
  });

  it("toetst diezelfde jaarnorm wél op een jaar metingen", () => {
    const oordeel = beoordeel(parameter({ gemiddelde: 60, bucket: "1j" }), "lucht-eu", {
      dagen: 365,
    });

    expect(oordeel.klasse).toBe("buiten-norm");
    expect(oordeel.label).toBe("boven norm");
  });

  it("noemt een jaargemiddelde onder de grenswaarde conform", () => {
    const oordeel = beoordeel(parameter({ gemiddelde: 20 }), "lucht-eu", { dagen: 365 });

    expect(oordeel.klasse).toBe("conform");
  });

  it("velt geen oordeel over een norm die overschrijdingen telt", () => {
    // Ozon mag 25 dagen per jaar boven 120 µg/m³ uitkomen. Een gemiddelde
    // onder 120 bewijst niets, en een gemiddelde erboven ook niet.
    const oordeel = beoordeel(
      parameter({ symbool: "O3", omschrijving: "Ozon", gemiddelde: 50 }),
      "lucht-eu",
      { dagen: 365 },
    );

    expect(oordeel.klasse).toBe("geen-norm");
    expect(oordeel.label).toBe("telt overschrijdingen");
  });

  it("weigert te toetsen wanneer de eenheid niet klopt", () => {
    // Zou IRCELINE CO ooit in µg/m³ gaan rapporteren, dan is 5000 µg/m³ geen
    // overschrijding van 10 mg/m³ — maar zonder deze controle wel.
    const oordeel = beoordeel(
      parameter({ symbool: "CO", eenheid: "µg/m³", gemiddelde: 5000 }),
      "lucht-eu",
      { dagen: 365 },
    );

    expect(oordeel.klasse).toBe("geen-norm");
    expect(oordeel.label).toBe("andere eenheid");
  });

  it("laat waternormen ongemoeid: die dragen geen middelingstijd", () => {
    // De watertoetsing mag niet veranderen door de komst van lucht.
    const fosfor = beoordeel(
      {
        ...parameter(),
        symbool: "P t",
        omschrijving: "Fosfor, totaal",
        eenheid: "mgP/L",
        gemiddelde: 0.5,
      },
      "oppervlaktewater",
      { dagen: 7 },
    );

    expect(fosfor.klasse).toBe("buiten-norm");
  });
});

describe("WHO-advieswaarden naast de EU-grenswaarden", () => {
  it("is op elke stof strenger dan of gelijk aan de EU", () => {
    for (const stof of ["PM2.5", "PM10", "NO2"]) {
      const eu = NORMEN["lucht-eu"][stof]!.bovengrens!;
      const who = NORMEN["lucht-who"][stof]!.bovengrens!;
      expect(who).toBeLessThan(eu);
    }
  });

  it("velt over hetzelfde jaargemiddelde een ander oordeel dan de EU", () => {
    // Dit is de reden dat beide sets er zijn. Borgerhout haalde over een jaar
    // 20 µg/m³ NO2: ruim onder de Europese grenswaarde van 40, maar het
    // dubbele van wat de WHO gezond noemt.
    const gemeten = parameter({ symbool: "NO2", gemiddelde: 20 });

    expect(beoordeel(gemeten, "lucht-eu", { dagen: 365 }).klasse).toBe("conform");
    expect(beoordeel(gemeten, "lucht-who", { dagen: 365 }).klasse).toBe("buiten-norm");
  });

  it("toetst ook de WHO-jaarnorm niet op een week", () => {
    const oordeel = beoordeel(parameter({ symbool: "PM2.5", gemiddelde: 9 }), "lucht-who", {
      dagen: 7,
    });

    expect(oordeel.label).toBe("jaarnorm");
  });

  it("velt geen oordeel over de 99-percentielwaarden", () => {
    // De WHO-daggrenzen zijn 99-percentielen, wat neerkomt op 34
    // overschrijdingsdagen per jaar — een telling, geen gemiddelde.
    const oordeel = beoordeel(
      parameter({ symbool: "SO2", gemiddelde: 1 }),
      "lucht-who",
      { dagen: 365 },
    );

    expect(oordeel.klasse).toBe("geen-norm");
  });
});
