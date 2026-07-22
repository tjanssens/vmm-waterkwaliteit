import { vatSamen } from "../data/aggregate.js";
import {
  beoordeel,
  BRONNEN,
  bronnenVoor,
  NORMENSETTEN,
  normVoor,
  type Normenset,
} from "../data/normen.js";
import { deelIn } from "../data/categorieen.js";
import { stofprofiel } from "../data/stoffen.js";
import { DatabankFout } from "../data/client.js";
import { FormaatFout } from "../data/csv.js";
import type { Meting, Oordeel, OordeelKlasse, ParameterSamenvatting } from "../data/types.js";
import type { Laagprofiel, LaagId, Meetpunt, Periode } from "../lagen/types.js";
import { laagprofiel } from "../lagen/index.js";
import { vormSvg } from "../lagen/merk.js";
import {
  escape,
  formatteerBereik,
  formatteerDatum,
  formatteerDatumKort,
  formatteerWaarde,
  meervoud,
  sommMaakOp,
} from "./format.js";
import { samenvattingsZin } from "./samenvatting.js";
import { EvolutieVenster } from "./evolutie.js";
import { kiesCategorieOpen, kiesNormenset, kiesPeriode } from "./voorkeuren.js";

const KLASSE_LABELS: Record<OordeelKlasse, string> = {
  "buiten-norm": "buiten norm",
  "op-grens": "op de grens",
  conform: "conform",
  "geen-norm": "zonder toetsbare norm",
};

const KLASSE_VOLGORDE: OordeelKlasse[] = ["buiten-norm", "op-grens", "conform", "geen-norm"];

interface Toestand {
  punt: Meetpunt;
  profiel: Laagprofiel;
  metingen: Meting[];
  periodes: readonly Periode[];
  gekozen: Periode;
  filters: Set<OordeelKlasse>;
  /** Of de ruimere historiek al opgehaald is; alleen bij een tijdas uit data. */
  uitgebreid: boolean;
  normenset: Normenset;
  /** Vrije tekst waarop de parametertabel gefilterd wordt. */
  zoekterm: string;
}

/**
 * "paneel" schuift over de kaart en is sluitbaar; "rapport" vult een eigen
 * tabblad en is bedoeld om te lezen en af te drukken.
 */
export type Modus = "paneel" | "rapport";

export class Paneel {
  private toestand: Toestand | null = null;
  private lopend: AbortController | null = null;
  private readonly venster = new EvolutieVenster();

  /**
   * Keuzes die de bezoeker maakt, blijven staan als hij naar een ander punt
   * gaat. Wie 1 jaar kiest en dan drie stations vergelijkt, wil niet elke keer
   * opnieuw op 1 jaar klikken.
   *
   * Periode en normenset worden per laag onthouden: een meetjaar zegt niets
   * bij lucht, en de normensetten verschillen sowieso per bron.
   */
  private readonly voorkeurPeriode = new Map<LaagId, string>();
  private readonly voorkeurNormenset = new Map<LaagId, Normenset>();
  /** Per categorie of hij open staat; die zijn wél gedeeld over de lagen. */
  private readonly voorkeurCategorie = new Map<string, boolean>();

  constructor(
    private readonly houder: HTMLElement,
    private readonly modus: Modus = "paneel",
  ) {}

  sluit(): void {
    this.lopend?.abort();
    this.lopend = null;
    this.toestand = null;
    this.houder.hidden = true;
    this.houder.innerHTML = "";
  }

