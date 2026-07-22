import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAnalyseresultaten } from "../src/data/csv.js";
import { vatSamen } from "../src/data/aggregate.js";
import { categorieVan, deelIn } from "../src/data/categorieen.js";
import type { ParameterSamenvatting } from "../src/data/types.js";

const parameter = (symbool: string, omschrijving = symbool): ParameterSamenvatting => ({
  symbool,
  omschrijving,
  eenheid: "mg/L",
  bucket: "2024",
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

  it("waarschuwt bij metalen, met een andere tekst per normenset", () => {
    // Bij oppervlaktewater is het totaalgehalte gemeten terwijl de norm op de
    // opgeloste fractie slaat; bij grondwater is het precies andersom. Eén
    // vaste tekst zou dus in de helft van de gevallen onwaar zijn.
    const metalen = deelIn([parameter("Cd t")])[0]!;
    const voor = (set: string) =>
      (metalen.waarschuwingen ?? []).find((w) => w.voor === set)?.tekst ?? "";

    expect(voor("oppervlaktewater")).toMatch(/totaalgehalte gemeten/i);
    expect(voor("grondwater")).toMatch(/0,45 µm gefiltreerd/i);
    expect(voor("oppervlaktewater")).not.toBe(voor("grondwater"));
  });

  it("verdeelt alle 46 parameters van OW65000 in 2024 zonder verlies", () => {
    const metingen = parseAnalyseresultaten(
      readFileSync(fileURLToPath(new URL("./fixtures/ow65000.tsv", import.meta.url)), "utf8"),
    );
    const van2024 = vatSamen(metingen).filter((p) => p.bucket === "2024");
    const ingedeeld = deelIn(van2024);
    const totaal = ingedeeld.reduce((som, c) => som + c.parameters.length, 0);

    expect(van2024).toHaveLength(46);
    expect(totaal).toBe(46);
    expect(ingedeeld.find((c) => c.id === "overige")?.parameters ?? []).toEqual([]);
  });
});
