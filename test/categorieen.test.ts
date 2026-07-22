import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAnalyseresultaten } from "../src/data/csv.js";
import { vatSamen } from "../src/data/aggregate.js";
import { categorieVan, deelIn } from "../src/data/categorieen.js";
import type { ParameterJaar } from "../src/data/types.js";

const parameter = (symbool: string, omschrijving = symbool): ParameterJaar => ({
  symbool,
  omschrijving,
  eenheid: "mg/L",
  jaar: 2024,
  aantal: 1,
  aantalOnderLimiet: 0,
  gemiddelde: 1,
  minimum: 1,
  maximum: 1,
  laatsteDatum: "2024-01-01",
  volledigOnderLimiet: false,
});

describe("categorieVan", () => {
  it.each([
    ["O2", "zuurstof"],
    ["CZV", "zuurstof"],
    ["NO3-", "nutrienten"],
    ["oPO4 f", "nutrienten"],
    ["P t", "nutrienten"],
    ["pH", "fysisch"],
    ["EC 20", "fysisch"],
    ["EColi", "bacteriologie"],
    ["IEntero", "bacteriologie"],
    ["Cd t", "metalen"],
    ["Zn t", "metalen"],
    ["Ag o", "metalen"],
    ["PFOS", "pfas"],
    ["PFBA", "pfas"],
    ["10:2 FTS", "pfas"],
  ])("deelt %s in bij %s", (symbool, verwacht) => {
    expect(categorieVan(parameter(symbool))).toBe(verwacht);
  });

  it("plaatst een onbekende parameter bij overige in plaats van te raden", () => {
    expect(categorieVan(parameter("XYZ123"))).toBe("overige");
  });
});

describe("deelIn", () => {
  it("laat categorieën zonder parameters weg", () => {
    const ingedeeld = deelIn([parameter("O2"), parameter("pH")]);

    expect(ingedeeld.map((c) => c.id)).toEqual(["zuurstof", "fysisch"]);
  });

  it("waarschuwt bij metalen dat het totaalgehalte niet toetsbaar is", () => {
    const metalen = deelIn([parameter("Cd t")])[0]!;

    expect(metalen.waarschuwing).toMatch(/opgeloste fractie/i);
  });

  it("verdeelt alle 46 parameters van OW65000 in 2024 zonder verlies", () => {
    const metingen = parseAnalyseresultaten(
      readFileSync(fileURLToPath(new URL("./fixtures/ow65000.tsv", import.meta.url)), "utf8"),
    );
    const van2024 = vatSamen(metingen).filter((p) => p.jaar === 2024);
    const ingedeeld = deelIn(van2024);
    const totaal = ingedeeld.reduce((som, c) => som + c.parameters.length, 0);

    expect(van2024).toHaveLength(46);
    expect(totaal).toBe(46);
    expect(ingedeeld.find((c) => c.id === "overige")?.parameters ?? []).toEqual([]);
  });
});
