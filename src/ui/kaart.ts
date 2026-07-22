import L from "leaflet";
import "leaflet.markercluster";
import type { Meetplaats, Meetnet } from "../geo/meetplaatsen.js";

/** Vlaanderen in beeld bij het openen. */
const START = { midden: [51.05, 4.4] as [number, number], zoom: 9 };

export interface KaartOpties {
  onSelectie: (meetplaats: Meetplaats) => void;
}

export class Kaart {
  private readonly kaart: L.Map;
  private readonly cluster: L.MarkerClusterGroup;
  private readonly markers = new Map<string, L.CircleMarker>();
  private alle: Meetplaats[] = [];
  private geselecteerd: string | null = null;
  private eigenPositie: L.CircleMarker | null = null;

  constructor(
    element: HTMLElement,
    private readonly opties: KaartOpties,
  ) {
    this.kaart = L.map(element, {
      center: START.midden,
      zoom: START.zoom,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
    }).addTo(this.kaart);

    // 7.534 losse markers is te veel om vloeiend te tekenen.
    this.cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      chunkedLoading: true,
      disableClusteringAtZoom: 14,
    });
    this.kaart.addLayer(this.cluster);
  }

  zet(meetplaatsen: Meetplaats[]): void {
    this.alle = meetplaatsen;
    this.filter(new Set());
  }

  /** Toont enkel punten uit de gekozen meetnetten; lege selectie toont alles. */
  filter(meetnetten: ReadonlySet<Meetnet>): Meetplaats[] {
    const zichtbaar =
      meetnetten.size === 0
        ? this.alle
        : this.alle.filter((m) => m.meetnetten.some((net) => meetnetten.has(net)));

    this.cluster.clearLayers();
    this.markers.clear();

    const laag = zichtbaar.map((meetplaats) => {
      const marker = L.circleMarker([meetplaats.lat, meetplaats.lon], this.stijl(meetplaats));
      marker.bindTooltip(
        `<strong>${meetplaats.code}</strong><br>${meetplaats.omschrijving}`,
        { direction: "top" },
      );
      marker.on("click", () => this.selecteer(meetplaats));
      this.markers.set(meetplaats.nummer, marker);
      return marker;
    });

    this.cluster.addLayers(laag);
    return zichtbaar;
  }

  selecteer(meetplaats: Meetplaats, zoomIn = false): void {
    const vorige = this.geselecteerd;
    this.geselecteerd = meetplaats.nummer;

    if (vorige) {
      const marker = this.markers.get(vorige);
      const punt = this.alle.find((m) => m.nummer === vorige);
      if (marker && punt) marker.setStyle(this.stijl(punt));
    }
    this.markers.get(meetplaats.nummer)?.setStyle(this.stijl(meetplaats));

    if (zoomIn) {
      this.kaart.setView([meetplaats.lat, meetplaats.lon], Math.max(this.kaart.getZoom(), 14));
    }
    this.opties.onSelectie(meetplaats);
  }

  toonPositie(lat: number, lon: number): void {
    this.eigenPositie?.remove();
    this.eigenPositie = L.circleMarker([lat, lon], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#1f6feb",
      fillOpacity: 1,
    })
      .addTo(this.kaart)
      .bindTooltip("Jouw locatie", { direction: "top" });
    this.kaart.setView([lat, lon], 13);
  }

  private stijl(meetplaats: Meetplaats): L.CircleMarkerOptions {
    const actief = this.geselecteerd === meetplaats.nummer;
    return {
      radius: actief ? 9 : 6,
      weight: actief ? 3 : 1.5,
      color: actief ? "#0b5f63" : "#ffffff",
      fillColor: meetplaats.meetnetten.length ? "#0b5f63" : "#8b9a93",
      fillOpacity: 0.85,
    };
  }
}