  /**
   * Het profiel hoeft er niet bij: elk punt draagt zijn laag, en die bepaalt
   * de bron. Zo hoeft de aanroeper niet twee dingen bij elkaar te houden.
   */
  async toon(punt: Meetpunt): Promise<void> {
    const profiel = laagprofiel(punt.laag);
    if (!profiel) throw new Error(`Onbekende databron "${punt.laag}".`);

    const beheerser = this.begin();
    this.houder.hidden = false;

    const tijdas = profiel.tijdas;
    if (tijdas.soort === "per-periode") {
      const onthouden = this.voorkeurPeriode.get(profiel.id);
      const periode = tijdas.periodes().find((p) => p.id === onthouden) ?? tijdas.standaard();
      await this.haalPeriode(punt, profiel, periode, beheerser);
      return;
    }

    this.toonLaden(punt, profiel, tijdas.ladenTekst());
    try {
      const metingen = await tijdas.haal(punt, beheerser.signal);
      if (beheerser.signal.aborted) return;
      this.zetToestand(punt, profiel, metingen, false);
    } catch (reden) {
      if (beheerser.signal.aborted) return;
      this.toonFout(punt, profiel, reden);
    }
  }

  private begin(): AbortController {
    this.lopend?.abort();
    const beheerser = new AbortController();
    this.lopend = beheerser;
    return beheerser;
  }

  /** Voor lagen waar de periodekeuze bepaalt wát er opgehaald wordt. */
  private async haalPeriode(
    punt: Meetpunt,
    profiel: Laagprofiel,
    periode: Periode,
    beheerser: AbortController,
  ): Promise<void> {
    const tijdas = profiel.tijdas;
    if (tijdas.soort !== "per-periode") return;

    this.toonLaden(punt, profiel, tijdas.ladenTekst(periode));
    try {
      const metingen = await tijdas.haal(punt, periode, beheerser.signal);
      if (beheerser.signal.aborted) return;
      this.zetToestand(punt, profiel, metingen, false, periode);
    } catch (reden) {
      if (beheerser.signal.aborted) return;
      this.toonFout(punt, profiel, reden);
    }
  }

  private async breidUit(): Promise<void> {
    const huidig = this.toestand;
    const tijdas = huidig?.profiel.tijdas;
    if (!huidig || tijdas?.soort !== "uit-data" || !tijdas.uitbreiden) return;

    const beheerser = this.begin();
    this.toonLaden(huidig.punt, huidig.profiel, tijdas.uitbreiden.ladenTekst());

    try {
      const metingen = await tijdas.uitbreiden.haal(huidig.punt, beheerser.signal);
      if (beheerser.signal.aborted) return;
      this.zetToestand(huidig.punt, huidig.profiel, metingen, true);
    } catch (reden) {
      if (beheerser.signal.aborted) return;
      this.toonFout(huidig.punt, huidig.profiel, reden);
    }
  }

  private zetToestand(
    punt: Meetpunt,
    profiel: Laagprofiel,
    metingen: Meting[],
    uitgebreid: boolean,
    gekozen?: Periode,
  ): void {
    const tijdas = profiel.tijdas;
    const periodes = tijdas.soort === "uit-data" ? tijdas.periodes(metingen) : tijdas.periodes();

    const standaard = kiesPeriode(periodes, this.voorkeurPeriode.get(profiel.id), gekozen);

    this.toestand = {
      punt,
      profiel,
      metingen,
      periodes,
      gekozen: standaard,
      filters: new Set(KLASSE_VOLGORDE),
      uitgebreid,
      normenset: this.behoudNormenset(profiel),
      zoekterm: "",
    };
    this.teken();
  }

  /**
   * De normenkeuze wordt per laag onthouden. Globaal onthouden zou betekenen
   * dat wie bij water op "drinkwater" staat en even een luchtstation opent,
   * daarna terugvalt op de standaard — de keuze bestaat immers niet bij lucht.
   */
  private behoudNormenset(profiel: Laagprofiel): Normenset {
    return kiesNormenset(
      profiel.normensetten,
      this.voorkeurNormenset.get(profiel.id),
      profiel.standaardNormenset,
    );
  }

  // ---- weergave ----

  private toonLaden(punt: Meetpunt, profiel: Laagprofiel, tekst: string): void {
    this.houder.innerHTML = `
      ${this.kopHtml(punt, profiel)}
      <div class="paneel__laden" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <p>${escape(tekst)}</p>
      </div>`;
    this.koppelSluiten();
  }

