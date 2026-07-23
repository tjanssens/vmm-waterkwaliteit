import { describe, expect, it } from "vitest";
import { korteRisicozin, stofprofiel } from "../src/data/stoffen.js";
import { splitsParameternaam } from "../src/data/grondwater.js";

/**
 * Elke PFAS-naam die de twee bronnen werkelijk rapporteren, opgehaald bij DOV.
 * PFAS ligt gevoelig: een stof die stil op de algemene familietekst terugvalt,
 * krijgt een verhaal over blusschuim terwijl ze uit voedselverpakking komt.
 */
const OPPERVLAKTEWATER_PFAS = [
  "10:2 FTS",
  "4:2 FTS",
  "6:2 FTS",
  "6:2 diPAP",
  "6:2/8:2 diPAP",
  "8:2 FTS",
  "8:2 diPAP",
  "DONA",
  "EtPFOSA",
  "EtPFOSA totaal",
  "EtPFOSAA",
  "HFPO-DA",
  "MePFBSA",
  "MePFBSAA",
  "MePFOSA",
  "MePFOSA totaal",
  "MePFOSAA",
  "PFBA",
  "PFBS",
  "PFBSA",
  "PFDA",
  "PFDS",
  "PFDoDA",
  "PFDoDS",
  "PFECHS",
  "PFHpA",
  "PFHpS",
  "PFHxA",
  "PFHxDA",
  "PFHxS",
  "PFHxS totaal",
  "PFHxSA",
  "PFNA",
  "PFNS",
  "PFOA",
  "PFOA totaal",
  "PFODA",
  "PFOS",
  "PFOS totaal",
  "PFOSA",
  "PFOSA totaal",
  "PFPeA",
  "PFPeS",
  "PFTeDA",
  "PFTrDA",
  "PFTrDS",
  "PFUnDA",
  "PFUnDS",
];

