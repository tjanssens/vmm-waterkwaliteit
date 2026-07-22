import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
// Zonder dit tweede bestand krijgen de clusterbollen geen enkele stijl mee.
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "./stijl.css";

import { Kaart } from "./ui/kaart.js";
import { Paneel } from "./ui/paneel.js";
import {
  laadMeetplaatsen,
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

/**
 * Alleen het rapport, zonder kaart of zijbalk. Bedoeld voor een eigen tabblad
 * en om af te drukken.
 */
async function toonRapport(nummer: string): Promise<void> {
  const houder = element<HTMLElement>("rapport");
  element<HTMLElement>("app").hidden = true;
  houder.hidden = false;
  document.body.classList.add("is-rapport");

  let meetplaatsen: Meetplaats[];
  try {
    meetplaatsen = await laadMeetplaatsen(document.baseURI);
  } catch (reden) {
    houder.innerHTML = `<p class="rapport__fout">${
      reden instanceof Error ? reden.message : "De meetplaatsen konden niet geladen worden."
    }</p>`;
    return;
  }

  const gekozen = meetplaatsen.find((m) => m.nummer === nummer);
  if (!gekozen) {
    houder.innerHTML = `<p class="rapport__fout">Meetplaats ${nummer} bestaat niet.
      <a href="./">Terug naar de kaart</a></p>`;
    return;
  }

  document.title = `${gekozen.code} — ${gekozen.omschrijving || "meetplaats"} | Waterkwaliteit`;
  await new Paneel(houder, "rapport").toon(gekozen);
}

async function start(): Promise<void> {
  const zoekveld = element<HTMLInputElement>("zoek");
  const lijst = element<HTMLElement>("resultaten");
  const filterbalk = element<HTMLElement>("filters");
  const statusregel = element<HTMLElement>("status");
  const locatieKnop = element<HTMLButtonElement>("locatie");

  const paneel = new Paneel(element("paneel"));
  const kaart = new Kaart(element("kaart"), {
    onSelectie: (meetplaats) => void paneel.toon(meetplaats),
  });

  let meetplaatsen: Meetplaats[] = [];
  let zichtbaar: Meetplaats[] = [];
  let positie: LatLon | undefined;
  const actieveFilters = new Set<Meetnet>();

  filterbalk.innerHTML = FILTERBAAR.map(
    (net) =>
      `<button type="button" class="filter" data-net="${net}" aria-pressed="false">${MEETNET_NAMEN[net]}</button>`,
  ).join("");

  try {
    statusregel.textContent = "Meetplaatsen laden…";
    meetplaatsen = await laadMeetplaatsen(document.baseURI);
  } catch (reden) {
    statusregel.textContent =
      reden instanceof Error ? reden.message : "De meetplaatsen konden niet geladen worden.";
    return;
  }

  kaart.zet(meetplaatsen);
  zichtbaar = meetplaatsen;
  toonLijst();

  function toonLijst(): void {
    const term = zoekveld.value;
    const treffers = zoek(zichtbaar, term, positie, 60);

    statusregel.textContent = term
      ? `${treffers.length === 60 ? "meer dan 60" : treffers.length} van ${zichtbaar.length} meetplaatsen`
      : `${zichtbaar.length} meetplaatsen${positie ? ", dichtstbijzijnde eerst" : ""}`;

    if (treffers.length === 0) {
      lijst.innerHTML = '<li class="lijst__leeg">Niets gevonden. Probeer een gemeente of nummer.</li>';
      return;
    }

    lijst.innerHTML = treffers
      .map((meetplaats) => {
        const meter = positie ? afstand(positie, meetplaats) : null;
        return `
          <li>
            <button type="button" class="treffer" data-nummer="${escape(meetplaats.nummer)}">
              <span class="treffer__code">${escape(meetplaats.code)}</span>
              <span class="treffer__oms">${escape(meetplaats.omschrijving || "Geen omschrijving")}</span>
              <span class="treffer__meta">
                ${escape(meetplaats.gemeente ?? "onbekende gemeente")}${
                  meter === null ? "" : ` · ${formatteerAfstand(meter)}`
                }
              </span>
            </button>
          </li>`;
      })
      .join("");

    lijst.querySelectorAll<HTMLButtonElement>(".treffer").forEach((knop) => {
      knop.addEventListener("click", () => {
        const gekozen = meetplaatsen.find((m) => m.nummer === knop.dataset.nummer);
        if (gekozen) kaart.selecteer(gekozen, true);
      });
    });
  }

  zoekveld.addEventListener("input", toonLijst);

  filterbalk.querySelectorAll<HTMLButtonElement>(".filter").forEach((knop) => {
    knop.addEventListener("click", () => {
      const net = knop.dataset.net as Meetnet;
      if (actieveFilters.has(net)) actieveFilters.delete(net);
      else actieveFilters.add(net);
      knop.setAttribute("aria-pressed", String(actieveFilters.has(net)));
      zichtbaar = kaart.filter(actieveFilters);
      toonLijst();
    });
  });

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

  // Diepe link: /?meetplaats=65000 opent dat punt meteen.
  const gevraagd = new URLSearchParams(location.search).get("meetplaats");
  if (gevraagd) {
    const genormaliseerd = gevraagd.toUpperCase().replace(/^(OW|WB)/, "");
    const gekozen = meetplaatsen.find((m) => m.nummer === genormaliseerd);
    if (gekozen) kaart.selecteer(gekozen, true);
  }
}

function escape(tekst: string): string {
  return tekst.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

const vraag = new URLSearchParams(location.search);
const gevraagdeMeetplaats = vraag.get("meetplaats");

if (vraag.get("weergave") === "rapport" && gevraagdeMeetplaats) {
  void toonRapport(gevraagdeMeetplaats.toUpperCase().replace(/^(OW|WB)/, ""));
} else {
  void start();
}
