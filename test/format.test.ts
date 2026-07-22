import { describe, expect, it } from "vitest";
import {
  formatteerBereik,
  formatteerDatum,
  formatteerDatumKort,
  formatteerGetal,
  formatteerWaarde,
  kleinLetter,
  sommMaakOp,
} from "../src/ui/format.js";

describe("formatteerGetal", () => {
  it("gebruikt de komma als decimaalteken", () => {
    expect(formatteerGetal(6.82)).toBe("6,82");
  });

  it.each([
    [6400, "6400"],
    [203.5, "204"],
    [35.4, "35,4"],
    [6.8242, "6,82"],
    [0.0984, "0,0984"],
    [0.0214, "0,0214"],
  ])("toont %f als %s", (waarde, verwacht) => {
    expect(formatteerGetal(waarde)).toBe(verwacht);
  });
});

describe("formatteerWaarde", () => {
  it("toont een gewone waarde zonder voorvoegsel", () => {
    expect(formatteerWaarde(0.0984)).toBe("0,0984");
  });

  it("zet '<' voor een waarde die volledig onder de detectielimiet lag", () => {
    // Cadmium op OW65000: zes metingen, alle onder de limiet.
    expect(formatteerWaarde(0.15, true)).toBe("< 0,15");
  });
});

describe("formatteerBereik", () => {
  it("toont minimum en maximum", () => {
    expect(formatteerBereik(0.0214, 0.325)).toBe("0,0214 – 0,325");
  });

  it("toont één waarde wanneer er maar één meting was", () => {
    expect(formatteerBereik(5.73, 5.73)).toBe("5,73");
  });
});

describe("formatteerDatum", () => {
  it("schrijft de maand voluit", () => {
    expect(formatteerDatum("2024-11-07")).toBe("7 november 2024");
  });

  it("laat een onherkenbare datum ongemoeid", () => {
    expect(formatteerDatum("onbekend")).toBe("onbekend");
  });
});

describe("formatteerDatumKort", () => {
  it("toont de datum compact genoeg voor een tabelkolom", () => {
    expect(formatteerDatumKort("2024-11-07")).toBe("07/11/2024");
  });

  it("laat een onherkenbare datum ongemoeid", () => {
    expect(formatteerDatumKort("onbekend")).toBe("onbekend");
  });
});

describe("kleinLetter", () => {
  it("zet een gewone naam in kleine letter", () => {
    expect(kleinLetter("Ammonium")).toBe("ammonium");
    expect(kleinLetter("Chemisch zuurstofverbruik")).toBe("chemisch zuurstofverbruik");
  });

  it("laat pH ongemoeid", () => {
    // Blind lowercasen maakte hier eerder het onleesbare "ph" van.
    expect(kleinLetter("pH")).toBe("pH");
  });

  it("laat een afkorting in hoofdletters ongemoeid", () => {
    expect(kleinLetter("CZV")).toBe("CZV");
    expect(kleinLetter("PFOS")).toBe("PFOS");
  });

  it("laat een naam die al klein is ongemoeid", () => {
    expect(kleinLetter("orthofosfaat")).toBe("orthofosfaat");
  });
});

describe("sommMaakOp", () => {
  it.each([
    [[], ""],
    [["fosfor"], "fosfor"],
    [["fosfor", "ammonium"], "fosfor en ammonium"],
    [["fosfor", "ammonium", "CZV"], "fosfor, ammonium en CZV"],
  ])("somt %j op als %s", (delen, verwacht) => {
    expect(sommMaakOp(delen)).toBe(verwacht);
  });
});
