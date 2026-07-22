import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
// Zonder dit tweede bestand krijgen de clusterbollen geen enkele stijl mee.
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./stijl.css";

import { Kaart } from "./ui/kaart.js";
import { vormSvg } from "./lagen/merk.js";
import { Paneel } from "./ui/paneel.js";
import { LAGEN, laagprofiel } from "./lagen/index.js";
import type { Laagprofiel, LaagId, Meetpunt } from "./lagen/types.js";
import {
  zoek,
  afstand,
  formatteerAfstand,
  MEETNET_NAMEN,
  type LatLon,
  type Meetnet,
  type Meetplaats,
} from "./geo/meetplaatsen.js";

/** Meetnetten waarop filteren zinvol is; de rest zit in de details. */
const FILTERBAAR: Meetnet[] = ["FYSICOCHEM", "BACTERIO", "WATBODEM", "MACROINV"];

const element = <T extends HTMLElement>(id: string): T => {
  const gevonden = document.getElementById(id);
  if (!gevonden) throw new Error(`Element #${id} ontbreekt in de pagina.`);
  return gevonden as T;
};

/** Punt plus het profiel waar het bij hoort; de lijst mengt lagen door elkaar. */
interface Vermelding {
  punt: Meetpunt;
  profiel: Laagprofiel;
}

/**
 * Alleen het rapport, zonder kaart of zijbalk. Bedoeld voor een eigen tabblad
 * en om af te drukken.
 */
async function toonRapport(laagId: LaagId, puntId: string): Promise<void> {
  const houder = element<HTMLElement>("rapport");
  element<HTMLElement>("app").hidden = true;
  houder.hidden = false;
  document.body.classList.add("is-rapport");

  const profiel = laagprofiel(laagId);
  if (!profiel) {
    houder.innerHTML = `<p class="rapport__fout">Onbekende databron "${laagId}".
      <a href="./">Terug naar de kaart</a></p>`;
    return;
  }

  let punten: Meetpunt[];
  try {
    punten = await profiel.laadPunten(null);
  } catch (reden) {
    houder.innerHTML = `<p class="rapport__fout">${
      reden instanceof Error ? reden.message : "De meetpunten konden niet geladen worden."
    }</p>`;
    return;
  }

  const gekozen = punten.find((p) => p.id === puntId);
  if (!gekozen) {
    houder.innerHTML = `<p class="rapport__fout">Meetpunt ${puntId} bestaat niet in ${profiel.naam}.
      <a href="./">Terug naar de kaart</a></p>`;
    return;
  }

  document.title = `${gekozen.code} — ${gekozen.omschrijving || "meetpunt"} | ${profiel.naam}`;
  await new Paneel(houder, "rapport").toon(gekozen, profiel);
}

