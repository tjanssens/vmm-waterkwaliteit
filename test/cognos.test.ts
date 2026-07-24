import { describe, expect, it } from "vitest";
import { bouwCognosUrl, leesAanvraag, rapportUrl, ValidatieFout } from "../shared/cognos.js";

const vraag = (query: string) => new URLSearchParams(query);

describe("leesAanvraag", () => {
  it("leest een geldige vraag", () => {
    expect(leesAanvraag(vraag("meetplaats=OW65000&matrix=OW&jaren=2024,2017"), 2026)).toEqual({
      meetplaats: "OW65000",
      matrix: "OW",
      jaren: ["2024", "2017"],
    });
  });

  it("gaat uit van oppervlaktewater wanneer de matrix ontbreekt", () => {
    expect(leesAanvraag(vraag("meetplaats=OW1&jaren=2024"), 2026).matrix).toBe("OW");
  });

  it("normaliseert kleine letters", () => {
    expect(leesAanvraag(vraag("meetplaats=ow65000&jaren=2024"), 2026).meetplaats).toBe("OW65000");
  });

  it("ontdubbelt herhaalde jaartallen", () => {
    expect(leesAanvraag(vraag("meetplaats=OW1&jaren=2024,2024,2023"), 2026).jaren).toEqual([
      "2024",
      "2023",
    ]);
  });

  it.each(["OW65000", "WB124", "BI1000243", "OWBR12", "OWTR7"])(
    "aanvaardt de meetplaatscode %s",
    (code) => {
      expect(leesAanvraag(vraag(`meetplaats=${code}&jaren=2024`), 2026).meetplaats).toBe(code);
    },
  );

  // Bijna een kwart van de punten heeft een niet-numeriek nummer. Voor `\d+`
  // wees de proxy die codes af en was dat deel van de kaart onbevraagbaar. De
  // waarden komen hier al in hoofdletters binnen, zoals na normalisatie.
  it.each(["OWGK057", "OWOV_BL_WAKA", "OWBB ASSE", "OWOPEX1&2", "OW365000.B"])(
    "aanvaardt de niet-numerieke meetplaatscode %s",
    (code) => {
      expect(
        leesAanvraag(vraag(`meetplaats=${encodeURIComponent(code)}&jaren=2024`), 2026).meetplaats,
      ).toBe(code);
    },
  );

  describe("weigert alles wat geen geldige vraag is", () => {
    it.each([
      ["zonder meetplaats", "jaren=2024"],
      ["met een meetplaats zonder prefix", "meetplaats=65000&jaren=2024"],
      ["met een meetplaats zonder nummer", "meetplaats=OW&jaren=2024"],
      ["met een onbekende matrix", "meetplaats=OW1&matrix=XX&jaren=2024"],
      ["zonder jaartallen", "meetplaats=OW1"],
      ["met een jaartal in de toekomst", "meetplaats=OW1&jaren=2099"],
      ["met een jaartal van voor de metingen", "meetplaats=OW1&jaren=1900"],
      ["met een onvolledig jaartal", "meetplaats=OW1&jaren=24"],
    ])("%s", (_naam, query) => {
      expect(() => leesAanvraag(vraag(query), 2026)).toThrow(ValidatieFout);
    });

    it("met meer dan twintig jaartallen", () => {
      const veel = Array.from({ length: 21 }, (_, i) => 2000 + i).join(",");
      expect(() => leesAanvraag(vraag(`meetplaats=OW1&jaren=${veel}`), 2026)).toThrow(ValidatieFout);
    });

    it("laat geen injectie in de meetplaatscode toe", () => {
      expect(() =>
        leesAanvraag(vraag("meetplaats=OW1%26p_pSamplePoint%3DOW2&jaren=2024"), 2026),
      ).toThrow(ValidatieFout);
    });
  });
});

describe("bouwCognosUrl", () => {
  it("zet elk jaartal als eigen parameter, zoals Cognos verwacht", () => {
    const url = new URL(
      bouwCognosUrl({ meetplaats: "OW65000", matrix: "OW", jaren: ["2024", "2017"] }),
    );

    expect(url.searchParams.getAll("p_pJaar")).toEqual(["2024", "2017"]);
    expect(url.searchParams.get("p_pSamplePoint")).toBe("OW65000");
    expect(url.searchParams.get("p_pMatrix")).toBe("OW");
    expect(url.searchParams.get("fmt")).toBe("CSV");
  });

  it("spreekt uitsluitend het ene toegelaten rapport aan", () => {
    const url = bouwCognosUrl({ meetplaats: "OW1", matrix: "OW", jaren: ["2024"] });

    expect(url).toContain("/report/i1B4F72B440A747A3B2F9D6057DC16031");
    expect(url.startsWith("https://int-web.vmm.be/ibmcognos/")).toBe(true);
  });

});

describe("rapportUrl", () => {
  const url = new URL(rapportUrl({ meetplaats: "OW65000", matrix: "OW", jaren: ["2024"] }));

  it("opent het rapport rechtstreeks op meetplaats en meetjaar", () => {
    expect(url.searchParams.get("p_pSamplePoint")).toBe("OW65000");
    expect(url.searchParams.get("p_pMatrix")).toBe("OW");
    expect(url.searchParams.getAll("p_pJaar")).toEqual(["2024"]);
  });

  it("slaat het keuzescherm over", () => {
    // Zonder prompt=false toont Cognos alsnog de drie keuzelijsten.
    expect(url.searchParams.get("prompt")).toBe("false");
    expect(url.searchParams.get("action")).toBe("run");
  });

  it("wijst naar de VMM-rapportomgeving, niet naar onze eigen proxy", () => {
    expect(url.host).toBe("int-web.vmm.be");
    expect(url.searchParams.get("id")).toBe("i1B4F72B440A747A3B2F9D6057DC16031");
  });

  it("verwijst naar het rapport in de publieke map van de VMM", () => {
    expect(url.searchParams.get("pathRef")).toContain("Analyseresultaten");
  });
});
