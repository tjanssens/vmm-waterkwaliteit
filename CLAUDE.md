# VMM Waterkwaliteit

Kaart van de Vlaamse meetplaatsen oppervlaktewater: klik een punt, lees de
analyseresultaten. Vervangt het omslachtige heen-en-weer tussen de VMM-kaart
(die nummers toont) en het Cognos-rapport (dat codes verwacht).

Volg de globale codekwaliteitsstandaarden uit `~/.claude/CLAUDE.md`.

## Commando's

```bash
npm run dev                 # ontwikkelserver
npm test                    # vitest, eenmalig
npm run test:watch          # vitest, doorlopend
npm run typecheck           # tsc --noEmit
npm run build               # typecheck + productiebuild naar dist/
npm run data:meetplaatsen   # ververst public/data/meetplaatsen.json vanaf de WFS

cd worker && npx wrangler dev      # proxy lokaal
cd worker && npx wrangler deploy   # proxy uitrollen
```

## Architectuur

Twee onderdelen, verder niets:

- **Statische app** op GitHub Pages. Vite + TypeScript, Leaflet met clustering.
- **Cloudflare Worker** (`worker/`) als doorgeefluik naar Cognos.

De meetplaatsen komen uit een WFS die CORS wél toestaat en worden bij de build
afgeslankt tot `public/data/meetplaatsen.json` (917 kB, ~248 kB gzip). De
analyseresultaten komen live via de Worker.

## Databronnen

**Meetplaatsen** — WFS van Digitaal Vlaanderen, laag `Mtploppw`:

```
https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs
  ?service=WFS&version=2.0.0&request=GetFeature
  &typeNames=MeetplOppervlwaterkwal:Mtploppw
  &outputFormat=application/json&srsName=EPSG:4326
```

7.534 punten. Attributen: `MEETPLNR`, `OMSCHR` en een vlag per meetnet
(`FYSICOCHEM`, `BACTERIO`, `ZUURSTOF`, `WATBODEM`, `MACROINV`, `MACROFYT`,
`FYTOBENT`, `FYTOPLANKT`, `MAP_MEETNT`). Geen gemeenteveld — dat bepalen we
ruimtelijk tegen `VRBG:Refgem`. `CQL_FILTER` en `BBOX` werken server-side.

**Analyseresultaten** — ongedocumenteerde REST-endpoint van Cognos:

```
https://int-web.vmm.be/ibmcognos/bi/v1/disp/rds/reportData/report/
  i1B4F72B440A747A3B2F9D6057DC16031
  ?fmt=CSV&p_pMatrix=OW&p_pSamplePoint=OW65000&p_pJaar=2024
```

Geen authenticatie nodig. `p_pJaar` mag herhaald worden voor meerdere jaren.
`fmt=HTMLFragment` geeft er gemeente en waterloop bij; `fmt=JSON` geeft de
volledige rapportlayout.

## Zaken die stil fout gaan

Deze zijn met tests afgedekt. Verwijder die tests niet zonder reden.

- **De koppeling kaart ↔ rapport is de prefix.** Cognos verwacht `OW` +
  `MEETPLNR` voor oppervlaktewater, `WB` + nummer voor waterbodem. Biota heeft
  een eigen `B…`-reeks. Geverifieerd: WFS `210000` en Cognos `OW210000` zijn
  dezelfde plek aan de Rupel in Niel.
- **`p_pMatrix` moet bij die prefix passen.** `OW65000` met `p_pMatrix=WB`
  geeft nul metingen in plaats van een foutmelding. Leid de matrix altijd af
  uit de code (`matrixVanCode`), nooit uit een standaardwaarde.
- **Waterbodem meet in mg/kg droge stof.** Dezelfde symbolen (`N t`, `P t`)
  dragen daar een heel andere eenheid. Elke norm draagt daarom de eenheid
  waarin ze geldt, en `beoordeel` toetst niet bij een afwijkende eenheid.
  Zonder die controle kreeg 1200 mg/kg ds het oordeel "boven norm" tegen een
  drempel van 6 mgN/L.
- **Zeg nooit "alles binnen de norm" als er niets getoetst is.** Bij waterbodem
  en biota is geen enkele parameter toetsbaar; `samenvattingsZin` heeft daar
  een eigen tak voor.
- **Decimale komma.** Resultaten komen als `10,1`, niet `10.1`.
- **Detectielimieten.** De kolom `Teken` bevat `<` wanneer de stof niet is
  aangetoond; de waarde is dan de limiet, niet de concentratie. Ligt élke
  meting eronder, dan is het gemiddelde een bovengrens en toetsen we niet.
- **Metalen zijn totaalgehalten.** Symbolen op ` t` (`Cd t`, `Zn t`) zijn het
  totaalgehalte, terwijl de normen op de opgeloste fractie (` o`) slaan. Niet
  toetsen. Uitzondering: `P t` en `N t` zijn nutriënten, geen metalen.
- **Punten zonder resultaten bestaan.** `OW211100` en `OW215800` staan op de
  kaart maar leveren over 2012–2026 niets op. Toon dat expliciet.
- **Cognos meldt fouten met status 200** en een XML-body die met `<` begint.
- **Het endpoint is ongedocumenteerd.** Verandert het formaat, dan werpt de
  parser een `FormaatFout` in plaats van verkeerde cijfers te tonen.

## Openstaand

- De drempelwaarden in `src/data/normen.ts` zijn nog niet één voor één
  geverifieerd tegen VLAREM II, bijlage 2.3.1. Vooral de norm voor ammonium is
  onzeker. Typespecifieke normen per waterlooptype zijn nog niet verwerkt.