const GRONDWATER_PFAS = [
  "10:2 fluortelomeersulfonzuur (10:2 FTS) (10:2 FTS)",
  "11-chlooreicosafluoro-3-oxaundecaansulfonzuur (11Cl-PF3OUnDS) (11Cl-PF3OUnDS)",
  "2H,2H,3H,3H-perfluorundecaanzuur (4H-PFUnDA) (4H-PFUnDA)",
  "4,8-dioxa-3H-perfluornonaanzuur (DONA)) (DONA)",
  "4:2 fluortelomeersulfonzuur (4:2 FTS) (4:2 FTS)",
  "6:2 fluortelomeerfosfaat diester (6:2 diPAP) (6:2 diPAP)",
  "6:2 fluortelomeersulfonzuur (6:2 FTS) (6:2 FTS)",
  "6:2/8:2 fluortelomeerfosfaat diester (6:2/8:2 diPAP) (6:2/8:2 diPAP)",
  "7H-perfluorheptaanzuur (HPFHpA) (HPFHpA)",
  "8:2 fluortelomeer onverzadigd carboxylzuur (8:2 FTUCA) (8:2 FTUCA)",
  "8:2 fluortelomeerfosfaat diester (8:2 diPAP) (8:2 diPAP)",
  "8:2 fluortelomeersulfonzuur (8:2 FTS) (8:2 FTS)",
  "9-Chloorhexadecafluor-3-oxanonaansulfonzuur (9Cl-PF3ONS) (9Cl-PF3ONS)",
  "N-ethylperfluoroctaan-1-sulfonamide (EtPFOSA) (EtPFOSA)",
  "N-ethylperfluoroctaansulfonamidoazijnzuur  (EtPFOSAA) (EtPFOSAA)",
  "N-methylperfluorbutaansulfonamide (MePFBSA) (MePFBSA)",
  "N-methylperfluorbutaansulfonylamide azijnzuur (MePFBSAA) (MePFBSAA)",
  "N-methylperfluoroctaan-1-sulfonamide (MePFOSA) (MePFOSA)",
  "N-methylperfluoroctaansulfonamidoazijnzuur  (MePFOSAA) (MePFOSAA)",
  "PFAS (EFSA-4) (PFAS (EFSA-4))",
  "PFAS (EU DWRL-20) (PFAS (EU DWRL-20))",
  "Trifluorazijnzuur (TFA)",
  "perfluor-2-propoxypropaanzuur (HFPO-DA) (HFPO-DA)",
  "perfluor-3-7-dimethyloctaanzuur (P37DMOA) (P37DMOA)",
  "perfluor-4-ethylcyclohexaansulfonzuur (PFECHS) (PFECHS)",
  "perfluor-n-decaansulfonzuur (PFDS) (PFDS)",
  "perfluor-n-dodecaansulfonzuur (PFDoDS) (PFDoDS)",
  "perfluor-n-dodecaanzuur (PFDoDA) (PFDoDA)",
  "perfluor-n-octaansulfonzuur vertakt (PFOSbranched) (PFOSbranched)",
  "perfluor-n-octaanzuur vertakt (PFOAbranched) (PFOAbranched)",
  "perfluor-n-tetradecaanzuur (PFTeDA) (PFTeDA)",
  "perfluor-n-tridecaansulfonzuur (PFTrDS) (PFTrDS)",
  "perfluor-n-tridecaanzuur (PFTrDA) (PFTrDA)",
  "perfluor-n-undecaansulfonzuur (PFUnDS) (PFUnDS)",
  "perfluor-n-undecaanzuur (PFUnDA) (PFUnDA)",
  "perfluorbutaansulfonamide (PFBSA) (PFBSA)",
  "perfluorbutaansulfonzuur (PFBS) (PFBS)",
  "perfluorbutaanzuur (PFBA) (PFBA)",
  "perfluordecaanzuur (PFDA) (PFDA)",
  "perfluorheptaansulfonzuur (PFHpS) (PFHpS)",
  "perfluorheptaanzuur (PFHpA) (PFHpA)",
  "perfluorhexaansulfonamide (PFHxSA) (PFHxSA)",
  "perfluorhexaansulfonzuur (PFHxS) (PFHxS)",
  "perfluorhexaanzuur (PFHxA) (PFHxA)",
  "perfluorhexadecaanzuur (PFHxDA) (PFHxDA)",
  "perfluornonaansulfonzuur (PFNS) (PFNS)",
  "perfluornonaanzuur (PFNA) (PFNA)",
  "perfluoroctaansulfonamide (PFOSA) (PFOSA)",
  "perfluoroctaansulfonamide vertakt (PFOSAbranched) (PFOSAbranched)",
  "perfluoroctaansulfonzuur (PFOS) (PFOS)",
  "perfluoroctaanzuur (PFOA) (PFOA)",
  "perfluoroctadecaanzuur (PFODA) (PFODA)",
  "perfluorpentaansulfonzuur (PFPeS) (PFPeS)",
  "perfluorpentaanzuur (PFPeA) (PFPeA)",
  "totaal N-ethylperfluoroctaansulfonamide (lineair + vertakt) (EtPFOSAtotal) (EtPFOSAtotal)",
  "totaal N-ethylperfluoroctaansulfonamide (vertakt) (EtPFOSAbranchedl) (EtPFOSAbranched)",
  "totaal N-methylperfluoroctaansulfonamide (lineair + vertakt) (MePFOSAtotal) (MePFOSAtotal)",
  "totaal N-methylperfluoroctaansulfonamide (vertakt) (MePFOSAbranched) (MePFOSAbranched)",
  "totaal perfluor-n-octaansulfonzuur (lineair + vertakt) (PFOStotal) (PFOStotal)",
  "totaal perfluor-n-octaanzuur (lineair + vertakt) (PFOAtotal) (PFOAtotal)",
  "totaal perfluorhexaansulfonzuur (lineair + vertakt) (PFHxStotal) (PFHxStotal)",
  "totaal perfluorhexaansulfonzuur (vertakt) (PFHxSbranchedl) (PFHxSbranched)",
  "totaal perfluoroctaansulfonamide (lineair + vertakt) (PFOSAtotal) (PFOSAtotal)",
];

/** De tekst die geldt als we een stof niet apart beschrijven. */
const FAMILIE = stofprofiel({ symbool: "PFTeDS", omschrijving: "" })!;

