import type { Meting, ParameterSamenvatting } from "../data/types.js";
import { NORMEN, type Normenset } from "../data/normen.js";
import {
  bouwPad,
  kiesTicks,
  maakSchaal,
  opDatum,
  splitsInReeksen,
  type Punt,
} from "./grafiek.js";
import { escape, formatteerDatum, formatteerGetal, formatteerWaarde } from "./format.js";

const BREEDTE = 720;
const HOOGTE = 300;
// Rechts blijft ruimte vrij voor het normlabel; in het vlak zelf zou het
// bovenop de meetpunten vallen.
const MARGE = { boven: 16, rechts: 76, onder: 34, links: 58 };
const VLAK = {
  breedte: BREEDTE - MARGE.links - MARGE.rechts,
  hoogte: HOOGTE - MARGE.boven - MARGE.onder,
};

export interface EvolutieGegevens {
  parameter: ParameterSamenvatting;
  /** Alle metingen van deze parameter, over alle opgehaalde jaren. */
  metingen: Meting[];
  /** Tegen welke normenset de lijn in de grafiek getekend wordt. */
  normenset: Normenset;
}

/**
 * Toont het verloop van één parameter over de tijd. Opent als dialoog zodat
 * Escape, focusbeheer en de achtergrondafscherming van de browser komen.
 */
export class EvolutieVenster {
  private readonly dialoog: HTMLDialogElement;

  constructor() {
    this.dialoog = document.createElement("dialog");
    this.dialoog.className = "evolutie";
    document.body.appendChild(this.dialoog);

    // Klikken op de achtergrond sluit; klikken in de inhoud niet. We eisen dat
    // de klik óók op de achtergrond begón — anders sluit de klik waarmee je het
    // venster opent het meteen weer, omdat die klik nog doorloopt naar de
    // zojuist getoonde dialoog.
    let begonOpAchtergrond = false;
    this.dialoog.addEventListener("pointerdown", (gebeurtenis) => {
      begonOpAchtergrond = gebeurtenis.target === this.dialoog;
    });
    this.dialoog.addEventListener("click", (gebeurtenis) => {
      if (begonOpAchtergrond && gebeurtenis.target === this.dialoog) this.dialoog.close();
      begonOpAchtergrond = false;
    });
  }

  toon({ parameter, metingen, normenset }: EvolutieGegevens): void {
    const gesorteerd = opDatum(metingen);
    this.dialoog.innerHTML = this.inhoud(parameter, gesorteerd, normenset);
    this.dialoog
      .querySelector("[data-actie='sluiten']")
      ?.addEventListener("click", () => this.dialoog.close());
    this.koppelAanwijzer();
    this.dialoog.showModal();
  }

  /** Toont datum en waarde bij het punt waar de muis boven zweeft. */
  private koppelAanwijzer(): void {
    const vlak = this.dialoog.querySelector<HTMLElement>(".evolutie__grafiek");
    const svg = vlak?.querySelector("svg");
    const tooltip = vlak?.querySelector<HTMLElement>(".tooltip");
    const aanwijzer = vlak?.querySelector<SVGGElement>(".aanwijzer");
    if (!vlak || !svg || !tooltip || !aanwijzer) return;

    const lijn = aanwijzer.querySelector<SVGLineElement>(".aanwijzer__lijn")!;
    const stip = aanwijzer.querySelector<SVGCircleElement>(".aanwijzer__punt")!;

    const verberg = () => {
      tooltip.hidden = true;
      aanwijzer.setAttribute("hidden", "");
    };

    vlak.querySelectorAll<SVGCircleElement>(".trefvlak").forEach((trefvlak) => {
      trefvlak.addEventListener("pointerenter", () => {
        const { datum, waarde, limiet, x, y } = trefvlak.dataset;

        tooltip.innerHTML =
          `<span class="tooltip__datum">${datum}</span>` +
          `<span class="tooltip__waarde">${waarde}</span>` +
          (limiet ? '<span class="tooltip__noot">onder detectielimiet</span>' : "");
        tooltip.hidden = false;

        lijn.setAttribute("x1", x!);
        lijn.setAttribute("x2", x!);
        stip.setAttribute("cx", x!);
        stip.setAttribute("cy", y!);
        aanwijzer.removeAttribute("hidden");

        // Het SVG-coördinatenstelsel is geschaald; reken om naar de pagina.
        const doos = trefvlak.getBoundingClientRect();
        const kader = vlak.getBoundingClientRect();
        const midden = doos.left + doos.width / 2 - kader.left;
        tooltip.style.left = `${midden}px`;
        tooltip.style.top = `${doos.top - kader.top - 12}px`;
      });
    });

    svg.addEventListener("pointerleave", verberg);
  }