  private toonFout(punt: Meetpunt, profiel: Laagprofiel, reden: unknown): void {
    const uitleg =
      reden instanceof FormaatFout
        ? "De bron gaf een antwoord in een onbekend formaat. Waarschijnlijk is er iets veranderd aan de kant van de leverancier."
        : reden instanceof DatabankFout
          ? reden.message
          : "Er ging iets mis bij het ophalen van de resultaten.";

    this.houder.innerHTML = `
      ${this.kopHtml(punt, profiel)}
      <div class="paneel__fout" role="alert">
        <p>${escape(uitleg)}</p>
        <button type="button" class="knop" data-actie="opnieuw">Opnieuw proberen</button>
      </div>`;
    this.koppelSluiten();
    this.houder
      .querySelector('[data-actie="opnieuw"]')
      ?.addEventListener("click", () => void this.toon(punt));
  }

  private teken(): void {
    const toestand = this.toestand;
    if (!toestand) return;

    if (toestand.metingen.length === 0) {
      this.toonLeeg(toestand);
      return;
    }

    const alles = vatSamen(toestand.metingen, this.bucket(toestand));
    const vanPeriode = alles.filter((p) => p.bucket === toestand.gekozen.id);
    // Het venster gaat mee: een jaargrenswaarde mag niet op een week
    // metingen losgelaten worden.
    const venster =
      toestand.gekozen.dagen === undefined ? undefined : { dagen: toestand.gekozen.dagen };
    const oordelen = new Map(
      vanPeriode.map((p) => [p.symbool, beoordeel(p, toestand.normenset, venster)] as const),
    );

    const tellingen = new Map<OordeelKlasse, number>();
    for (const oordeel of oordelen.values()) {
      tellingen.set(oordeel.klasse, (tellingen.get(oordeel.klasse) ?? 0) + 1);
    }
    const aanwezig = KLASSE_VOLGORDE.filter((k) => (tellingen.get(k) ?? 0) > 0);

    toestand.filters = new Set([...toestand.filters].filter((k) => aanwezig.includes(k)));
    if (toestand.filters.size === 0) toestand.filters = new Set(aanwezig);
    const allesAan = toestand.filters.size === aanwezig.length;

    this.houder.innerHTML = `
      ${this.kopHtml(toestand.punt, toestand.profiel)}
      ${this.periodesHtml(toestand)}
      ${this.samenvattingHtml(toestand, vanPeriode, oordelen, tellingen, aanwezig, allesAan)}
      ${this.gereedschapHtml(toestand, vanPeriode)}
      ${this.categorieenHtml(toestand, alles, vanPeriode, oordelen)}
      ${this.voetHtml(toestand)}`;

    this.koppelSluiten();
    this.koppelUitbreiden();
    this.koppelPeriodes(toestand);
    this.koppelFilters(toestand, aanwezig, allesAan);
    this.koppelNormenset(toestand);
    this.koppelZoek(toestand);
    this.koppelEvolutie(toestand, vanPeriode);
    this.koppelCategorieen();
  }

  private toonLeeg(toestand: Toestand): void {
    const tijdas = toestand.profiel.tijdas;
    const kanUitbreiden = tijdas.soort === "uit-data" && tijdas.uitbreiden && !toestand.uitgebreid;

    this.houder.innerHTML = `
      ${this.kopHtml(toestand.punt, toestand.profiel)}
      <div class="paneel__leeg">
        <p>${escape(toestand.profiel.leegTekst(toestand.uitgebreid))}</p>
        ${toestand.profiel.leegHint ? `<p class="paneel__hint">${escape(toestand.profiel.leegHint)}</p>` : ""}
        ${kanUitbreiden ? `<button type="button" class="knop" data-actie="uitbreiden">${escape(tijdas.uitbreiden!.label)}</button>` : ""}
      </div>`;
    this.koppelSluiten();
    this.koppelUitbreiden();
  }

