import { describe, expect, it } from "vitest";
import { korteRisicozin, stofprofiel } from "../src/data/stoffen.js";
import { splitsParameternaam } from "../src/data/grondwater.js";

/**
 * De pesticiden zoals DOV ze rapporteert, met hun parametergroep. Genomen uit
 * een steekproef van 30.000 metingen; de volle databank telt er 448.000, en
 * die binnenhalen om een lijst namen te krijgen zou niet in verhouding staan.
 *
 * De zeldzame stoffen ontbreken daardoor. Dat is precies waarom de familie- en
 * groepsteksten blijven bestaan: die vangen wat hier niet in staat.
 */
const PESTICIDEN: [string, string][] = [
  ["Desethylatrazine (atr_des)", "Pesticiden: relevante metabolieten"],
  ["2,6-Dichlorobenzamide (BAM) (BAM)", "Niet-relevante metabolieten van pesticiden"],
  ["AMPA (AMPA)", "Niet-relevante metabolieten van pesticiden"],
  ["dimethylsulfamide (DMS)", "Pesticiden: relevante metabolieten"],
  ["VIS-01 (VIS)", "Niet-relevante metabolieten van pesticiden"],
  ["Desisopropylatrazine (Atr_desisoprop)", "Pesticiden: relevante metabolieten"],
  ["Desethylterbuthylazine (Terbu_des)", "Pesticiden: relevante metabolieten"],
  ["Desphenyl-Chloridazon (Dchdzn)", "Niet-relevante metabolieten van pesticiden"],
  ["Metazachloor ESA (479M08) (meta8)", "Niet-relevante metabolieten van pesticiden"],
  ["Metazachloor OA (479M04) (meta4)", "Niet-relevante metabolieten van pesticiden"],
  ["S-Metolachloor ESA (Metola-S-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["Metazachloor 479M09 (meta9)", "Pesticiden: relevante metabolieten"],
  ["Metazachloor 479M11 (meta11)", "Pesticiden: relevante metabolieten"],
  ["EZ-3-chlooracrylzuur (chazr)", "Pesticiden: relevante metabolieten"],
  ["Metazachloor 479M12 (meta12)", "Niet-relevante metabolieten van pesticiden"],
  ["Terbutylazine (Terbu)", "Pesticiden: actieve stoffen"],
  ["Chloortoluron (Chlortol)", "Pesticiden: actieve stoffen"],
  ["Bentazon (Bentaz)", "Pesticiden: actieve stoffen"],
  ["Atrazine (Atraz)", "Pesticiden: actieve stoffen"],
  ["Diuron (Diur)", "Pesticiden: actieve stoffen"],
  ["Simazine (Simaz)", "Pesticiden: actieve stoffen"],
  ["2,4-DB (24db)", "Pesticiden: actieve stoffen"],
  ["Isoproturon (Isoprot)", "Pesticiden: actieve stoffen"],
  ["Ethofumesaat (Ethofum)", "Pesticiden: actieve stoffen"],
  ["Metazachloor (Metaza)", "Pesticiden: actieve stoffen"],
  ["Propazine (Propaz)", "Pesticiden: actieve stoffen"],
  ["Linuron (Linur)", "Pesticiden: actieve stoffen"],
  ["Alachloor (Ala)", "Pesticiden: actieve stoffen"],
  ["Terbutryn (Terbutryn)", "Pesticiden: actieve stoffen"],
  ["Sebuthylazine (Sebu)", "Pesticiden: actieve stoffen"],
  ["Propanil (Propan)", "Pesticiden: actieve stoffen"],
  ["Fluroxypyr (Fluroxypyr)", "Pesticiden: actieve stoffen"],
  ["Dichloorprop (Dichlorpr)", "Pesticiden: actieve stoffen"],
  ["Chloridazon (Chloridaz)", "Pesticiden: actieve stoffen"],
  ["Dicamba (Dicam)", "Pesticiden: actieve stoffen"],
  ["Prometryn (Prometr)", "Pesticiden: actieve stoffen"],
  ["MCPB (mcpb)", "Pesticiden: actieve stoffen"],
  ["Cyanazine (Cyana)", "Pesticiden: actieve stoffen"],
  ["trichlorpyr (trichlorpyr)", "Pesticiden: actieve stoffen"],
  ["Chloorpropharm (Clproph)", "Pesticiden: actieve stoffen"],
  ["Carbetamide (Carbet)", "Pesticiden: actieve stoffen"],
  ["Metoxuron (Metox)", "Pesticiden: actieve stoffen"],
  ["Hexazinone (Hexaz)", "Pesticiden: actieve stoffen"],
  ["Fenoprop (Fenoprop)", "Pesticiden: actieve stoffen"],
  ["2,4-D (24d)", "Pesticiden: actieve stoffen"],
  ["Methabenzthiazuron (Methabenz)", "Pesticiden: actieve stoffen"],
  ["2,4,5-T (245t)", "Pesticiden: actieve stoffen"],
  ["Metobromuron (Metobro)", "Pesticiden: actieve stoffen"],
  ["Monolinuron (Linur_mono)", "Pesticiden: actieve stoffen"],
  ["Mecoprop (Mecopr)", "Pesticiden: actieve stoffen"],
  ["Carbendazim (Carben)", "Pesticiden: actieve stoffen"],
  ["MCPA (mcpa)", "Pesticiden: actieve stoffen"],
  ["Bromacil (brom)", "Pesticiden: actieve stoffen"],
  ["Propachloor (PropaCl)", "Pesticiden: actieve stoffen"],
  ["Flufenacet (flufe)", "Pesticiden: actieve stoffen"],
  ["S-Metolachlor (metola-S)", "Pesticiden: actieve stoffen"],
  ["Metamitron (Metami)", "Pesticiden: actieve stoffen"],
  ["Pesticiden Totaal (pest-tot)", "Pesticiden: actieve stoffen"],
  ["Metolachloor (metola)", "Pesticiden: actieve stoffen"],
  ["triazophos (triazoph)", "Pesticiden: actieve stoffen"],
  ["trifloxystrobin (Triflox)", "Pesticiden: actieve stoffen"],
  ["Pentachloorfenol (5ClFenol)", "Pesticiden: actieve stoffen"],
  ["mesotrione (Mesotri)", "Pesticiden: actieve stoffen"],
  ["imidacloprid (Imida)", "Pesticiden: actieve stoffen"],
  ["Chloorthalonil metaboliet R471811 (R471811)", "Pesticiden: relevante metabolieten"],
  ["Methyldesfenylchloridazon (medesfenylchloridaz)", "Niet-relevante metabolieten van pesticiden"],
  ["1,2,4-Triazool (124Triaz)", "Pesticiden: relevante metabolieten"],
  ["fluopicolide (fluopicolide)", "Pesticiden: actieve stoffen"],
  ["1,2-Dibroom-3-chloorpropaan (dibrclprop)", "Pesticiden: actieve stoffen"],
  ["1,3-Dichloorpropeen (trans) (13DCPE_trans)", "Pesticiden: actieve stoffen"],
  ["1,3-Dichloorpropeen (cis) (13DCPE_cis)", "Pesticiden: actieve stoffen"],
  ["Dimethenamid-OA (Dimethenamid-OA)", "Niet-relevante metabolieten van pesticiden"],
  ["acetochlor-ESA (acetochlor-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["Propachlor-ESA (Propachlor-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["Dimethenamid-ESA (Dimethenamid-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["Flufenacet-OA (Flufenacet-OA)", "Niet-relevante metabolieten van pesticiden"],
  ["acetochlor-OA (acetochlor-OA)", "Niet-relevante metabolieten van pesticiden"],
  ["Flufenacet-ESA (Flufenacet-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["metolachlor-OA (metola-OA)", "Niet-relevante metabolieten van pesticiden"],
  ["alachlor-OA (alachlor-OA)", "Niet-relevante metabolieten van pesticiden"],
  ["metolachlor-ESA (metola-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["alachlor-ESA (alachlor-ESA)", "Niet-relevante metabolieten van pesticiden"],
  ["Glyfosaat (Glyfos)", "Pesticiden: actieve stoffen"],
  ["Broommethaan (CH3Br)", "Pesticiden: actieve stoffen"],
];

/** De vangnettekst voor een pesticide die we niet nader kennen. */
const ALGEMEEN = stofprofiel({
  symbool: "Onbekende stof",
  omschrijving: "",
  groep: "Pesticiden: actieve stoffen",
})!;

const profielVoor = (naam: string, groep: string) => {
  const { omschrijving, symbool } = splitsParameternaam(naam);
  return stofprofiel({ symbool, omschrijving, groep });
};

describe("duiding bij pesticiden", () => {
  it("duidt de stoffen die in de meetnetten domineren", () => {
    // Niet elke stof apart: honderden middelen krijgen nooit een eigen tekst.
    // Wel de stoffen die het beeld bepalen — de vier die overblijven zijn
    // zeldzaam en vallen terug op de tekst van hun groep.
    const algemeen = PESTICIDEN.filter(
      ([naam, groep]) => (profielVoor(naam, groep) ?? ALGEMEEN) === ALGEMEEN,
    );

    expect(algemeen.length).toBeLessThanOrEqual(4);
  });

  it("houdt verboden en toegelaten middelen uit elkaar", () => {
    // Dit onderscheid bepaalt wat een meting betekent. Atrazine is een erfenis
    // van twintig jaar geleden; terbutylazine verving het en mag nog gebruikt
    // worden, dus daar gaat een vondst over vandaag.
    expect(profielVoor("Atrazine (Atraz)", "Pesticiden: actieve stoffen")!.herkomst).toMatch(
      /niet meer toegelaten/i,
    );
    expect(profielVoor("Terbutylazine (Terbu)", "Pesticiden: actieve stoffen")!.herkomst).toMatch(
      /nog steeds toegelaten/i,
    );
  });

  it("geeft de metabolieten de tekst van hun eigen familie", () => {
    // DOV verzint per metaboliet een schrijfwijze; het patroon erachter is
    // stabiel, de spelling niet.
    const esa = profielVoor("Metazachloor ESA (479M08) (meta8)", "Niet-relevante metabolieten van pesticiden");
    const oa = profielVoor("metolachlor-OA (metola-OA)", "Niet-relevante metabolieten van pesticiden");
    expect(esa?.wat).toMatch(/ESA- en OA-metabolieten/i);
    expect(oa).toBe(esa);

    const des = profielVoor("Desethylatrazine (atr_des)", "Pesticiden: relevante metabolieten");
    expect(des?.wat).toMatch(/triazineherbiciden/i);
  });

  it("noemt bij elk pesticide een gevolg voor mens of milieu", () => {
    const GEVOLG =
      /kanker|voortplanting|zenuwstelsel|onvruchtbaar|drinkwater|winning|waterplanten|waterorganismen|waterleven|voedsel|bijen|vis|algen|gezondheid|erfelijk|ozonlaag|hormoon|amfibie/i;

    const zonderGevolg = PESTICIDEN.filter(([naam, groep]) => {
      const profiel = profielVoor(naam, groep);
      return profiel && !GEVOLG.test(profiel.risico ?? "");
    }).map(([naam]) => naam);

    expect(zonderGevolg).toEqual([]);
  });

  it("zet dat gevolg ook in de korte zin bij een overschrijding", () => {
    const GEVOLG =
      /kanker|voortplanting|zenuwstelsel|onvruchtbaar|drinkwater|winning|waterplanten|waterinsecten|waterleven|bijen|algen|beek|grondwater|toegelaten|waterorganismen|hormoon|amfibie|erfelijk|ozonlaag/i;

    for (const [naam, groep] of PESTICIDEN.slice(0, 25)) {
      const profiel = profielVoor(naam, groep);
      if (profiel) expect(korteRisicozin(profiel)).toMatch(GEVOLG);
    }
  });
});