const profielVoor = (naam: string, groep?: string) => {
  const { omschrijving, symbool } = splitsParameternaam(naam);
  return stofprofiel({ symbool, omschrijving, ...(groep ? { groep } : {}) });
};

describe("dekking van de PFAS-teksten", () => {
  it("geeft elke PFAS uit oppervlaktewater een eigen tekst", () => {
    const familietekst = OPPERVLAKTEWATER_PFAS.filter(
      (naam) => (profielVoor(naam) ?? FAMILIE) === FAMILIE,
    );
    expect(familietekst).toEqual([]);
  });

  it("dekt ook de namen die alleen de VMM-databank gebruikt", () => {
    // De DOV-laag en de resultatendatabank van de VMM lopen niet gelijk. Aan
    // meetplaats OW834900 staan PFPeDA en de som PFAS-43, die in de DOV-laag
    // niet voorkomen — gevonden door de tabel daar na te lopen, niet door de
    // lijsten te vergelijken.
    for (const naam of ["PFPeDA", "PFAS-43", "PFOS totaal", "PFOA vertakt", "PFOSA vertakt"]) {
      expect(profielVoor(naam)).not.toBe(FAMILIE);
      expect(profielVoor(naam)).toBeDefined();
    }
  });

  it("geeft elke PFAS uit grondwater een eigen tekst", () => {
    // Ook de namen die DOV slordig schrijft: een haakje te veel bij DONA, een
    // letter te veel bij EtPFOSAbranched.
    const familietekst = GRONDWATER_PFAS.filter(
      (naam) => (profielVoor(naam, "Grondwater_chemisch_PFAS") ?? FAMILIE) === FAMILIE,
    );
    expect(familietekst).toEqual([]);
  });

  it("noemt bij elke PFAS een gevolg voor mens of milieu", () => {
    // "Waarom het uitmaakt" mag niet blijven staan bij het gedrag van de stof.
    // Dat iets mobiel is of traag afbreekt, zegt een lezer niets; wat het
    // betekent voor drinkwater, voedsel of gezondheid wel. Waar het gevolg
    // niet vaststaat, hoort dat er met zoveel woorden te staan — vandaar dat
    // "kennisleemte" en "te weinig gegevens" ook meetellen.
    const GEVOLG =
      /kanker|vaccinatie|afweersysteem|lever|drinkwater|putwater|eieren|vis|voedselketen|voedsel|winning|gezondheid|kennisleemte|te weinig gegevens|niet meer uit|schildklier/i;

    const zonderGevolg = [...OPPERVLAKTEWATER_PFAS, ...GRONDWATER_PFAS]
      .map((naam) => ({ naam, profiel: profielVoor(naam, "Grondwater_chemisch_PFAS") }))
      .filter(({ profiel }) => profiel && !GEVOLG.test(profiel.risico ?? ""))
      .map(({ naam }) => naam);

    expect(zonderGevolg).toEqual([]);
  });

  it("zet dat gevolg ook in de korte zin bij een overschrijding", () => {
    // De regel in de tabel is voor wie nooit doorklikt. Daar is de ruimte het
    // kleinst en het gevolg het belangrijkst.
    const GEVOLG =
      /kanker|vaccinatie|afweersysteem|lever|drinkwater|putwater|eieren|vis|voedselketen|voedsel|winning|gezondheid|gevolgen|schildklier/i;

    for (const symbool of ["PFOS", "PFOA", "PFBS", "6:2 diPAP", "TFA", "PFHxA"]) {
      expect(korteRisicozin(profielVoor(symbool)!)).toMatch(GEVOLG);
    }
  });

  it("houdt de families uit elkaar", () => {
    // Als alles op één tekst uitkomt, slaagt de test hierboven ook. Dit legt
    // vast dat er werkelijk onderscheid gemaakt wordt.
    const teksten = new Set(
      [...OPPERVLAKTEWATER_PFAS, ...GRONDWATER_PFAS]
        .map((naam) => profielVoor(naam, "Grondwater_chemisch_PFAS")?.wat)
        .filter(Boolean),
    );
    expect(teksten.size).toBeGreaterThanOrEqual(15);
  });
});
