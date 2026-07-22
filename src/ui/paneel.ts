import { vatSamen, meetjaren } from "../data/aggregate.js";
import {
  beoordeel,
  BRONNEN,
  bronnenVoor,
  NORMEN,
  NORMENSETTEN,
  type Normenset,
} from "../data/normen.js";
import { bronUrls } from "../data/client.js";
import { deelIn } from "../data/categorieen.js";
import { haalResultaten, DatabankFout } from "../data/client.js";
import { FormaatFout } from "../data/csv.js";
import type { Meting, Oordeel, OordeelKlasse, ParameterJaar } from "../data/types.js";
import type { Meetplaats } from "../geo/meetplaatsen.js";
import { MEETNET_NAMEN } from "../geo/meetplaatsen.js";
import {
  formatteerBereik,
  formatteerDatum,
  formatteerDatumKort,
  formatteerWaarde,
  sommMaakOp,
} from "./format.js";
import { samenvattingsZin } from "./samenvatting.js";
import { EvolutieVenster } from "./evolutie.js";

/** Hoeveel jaargangen we standaard ophalen; alles ophalen duurt ~12 s. */
const STANDAARD_JAREN = 5;

const KLASSE_LABELS: Record<OordeelKlasse, string> = {
  "buiten-norm": "buiten norm",
  "op-grens": "op de grens",
  conform: "conform",
  "geen-norm": "zonder toetsbare norm",
};

const KLASSE_VOLGORDE: OordeelKlasse[] = ["buiten-norm", "op-grens", "conform", "geen-norm"];

interface Toestand {
  meetplaats: Meetplaats;
  metingen: Meting[];
  jaren: number[];
  gekozenJaar: number;
  filters: Set<OordeelKlasse>;
  volledigeHistoriek: boolean;
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

  async toon(meetplaats: Meetplaats): Promise<void> {
    this.lopend?.abort();
    const beheerser = new AbortController();
    this.lopend = beheerser;

    this.houder.hidden = false;
    this.toonLaden(meetplaats, STANDAARD_JAREN);

    const nu = new Date().getFullYear();
    const jaren = Array.from({ length: STANDAARD_JAREN }, (_, i) => nu - i);

    try {
      const metingen = await haalResultaten(
        { meetplaats: meetplaats.code, matrix: meetplaats.matrix, jaren },
        beheerser.signal,
      );
      if (beheerser.signal.aborted) return;
      this.zetToestand(meetplaats, metingen, false);
    } catch (reden) {
      if (beheerser.signal.aborted) return;
      this.toonFout(meetplaats, reden);
    }
  }

  private async haalVolledigeHistoriek(): Promise<void> {
    const huidig = this.toestand;
    if (!huidig) return;

    this.lopend?.abort();
    const beheerser = new AbortController();
    this.lopend = beheerser;

    this.toonLaden(huidig.meetplaats, 20);

    const nu = new Date().getFullYear();
    const jaren = Array.from({ length: 20 }, (_, i) => nu - i);

    try {
      const metingen = await haalResultaten(
        { meetplaats: huidig.meetplaats.code, matrix: huidig.meetplaats.matrix, jaren },
        beheerser.signal,
      );
      if (beheerser.signal.aborted) return;
      this.zetToestand(huidig.meetplaats, metingen, true);
    } catch (reden) {
      if (beheerser.signal.aborted) return;
      this.toonFout(huidig.meetplaats, reden);
    }
  }

  private zetToestand(meetplaats: Meetplaats, metingen: Meting[], volledig: boolean): void {
    const jaren = meetjaren(metingen);
    this.toestand = {
      meetplaats,
      metingen,
      jaren,
      gekozenJaar: jaren[0] ?? 0,
      filters: new Set(KLASSE_VOLGORDE),
      volledigeHistoriek: volledig,
      normenset: this.toestand?.normenset ?? "oppervlaktewater",
      zoekterm: "",
    };
    this.teken();
  }

  // ---- weergave ----

  private toonLaden(meetplaats: Meetplaats, jaren: number): void {
    this.houder.innerHTML = `
      ${this.kopHtml(meetplaats)}
      <div class="paneel__laden" role="status">
        <span class="spinner" aria-hidden="true"></span>
        <p>Resultaten van de laatste ${jaren} jaar ophalen bij de VMM-databank…</p>
        <p class="paneel__hint">De eerste keer duurt dit ongeveer ${jaren > 10 ? "twaalf" : "acht"} seconden.</p>
      </div>`;
    this.koppelSluiten();
  }

