import { describe, expect, it } from "vitest";
import { korteRisicozin, STOFBRONNEN, stofprofiel } from "../src/data/stoffen.js";
import { splitsParameternaam } from "../src/data/grondwater.js";

/**
 * De metalen zoals de drie bronnen ze schrijven. De VMM hangt " t" of " o"
 * achter het symbool voor de gemeten fractie, DOV schrijft de naam voluit met
 * de code erachter, en IRCELINE meet er één in de lucht.
 */
const OPPERVLAKTEWATER = [
  "Sb t", "As t", "Ba t", "Be t", "B t", "Cd t", "Cr t", "Fe t", "Co t", "Cu t", "Hg t",
  "Pb t", "Mn t", "Mo t", "Ni t", "Se t", "Te t", "Tl t", "Sn t", "Ti t", "U t", "V t",
  "Ag t", "Zn t", "As o", "Cd o", "Pb o", "Ni o",
];

/** De elf die DOV onder "Zware metalen" rapporteert, plus aluminium en ijzer. */
const GRONDWATER = [
  "Arseen (As)", "Zink (Zn)", "Cadmium (Cd)", "Aluminium (Al)", "Nikkel (Ni)", "Chroom (Cr)",
  "Koper (Cu)", "Boor (B)", "Cobalt (Co)", "Lood (Pb)", "Kwik (Hg)", "Mangaan (Mn)",
  "Ijzer (Fe)", "Ijzer II (Fe2+)",
];

const profielVoor = (naam: string, laag?: "oppervlaktewater" | "grondwater" | "lucht") => {
  const { omschrijving, symbool } = splitsParameternaam(naam);
  return stofprofiel({ symbool, omschrijving, groep: "Zware metalen" }, laag);
};

describe("duiding bij metalen", () => {
  it("duidt elk metaal uit de drie bronnen", () => {
    const zonder = [
      ...OPPERVLAKTEWATER.map((n) => [n, profielVoor(n, "oppervlaktewater")] as const),
      ...GRONDWATER.map((n) => [n, profielVoor(n, "grondwater")] as const),
      ["Hg", stofprofiel({ symbool: "Hg", omschrijving: "Kwik, gasvormig" }, "lucht")] as const,
    ]
      .filter(([, profiel]) => !profiel)
      .map(([naam]) => naam);

    expect(zonder).toEqual([]);
  });

  it("leest kwik anders in lucht dan in water", () => {
    // In de lucht gaat het over neerslag en verspreiding over de wereld, in
    // water over methylkwik in vis. Dezelfde stof, een ander verhaal.
    const lucht = stofprofiel({ symbool: "Hg", omschrijving: "Kwik" }, "lucht")!;
    const water = profielVoor("Kwik (Hg)", "grondwater")!;

    expect(lucht).not.toBe(water);
    expect(lucht.wat).toMatch(/gasvorm/i);
    expect(water.risico).toMatch(/methylkwik/i);
  });

  it("negeert of het totaalgehalte of de opgeloste fractie gemeten is", () => {
    // " t" en " o" zeggen iets over de meetwijze, niet over de stof.
    expect(profielVoor("As t", "oppervlaktewater")).toBe(profielVoor("As o", "oppervlaktewater"));
    expect(profielVoor("Pb t", "oppervlaktewater")).toBe(profielVoor("Lood (Pb)", "grondwater"));
  });

  it("noemt bij elk metaal een gevolg voor mens of milieu", () => {
    const GEVOLG =
      /kanker|nier|bot|zenuwstelsel|hersen|bloeddruk|allergie|waterorganismen|waterleven|vis|algen|huid|schildklier|maag|smaak|verkleuring|leiding|gezondheid|hart|voortplanting|gewricht/i;

    const zonderGevolg = [...OPPERVLAKTEWATER, ...GRONDWATER]
      .map((naam) => ({ naam, profiel: profielVoor(naam, "grondwater") }))
      .filter(({ profiel }) => profiel && !GEVOLG.test(profiel.risico ?? ""))
      .map(({ naam }) => naam);

    expect(zonderGevolg).toEqual([]);
  });

  it("onderbouwt een indeling als kankerverwekkend met de IARC-lijst", () => {
    // Zeggen dat een stof kankerverwekkend is, is de zwaarste uitspraak die
    // deze app doet. Die hoort naar de instantie te verwijzen die ze deed.
    for (const naam of ["Arseen (As)", "Cadmium (Cd)", "Chroom (Cr)", "Nikkel (Ni)"]) {
      const profiel = profielVoor(naam, "grondwater")!;
      expect(profiel.risico).toMatch(/IARC/);
      expect(profiel.bronnen).toContain("iarcKankersoorten");
    }
  });

  it("verwijst voor kwik naar het verdrag dat erover gaat", () => {
    expect(profielVoor("Kwik (Hg)", "grondwater")!.bronnen).toContain("minamata");
    expect(STOFBRONNEN.minamata.url).toMatch(/minamataconvention\.org/);
  });

  it("zet het gevolg ook in de korte zin bij een overschrijding", () => {
    const GEVOLG =
      /kanker|nier|bot|zenuwstelsel|bloeddruk|allergie|waterorganismen|waterleven|vis|huid|smaak|verkleuring|gezondheid|hart|schildklier|hersen|voortplanting|gewricht/i;

    for (const naam of ["As t", "Pb t", "Cd t", "Hg t", "Cu t", "Mn t", "Fe t"]) {
      expect(korteRisicozin(profielVoor(naam, "oppervlaktewater")!)).toMatch(GEVOLG);
    }
  });
});
