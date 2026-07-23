/**
 * Nederlandse getalopmaak met een zinnig aantal decimalen: concentraties
 * lopen van 0,0214 mgP/L tot 6400 µg/L, dus een vast aantal werkt niet.
 */
export function formatteerGetal(waarde: number): string {
  const grootte = Math.abs(waarde);
  const decimalen = grootte >= 100 ? 0 : grootte >= 10 ? 1 : grootte >= 1 ? 2 : 4;
  // toFixed vult aan met nullen; "0,1500" suggereert een precisie die er niet is.
  const afgerond = waarde.toFixed(decimalen).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return afgerond.replace(".", ",");
}

/**
 * Toont het voorvoegsel "<" wanneer élke meting onder de detectielimiet lag:
 * het gemiddelde is dan een bovengrens, geen gemeten concentratie.
 */
export function formatteerWaarde(waarde: number, onderLimiet = false): string {
  return (onderLimiet ? "< " : "") + formatteerGetal(waarde);
}

export function formatteerBereik(minimum: number, maximum: number): string {
  if (minimum === maximum) return formatteerGetal(minimum);
  return `${formatteerGetal(minimum)} – ${formatteerGetal(maximum)}`;
}

const MAANDEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

/** "2024-11-07" wordt "7 november 2024". */
export function formatteerDatum(iso: string): string {
  const [jaar, maand, dag] = iso.split("-");
  const naam = MAANDEN[Number(maand) - 1];
  if (!jaar || !naam || !dag) return iso;
  return `${Number(dag)} ${naam} ${jaar}`;
}

/** "2024-11-07" wordt "07/11/2024", compact genoeg voor een tabelkolom. */
export function formatteerDatumKort(iso: string): string {
  const [jaar, maand, dag] = iso.split("-");
  if (!jaar || !maand || !dag) return iso;
  return `${dag}/${maand}/${jaar}`;
}

/**
 * Zet een parameternaam in lopende tekst. Alleen de eerste letter gaat omlaag:
 * blind lowercasen maakt van "pH" het onleesbare "ph", en van "CZV" "czv".
 */
export function kleinLetter(naam: string): string {
  if (!/^[A-Z][a-z]/.test(naam)) return naam;
  return naam[0]!.toLowerCase() + naam.slice(1);
}

/**
 * Telwoord plus zelfstandig naamwoord, met het enkelvoud bij één: "1 parameter"
 * en niet "1 parameters". Het meervoud is standaard het woord plus een s, want
 * dat klopt voor alles waar we tot nu toe op tellen.
 */
export function meervoud(aantal: number, enkelvoud: string, meervoudsvorm?: string): string {
  return `${aantal} ${aantal === 1 ? enkelvoud : (meervoudsvorm ?? `${enkelvoud}s`)}`;
}

/** Somt op zoals in lopende tekst: "a, b en c". */
export function sommMaakOp(delen: readonly string[]): string {
  if (delen.length === 0) return "";
  if (delen.length === 1) return delen[0]!;
  return `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]!}`;
}

/**
 * Ontsnapt tekst die in HTML terechtkomt. Stond eerder drie keer in de
 * codebase, in twee varianten waarvan er één `>` liet staan: vandaar één
 * versie op de plek waar de andere opmaakhulpjes ook wonen.
 */
export function escape(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Dag plus tijdstip, als dat bekend is. Bij lucht liggen 24 metingen op
 * dezelfde dag; zonder het uur zijn ze in de tooltip niet uit elkaar te houden.
 */
export function formatteerMoment(datum: string, tijdstip: string | null): string {
  const dag = formatteerDatum(datum);
  return tijdstip ? `${dag}, ${tijdstip.slice(0, 5)}` : dag;
}
