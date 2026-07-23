/**
 * Hoe je een PFAS herkent aan haar naam.
 *
 * Staat apart omdat twee modules deze kennis nodig hebben: `stoffen.ts` om de
 * juiste tekst te kiezen en `categorieen.ts` om de stof in de PFAS-categorie te
 * zetten. Toen dit twee kopieën waren, kon een nieuwe PFAS-vorm wél duiding
 * krijgen en tóch bij "Overige parameters" belanden, of omgekeerd. Geen van
 * beide gevallen laat een test falen, want elke test kende maar één kopie.
 */

/**
 * PFAS zijn met duizenden en krijgen geen tekst per stof, maar ze delen een
 * vorm in hun code: PFOA, 6:2 FTS, MePFOSA, HFPO-DA, 9Cl-PF3ONS.
 */
export const PFAS_SYMBOOL =
  /^(PF[A-Z]|\d+:\d+[\s/]|[A-Za-z]*PFOS|[A-Za-z]*PFOA|HFPO|DONA|\d*Cl-PF|\d+H-PF|P\d+DMOA|Me?PF|Et?PF)/;

/**
 * "Fluoride" mag hier niet in trappen, vandaar de stam en niet enkel "fluor":
 * per-, poly- en fluortelomeerverbindingen zijn PFAS, fluoride is dat niet.
 */
export const PFAS_NAAM = /(perfluor|polyfluor|fluortelomeer|fluoroctaan|fluorbutaan)/i;

/** Of deze parameter aan haar naam als PFAS te herkennen is. */
export function lijktOpPfas(symbool: string, omschrijving: string): boolean {
  return PFAS_SYMBOOL.test(symbool) || PFAS_NAAM.test(omschrijving);
}

/**
 * Haalt de variantaanduiding van een PFAS-symbool af.
 *
 * Dezelfde stof komt in vier gedaanten binnen. De VMM schrijft "PFOS totaal"
 * en "PFOS vertakt"; DOV plakt het aan elkaar tot "PFOStotal" en
 * "PFOSbranched", met in twee gevallen een tikfout ("PFHxSbranchedl"). Het
 * gaat telkens om perfluoroctaansulfonzuur, dus om dezelfde uitleg.
 *
 * Zonder dit zou alleen de kale vorm zijn eigen tekst krijgen en zouden de
 * varianten terugvallen op het familieverhaal, zonder dat iemand ziet dat er
 * een preciezere tekst bestond.
 */
export function pfasStam(symbool: string): string {
  return symbool
    .replace(/\s+(totaal|vertakt|lineair)$/i, "")
    .replace(/(total|branchedl?|linear)$/, "")
    .trim();
}