  /**
   * Bij een tijdas per periode valt alles in één emmer, want de keuze bepaalt
   * al wat er opgehaald is; die emmer heet dan naar de periode zelf.
   */
  private bucket(toestand: Toestand) {
    const tijdas = toestand.profiel.tijdas;
    if (tijdas.soort === "uit-data") return tijdas.bucketVan;
    const id = toestand.gekozen.id;
    return () => id;
  }

  private kopHtml(punt: Meetpunt, profiel: Laagprofiel): string {
    const feiten = profiel
      .feiten(punt)
      .map(([label, waarde]) => `<div><dt>${escape(label)}</dt><dd>${escape(waarde)}</dd></div>`)
      .join("");

    return `
      <header class="paneel__kop">
        <div class="paneel__acties">${this.actiesHtml(punt)}</div>
        <p class="paneel__eyebrow">
          <span class="laagmerk">${vormSvg(profiel.merk, 11)}</span>${escape(profiel.eyebrow)}
        </p>
        <h2 class="paneel__code">${escape(punt.code)}</h2>
        <p class="paneel__plaats">${escape(punt.omschrijving)}</p>
        <dl class="paneel__feiten">${feiten}</dl>
      </header>`;
  }

  private actiesHtml(punt: Meetpunt): string {
    if (this.modus === "rapport") {
      return `
        <a class="paneel__nieuwtab" href="./">Naar de kaart</a>
        <button type="button" class="knop" data-actie="afdrukken">Afdrukken</button>`;
    }
    return `
      <a class="paneel__nieuwtab"
         href="?laag=${encodeURIComponent(punt.laag)}&punt=${encodeURIComponent(punt.id)}&weergave=rapport"
         target="_blank" rel="noopener"
         title="Open het rapport van ${escape(punt.code)} in een nieuw tabblad">Rapport ↗</a>
      <button type="button" class="paneel__sluit" data-actie="sluiten" aria-label="Paneel sluiten">×</button>`;
  }

  private periodesHtml(toestand: Toestand): string {
    const tijdas = toestand.profiel.tijdas;
    const label = tijdas.soort === "uit-data" ? "Meetjaar" : "Periode";

    const knoppen = toestand.periodes
      .map(
        (periode) =>
          `<button type="button" class="jaar" data-periode="${escape(periode.id)}"
             aria-pressed="${periode.id === toestand.gekozen.id}">${escape(periode.label)}</button>`,
      )
      .join("");

    const uitbreidKnop =
      tijdas.soort === "uit-data" && tijdas.uitbreiden && !toestand.uitgebreid
        ? `<button type="button" class="knop knop--stil" data-actie="uitbreiden">${escape(tijdas.uitbreiden.label)}</button>`
        : "";

    return `
      <div class="paneel__jaren">
        <span class="paneel__label" id="periodelabel">${label}</span>
        <div class="jaren" role="group" aria-labelledby="periodelabel">${knoppen}</div>
        ${uitbreidKnop}
      </div>`;
  }

  private samenvattingHtml(
    toestand: Toestand,
    parameters: ParameterSamenvatting[],
    oordelen: Map<string, Oordeel>,
    tellingen: Map<OordeelKlasse, number>,
    aanwezig: OordeelKlasse[],
    allesAan: boolean,
  ): string {
    const zin = samenvattingsZin(parameters, oordelen);
    const aantalMetingen = parameters.reduce((som, p) => som + p.aantal, 0);

    const chips = aanwezig
      .map(
        (klasse) =>
          `<button type="button" class="chip chip--${klasse}" data-filter="${klasse}" aria-pressed="${allesAan || toestand.filters.has(klasse)}">
             <b>${tellingen.get(klasse)}</b> ${KLASSE_LABELS[klasse]}
           </button>`,
      )
      .join("");

    const gefilterd = allesAan
      ? "Klik een label om enkel die parameters te tonen."
      : `Gefilterd op: ${sommMaakOp([...toestand.filters].map((k) => KLASSE_LABELS[k]))}.`;

    return `
      <section class="paneel__oordeel">
        <p>In ${escape(toestand.gekozen.label)} werd hier ${aantalMetingen} keer een waarde gemeten,
        verdeeld over ${meervoud(parameters.length, "parameter")}. ${escape(zin)}</p>
        <div class="chips">
          ${chips}
          ${allesAan ? "" : '<button type="button" class="stille-knop" data-actie="filters-wissen">Toon alles</button>'}
        </div>
        <p class="paneel__hint">${escape(gefilterd)}</p>
      </section>`;
  }

