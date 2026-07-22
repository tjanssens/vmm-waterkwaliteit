import type { Oordeel, OordeelKlasse, ParameterSamenvatting } from "../data/types.js";
import { kleinLetter, sommMaakOp } from "./format.js";

/**
 * De zin bovenaan het paneel. Dit is de enige plek waar een leek een oordeel
 * leest, dus hij mag nooit meer beweren dan er getoetst is.
 */
export function samenvattingsZin(
  parameters: readonly ParameterSamenvatting[],
  oordelen: ReadonlyMap<string, Oordeel>,
): string {
  const namenVan = (klasse: OordeelKlasse) =>
    parameters
      .filter((p) => oordelen.get(p.symbool)?.klasse === klasse)
      .map((p) => kleinLetter(p.omschrijving.split(",")[0]!));

  const buiten = namenVan("buiten-norm");
  const grens = namenVan("op-grens");
  const conform = namenVan("conform");

  if (buiten.length + grens.length + conform.length === 0) {
    // Waterbodem en biota hebben hier geen enkele toetsbare parameter.
    // "Alles binnen de norm" zou dan een schone rekening suggereren.
    return "Geen van deze parameters kon tegen een norm getoetst worden.";
  }

  if (buiten.length === 0 && grens.length === 0) {
    // Neutraal geformuleerd: "basiskwaliteitsnorm" is een VLAREM-begrip dat
    // bij lucht en grondwater niet bestaat.
    return "Alle getoetste parameters blijven binnen de norm.";
  }

  if (buiten.length === 0) {
    return `Geen enkele parameter overschrijdt de norm, maar ${sommMaakOp(grens)} ${
      grens.length === 1 ? "schuurt" : "schuren"
    } er tegenaan.`;
  }

  let zin = `De norm wordt overschreden voor ${sommMaakOp(buiten)}.`;
  if (grens.length > 0) {
    zin += ` Daarnaast ${grens.length === 1 ? "zit" : "zitten"} ${sommMaakOp(grens)} op de grens.`;
  }
  return zin;
}