  private inhoud(parameter: ParameterSamenvatting, metingen: Meting[], set: Normenset): string {
    const norm = NORMEN[set][parameter.symbool];
    const normGeldt = norm !== undefined && norm.eenheid === parameter.eenheid;
    const jaren = [...new Set(metingen.map((m) => m.jaar))];

    return `
      <article class="evolutie__kader">
        <header class="evolutie__kop">
          <button type="button" class="evolutie__sluit" data-actie="sluiten" aria-label="Venster sluiten">×</button>
          <p class="paneel__eyebrow">Verloop over de tijd</p>
          <h2 class="evolutie__titel">${escape(parameter.omschrijving)}</h2>
          <p class="evolutie__meta">
            <span class="parameter__symbool">${escape(parameter.symbool)}</span>
            <span>${metingen.length} metingen in ${jaren.length} ${jaren.length === 1 ? "meetjaar" : "meetjaren"}</span>
            <span>eenheid ${escape(parameter.eenheid)}</span>
          </p>
        </header>

        ${this.grafiek(parameter, metingen, normGeldt ? norm : undefined)}
        ${this.legende(metingen, normGeldt ? norm : undefined)}
        ${this.tabel(metingen)}
      </article>`;
  }

  private grafiek(
    parameter: ParameterSamenvatting,
    metingen: Meting[],
    norm?: { ondergrens?: number; bovengrens?: number; label: string },
  ): string {
    if (metingen.length === 0) return "";

    const waarden = metingen.map((m) => m.waarde);
    const grenzen = [norm?.ondergrens, norm?.bovengrens].filter(
      (g): g is number => g !== undefined,
    );
    // De normlijn moet in beeld passen, anders lijkt hij te ontbreken.
    const yWaarden = [...waarden, ...grenzen, 0];

    const tijden = metingen.map((m) => Date.parse(m.datum));
    const x = maakSchaal(tijden, VLAK.breedte);
    const y = maakSchaal(yWaarden, VLAK.hoogte, true, 0.08);

    const punten: Punt[] = metingen.map((meting) => ({
      x: x.naar(Date.parse(meting.datum)),
      y: y.naar(meting.waarde),
      meting,
    }));

    const yTicks = kiesTicks(y.min, y.max, 5);
    const jaarTicks = this.jaarTicks(metingen, x);

    const rasterY = yTicks
      .map(
        (tick) =>
          `<line class="raster" x1="0" x2="${VLAK.breedte}" y1="${y.naar(tick).toFixed(1)}" y2="${y.naar(tick).toFixed(1)}"/>
           <text class="aslabel aslabel--y" x="-10" y="${(y.naar(tick) + 4).toFixed(1)}">${formatteerGetal(tick)}</text>`,
      )
      .join("");

    const asX = jaarTicks
      .map(
        ({ positie, label }) =>
          `<text class="aslabel aslabel--x" x="${positie.toFixed(1)}" y="${VLAK.hoogte + 22}">${label}</text>`,
      )
      .join("");

    const normLijnen = grenzen
      .map(
        (grens) =>
          `<line class="normlijn" x1="0" x2="${VLAK.breedte}" y1="${y.naar(grens).toFixed(1)}" y2="${y.naar(grens).toFixed(1)}"/>
           <text class="normlabel" x="${VLAK.breedte + 8}" y="${(y.naar(grens) + 4).toFixed(1)}">norm ${formatteerGetal(grens)}</text>`,
      )
      .join("");

    const lijnen = splitsInReeksen(punten)
      .filter((reeks) => reeks.length > 1)
      .map((reeks) => `<path class="reeks" d="${bouwPad(reeks)}"/>`)
      .join("");

    const markers = punten
      .map((p) => {
        const onder = p.meting.onderDetectielimiet;
        const waarde = `${formatteerWaarde(p.meting.waarde, onder)} ${parameter.eenheid}`;
        const titel = `${formatteerDatum(p.meting.datum)}: ${waarde}${onder ? " (onder detectielimiet)" : ""}`;
        return `<circle class="punt ${onder ? "punt--limiet" : ""}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5"><title>${escape(titel)}</title></circle>`;
      })
      .join("");

    // Ruimere, onzichtbare trefvlakken: een marker van 4,5 px is te klein om
    // comfortabel aan te wijzen.
    const trefvlakken = punten
      .map((p, i) => {
        const onder = p.meting.onderDetectielimiet;
        return `<circle class="trefvlak" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13"
                  data-punt="${i}"
                  data-datum="${escape(formatteerDatum(p.meting.datum))}"
                  data-waarde="${escape(formatteerWaarde(p.meting.waarde, onder))} ${escape(parameter.eenheid)}"
                  data-limiet="${onder ? "1" : ""}"
                  data-x="${p.x.toFixed(1)}" data-y="${p.y.toFixed(1)}"/>`;
      })
      .join("");

    return `
      <div class="evolutie__grafiek">
        <svg viewBox="0 0 ${BREEDTE} ${HOOGTE}" role="img"
             aria-label="Verloop van ${escape(parameter.omschrijving)} over de tijd. De waarden staan ook in de tabel hieronder.">
          <g transform="translate(${MARGE.links} ${MARGE.boven})">
            ${rasterY}
            ${normLijnen}
            ${lijnen}
            ${markers}
            <g class="aanwijzer" hidden>
              <line class="aanwijzer__lijn" y1="0" y2="${VLAK.hoogte}"/>
              <circle class="aanwijzer__punt" r="7"/>
            </g>
            ${trefvlakken}
            ${asX}
          </g>
        </svg>
        <div class="tooltip" hidden role="status"></div>
      </div>`;
  }