  /** Zoekveld op parameter plus de keuze van de normenset. */
  private gereedschapHtml(toestand: Toestand, parameters: ParameterSamenvatting[]): string {
    const knoppen = toestand.profiel.normensetten
      .map((set) => {
        const getoetst = parameters.filter((p) => normVoor(p, set)).length;
        return `<button type="button" class="normknop" data-normenset="${set}"
                  aria-pressed="${toestand.normenset === set}"
                  title="${escape(NORMENSETTEN[set].uitleg)}">
                  ${escape(NORMENSETTEN[set].naam)}
                  <span class="normknop__telling">${getoetst}</span>
                </button>`;
      })
      .join("");

    return `
      <div class="gereedschap">
        <div class="gereedschap__zoek">
          <label class="paneel__label" for="parameterzoek">Zoek een parameter</label>
          <input id="parameterzoek" type="search" data-parameterzoek
                 value="${escape(toestand.zoekterm)}" autocomplete="off"
                 placeholder="nitraat, PFOS, zuurstof…" />
        </div>
        <div class="gereedschap__normen">
          <span class="paneel__label" id="normlabel">Toetsen aan</span>
          <div class="normkeuze" role="group" aria-labelledby="normlabel">${knoppen}</div>
        </div>
      </div>
      <p class="paneel__hint gereedschap__uitleg">${escape(NORMENSETTEN[toestand.normenset].uitleg)}</p>`;
  }

  private categorieenHtml(
    toestand: Toestand,
    alles: ParameterSamenvatting[],
    parameters: ParameterSamenvatting[],
    oordelen: Map<string, Oordeel>,
  ): string {
    const term = toestand.zoekterm.trim().toLowerCase();
    const zichtbaar = parameters
      .filter((p) => toestand.filters.has(oordelen.get(p.symbool)!.klasse))
      .filter(
        (p) =>
          term === "" ||
          p.omschrijving.toLowerCase().includes(term) ||
          p.symbool.toLowerCase().includes(term),
      );

    if (zichtbaar.length === 0) {
      return `<p class="paneel__leeg">${
        term
          ? `Geen parameter gevonden voor "${escape(toestand.zoekterm)}".`
          : "Geen parameters in deze selectie."
      }</p>`;
    }

    const vorige = this.vorigePeriode(toestand, alles);

    return deelIn(zichtbaar)
      .map((categorie) => {
        const gesorteerd = categorie.parameters.slice().sort((a, b) => {
          const rangA = KLASSE_VOLGORDE.indexOf(oordelen.get(a.symbool)!.klasse);
          const rangB = KLASSE_VOLGORDE.indexOf(oordelen.get(b.symbool)!.klasse);
          return rangA - rangB || a.omschrijving.localeCompare(b.omschrijving, "nl");
        });

        // In het rapport staat alles open: dat moet je in één keer kunnen
        // lezen en afdrukken, zonder eerst overal te klikken.
        const standaardOpen =
          this.modus === "rapport" ||
          toestand.zoekterm.trim() !== "" ||
          gesorteerd.some((p) => {
            const klasse = oordelen.get(p.symbool)!.klasse;
            return klasse === "buiten-norm" || klasse === "op-grens";
          });
        const heeftAandacht = kiesCategorieOpen(
          standaardOpen,
          this.voorkeurCategorie.get(categorie.id),
          this.modus === "rapport",
        );

        const rijen = gesorteerd
          .map((p) =>
            this.rijHtml(p, oordelen.get(p.symbool)!, vorige, toestand.normenset, toestand.punt.laag),
          )
          .join("");

        return `
          <section class="categorie" data-categorie="${escape(categorie.id)}" data-open="${heeftAandacht ? 1 : 0}">
            <button type="button" class="categorie__kop" aria-expanded="${heeftAandacht}">
              <span class="caret" aria-hidden="true"></span>
              <span class="categorie__naam">${escape(categorie.naam)}</span>
              <span class="categorie__aantal">${meervoud(categorie.parameters.length, "parameter")}</span>
            </button>
            <div class="categorie__body">
              ${(categorie.waarschuwingen ?? [])
                .filter((w) => !w.voor || w.voor === toestand.normenset)
                .map((w) => `<p class="waarschuwing"><strong>Let op.</strong> ${escape(w.tekst)}</p>`)
                .join("")}
              <div class="tabel-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th><th>Parameter</th>
                      <th class="num">Metingen</th><th class="num">Gemiddelde</th>
                      <th class="num">Laagste – hoogste</th><th>Laatste</th>
                    </tr>
                  </thead>
                  <tbody>${rijen}</tbody>
                </table>
              </div>
            </div>
          </section>`;
      })
      .join("");
  }

