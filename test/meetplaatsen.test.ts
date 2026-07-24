import { describe, expect, it } from "vitest";
import {
  afstand,
  codeVoor,
  formatteerAfstand,
  matrixVanCode,
  zoek,
  type Meetplaats,
} from "../src/geo/meetplaatsen.js";

const punt = (over: Partial<Meetplaats> & Pick<Meetplaats, "nummer">): Meetplaats => ({
  laag: "oppervlaktewater",
  id: over.nummer,
  code: `OW${over.nummer}`,
  matrix: "OW",
  omschrijving: "",
  gemeente: null,
  lon: 4.5,
  lat: 51,
  meetnetten: ["FYSICOCHEM"],
  meetPfas: false,
  zoeksleutel:
    `OW${over.nummer} ${over.nummer} ${over.omschrijving ?? ""} ${over.gemeente ?? ""}`.toLowerCase(),
  ...over,
});

describe("codeVoor", () => {
  it("geeft oppervlaktewaterpunten de OW-prefix", () => {
    expect(codeVoor("65000", ["FYSICOCHEM", "MACROINV"])).toBe("OW65000");
  });

  it("geeft een zuiver waterbodempunt de WB-prefix", () => {
    expect(codeVoor("124", ["WATBODEM"])).toBe("WB124");
  });

  it("houdt een punt dat óók fysisch-chemisch bemonsterd wordt bij OW", () => {
    // 210000 aan de Rupel zit in beide meetnetten; het rapport kent het als OW210000.
    expect(codeVoor("210000", ["FYSICOCHEM", "MACROINV", "FYTOPLANKT", "WATBODEM"])).toBe(
      "OW210000",
    );
  });
});

describe("matrixVanCode", () => {
  // Een OW-code opvragen met matrix WB levert stilzwijgend nul resultaten op,
  // dus de matrix moet altijd bij de prefix passen.
  it.each([
    ["OW65000", "OW"],
    ["OWBR12", "OW"],
    ["OWTR7", "OW"],
    ["WB124", "WB"],
    ["B1000243", "BI"],
  ])("leidt uit %s de matrix %s af", (code, verwacht) => {
    expect(matrixVanCode(code)).toBe(verwacht);
  });
});

describe("afstand", () => {
  it("meet de afstand tussen twee punten in meter", () => {
    // Kalmthout OW65000 naar OW65100, hemelsbreed ongeveer 1,6 km.
    const gemeten = afstand({ lat: 51.4088, lon: 4.4633 }, { lat: 51.3963, lon: 4.4761 });
    expect(gemeten).toBeGreaterThan(1400);
    expect(gemeten).toBeLessThan(1900);
  });

  it("geeft nul voor hetzelfde punt", () => {
    expect(afstand({ lat: 51, lon: 4 }, { lat: 51, lon: 4 })).toBe(0);
  });
});

describe("formatteerAfstand", () => {
  it.each([
    [120, "120 m"],
    [1500, "1,5 km"],
    [24_000, "24 km"],
  ])("toont %i m als %s", (meter, verwacht) => {
    expect(formatteerAfstand(meter)).toBe(verwacht);
  });
});

describe("zoek", () => {
  const punten = [
    punt({ nummer: "65000", omschrijving: "Leyterstraat, opw brug", gemeente: "Kalmthout", lat: 51.4088, lon: 4.4633 }),
    punt({ nummer: "65100", omschrijving: "Onderbroeksesteenweg", gemeente: "Kalmthout", lat: 51.3963, lon: 4.4761 }),
    punt({ nummer: "210000", omschrijving: "FC loskade, Rupel", gemeente: "Niel", lat: 51.1102, lon: 4.3312 }),
  ];

  it("vindt op meetplaatsnummer", () => {
    expect(zoek(punten, "65000").map((m) => m.nummer)).toEqual(["65000"]);
  });

  it("vindt ook wanneer de gebruiker de OW-prefix meetypt", () => {
    // Precies de verwarring die deze app moet wegnemen.
    expect(zoek(punten, "OW65000").map((m) => m.nummer)).toEqual(["65000"]);
  });

  it("kort een zoekterm die met ow of wb begint niet in", () => {
    // De prefix-afkorting gold ooit voor codes, maar knipte "ow"/"wb" van élke
    // term. "wbeek" werd zo "eek" en matchte dan ook een gewone "Beek".
    const extra = [
      punt({ nummer: "400", omschrijving: "Wbeekmonding" }),
      punt({ nummer: "401", omschrijving: "Beekmonding" }),
    ];
    expect(zoek(extra, "wbeek").map((m) => m.nummer)).toEqual(["400"]);
  });

  it("vindt op gemeente", () => {
    expect(zoek(punten, "kalmthout").map((m) => m.nummer)).toEqual(["65000", "65100"]);
  });

  it("vindt op omschrijving, ongeacht hoofdletters", () => {
    expect(zoek(punten, "RUPEL").map((m) => m.nummer)).toEqual(["210000"]);
  });

  it("zet een exacte nummertreffer bovenaan", () => {
    const extra = [...punten, punt({ nummer: "650001", omschrijving: "Elders" })];
    expect(zoek(extra, "65000")[0]!.nummer).toBe("65000");
  });

  it("zet genummerde meetplaatsen vóór meetplaatsen met een naam", () => {
    // Niet elk meetplaatsnummer is een getal: "Timbers 15" bestaat echt.
    // Wordt het nummer uit de code teruggerekend in plaats van gelezen, dan
    // blijft van "OWTimbers 15" de tekst " 15" over — en die spatie sorteert
    // vóór elk cijfer, waardoor zulke punten de lijst aanvoeren.
    const extra = [punt({ nummer: "Timbers 15", omschrijving: "Noordzee" }), ...punten];
    expect(zoek(extra, "")[0]!.nummer).toBe("65000");
  });

  it("sorteert op nummer en niet op de prefix van de code", () => {
    // Anders zou elk OW-punt vóór elk WB-punt staan in plaats van op volgorde.
    const gemengd = [
      punt({ nummer: "200" }),
      { ...punt({ nummer: "100" }), code: "WB100", matrix: "WB" as const },
    ];
    expect(zoek(gemengd, "").map((m) => m.nummer)).toEqual(["100", "200"]);
  });

  it("sorteert op afstand wanneer een positie bekend is", () => {
    const vanaf = { lat: 51.09, lon: 4.33 }; // dicht bij Niel
    expect(zoek(punten, "", vanaf)[0]!.nummer).toBe("210000");
  });

  it("beperkt het aantal resultaten", () => {
    expect(zoek(punten, "", undefined, 2)).toHaveLength(2);
  });

  it("geeft alles terug bij een lege zoekterm", () => {
    expect(zoek(punten, "")).toHaveLength(3);
  });
});