async function start(): Promise<void> {
  const zoekveld = element<HTMLInputElement>("zoek");
  const lijst = element<HTMLElement>("resultaten");
  const laagbalk = element<HTMLElement>("lagen");
  const filterbalk = element<HTMLElement>("filters");
  const statusregel = element<HTMLElement>("status");
  const locatieKnop = element<HTMLButtonElement>("locatie");

  const paneel = new Paneel(element("paneel"));
  const kaart = new Kaart(element("kaart"), {
    onSelectie: (punt, profiel) => void paneel.toon(punt, profiel),
  });

  /** Alle geladen punten per laag, en welke daarvan na filteren zichtbaar zijn. */
  const geladen = new Map<LaagId, Meetpunt[]>();
  const zichtbaar = new Map<LaagId, Meetpunt[]>();
  const actieveLagen = new Set<LaagId>(LAGEN.map((l) => l.id));
  const actieveFilters = new Set<Meetnet>();
  let positie: LatLon | undefined;

  for (const profiel of LAGEN) kaart.voegLaagToe(profiel);

  bouwLaagschakelaars();
  bouwMeetnetfilters();

  try {
    statusregel.textContent = "Meetpunten laden…";
    await Promise.all(
      LAGEN.filter((profiel) => !profiel.perVenster).map(async (profiel) => {
        const punten = await profiel.laadPunten(null);
        geladen.set(profiel.id, punten);
      }),
    );
  } catch (reden) {
    statusregel.textContent =
      reden instanceof Error ? reden.message : "De meetpunten konden niet geladen worden.";
    return;
  }

  pasFiltersToe();

  // ---- opbouw van de linkerkolom ----

  function bouwLaagschakelaars(): void {
    // Met één laag valt er niets te kiezen; dan is de schakelaar ruis.
    if (LAGEN.length < 2) return;
    laagbalk.hidden = false;

    laagbalk.innerHTML = LAGEN.map(
      (profiel) => `
        <button type="button" class="laag" data-laag="${profiel.id}" aria-pressed="true">
          <span class="laag__merk">${vormSvg(profiel.merk, 16)}</span>
          <span class="laag__naam">${escape(profiel.naam)}</span>
          <span class="laag__telling" data-telling="${profiel.id}"></span>
        </button>`,
    ).join("");

    laagbalk.querySelectorAll<HTMLButtonElement>("[data-laag]").forEach((knop) => {
      knop.addEventListener("click", () => {
        const id = knop.dataset.laag as LaagId;
        const aan = !actieveLagen.has(id);
        if (aan) actieveLagen.add(id);
        else actieveLagen.delete(id);
        knop.setAttribute("aria-pressed", String(aan));
        kaart.toonLaag(id, aan);
        toonLijst();
      });
    });
  }

  /** De meetnetten bestaan alleen bij oppervlaktewater. */
  function bouwMeetnetfilters(): void {
    filterbalk.innerHTML = FILTERBAAR.map(
      (net) =>
        `<button type="button" class="filter" data-net="${net}" aria-pressed="false">${MEETNET_NAMEN[net]}</button>`,
    ).join("");

    filterbalk.querySelectorAll<HTMLButtonElement>(".filter").forEach((knop) => {
      knop.addEventListener("click", () => {
        const net = knop.dataset.net as Meetnet;
        if (actieveFilters.has(net)) actieveFilters.delete(net);
        else actieveFilters.add(net);
        knop.setAttribute("aria-pressed", String(actieveFilters.has(net)));
        pasFiltersToe();
      });
    });
  }

  function pasFiltersToe(): void {
    for (const profiel of LAGEN) {
      const alle = geladen.get(profiel.id) ?? [];
      const na =
        profiel.id === "oppervlaktewater" && actieveFilters.size > 0
          ? alle.filter((punt) =>
              (punt as Meetplaats).meetnetten.some((net) => actieveFilters.has(net)),
            )
          : alle;

      zichtbaar.set(profiel.id, na);
      kaart.zet(profiel.id, na);

      const telling = laagbalk.querySelector(`[data-telling="${profiel.id}"]`);
      if (telling) telling.textContent = String(na.length);
    }
    toonLijst();
  }

  // ---- resultatenlijst ----

  function huidigeVermeldingen(): Vermelding[] {
    return LAGEN.filter((profiel) => actieveLagen.has(profiel.id)).flatMap((profiel) =>
      (zichtbaar.get(profiel.id) ?? []).map((punt) => ({ punt, profiel })),
    );
  }

  function toonLijst(): void {
    const vermeldingen = huidigeVermeldingen();
    const bijPunt = new Map(vermeldingen.map((v) => [`${v.punt.laag}/${v.punt.id}`, v]));
    const term = zoekveld.value;
    const treffers = zoek(
      vermeldingen.map((v) => v.punt),
      term,
      positie,
      60,
    );

    statusregel.textContent = term
      ? `${treffers.length === 60 ? "meer dan 60" : treffers.length} van ${vermeldingen.length} meetpunten`
      : `${vermeldingen.length} meetpunten${positie ? ", dichtstbijzijnde eerst" : ""}`;

    if (treffers.length === 0) {
      lijst.innerHTML =
        '<li class="lijst__leeg">Niets gevonden. Probeer een gemeente of nummer.</li>';
      return;
    }

    lijst.innerHTML = treffers
      .map((punt) => {
        const profiel = bijPunt.get(`${punt.laag}/${punt.id}`)!.profiel;
        const meter = positie ? afstand(positie, punt) : null;
        return `
          <li>
            <button type="button" class="treffer" data-laag="${escape(punt.laag)}" data-punt="${escape(punt.id)}">
              <span class="treffer__code">
                <span class="treffer__merk">${vormSvg(profiel.merk, 11)}</span>${escape(punt.code)}
              </span>
              <span class="treffer__oms">${escape(punt.omschrijving || "Geen omschrijving")}</span>
              <span class="treffer__meta">
                ${escape(punt.gemeente ?? "onbekende gemeente")}${
                  meter === null ? "" : ` · ${formatteerAfstand(meter)}`
                }
              </span>
            </button>
          </li>`;
      })
      .join("");

    lijst.querySelectorAll<HTMLButtonElement>(".treffer").forEach((knop) => {
      knop.addEventListener("click", () => {
        const gekozen = bijPunt.get(`${knop.dataset.laag}/${knop.dataset.punt}`);
        if (gekozen) kaart.selecteer(gekozen.punt, true);
      });
    });
  }

  zoekveld.addEventListener("input", toonLijst);

  locatieKnop.addEventListener("click", () => {
    if (!navigator.geolocation) {
      statusregel.textContent = "Deze browser geeft geen locatie door.";
      return;
    }
    locatieKnop.disabled = true;
    statusregel.textContent = "Locatie bepalen…";

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        positie = { lat: coords.latitude, lon: coords.longitude };
        kaart.toonPositie(coords.latitude, coords.longitude);
        locatieKnop.disabled = false;
        toonLijst();
      },
      () => {
        locatieKnop.disabled = false;
        statusregel.textContent = "Locatie niet beschikbaar. Zoek op gemeente of nummer.";
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  });

  // Diepe link: ?laag=…&punt=… opent dat punt meteen.
  const gevraagd = leesDiepeLink(new URLSearchParams(location.search));
  if (gevraagd) {
    const punt = (geladen.get(gevraagd.laag) ?? []).find((p) => p.id === gevraagd.punt);
    if (punt) kaart.selecteer(punt, true);
  }
}

/**
 * Leest de diepe link. `?meetplaats=65000` blijft werken: die vorm staat in
 * links die mensen al gedeeld hebben.
 */
function leesDiepeLink(vraag: URLSearchParams): { laag: LaagId; punt: string } | null {
  const punt = vraag.get("punt");
  const laag = vraag.get("laag");
  if (punt && laag && laagprofiel(laag as LaagId)) {
    return { laag: laag as LaagId, punt };
  }

  const meetplaats = vraag.get("meetplaats");
  if (meetplaats) {
    return { laag: "oppervlaktewater", punt: meetplaats.toUpperCase().replace(/^(OW|WB)/, "") };
  }
  return null;
}

function escape(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const vraag = new URLSearchParams(location.search);
const diep = leesDiepeLink(vraag);

if (vraag.get("weergave") === "rapport" && diep) {
  void toonRapport(diep.laag, diep.punt);
} else {
  void start();
}