  private rijHtml(
    parameter: ParameterSamenvatting,
    oordeel: Oordeel,
    vorige: ParameterSamenvatting[],
    set: Normenset,
    laag: LaagId,
  ): string {
    const toen = vorige.find((p) => p.symbool === parameter.symbool);
    const verloop = toen ? this.verloopHtml(parameter, toen, oordeel) : "";
    const norm = normVoor(parameter, set);
    const normregel = norm
      ? `<span class="parameter__norm" title="${escape(norm.toets)} — ${escape(BRONNEN[norm.bron].naam)}">norm ${escape(norm.label)}</span>`
      : "";

    return `
      <tr>
        <td class="status">
          <span class="badge badge--${oordeel.klasse}"${oordeel.toelichting ? ` title="${escape(oordeel.toelichting)}"` : ""}>${escape(oordeel.label)}</span>
        </td>
        <td class="parameter">
          <button type="button" class="parameter__knop" data-evolutie="${escape(parameter.symbool)}"
                  title="Toon het verloop van ${escape(parameter.omschrijving)} over de tijd">
            ${escape(parameter.omschrijving)}
            ${
              // Bij DOV is het symbool de volledige naam; die twee keer tonen
              // levert "Mangaan (Mn) Mangaan (Mn)" op.
              parameter.symbool === parameter.omschrijving
                ? ""
                : `<span class="parameter__symbool">${escape(parameter.symbool)}</span>`
            }
          </button>
          ${normregel}
          ${verloop}
          ${wattekstHtml(parameter, oordeel, laag)}
        </td>
        <td class="num waarde">
          ${parameter.aantal}
          ${parameter.aantalOnderLimiet ? `<span class="onderlimiet">${parameter.aantalOnderLimiet}× &lt; limiet</span>` : ""}
        </td>
        <td class="num waarde">
          ${escape(formatteerWaarde(parameter.gemiddelde, parameter.volledigOnderLimiet))}
          <span class="eenheid">${escape(parameter.eenheid)}</span>
        </td>
        <td class="num waarde bereik">${escape(formatteerBereik(parameter.minimum, parameter.maximum))}</td>
        <td class="datum" title="${escape(formatteerDatum(parameter.laatsteDatum))}">${escape(formatteerDatumKort(parameter.laatsteDatum))}</td>
      </tr>`;
  }

  private verloopHtml(
    nu: ParameterSamenvatting,
    toen: ParameterSamenvatting,
    oordeel: Oordeel,
  ): string {
    if (toen.gemiddelde === 0 || oordeel.klasse === "geen-norm") return "";
    const procent = ((nu.gemiddelde - toen.gemiddelde) / toen.gemiddelde) * 100;
    if (Math.abs(procent) < 8) return "";

    const omlaag = procent < 0;
    // Bij zuurstof is méér beter; bij al de rest minder.
    const beter = nu.symbool === "O2" || nu.symbool === "O2 verz" ? !omlaag : omlaag;

    return `<span class="verloop verloop--${beter ? "beter" : "slechter"}">
      ${omlaag ? "▼" : "▲"} ${Math.abs(Math.round(procent))}% t.o.v. ${escape(toen.bucket)}
    </span>`;
  }

