import L from "leaflet";
import "leaflet.markercluster";
import type { Laagprofiel, LaagId, Meetpunt, Merk, Vak } from "../lagen/types.js";
import { vormSvg } from "../lagen/merk.js";

/** Vlaanderen in beeld bij het openen. */
const START = { midden: [51.05, 4.4] as [number, number], zoom: 9 };

export interface KaartOpties {
  onSelectie: (punt: Meetpunt) => void;
  /** Roept terug wanneer het kaartvenster verschoven of gezoomd is. */
  onVenster?: (venster: Vak, zoom: number) => void;
}

interface Laag {
  profiel: Laagprofiel;
  cluster: L.MarkerClusterGroup;
  markers: Map<string, L.CircleMarker | L.Marker>;
  zichtbaar: boolean;
}

export class Kaart {
  private readonly kaart: L.Map;
  private readonly lagen = new Map<LaagId, Laag>();
  private geselecteerd: Meetpunt | null = null;
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

    if (this.opties.onVenster) {
      this.kaart.on("moveend", () => this.meldVenster());
    }
  }

  /** Registreert een laag; punten komen er via `zet` in. */
  voegLaagToe(profiel: Laagprofiel, zichtbaar = true): void {
    // 7.534 losse markers is te veel om vloeiend te tekenen.
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      chunkedLoading: true,
      disableClusteringAtZoom: 14,
      iconCreateFunction: (groep) => this.clusterIcoon(groep, profiel.merk),
    });

    this.lagen.set(profiel.id, {
      profiel,
      cluster,
      markers: new Map(),
      zichtbaar,
    });

    if (zichtbaar) this.kaart.addLayer(cluster);
  }

  /** Vervangt de punten van één laag. */
  zet(laagId: LaagId, punten: readonly Meetpunt[]): void {
    const laag = this.lagen.get(laagId);
    if (!laag) return;

    laag.cluster.clearLayers();
    laag.markers.clear();

    const markers = punten.map((punt) => {
      const marker = this.maakMarker(punt, laag.profiel.merk);
      marker.bindTooltip(`<strong>${punt.code}</strong><br>${punt.omschrijving}`, {
        direction: "top",
      });
      marker.on("click", () => this.selecteer(punt));
      laag.markers.set(punt.id, marker);
      return marker;
    });

    laag.cluster.addLayers(markers);
  }

  toonLaag(laagId: LaagId, zichtbaar: boolean): void {
    const laag = this.lagen.get(laagId);
    if (!laag || laag.zichtbaar === zichtbaar) return;

    laag.zichtbaar = zichtbaar;
    if (zichtbaar) this.kaart.addLayer(laag.cluster);
    else this.kaart.removeLayer(laag.cluster);
  }

  selecteer(punt: Meetpunt, zoomIn = false): void {
    const vorige = this.geselecteerd;
    this.geselecteerd = punt;

    if (vorige) this.herteken(vorige);
    this.herteken(punt);

    if (zoomIn) {
      this.kaart.setView([punt.lat, punt.lon], Math.max(this.kaart.getZoom(), 14));
    }

    this.opties.onSelectie(punt);
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

  huidigVenster(): { venster: Vak; zoom: number } {
    const grens = this.kaart.getBounds();
    return {
      venster: {
        zuid: grens.getSouth(),
        west: grens.getWest(),
        noord: grens.getNorth(),
        oost: grens.getEast(),
      },
      zoom: this.kaart.getZoom(),
    };
  }

  private meldVenster(): void {
    const { venster, zoom } = this.huidigVenster();
    this.opties.onVenster?.(venster, zoom);
  }

  private herteken(punt: Meetpunt): void {
    const laag = this.lagen.get(punt.laag);
    const marker = laag?.markers.get(punt.id);
    if (!laag || !marker) return;

    const actief = this.isActief(punt);
    if (marker instanceof L.CircleMarker) {
      marker.setStyle(this.cirkelStijl(laag.profiel.merk, actief));
      marker.setRadius(actief ? 9 : 6);
    } else {
      marker.setIcon(this.vormIcoon(laag.profiel.merk, actief));
    }
  }

  private isActief(punt: Meetpunt): boolean {
    return this.geselecteerd?.laag === punt.laag && this.geselecteerd.id === punt.id;
  }

  /**
   * Cirkels gaan via canvas — dat is wat 7.534 punten vloeiend houdt. De
   * andere vormen kan canvas niet tekenen, en die lagen zijn klein genoeg om
   * als DOM-element te bestaan.
   */
  private maakMarker(punt: Meetpunt, merk: Merk): L.CircleMarker | L.Marker {
    const actief = this.isActief(punt);
    if (merk.vorm === "cirkel") {
      return L.circleMarker([punt.lat, punt.lon], {
        ...this.cirkelStijl(merk, actief),
        radius: actief ? 9 : 6,
      });
    }
    return L.marker([punt.lat, punt.lon], { icon: this.vormIcoon(merk, actief) });
  }

  private cirkelStijl(merk: Merk, actief: boolean): L.CircleMarkerOptions {
    return {
      weight: actief ? 3 : 1.5,
      color: actief ? merk.kleur : "#ffffff",
      fillColor: merk.kleur,
      fillOpacity: 0.85,
    };
  }

  private vormIcoon(merk: Merk, actief: boolean): L.DivIcon {
    const maat = actief ? 20 : 14;
    return L.divIcon({
      className: "puntmerk",
      html: vormSvg(merk, maat, actief),
      iconSize: [maat, maat],
      iconAnchor: [maat / 2, maat / 2],
    });
  }

  /** De clusterbol draagt de kleur van zijn laag, zodat lagen ook geclusterd te onderscheiden zijn. */
  private clusterIcoon(groep: L.MarkerCluster, merk: Merk): L.DivIcon {
    const aantal = groep.getChildCount();
    const maat = aantal < 10 ? 32 : aantal < 100 ? 38 : 44;
    return L.divIcon({
      html: `<div class="cluster__bol" style="--laagkleur:${merk.kleur}"><span>${aantal}</span></div>`,
      className: `cluster cluster--${merk.vorm}`,
      iconSize: [maat, maat],
    });
  }
}