  private toonFout(meetplaats: Meetplaats, reden: unknown): void {
    const uitleg =
      reden instanceof FormaatFout
        ? "De databank gaf een antwoord in een onbekend formaat. Waarschijnlijk is er iets veranderd aan de VMM-zijde."
        : reden instanceof DatabankFout
          ? reden.message
          : "Er ging iets mis bij het ophalen van de resultaten.";

    this.houder.innerHTML = `
      ${this.kopHtml(meetplaats)}
      <div class="paneel__fout" role="alert">
        <p>${escape(uitleg)}</p>
        <button type="button" class="knop" data-actie="opnieuw">Opnieuw proberen</button>
      </div>`;
    this.koppelSluiten();
    this.houder
      .querySelector('[data-actie="opnieuw"]')
      ?.addEventListener("click", () => void this.toon(meetplaats));
  }

  private teken(): void {
    const toestand = this.toestand;
    if (!toestand) return;

    if (toestand.metingen.length === 0) {
      this.houder.innerHTML = `
        ${this.kopHtml(toestand.meetplaats)}
        <div class="paneel__leeg">
          <p>Voor deze meetplaats zijn geen analyseresultaten beschikbaar
          ${toestand.volledigeHistoriek ? "over de laatste twintig jaar" : `over de laatste ${STANDAARD_JAREN} jaar`}.</p>
          <p class="paneel__hint">Meetplaatsen blijven op de kaart staan nadat ze uit een meetnet zijn gehaald.</p>
          ${toestand.volledigeHistoriek ? "" : '<button type="button" class="knop" data-actie="historiek">Volledige historiek zoeken</button>'}
        </div>`;
      this.koppelSluiten();
      this.koppelHistoriek();
      return;
    }

    const vanJaar = vatSamen(toestand.metingen).filter((p) => p.jaar === toestand.gekozenJaar);
    const oordelen = new Map(
      vanJaar.map((p) => [p.symbool, beoordeel(p, toestand.normenset)] as const),
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
      ${this.kopHtml(toestand.meetplaats)}
      ${this.jarenHtml(toestand)}
      ${this.samenvattingHtml(toestand, vanJaar, oordelen, tellingen, aanwezig, allesAan)}
      ${this.gereedschapHtml(toestand, vanJaar)}
      ${this.categorieenHtml(toestand, vanJaar, oordelen)}
      ${this.voetHtml(toestand)}`;

    this.koppelSluiten();
    this.koppelHistoriek();

    this.houder.querySelectorAll<HTMLButtonElement>("[data-jaar]").forEach((knop) => {
      knop.addEventListener("click", () => {
        toestand.gekozenJaar = Number(knop.dataset.jaar);
        this.teken();
      });
    });

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

    this.houder.querySelectorAll<HTMLButtonElement>("[data-normenset]").forEach((knop) => {
      knop.addEventListener("click", () => {
        toestand.normenset = knop.dataset.normenset as Normenset;
        // De klassen verschillen per set; begin weer met alles zichtbaar.
        toestand.filters = new Set(KLASSE_VOLGORDE);
        this.teken();
      });
    });

    const zoekveld = this.houder.querySelector<HTMLInputElement>("[data-parameterzoek]");
    if (zoekveld) {
      zoekveld.addEventListener("input", () => {
        toestand.zoekterm = zoekveld.value;
        this.teken();
        // Na hertekenen is het veld vervangen; zet de cursor terug.
        const nieuw = this.houder.querySelector<HTMLInputElement>("[data-parameterzoek]");
        nieuw?.focus();
        nieuw?.setSelectionRange(nieuw.value.length, nieuw.value.length);
      });
    }

    this.houder.querySelectorAll<HTMLButtonElement>("[data-evolutie]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const symbool = knop.dataset.evolutie!;
        const parameter = vanJaar.find((p) => p.symbool === symbool);
        if (!parameter) return;
        // Bewust álle opgehaalde jaren, niet enkel het gekozen: het verloop
        // over de jaren is juist wat je hier wil zien.
        this.venster.toon({
          parameter,
          metingen: toestand.metingen.filter((m) => m.symbool === symbool),
          normenset: toestand.normenset,
        });
      });
    });

    this.houder.querySelectorAll<HTMLButtonElement>(".categorie__kop").forEach((knop) => {
      knop.addEventListener("click", () => {
        const sectie = knop.closest(".categorie");
        const open = sectie?.getAttribute("data-open") === "1";
        sectie?.setAttribute("data-open", open ? "0" : "1");
        knop.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  private kopHtml(meetplaats: Meetplaats): string {
    const netten = meetplaats.meetnetten.map((n) => MEETNET_NAMEN[n]);
    return `
      <header class="paneel__kop">
        <div class="paneel__acties">${this.actiesHtml(meetplaats)}</div>
        <p class="paneel__eyebrow">Meetplaats oppervlaktewater</p>
        <h2 class="paneel__code">${escape(meetplaats.code)}</h2>
        <p class="paneel__plaats">${escape(meetplaats.omschrijving)}</p>
        <dl class="paneel__feiten">
          ${meetplaats.gemeente ? `<div><dt>Gemeente</dt><dd>${escape(meetplaats.gemeente)}</dd></div>` : ""}
          <div><dt>Meetplaatsnummer</dt><dd>${escape(meetplaats.nummer)}</dd></div>
          ${netten.length ? `<div><dt>Meetnetten</dt><dd>${escape(sommMaakOp(netten))}</dd></div>` : ""}
        </dl>
      </header>`;
  }

  private actiesHtml(meetplaats: Meetplaats): string {
    if (this.modus === "rapport") {
      return `
        <a class="paneel__nieuwtab" href="./">Naar de kaart</a>
        <button type="button" class="knop" data-actie="afdrukken">Afdrukken</button>`;
    }
    return `
      <a class="paneel__nieuwtab"
         href="?meetplaats=${encodeURIComponent(meetplaats.nummer)}&weergave=rapport"
         target="_blank" rel="noopener"
         title="Open het rapport van ${escape(meetplaats.code)} in een nieuw tabblad">Rapport ↗</a>
      <button type="button" class="paneel__sluit" data-actie="sluiten" aria-label="Paneel sluiten">×</button>`;
  }

  private jarenHtml(toestand: Toestand): string {
    const knoppen = toestand.jaren
      .slice()
      .sort((a, b) => a - b)
      .map(
        (jaar) =>
          `<button type="button" class="jaar" data-jaar="${jaar}" aria-pressed="${jaar === toestand.gekozenJaar}">${jaar}</button>`,
      )
      .join("");

    return `
      <div class="paneel__jaren">
        <span class="paneel__label" id="jaarlabel">Meetjaar</span>
        <div class="jaren" role="group" aria-labelledby="jaarlabel">${knoppen}</div>
        ${
          toestand.volledigeHistoriek
            ? ""
            : '<button type="button" class="knop knop--stil" data-actie="historiek">Volledige historiek</button>'
        }
      </div>`;
  }

  private samenvattingHtml(
    toestand: Toestand,
    parameters: ParameterJaar[],
    oordelen: Map<string, Oordeel>,
    tellingen: Map<OordeelKlasse, number>,
    aanwezig: OordeelKlasse[],
    allesAan: boolean,
  ): string {
    const zin = samenvattingsZin(parameters, oordelen);
    const aantalMetingen = toestand.metingen.filter((m) => m.jaar === toestand.gekozenJaar).length;

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
        <p>In ${toestand.gekozenJaar} werd hier ${aantalMetingen} keer een waarde gemeten, verdeeld over ${parameters.length} parameters. ${escape(zin)}</p>
        <div class="chips">
          ${chips}
          ${allesAan ? "" : '<button type="button" class="stille-knop" data-actie="filters-wissen">Toon alles</button>'}
        </div>
        <p class="paneel__hint">${escape(gefilterd)}</p>
      </section>`;
  }

  /** Zoekveld op parameter plus de keuze van de normenset. */
  private gereedschapHtml(toestand: Toestand, parameters: ParameterJaar[]): string {
    const knoppen = (Object.keys(NORMENSETTEN) as Normenset[])
      .map((set) => {
        const getoetst = parameters.filter((p) => NORMEN[set][p.symbool]).length;
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
    parameters: ParameterJaar[],
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
        term ? `Geen parameter gevonden voor "${escape(toestand.zoekterm)}".` : "Geen parameters in deze selectie."
      }</p>`;
    }

    const vorigJaar = this.vorigMeetjaar(toestand);

    return deelIn(zichtbaar)
      .map((categorie) => {
        const gesorteerd = categorie.parameters.slice().sort((a, b) => {
          const rangA = KLASSE_VOLGORDE.indexOf(oordelen.get(a.symbool)!.klasse);
          const rangB = KLASSE_VOLGORDE.indexOf(oordelen.get(b.symbool)!.klasse);
          return rangA - rangB || a.omschrijving.localeCompare(b.omschrijving, "nl");
        });

        // In het rapport staat alles open: dat moet je in één keer kunnen
        // lezen en afdrukken, zonder eerst overal te klikken.
        const heeftAandacht =
          this.modus === "rapport" ||
          toestand.zoekterm.trim() !== "" ||
          gesorteerd.some((p) => {
            const klasse = oordelen.get(p.symbool)!.klasse;
            return klasse === "buiten-norm" || klasse === "op-grens";
          });

        const rijen = gesorteerd
          .map((p) => this.rijHtml(p, oordelen.get(p.symbool)!, vorigJaar, toestand.normenset))
          .join("");

        return `
          <section class="categorie" data-open="${heeftAandacht ? 1 : 0}">
            <button type="button" class="categorie__kop" aria-expanded="${heeftAandacht}">
              <span class="caret" aria-hidden="true"></span>
              <span class="categorie__naam">${escape(categorie.naam)}</span>
              <span class="categorie__aantal">${categorie.parameters.length} parameters</span>
            </button>
            <div class="categorie__body">
              ${categorie.waarschuwing ? `<p class="waarschuwing"><strong>Let op.</strong> ${escape(categorie.waarschuwing)}</p>` : ""}
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
    parameter: ParameterJaar,
    oordeel: Oordeel,
    vorigJaar: ParameterJaar[],
    set: Normenset,
  ): string {
    const vorig = vorigJaar.find((p) => p.symbool === parameter.symbool);
    const verloop = vorig ? this.verloopHtml(parameter, vorig, oordeel) : "";
    const norm = NORMEN[set][parameter.symbool];
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
            <span class="parameter__symbool">${escape(parameter.symbool)}</span>
          </button>
          ${normregel}
          ${verloop}
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

  private verloopHtml(nu: ParameterJaar, toen: ParameterJaar, oordeel: Oordeel): string {
    if (toen.gemiddelde === 0 || oordeel.klasse === "geen-norm") return "";
    const procent = ((nu.gemiddelde - toen.gemiddelde) / toen.gemiddelde) * 100;
    if (Math.abs(procent) < 8) return "";

    const omlaag = procent < 0;
    // Bij zuurstof is méér beter; bij al de rest minder.
    const beter = nu.symbool === "O2" || nu.symbool === "O2 verz" ? !omlaag : omlaag;

    return `<span class="verloop verloop--${beter ? "beter" : "slechter"}">
      ${omlaag ? "▼" : "▲"} ${Math.abs(Math.round(procent))}% t.o.v. ${toen.jaar}
    </span>`;
  }

  private vorigMeetjaar(toestand: Toestand): ParameterJaar[] {
    const eerder = toestand.jaren.filter((j) => j < toestand.gekozenJaar);
    const jaar = eerder[0];
    if (jaar === undefined) return [];
    return vatSamen(toestand.metingen).filter((p) => p.jaar === jaar);
  }

  private voetHtml(toestand: Toestand): string {
    const bronnen = bronnenVoor(toestand.normenset)
      .map(
        (b) =>
          `<li><a href="${b.url}" target="_blank" rel="noopener">${escape(b.naam)}</a></li>`,
      )
      .join("");

    // Het gekozen meetjaar, want dat is wat het paneel toont.
    const links = bronUrls(toestand.meetplaats.code, toestand.meetplaats.matrix, [
      toestand.gekozenJaar,
    ]);

    return `
      <footer class="paneel__voet">
        <h3>Over deze cijfers</h3>
        <p>Per parameter tonen we het gemiddelde over ${toestand.gekozenJaar} en de laagste en hoogste
        gemeten waarde — niet elke afzonderlijke staalname.</p>

        <h3>Bron van deze cijfers</h3>
        <p>
          <a href="${escape(links.rapport)}" target="_blank" rel="noopener">Analyseresultaten voor ${escape(toestand.meetplaats.code)} in ${toestand.gekozenJaar}</a>
          — het rapport van de VMM zelf, waarop deze cijfers gepubliceerd staan.
          Het opent rechtstreeks op dit meetpunt en meetjaar. Onderdeel van de
          <a href="${links.databank}" target="_blank" rel="noopener">databank waterkwaliteit</a>.
        </p>

        <h3>Normen</h3>
        <p>${escape(NORMENSETTEN[toestand.normenset].uitleg)}</p>
        <ul class="bronlijst">${bronnen}</ul>
        <p>De toetsing is <strong>indicatief</strong> en geen officiële beoordeling van de VMM.
        Een deel van de normen voor oppervlaktewater verschilt per waterlooptype; welk type deze
        waterloop heeft weten we niet, dus die parameters krijgen "hangt van type af" in plaats van
        een oordeel.</p>

        <p>Waarden met <code>&lt;</code> liggen onder de detectielimiet van het labo: de stof is niet
        aangetoond en de getoonde waarde is de limiet zelf.</p>
        <p>Meetgegevens: Vlaamse Milieumaatschappij, databank waterkwaliteit.
        Locaties: Digitaal Vlaanderen.</p>
      </footer>`;
  }

  private koppelSluiten(): void {
    this.houder
      .querySelector('[data-actie="sluiten"]')
      ?.addEventListener("click", () => this.sluit());
    this.houder
      .querySelector('[data-actie="afdrukken"]')
      ?.addEventListener("click", () => window.print());
  }

  private koppelHistoriek(): void {
    this.houder
      .querySelector('[data-actie="historiek"]')
      ?.addEventListener("click", () => void this.haalVolledigeHistoriek());
  }
}

function escape(tekst: string): string {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
