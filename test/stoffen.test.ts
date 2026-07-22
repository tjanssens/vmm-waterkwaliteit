import { describe, expect, it } from "vitest";
import { STOFBRONNEN, stofprofiel } from "../src/data/stoffen.js";
import { STOFFEN } from "../src/data/lucht.js";
import type { ParameterSamenvatting } from "../src/data/types.js";

const parameter = (
  symbool: string,
  omschrijving = symbool,
  groep?: string,
): Pick<ParameterSamenvatting, "symbool" | "omschrijving"> & { groep?: string } => ({
  symbool,
  omschrijving,
  ...(groep === undefined ? {} : { groep }),
});

describe("stofprofiel", () => {
  it("geeft dezelfde duiding, hoe de bron de stof ook noemt", () => {
    // Nitraat heet "NO3-" bij de VMM en "Nitraat (NO3)" bij DOV. Zou elk van
    // die namen een eigen tekst krijgen, dan gaan die vroeg of laat uiteenlopen.
    const vmm = stofprofiel(parameter("NO3-"));
    const dov = stofprofiel(parameter("Nitraat (NO3)"));

    expect(vmm).toBeDefined();
    expect(dov).toBe(vmm);
  });

  it("herkent een metaal ongeacht of het totaal of opgelost gemeten is", () => {
    // De VMM hangt " t" of " o" achter het symbool voor de fractie. Voor de
    // vraag wat arseen is, maakt dat niets uit.
    const totaal = stofprofiel(parameter("As t"));
    const opgelost = stofprofiel(parameter("As o"));

    expect(totaal?.wat).toMatch(/halfmetaal/i);
    expect(opgelost).toBe(totaal);
  });

  it("valt voor een onbekende PFAS terug op de familie", () => {
    const profiel = stofprofiel(parameter("PFHxS", "perfluorhexaansulfonzuur"));
    expect(profiel?.wat).toMatch(/fluorverbindingen/i);
  });

  it("valt voor een onbekend pesticide terug op de parametergroep", () => {
    // DOV rapporteert honderden pesticiden; die krijgen nooit elk een tekst.
    const profiel = stofprofiel(
      parameter("Bentazon", "Bentazon", "Pesticiden: actieve stoffen"),
    );
    expect(profiel?.wat).toMatch(/onkruid/i);
  });

  it("zwijgt over een stof die we niet kennen", () => {
    // Liever niets dan een tekst die op alles past: bij gezondheidsinformatie
    // is de schijn van uitleg erger dan geen uitleg.
    expect(stofprofiel(parameter("XYZ123"))).toBeUndefined();
  });

  it("duidt elke stof die het luchtmeetnet meet", () => {
    const zonder = Object.values(STOFFEN)
      .filter(({ symbool, naam }) => !stofprofiel(parameter(symbool, naam), "lucht"))
      .map((s) => s.symbool);

    expect(zonder).toEqual([]);
  });

  it("draagt bij elke duiding minstens één bron", () => {
    // Een gezondheidsuitspraak zonder herkomst is precies wat deze app niet
    // wil zijn.
    const symbolen = ["NO2", "PM2.5", "NO3-", "Lood (Pb)", "PFOS", "O2"];
    for (const symbool of symbolen) {
      const profiel = stofprofiel(parameter(symbool))!;
      expect(profiel.bronnen.length).toBeGreaterThan(0);
      for (const bron of profiel.bronnen) expect(STOFBRONNEN[bron]).toBeDefined();
    }
  });

  it("onderbouwt de zwaarste uitspraken met twee bronnen", () => {
    // Lood, arseen, fijn stof en PFAS zijn de plaatsen waar een fout het meest
    // kost. Die zijn elk in twee bronnen nagegaan.
    for (const symbool of ["Lood (Pb)", "Arseen (As)", "PM2.5", "PFOS"]) {
      expect(stofprofiel(parameter(symbool))!.bronnen.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("duidt elke niet-pesticide die DOV op een echte filter rapporteert", () => {
    // De volledige lijst zoals filter 620/72/2-1 in Landen ze levert, op de 71
    // pesticiden na — die lopen via hun groep. Deze namen zijn de plaats waar
    // duiding stil wegvalt: DOV schrijft "Ijzer" zonder trema en zet de
    // labowaarde apart onder "(EC(Lab.))", en elke afwijking van die spelling
    // levert een stof zonder uitleg op.
    const gerapporteerd = [
      "Opgeloste zuurstof (O2)", "Totaal organische koolstof (TOC)", "Nitraat (NO3)",
      "Ammonium (NH4)", "Fosfaat (PO4)", "Nitriet (NO2)", "Calcium (Ca)", "Chloriden (Cl)",
      "Elektrische geleidbaarheid (EC)", "Kalium (K)", "Magnesium (Mg)", "Natrium (Na)",
      "Sulfaat (SO4)", "Temperatuur (T)", "Zuurtegraad (pH)", "Bicarbonaat (HCO3)",
      "Bromide (Br)", "Carbonaat (CO3)", "Geleidbaarheid in het labo (EC(Lab.))",
      "Redoxpotentiaal (Eh°)", "Som anionen (SomAN)", "Som kationen (SomKAT)",
      "Zuurtegraad in het labo (pH(Lab.))", "Aluminium (Al)", "Chroom (Cr)", "Ijzer (Fe)",
      "Arseen (As)", "Boor (B)", "Cadmium (Cd)", "Cobalt (Co)", "Koper (Cu)", "Lood (Pb)",
      "Mangaan (Mn)", "Nikkel (Ni)", "Zink (Zn)", "AfwijkingBalans% (%AfwijkBalans)",
    ];

    const zonder = gerapporteerd.filter((naam) => !stofprofiel(parameter(naam)));

    expect(zonder).toEqual([]);
  });

  it("duidt een ultrakorte PFAS via haar parametergroep", () => {
    // Trifluorazijnzuur heet nergens "perfluor" en heeft geen PF-code, dus de
    // vormherkenning grijpt niet. DOV zet het wel in de PFAS-groep.
    const profiel = stofprofiel(
      parameter("Trifluorazijnzuur (TFA)", "Trifluorazijnzuur", "Grondwater_chemisch_PFAS"),
    );
    expect(profiel?.wat).toMatch(/fluorverbindingen/i);
  });

  it("leest hetzelfde symbool anders per laag", () => {
    // "T" is bij IRCELINE de luchttemperatuur en bij de VMM de temperatuur van
    // het water. Beide teksten gaan over temperatuur, dus een verwisseling
    // valt niemand op — precies daarom staat deze test er.
    const lucht = stofprofiel(parameter("T", "Temperatuur"), "lucht");
    const water = stofprofiel(parameter("T", "Temperatuur"), "oppervlaktewater");

    expect(lucht?.wat).toMatch(/luchttemperatuur/i);
    expect(water?.wat).toMatch(/temperatuur van het water/i);
    expect(lucht).not.toBe(water);
  });

  it("duidt alle 46 parameters van OW65000, metalenscan inbegrepen", () => {
    // De VMM meet daar veertien metalen waar geen norm voor bestaat, van
    // antimoon tot vanadium. Zonder duiding staat daar een rij namen zonder
    // enige aanwijzing waarom ze gemeten zijn.
    const gerapporteerd = [
      "CZV", "O2", "BZV5", "DOC", "O2 verz", "P t", "N t", "oPO4 f", "KjN", "NO3-", "NH4+",
      "N+N", "N+N+N", "NO2-", "Cl-", "EC 20", "pH", "SO4=", "T", "ZS", "TAM", "EC 25",
      "Sb t", "As t", "Ba t", "Be t", "B t", "Cd t", "Cr t", "Fe t", "Co t", "Cu t", "Hg t",
      "Pb t", "Mn t", "Mo t", "Ni t", "Se t", "Te t", "Tl t", "Sn t", "Ti t", "U t", "V t",
      "Ag t", "Zn t",
    ];

    const zonder = gerapporteerd.filter(
      (symbool) => !stofprofiel(parameter(symbool), "oppervlaktewater"),
    );

    expect(gerapporteerd).toHaveLength(46);
    expect(zonder).toEqual([]);
  });

  it("verwijst naar een pagina die de lezer kan openen", () => {
    for (const bron of Object.values(STOFBRONNEN)) {
      expect(bron.url).toMatch(/^https:\/\//);
      expect(bron.naam.length).toBeGreaterThan(10);
    }
  });
});
