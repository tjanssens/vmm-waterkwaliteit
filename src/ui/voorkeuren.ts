import type { Normenset } from "../data/normen.js";
import type { Periode } from "../lagen/types.js";

/**
 * Welke keuzes blijven staan als de bezoeker naar een ander meetpunt gaat.
 * Wie 1 jaar kiest en dan drie stations vergelijkt, wil niet elke keer opnieuw
 * op 1 jaar klikken.
 *
 * De regels staan hier apart van het paneel omdat ze uit te leggen en te
 * testen zijn; het paneel houdt alleen bij wát er onthouden is.
 */

/**
 * De periode waarop een meetpunt opent.
 *
 * Een expliciete keuze wint altijd. Anders de eerder gekozen periode, maar
 * alleen als dit punt hem heeft, het ene meetpunt is nu eenmaal niet in
 * dezelfde jaren bemonsterd als het andere. Blijft er niets over, dan de
 * laatste in de rij: die loopt oplopend, dus dat is de recentste.
 */
export function kiesPeriode(
  periodes: readonly Periode[],
  onthouden: string | undefined,
  expliciet?: Periode,
): Periode {
  if (expliciet) return expliciet;
  return (
    periodes.find((p) => p.id === onthouden) ??
    periodes[periodes.length - 1] ?? { id: "", label: "" }
  );
}

/**
 * De normenset waarop een meetpunt opent.
 *
 * Per laag onthouden, niet globaal: wie bij water op "drinkwater" staat en
 * even een luchtstation opent, hoort daarna niet terug te vallen op de
 * standaard omdat die keuze bij lucht niet bestaat.
 */
export function kiesNormenset(
  beschikbaar: readonly Normenset[],
  onthouden: Normenset | undefined,
  standaard: Normenset,
): Normenset {
  return onthouden && beschikbaar.includes(onthouden) ? onthouden : standaard;
}

/**
 * Of een categorie opengeklapt is.
 *
 * Heeft de bezoeker deze categorie zelf open- of dichtgeklapt, dan wint die
 * keuze. Categorieën waar hij nooit aan gezeten heeft volgen de slimme
 * standaard: open wanneer er iets buiten de norm valt. Het rapport staat
 * altijd volledig open, want dat moet je in één keer kunnen lezen en afdrukken.
 */
export function kiesCategorieOpen(
  standaardOpen: boolean,
  onthouden: boolean | undefined,
  isRapport: boolean,
): boolean {
  if (isRapport) return true;
  return onthouden ?? standaardOpen;
}