  /**
   * De periode vlak vóór de gekozen, voor de trendpijl. Bij een laag met één
   * emmer bestaat die niet en verdwijnt de pijl vanzelf.
   */
  private vorigePeriode(
    toestand: Toestand,
    alles: ParameterSamenvatting[],
  ): ParameterSamenvatting[] {
    const index = toestand.periodes.findIndex((p) => p.id === toestand.gekozen.id);
    const vorige = index > 0 ? toestand.periodes[index - 1] : undefined;
    if (!vorige) return [];
    return alles.filter((p) => p.bucket === vorige.id);
  }

  private voetHtml(toestand: Toestand): string {
    const bronnen = bronnenVoor(toestand.normenset)
      .map((b) => `<li><a href="${b.url}" target="_blank" rel="noopener">${escape(b.naam)}</a></li>`)
      .join("");

    const bron = toestand.profiel.bron(toestand.punt, toestand.gekozen);
    const context = bron.context
      ? ` Onderdeel van de <a href="${escape(bron.context.url)}" target="_blank" rel="noopener">${escape(bron.context.tekst)}</a>.`
      : "";

    return `
      <footer class="paneel__voet">
        <h3>Over deze cijfers</h3>
        <p>${escape(toestand.profiel.toelichting(toestand.gekozen))}</p>
        ${meetwijzeHtml(toestand.profiel)}

        <h3>Bron van deze cijfers</h3>
        <p>
          <a href="${escape(bron.url)}" target="_blank" rel="noopener">${escape(bron.tekst)}</a>
          — ${escape(bron.uitleg)}${context}
        </p>

        <h3>Normen</h3>
        <p>${escape(NORMENSETTEN[toestand.normenset].uitleg)}</p>
        <ul class="bronlijst">${bronnen}</ul>
        <p>De toetsing is <strong>indicatief</strong> en geen officiële beoordeling.</p>

        <p>Waarden met <code>&lt;</code> liggen onder de detectielimiet van het labo: de stof is niet
        aangetoond en de getoonde waarde is de limiet zelf.</p>
      </footer>`;
  }

  // ---- gebeurtenissen ----

  private koppelSluiten(): void {
    this.houder
      .querySelector('[data-actie="sluiten"]')
      ?.addEventListener("click", () => this.sluit());
    this.houder
      .querySelector('[data-actie="afdrukken"]')
      ?.addEventListener("click", () => window.print());
  }

  private koppelUitbreiden(): void {
    this.houder
      .querySelector('[data-actie="uitbreiden"]')
      ?.addEventListener("click", () => void this.breidUit());
  }

