import { describe, expect, it } from "vitest";
import { kiesCategorieOpen, kiesNormenset, kiesPeriode } from "../src/ui/voorkeuren.js";
import type { Periode } from "../src/lagen/types.js";

const jaren: Periode[] = [
  { id: "2022", label: "2022" },
  { id: "2023", label: "2023" },
  { id: "2024", label: "2024" },
];

const vensters: Periode[] = [
  { id: "48u", label: "48 uur", dagen: 2 },
  { id: "7d", label: "7 dagen", dagen: 7 },
  { id: "1j", label: "1 jaar", dagen: 365 },
];

describe("kiesPeriode", () => {
  it("houdt de eerder gekozen periode vast", () => {
    // De klacht die dit oplost: 1 jaar kiezen, naar een ander station gaan,
    // en dan weer op 7 dagen uitkomen.
    expect(kiesPeriode(vensters, "1j").id).toBe("1j");
  });

  it("neemt de recentste wanneer er niets onthouden is", () => {
    expect(kiesPeriode(jaren, undefined).id).toBe("2024");
  });

  it("valt terug wanneer dit meetpunt de onthouden periode niet heeft", () => {
    // Niet elk meetpunt is in dezelfde jaren bemonsterd.
    expect(kiesPeriode(jaren, "2019").id).toBe("2024");
  });

  it("laat een expliciete keuze altijd voorgaan", () => {
    const gevraagd = { id: "2022", label: "2022" };
    expect(kiesPeriode(jaren, "2024", gevraagd).id).toBe("2022");
  });

  it("levert geen ongeldige periode bij een punt zonder metingen", () => {
    expect(kiesPeriode([], "2024").id).toBe("");
  });
});

describe("kiesNormenset", () => {
  it("houdt de keuze vast binnen dezelfde laag", () => {
    expect(kiesNormenset(["oppervlaktewater", "drinkwater"], "drinkwater", "oppervlaktewater")).toBe(
      "drinkwater",
    );
  });

  it("valt terug op de standaard wanneer de laag die set niet kent", () => {
    // Wie bij water op drinkwater staat en een luchtstation opent, krijgt
    // daar de luchtstandaard — drinkwater bestaat er niet.
    expect(kiesNormenset(["lucht-eu", "lucht-who"], "drinkwater", "lucht-eu")).toBe("lucht-eu");
  });
});

describe("kiesCategorieOpen", () => {
  it("volgt de slimme standaard zolang de bezoeker niets geklikt heeft", () => {
    expect(kiesCategorieOpen(true, undefined, false)).toBe(true);
    expect(kiesCategorieOpen(false, undefined, false)).toBe(false);
  });

  it("laat een eigen klik voorgaan op de standaard", () => {
    expect(kiesCategorieOpen(true, false, false)).toBe(false);
    expect(kiesCategorieOpen(false, true, false)).toBe(true);
  });

  it("zet in het rapport alles open, wat de bezoeker ook geklikt heeft", () => {
    // Het rapport moet in één keer te lezen en af te drukken zijn.
    expect(kiesCategorieOpen(false, false, true)).toBe(true);
  });
});
