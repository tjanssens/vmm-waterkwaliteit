import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
// Zonder dit tweede bestand krijgen de clusterbollen geen enkele stijl mee.
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./stijl.css";

import { Kaart } from "./ui/kaart.js";
import { vormSvg } from "./lagen/merk.js";
import { escape } from "./ui/format.js";
import { Paneel } from "./ui/paneel.js";
import { LAGEN, laagprofiel } from "./lagen/index.js";
import type { LaagId, Meetpunt } from "./lagen/types.js";
import { zoek, afstand, formatteerAfstand, type LatLon } from "./geo/meetplaatsen.js";

const element = <T extends HTMLElement>(id: string): T => {
  const gevonden = document.getElementById(id);
  if (!gevonden) throw new Error(`Element #${id} ontbreekt in de pagina.`);
  return gevonden as T;
};

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
  await new Paneel(houder, "rapport").toon(gekozen);
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
    onSelectie: (punt) => void paneel.toon(punt),
  });

  /** Alle geladen punten per laag, en welke daarvan na filteren zichtbaar zijn. */
  const geladen = new Map<LaagId, Meetpunt[]>();
  const zichtbaar = new Map<LaagId, Meetpunt[]>();
  const actieveLagen = new Set<LaagId>(LAGEN.map((l) => l.id));
  /** Actieve puntfilters, als "laag/filter"-sleutels over alle lagen heen. */
  const actieveFilters = new Set<string>();
  let positie: LatLon | undefined;

  for (const profiel of LAGEN) kaart.voegLaagToe(profiel);

  bouwLaagschakelaars();
  bouwPuntfilters();

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
        // De filterknoppen van een uitgeschakelde laag horen te verdwijnen.
        bouwPuntfilters();
        pasFiltersToe();
      });
    });
  }

  /**
   * De filterknoppen komen uit de profielen zelf: wat er te filteren valt,
   * verschilt per bron. Alleen ingeschakelde lagen tonen hun knoppen.
   */
  function bouwPuntfilters(): void {
    filterbalk.innerHTML = LAGEN.filter((profiel) => actieveLagen.has(profiel.id))
      .flatMap((profiel) =>
        (profiel.puntfilters ?? []).map((filter) => {
          const sleutel = `${profiel.id}/${filter.id}`;
          return `<button type="button" class="filter" data-filter="${escape(sleutel)}"
                    aria-pressed="${actieveFilters.has(sleutel)}">${escape(filter.label)}</button>`;
        }),
      )
      .join("");

    filterbalk.querySelectorAll<HTMLButtonElement>(".filter").forEach((knop) => {
      knop.addEventListener("click", () => {
        const sleutel = knop.dataset.filter!;
        if (actieveFilters.has(sleutel)) actieveFilters.delete(sleutel);
        else actieveFilters.add(sleutel);
        knop.setAttribute("aria-pressed", String(actieveFilters.has(sleutel)));
        pasFiltersToe();
      });
    });
  }

  function pasFiltersToe(): void {
    for (const profiel of LAGEN) {
      const alle = geladen.get(profiel.id) ?? [];
      const aan = (profiel.puntfilters ?? []).filter((f) =>
        actieveFilters.has(`${profiel.id}/${f.id}`),
      );
      // Geen filter aan betekent alles tonen, niet niets.
      const na = aan.length === 0 ? alle : alle.filter((punt) => aan.some((f) => f.past(punt)));

      zichtbaar.set(profiel.id, na);
      kaart.zet(profiel.id, na);

      const telling = laagbalk.querySelector(`[data-telling="${profiel.id}"]`);
      if (telling) telling.textContent = String(na.length);
    }
    toonLijst();
  }

  // ---- resultatenlijst ----

  /** De punten van alle ingeschakelde lagen, door elkaar. */
  function zichtbarePunten(): Meetpunt[] {
    return LAGEN.filter((profiel) => actieveLagen.has(profiel.id)).flatMap(
      (profiel) => zichtbaar.get(profiel.id) ?? [],
    );
  }

  function toonLijst(): void {
    const punten = zichtbarePunten();
    const term = zoekveld.value;
    const treffers = zoek(punten, term, positie, 60);

    statusregel.textContent = term
      ? `${treffers.length === 60 ? "meer dan 60" : treffers.length} van ${punten.length} meetpunten`
      : `${punten.length} meetpunten${positie ? ", dichtstbijzijnde eerst" : ""}`;

    if (treffers.length === 0) {
      lijst.innerHTML =
        '<li class="lijst__leeg">Niets gevonden. Probeer een gemeente of nummer.</li>';
      return;
    }

    lijst.innerHTML = treffers
      .map((punt) => {
        const profiel = laagprofiel(punt.laag)!;
        const meter = positie ? afstand(positie, punt) : null;
        return `
          <li>
            <button type="button" class="treffer" data-laag="${escape(punt.laag)}" data-punt="${escape(punt.id)}">
              <span class="treffer__code">
                <span class="treffer__merk">${vormSvg(profiel.merk, 11)}</span>${escape(punt.code)}
              </span>
              <span class="treffer__oms">${escape(punt.omschrijving || "Geen omschrijving")}</span>
              <span class="treffer__meta">
                ${[punt.gemeente, meter === null ? null : formatteerAfstand(meter)]
                  .filter(Boolean)
                  .map((deel) => escape(String(deel)))
                  .join(" · ")}
              </span>
            </button>
          </li>`;
      })
      .join("");

    lijst.querySelectorAll<HTMLButtonElement>(".treffer").forEach((knop) => {
      knop.addEventListener("click", () => {
        const gekozen = punten.find(
          (p) => p.laag === knop.dataset.laag && p.id === knop.dataset.punt,
        );
        if (gekozen) kaart.selecteer(gekozen, true);
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


const vraag = new URLSearchParams(location.search);
const diep = leesDiepeLink(vraag);

if (vraag.get("weergave") === "rapport" && diep) {
  void toonRapport(diep.laag, diep.punt);
} else {
  void start();
}
