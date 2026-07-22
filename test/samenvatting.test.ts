import { describe, expect, it } from "vitest";
import { samenvattingsZin } from "../src/ui/samenvatting.js";
import type { Oordeel, OordeelKlasse, ParameterSamenvatting } from "../src/data/types.js";

const LABELS: Record<OordeelKlasse, string> = {
  "buiten-norm": "boven norm",
  "op-grens": "grenswaarde",
  conform: "conform",
  "geen-norm": "geen norm",
};

/** Bouwt de parameters en hun oordelen in één keer op. */
function opstelling(paren: [naam: string, klasse: OordeelKlasse][]) {
  const parameters: ParameterSamenvatting[] = paren.map(([naam], i) => ({
    symbool: `S${i}`,
    omschrijving: naam,
    eenheid: "mg/L",
    bucket: "2024",
    aantal: 6,
    aantalOnderLimiet: 0,
    gemiddelde: 1,
    minimum: 1,
    maximum: 1,
    laatsteDatum: "2024-11-07",
    volledigOnderLimiet: false,
  }));

  const oordelen = new Map<string, Oordeel>(
    paren.map(([, klasse], i) => [`S${i}`, { klasse, label: LABELS[klasse] }]),
  );

  return { parameters, oordelen };
}

describe("samenvattingsZin", () => {
  it("noemt de overschrijdingen bij naam", () => {
    const { parameters, oordelen } = opstelling([
      ["Chemisch zuurstofverbruik", "buiten-norm"],
      ["Ammonium", "buiten-norm"],
      ["Zink", "geen-norm"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toBe(
      "De norm wordt overschreden voor chemisch zuurstofverbruik en ammonium.",
    );
  });

  it("voegt de grensgevallen toe met een meervoudig werkwoord", () => {
    const { parameters, oordelen } = opstelling([
      ["Fosfor", "buiten-norm"],
      ["Zuurstof", "op-grens"],
      ["Orthofosfaat", "op-grens"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toBe(
      "De norm wordt overschreden voor fosfor. Daarnaast zitten zuurstof en orthofosfaat op de grens.",
    );
  });

  it("gebruikt het enkelvoud bij één grensgeval", () => {
    const { parameters, oordelen } = opstelling([
      ["Fosfor", "buiten-norm"],
      ["Zuurstof", "op-grens"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toContain("Daarnaast zit zuurstof op de grens.");
  });

  it("laat pH als pH staan", () => {
    const { parameters, oordelen } = opstelling([["pH", "buiten-norm"]]);

    expect(samenvattingsZin(parameters, oordelen)).toBe("De norm wordt overschreden voor pH.");
  });

  it("meldt het apart wanneer niets de norm overschrijdt maar iets er tegenaan schuurt", () => {
    const { parameters, oordelen } = opstelling([
      ["Orthofosfaat", "op-grens"],
      ["Nitraat", "conform"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toBe(
      "Geen enkele parameter overschrijdt de norm, maar orthofosfaat schuurt er tegenaan.",
    );
  });

  it("meldt een schone toetsing wanneer alles conform is", () => {
    const { parameters, oordelen } = opstelling([
      ["Nitraat", "conform"],
      ["Zuurstof", "conform"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toBe(
      "Alle getoetste parameters blijven binnen de norm.",
    );
  });

  it("beweert géén schone rekening wanneer er niets getoetst kon worden", () => {
    // Een waterbodempunt meet in mg/kg ds; geen enkele norm is van toepassing.
    // "Alles binnen de norm" zou hier ronduit misleidend zijn.
    const { parameters, oordelen } = opstelling([
      ["Stikstof", "geen-norm"],
      ["Fosfor", "geen-norm"],
    ]);

    expect(samenvattingsZin(parameters, oordelen)).toBe(
      "Geen van deze parameters kon tegen een norm getoetst worden.",
    );
  });
});

describe("namen met een komma erin", () => {
  it("kort een naam met een bijstelling in", () => {
    const zin = samenvattingsZin(
      [
        {
          symbool: "P t",
          omschrijving: "Fosfor, totaal",
          eenheid: "mgP/L",
          bucket: "2024",
          aantal: 6,
          aantalOnderLimiet: 0,
          gemiddelde: 1,
          minimum: 1,
          maximum: 1,
          laatsteDatum: "2024-11-07",
          volledigOnderLimiet: false,
        },
      ],
      new Map([["P t", { klasse: "buiten-norm" as const, label: "boven norm" }]]),
    );

    expect(zin).toContain("fosfor");
    expect(zin).not.toContain("totaal");
  });

  it("laat een decimale komma binnen een naam staan", () => {
    // "Fijn stof (PM2,5)" werd afgekapt tot "fijn stof (PM2" zodra de zin
    // op elke komma inkortte.
    const zin = samenvattingsZin(
      [
        {
          symbool: "PM2.5",
          omschrijving: "Fijn stof (PM2,5)",
          eenheid: "µg/m³",
          bucket: "1j",
          aantal: 8735,
          aantalOnderLimiet: 0,
          gemiddelde: 8.61,
          minimum: 1,
          maximum: 40,
          laatsteDatum: "2026-07-22",
          volledigOnderLimiet: false,
        },
      ],
      new Map([["PM2.5", { klasse: "buiten-norm" as const, label: "boven norm" }]]),
    );

    expect(zin).toContain("fijn stof (PM2,5)");
  });
});
