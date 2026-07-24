/**
 * Zet een getal in Belgische schrijfwijze om naar een vorm die `Number` en
 * `parseFloat` aankunnen.
 *
 * De komma is de decimaalscheider. Staat er een komma, dan zijn punten
 * duizendtallen, dus "1.234,5" wordt "1234.5". Zonder komma laten we een punt
 * staan, zodat een bron die "12.5" schrijft ongemoeid blijft.
 *
 * Dit stond woordelijk in zowel de Cognos-parser als de DOV-parser als
 * `.replace(",", ".")`, dat maar de eerste komma vervangt: een gegroepeerde
 * waarde werd dan onleesbaar (NaN) of, bij parseFloat, stil afgekapt tot een
 * fout getal.
 */
export function belgischeNotatie(tekst: string): string {
  return tekst.includes(",") ? tekst.replace(/\./g, "").replace(",", ".") : tekst;
}
