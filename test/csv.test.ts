import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAnalyseresultaten, FormaatFout } from "../src/data/csv.js";

const fixture = (naam: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${naam}`, import.meta.url)), "utf8");

const KOP =
  "Sample Point\tDatum\tSample ID\tTijdstip\tParameter Symbool\tParameter omschrijving\tTeken\tResultaat\tEenheid";

describe("parseAnalyseresultaten", () => {
  it("leest een gewone meting volledig uit", () => {
    const csv = `${KOP}\nOW65000\t2024-11-07\t21998877\t09:41:00\toPO4 f\tOrthofosfaat\t=\t0,022\tmgP/L\n`;

    expect(parseAnalyseresultaten(csv)).toEqual([
      {
        meetplaats: "OW65000",
        datum: "2024-11-07",
        jaar: 2024,
        staalId: "21998877",
        tijdstip: "09:41:00",
        symbool: "oPO4 f",
        omschrijving: "Orthofosfaat",
        eenheid: "mgP/L",
        waarde: 0.022,
        onderDetectielimiet: false,
      },
    ]);
  });

  it("leest de decimale komma als decimaalteken", () => {
    const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tN t\tStikstof\t=\t28,5\tmgN/L\n`;
    expect(parseAnalyseresultaten(csv)[0]!.waarde).toBe(28.5);
  });

  it("markeert een '<'-resultaat als onder de detectielimiet", () => {
    const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tCd t\tCadmium\t<\t0,1\tµg/L\n`;
    const meting = parseAnalyseresultaten(csv)[0]!;

    expect(meting.onderDetectielimiet).toBe(true);
    // De waarde is de limiet zelf, niet de concentratie.
    expect(meting.waarde).toBe(0.1);
  });

  it("behandelt '>' eveneens als niet-exacte waarde maar niet als detectielimiet", () => {
    const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tX\tOnbekend\t>\t100\tmg/L\n`;
    expect(parseAnalyseresultaten(csv)[0]!.onderDetectielimiet).toBe(false);
  });

  it("geeft een lege lijst terug wanneer het meetpunt geen resultaten heeft", () => {
    expect(parseAnalyseresultaten(fixture("leeg.tsv"))).toEqual([]);
  });

  it("verdraagt een ontbrekend tijdstip", () => {
    const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tpH\tZuurtegraad\t=\t6,5\t-\n`;
    expect(parseAnalyseresultaten(csv)[0]!.tijdstip).toBeNull();
  });

  it("negeert lege regels aan het einde", () => {
    const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tpH\tZuurtegraad\t=\t6,5\t-\n\n\n`;
    expect(parseAnalyseresultaten(csv)).toHaveLength(1);
  });

  it("verdraagt CRLF-regeleindes", () => {
    const csv = `${KOP}\r\nOW1\t2024-01-01\t1\t\tpH\tZuurtegraad\t=\t6,5\t-\r\n`;
    expect(parseAnalyseresultaten(csv)).toHaveLength(1);
  });

  describe("faalt zichtbaar in plaats van stil verkeerde cijfers te tonen", () => {
    it("weigert een respons met een onverwachte kolomindeling", () => {
      const csv = "Meetpunt\tDatum\tWaarde\nOW1\t2024-01-01\t5\n";
      expect(() => parseAnalyseresultaten(csv)).toThrow(FormaatFout);
    });

    it("weigert een Cognos-foutmelding die als tekst binnenkomt", () => {
      const csv = '<rds:error><rds:message>RDS-ERR-1021 ...</rds:message></rds:error>';
      expect(() => parseAnalyseresultaten(csv)).toThrow(FormaatFout);
    });

    it("weigert een regel met een onleesbaar getal", () => {
      const csv = `${KOP}\nOW1\t2024-01-01\t1\t\tpH\tZuurtegraad\t=\tn.v.t.\t-\n`;
      expect(() => parseAnalyseresultaten(csv)).toThrow(FormaatFout);
    });
  });

  describe("op de echte respons voor OW65000", () => {
    const metingen = parseAnalyseresultaten(fixture("ow65000.tsv"));

    it("leest alle 466 metingen", () => {
      expect(metingen).toHaveLength(466);
    });

    it("herkent de 100 waarden onder de detectielimiet", () => {
      expect(metingen.filter((m) => m.onderDetectielimiet)).toHaveLength(100);
    });

    it("vindt drie meetjaren", () => {
      expect([...new Set(metingen.map((m) => m.jaar))].sort()).toEqual([2016, 2017, 2024]);
    });

    it("behoudt de eenheid met µ-teken correct", () => {
      const zilver = metingen.find((m) => m.symbool === "Ag t");
      expect(zilver?.eenheid).toBe("µg/L");
    });
  });
});