  private koppelPeriodes(toestand: Toestand): void {
    this.houder.querySelectorAll<HTMLButtonElement>("[data-periode]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const periode = toestand.periodes.find((p) => p.id === knop.dataset.periode);
        if (!periode) return;
        this.voorkeurPeriode.set(toestand.profiel.id, periode.id);

        if (toestand.profiel.tijdas.soort === "per-periode") {
          // Hier bepaalt de keuze wát er opgehaald wordt, niet wat er getoond wordt.
          void this.haalPeriode(toestand.punt, toestand.profiel, periode, this.begin());
          return;
        }
        toestand.gekozen = periode;
        this.teken();
      });
    });
  }

  private koppelFilters(toestand: Toestand, aanwezig: OordeelKlasse[], allesAan: boolean): void {
    this.houder.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const klasse = knop.dataset.filter as OordeelKlasse;
        if (allesAan) toestand.filters = new Set([klasse]);
        else if (toestand.filters.has(klasse)) {
          if (toestand.filters.size === 1) toestand.filters = new Set(aanwezig);
          else toestand.filters.delete(klasse);
        } else toestand.filters.add(klasse);
        this.teken();
      });
    });

    this.houder.querySelector('[data-actie="filters-wissen"]')?.addEventListener("click", () => {
      toestand.filters = new Set(aanwezig);
      this.teken();
    });
  }

  private koppelNormenset(toestand: Toestand): void {
    this.houder.querySelectorAll<HTMLButtonElement>("[data-normenset]").forEach((knop) => {
      knop.addEventListener("click", () => {
        toestand.normenset = knop.dataset.normenset as Normenset;
        this.voorkeurNormenset.set(toestand.profiel.id, toestand.normenset);
        // De klassen verschillen per set; begin weer met alles zichtbaar.
        toestand.filters = new Set(KLASSE_VOLGORDE);
        this.teken();
      });
    });
  }

  private koppelZoek(toestand: Toestand): void {
    const zoekveld = this.houder.querySelector<HTMLInputElement>("[data-parameterzoek]");
    if (!zoekveld) return;

    zoekveld.addEventListener("input", () => {
      toestand.zoekterm = zoekveld.value;
      this.teken();
      // Na hertekenen is het veld vervangen; zet de cursor terug.
      const nieuw = this.houder.querySelector<HTMLInputElement>("[data-parameterzoek]");
      nieuw?.focus();
      nieuw?.setSelectionRange(nieuw.value.length, nieuw.value.length);
    });
  }

  private koppelEvolutie(toestand: Toestand, parameters: ParameterSamenvatting[]): void {
    this.houder.querySelectorAll<HTMLButtonElement>("[data-evolutie]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const symbool = knop.dataset.evolutie!;
        const parameter = parameters.find((p) => p.symbool === symbool);
        if (!parameter) return;
        // Bewust álle opgehaalde metingen, niet enkel de gekozen periode: het
        // verloop over de tijd is juist wat je hier wil zien.
        this.venster.toon({
          parameter,
          metingen: toestand.metingen.filter((m) => m.symbool === symbool),
          normenset: toestand.normenset,
          laag: toestand.punt.laag,
        });
      });
    });
  }

  private koppelCategorieen(): void {
    this.houder.querySelectorAll<HTMLButtonElement>(".categorie__kop").forEach((knop) => {
      knop.addEventListener("click", () => {
        const sectie = knop.closest<HTMLElement>(".categorie");
        const open = sectie?.getAttribute("data-open") === "1";
        sectie?.setAttribute("data-open", open ? "0" : "1");
        const id = sectie?.dataset.categorie;
        if (id) this.voorkeurCategorie.set(id, !open);
        knop.setAttribute("aria-expanded", String(!open));
      });
    });
  }
}


/**
 * Eén zin over wat de stof is, alleen bij een overschrijding.
 *
 * Wie hier komt en "atrazine" ziet staan, weet nog niets. De volle duiding
 * hangt achter de grafiek, maar de lezer die nooit doorklikt is juist degene
 * die deze regel nodig heeft. Enkel bij "buiten norm": zou de zin overal staan,
 * dan wordt het behang en valt de overschrijding niet meer op.
 */
function wattekstHtml(
  parameter: ParameterSamenvatting,
  oordeel: Oordeel,
  laag: LaagId,
): string {
  if (oordeel.klasse !== "buiten-norm") return "";
  const profiel = stofprofiel(parameter, laag);
  if (!profiel) return "";
  return `<span class="parameter__duiding">${escape(profiel.wat)}</span>`;
}

/**
 * Hoe er gemeten is, met de bron erbij. Bij grondwater bepaalt dat wat een
 * oordeel waard is: de metalen zijn de opgeloste fractie, niet het geheel.
 */
function meetwijzeHtml(profiel: Laagprofiel): string {
  const meetwijze = profiel.meetwijze;
  if (!meetwijze) return "";
  return `<p>${escape(meetwijze.tekst)}
    <a href="${escape(meetwijze.bron.url)}" target="_blank" rel="noopener">${escape(
      meetwijze.bron.naam,
    )}</a>.</p>`;
}
