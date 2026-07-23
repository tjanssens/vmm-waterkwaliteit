/**
 * Wat er misgaat bij het bevragen van een databron, en hoe we dat aan de
 * bezoeker vertellen.
 *
 * Staat apart van de clients omdat alle drie de bronnen hetzelfde nodig
 * hebben. Toen dit drie kopieën waren, was de kans reëel dat een aanscherping
 * op één plek gebeurde: wordt de abortcontrole ergens strenger of soepeler,
 * dan toont een van de andere lagen "Geen verbinding" op een aanroep die de
 * gebruiker zelf afbrak door de kaart te verschuiven.
 */

export class DatabankFout extends Error {
  constructor(
    boodschap: string,
    /** Of opnieuw proberen zin heeft; bepaalt of het paneel dat aanbiedt. */
    readonly herstelbaar: boolean,
  ) {
    super(boodschap);
    this.name = "DatabankFout";
  }
}

/** Een afgebroken aanroep is geen fout: de gebruiker vroeg iets anders. */
export function isAfgebroken(reden: unknown): boolean {
  return reden instanceof DOMException && reden.name === "AbortError";
}

/**
 * Haalt een URL op en vertaalt de mislukkingen naar `DatabankFout`.
 *
 * Een afgebroken aanroep gaat ongewijzigd door, zodat de aanroeper hem kan
 * herkennen en stil kan negeren. Alles wat het antwoord zelf betreft (JSON,
 * XML, tekst) blijft aan de bron: die weet als enige wat haar antwoord betekent.
 */
export async function haalOp(
  url: URL | string,
  bron: string,
  opties: RequestInit = {},
): Promise<Response> {
  let antwoord: Response;
  try {
    antwoord = await fetch(url, opties);
  } catch (reden) {
    if (isAfgebroken(reden)) throw reden;
    throw new DatabankFout(`Geen verbinding met ${bron}. Controleer je internetverbinding.`, true);
  }

  // Vanaf 500 ligt het aan de server en heeft opnieuw proberen zin; bij 400
  // klopt onze vraag niet en verandert een tweede poging daar niets aan.
  if (!antwoord.ok) {
    throw new DatabankFout(
      `${bron} gaf een onverwachte status (${antwoord.status}).`,
      antwoord.status >= 500,
    );
  }

  return antwoord;
}
