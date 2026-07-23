import { describe, expect, it } from "vitest";
import { stofprofiel } from "../src/data/stoffen.js";
import { categorieVan } from "../src/data/categorieen.js";
import type { ParameterSamenvatting } from "../src/data/types.js";

/**
 * De 75 parameters die op meetplaats OW72000 in "Overige parameters" stonden:
 * geneesmiddelen, organofosfaat-insecticiden, ultrakorte PFAS en een
 * industriële stof, allemaal onder afkortingen die de VMM zelf verzint.
 *
 * Dit was geen randgeval maar de helft van de tabel. Wie hier keek, zag een
 * lijst codes zonder categorie en zonder uitleg.
 */
const OW72000_OVERIG = [
  "2233TFPrA", "2333TFPrA", "Aclonifen", "Amidotriz", "Atenolol", "AzinfosEy", "AzinfosMy",
  "Benzotriazool", "Bezafibraat", "Bifenox", "Boscalid", "BrfosEy", "BrfosMy", "Carbamaze",
  "Cfvinfos", "Cprofam", "CpfosEy", "CpfosMy", "Clarithromyc", "Clindamyc", "ClindamycineHCl",
  "Clozapine", "Cumafos", "Cypmethrin", "Demeton", "Demeton-O", "Demeton-S", "Diazinon",
  "DCvos", "Diclofenac", "Na_diclofenac", "Dflucan", "Dmetoat", "Dimdazol", "Dsulfoton",
  "Etfum", "Ethopfos", "Fenazon", "Fenithion", "Fenthion", "Fipronil", "Fonofos", "Gabapentine",
  "HyCtazide", "Iopamidol", "Iopromide", "Irbesartan", "Ketoprofen", "Lidocaine", "Malathion",
  "Methidat", "Metcarb", "Metoprolol", "Metoprololtartraat", "Metbuzin", "Mevinfos", "Naproxen",
  "Oxadiazon", "PathionEy", "PathionMy", "Pentoxif", "PirfosMy", "Propanolol", "PropanololHCl",
  "Quinofen", "Sotalol", "SotalolHCl", "Sulfamazol", "Terbufos", "TclofosMy", "Triazofos",
  "TFA", "TFMS", "Trimoprim", "Valsartan",
];

const parameter = (symbool: string): ParameterSamenvatting => ({
  symbool,
  omschrijving: symbool,
  eenheid: "ng/L",
  bucket: "2024",
  aantal: 1,
  aantalOnderLimiet: 0,
  gemiddelde: 1,
  minimum: 1,
  maximum: 1,
  laatsteDatum: "2024-01-01",
  volledigOnderLimiet: false,
});

describe("stoffen die eerst bij Overige belandden", () => {
  it("deelt ze alle 75 in een echte categorie in", () => {
    const overig = OW72000_OVERIG.filter((s) => categorieVan(parameter(s)) === "overige");
    expect(overig).toEqual([]);
  });

  it("geeft ze alle 75 een tekst", () => {
    const zonder = OW72000_OVERIG.filter((s) => !stofprofiel(parameter(s)));
    expect(zonder).toEqual([]);
  });

  it("herkent de afkortingen van de VMM voor wat ze zijn", () => {
    // "AzinfosEy" is azinfos-ethyl, een organofosfaat; geen enkel patroon op
    // "fos" met een woordgrens past daarop. "Carbamaze" is carbamazepine en
    // niet iets met carbamaat. Zulke afkortingen moeten met de hand.
    expect(categorieVan(parameter("AzinfosEy"))).toBe("pesticiden");
    expect(categorieVan(parameter("Carbamaze"))).toBe("farmaceutisch");
    expect(categorieVan(parameter("Amidotriz"))).toBe("farmaceutisch");
    expect(categorieVan(parameter("TFMS"))).toBe("pfas");
  });

  it("leidt de categorie af uit de duiding, niet uit een tweede lijst", () => {
    // Eén plek waar staat wat een stof is. Stond het op twee plekken, dan
    // liepen ze uit de pas — en dat gebeurde ook: deze stoffen hadden soms al
    // een tekst terwijl ze in "Overige parameters" bleven staan.
    expect(stofprofiel(parameter("Metoprolol"))?.categorie).toBe("farmaceutisch");
    expect(categorieVan(parameter("Metoprolol"))).toBe("farmaceutisch");
  });

  it("duidt de geneesmiddelen naar wat ze in het water doen", () => {
    expect(stofprofiel(parameter("Diclofenac"))?.risico).toMatch(/gieren|nieren/i);
    expect(stofprofiel(parameter("Sulfamazol"))?.risico).toMatch(/resistent/i);
    expect(stofprofiel(parameter("Iopamidol"))?.risico).toMatch(/breken ze ook in het milieu niet af/i);
  });
});