  /** Eén label per meetjaar, op de eerste meting van dat jaar. */
  private jaarTicks(metingen: Meting[], x: { naar(w: number): number }) {
    const gezien = new Set<number>();
    const ticks: { positie: number; label: string }[] = [];

    for (const meting of metingen) {
      if (gezien.has(meting.jaar)) continue;
      gezien.add(meting.jaar);
      ticks.push({ positie: x.naar(Date.parse(meting.datum)), label: String(meting.jaar) });
    }
    return ticks;
  }

  private legende(metingen: Meting[], norm?: { label: string }): string {
    const heeftLimiet = metingen.some((m) => m.onderDetectielimiet);
    const items = [
      '<span class="legende__item"><span class="legende__punt"></span>gemeten waarde</span>',
      heeftLimiet
        ? '<span class="legende__item"><span class="legende__punt legende__punt--limiet"></span>onder detectielimiet — de waarde is de limiet, niet de concentratie</span>'
        : "",
      norm ? `<span class="legende__item"><span class="legende__streep"></span>norm ${escape(norm.label)}</span>` : "",
    ].filter(Boolean);

    return `<p class="legende">${items.join("")}</p>`;
  }

  private tabel(metingen: Meting[]): string {
    const rijen = [...metingen]
      .reverse()
      .map(
        (meting) => `
        <tr>
          <td class="datum">${escape(formatteerDatum(meting.datum))}</td>
          <td class="num waarde">${escape(formatteerWaarde(meting.waarde, meting.onderDetectielimiet))}</td>
          <td>${meting.onderDetectielimiet ? '<span class="badge badge--geen-norm">niet aangetoond</span>' : ""}</td>
        </tr>`,
      )
      .join("");

    return `
      <details class="evolutie__tabel">
        <summary>Alle ${metingen.length} metingen</summary>
        <div class="tabel-scroll">
          <table>
            <thead><tr><th>Datum</th><th class="num">Waarde</th><th>Opmerking</th></tr></thead>
            <tbody>${rijen}</tbody>
          </table>
        </div>
      </details>`;
  }
}

