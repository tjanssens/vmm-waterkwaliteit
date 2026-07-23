import type { Merk } from "./types.js";

/**
 * Tekent het merkteken van een laag. Vorm draagt het onderscheid, kleur
 * versterkt het: kleur alleen zou onleesbaar zijn voor kleurenblinde
 * gebruikers en op een afdruk.
 *
 * Gebruikt door de kaart, de legenda, de laagschakelaars, de trefferlijst en
 * de paneelkop: vandaar dat het hier staat en niet in de kaartmodule.
 */
export function vormSvg(merk: Merk, maat: number, actief = false): string {
  const rand = actief ? merk.kleur : "#ffffff";
  const dikte = actief ? 2.5 : 1.5;
  const gemeen = `fill="${merk.kleur}" fill-opacity="0.85" stroke="${rand}" stroke-width="${dikte}"`;

  const vorm =
    merk.vorm === "vierkant"
      ? `<rect x="2.5" y="2.5" width="15" height="15" rx="2" ${gemeen} />`
      : merk.vorm === "driehoek"
        ? `<path d="M10 2.5 L18 17 L2 17 Z" stroke-linejoin="round" ${gemeen} />`
        : `<circle cx="10" cy="10" r="7.5" ${gemeen} />`;

  return `<svg viewBox="0 0 20 20" width="${maat}" height="${maat}" aria-hidden="true">${vorm}</svg>`;
}
