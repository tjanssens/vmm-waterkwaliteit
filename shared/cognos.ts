/**
 * Opbouw van de aanroep naar de VMM-databank.
 *
 * Gedeeld door de Cloudflare Worker (productie) en de dev-server, zodat wat je
 * lokaal test exact dezelfde validatie doorloopt als wat live draait.
 */

export const RAPPORT_ID = "i1B4F72B440A747A3B2F9D6057DC16031";

const COGNOS = `https://int-web.vmm.be/ibmcognos/bi/v1/disp/rds/reportData/report/${RAPPORT_ID}`;

/** Meetplaatscode: matrixprefix plus nummer, bv. OW65000, WB124, OWBR12. */
const MEETPLAATS = /^(OWBR|OWTR|OW|WB|BI|B)\d+$/;

const MATRIX = new Set(["OW", "WB", "BI"]);
const VROEGSTE_JAAR = 1980;
export const MAX_JAREN = 20;

export class ValidatieFout extends Error {
  constructor(boodschap: string) {
    super(boodschap);
    this.name = "ValidatieFout";
  }
}

export interface Aanvraag {
  meetplaats: string;
  matrix: string;
  jaren: string[];
}

/**
 * Leest en controleert de vraagparameters. Bewust streng: deze functie is de
 * enige plek waar gebruikersinvoer een externe aanroep kan sturen.
 */
export function leesAanvraag(vraag: URLSearchParams, nu = new Date().getFullYear()): Aanvraag {
  const meetplaats = (vraag.get("meetplaats") ?? "").trim().toUpperCase();
  if (!MEETPLAATS.test(meetplaats)) {
    throw new ValidatieFout("Parameter 'meetplaats' verwacht een code zoals OW65000.");
  }

  const matrix = (vraag.get("matrix") ?? "OW").trim().toUpperCase();
  if (!MATRIX.has(matrix)) {
    throw new ValidatieFout("Parameter 'matrix' verwacht OW, WB of BI.");
  }

  const jaren = [...new Set((vraag.get("jaren") ?? "").split(",").map((j) => j.trim()))].filter(
    (j) => j !== "",
  );
  if (jaren.length === 0 || jaren.length > MAX_JAREN) {
    throw new ValidatieFout(`Parameter 'jaren' verwacht 1 tot ${MAX_JAREN} jaartallen.`);
  }
  for (const jaar of jaren) {
    const getal = Number(jaar);
    if (!/^\d{4}$/.test(jaar) || getal < VROEGSTE_JAAR || getal > nu) {
      throw new ValidatieFout(`'${jaar}' is geen geldig meetjaar.`);
    }
  }

  return { meetplaats, matrix, jaren };
}

/**
 * Het VMM-rapport zelf, met de prompts al ingevuld. Dit is de pagina waarop de
 * VMM deze cijfers publiceert — de juiste bron om naar te verwijzen, beter dan
 * onze eigen tussenopslag.
 */
export function rapportUrl({ meetplaats, matrix, jaren }: Aanvraag): string {
  const url = new URL("https://int-web.vmm.be/ibmcognos/bi/");
  url.searchParams.set("perspective", "classicviewer");
  url.searchParams.set(
    "pathRef",
    ".public_folders/Water/Meetnetten/Analyseresultaten+per+meetplaats",
  );
  url.searchParams.set("id", RAPPORT_ID);
  url.searchParams.set("action", "run");
  url.searchParams.set("format", "HTML");
  // Zonder dit toont Cognos alsnog het keuzescherm.
  url.searchParams.set("prompt", "false");
  url.searchParams.set("p_pMatrix", matrix);
  url.searchParams.set("p_pSamplePoint", meetplaats);
  for (const jaar of jaren) url.searchParams.append("p_pJaar", jaar);
  return url.toString();
}

export function bouwCognosUrl({ meetplaats, matrix, jaren }: Aanvraag): string {
  const url = new URL(COGNOS);
  url.searchParams.set("fmt", "CSV");
  url.searchParams.set("p_pMatrix", matrix);
  url.searchParams.set("p_pSamplePoint", meetplaats);
  // Cognos verwacht de jaren als herhaalde parameter, niet als lijst.
  for (const jaar of jaren) url.searchParams.append("p_pJaar", jaar);
  return url.toString();
}
