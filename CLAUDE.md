# Milieumetingen in je buurt

Kaart met meetpunten voor oppervlaktewater, lucht en grondwater: klik een punt,
lees de resultaten. Begon als vervanger van het heen-en-weer tussen de VMM-kaart
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

Twee onderdelen: een statische app op GitHub Pages (Vite + TypeScript, Leaflet
met clustering) en een Cloudflare Worker (`worker/`) als doorgeefluik naar
Cognos. Alleen die ene bron heeft een proxy nodig; IRCELINE en DOV staan CORS
zelf toe.

### De laag-abstractie

Alles wat aan één databron eigen is, zit achter `Laagprofiel` in
`src/lagen/types.ts`: hoe punten geladen worden, hoe de tijdas werkt, welke
normensetten gelden, welke feiten in de kop staan, hoe er gemeten wordt en waar
de burger de cijfers zelf kan raadplegen. `Kaart` en `Paneel` praten daartegen
en niet tegen Cognos, IRCELINE of DOV rechtstreeks.

Een laag toevoegen hoort één bestand in `src/lagen/` te kosten plus één regel in
`src/lagen/index.ts`. Staat er een `if (laag === …)` in gedeelde code, dan zit
de oplossing op de verkeerde plek — de meetnetfilters begonnen zo en zijn
daarom `Puntfilter`s op het profiel geworden.

### Twee manieren waarop de tijdas werkt

- **`uit-data`** (oppervlaktewater, grondwater): alles wordt in één keer
  opgehaald en de gekozen periode bepaalt wat je *ziet*.
- **`per-periode`** (lucht): de keuze bepaalt wat er *opgehaald wordt*. Een jaar
  uurmetingen halen we niet binnen om er twee dagen van te tonen.

`vatSamen(metingen, bucket)` neemt daarom een bucketfunctie in plaats van hard
op jaartal te groeperen.

### Laden per kaartvenster

Grondwater laadt niet vooraf maar per venster (`perVenster`, `minimumZoom`). De
orkestratie zit in `main.ts`, niet in het profiel: 400 ms wachten tot de kaart
stil valt, een `AbortController` per laag zodat een traag antwoord een nieuwer
niet overschrijft, en een melding wanneer er verder ingezoomd moet worden.

Zo'n laag heeft ook `puntOpId` nodig. Zonder dat werken de rapportweergave en de
deelbare link niet: die kennen alleen een id en kunnen niet eerst alles ophalen.

## Databronnen

**Meetplaatsen oppervlaktewater** — WFS van Digitaal Vlaanderen, laag `Mtploppw`:

```
https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs
  ?service=WFS&version=2.0.0&request=GetFeature
  &typeNames=MeetplOppervlwaterkwal:Mtploppw
  &outputFormat=application/json&srsName=EPSG:4326
```

7.534 punten. Geen gemeenteveld — dat bepalen we ruimtelijk tegen `VRBG:Refgem`.

**Analyseresultaten oppervlaktewater** — ongedocumenteerde REST-endpoint van
Cognos, geen authenticatie:

```
https://int-web.vmm.be/ibmcognos/bi/v1/disp/rds/reportData/report/
  i1B4F72B440A747A3B2F9D6057DC16031
  ?fmt=CSV&p_pMatrix=OW&p_pSamplePoint=OW65000&p_pJaar=2024
```

Het rapport is ook rechtstreeks te openen met de prompts al ingevuld; dat is wat
`rapportUrl()` bouwt voor de bronvermelding. `prompt=false` slaat het keuzescherm
over.

**Luchtkwaliteit** — IRCELINE, SOS-API met CORS:

```
GET  /sos/api/v1/stations?format=json                     137 stations
GET  /sos/api/v1/timeseries?station=<id>&expanded=true    reeksen van dat station
POST /sos/api/v1/timeseries/getData                       {timeseries:[…], timespan:"ISO/ISO"}
```

**Grondwater** — DOV, WFS met CORS. Drie lagen in `gw_meetnetten`:
`grondwaterlocaties_met_metingen` (19.024 filters), `grondwatermonsters` en
`grondwaterobservaties`.

## Zaken die stil fout gaan

Deze zijn met tests afgedekt. Verwijder die tests niet zonder reden.

### Oppervlaktewater

- **De koppeling kaart ↔ rapport is de prefix.** Cognos verwacht `OW` +
  `MEETPLNR`, `WB` + nummer voor waterbodem, en biota heeft een eigen `B…`-reeks.
- **`p_pMatrix` moet bij die prefix passen.** `OW65000` met `p_pMatrix=WB` geeft
  nul metingen in plaats van een foutmelding. Leid de matrix af uit de code.
- **Waterbodem meet in mg/kg droge stof.** Dezelfde symbolen dragen daar een
  andere eenheid; elke norm draagt daarom de eenheid waarin ze geldt.
- **Zeg nooit "alles binnen de norm" als er niets getoetst is.**
- **Decimale komma**, en **detectielimieten** in de kolom `Teken`.
- **Metalen zijn totaalgehalten** terwijl de milieukwaliteitsnorm op de opgeloste
  fractie slaat. Niet toetsen. Uitzondering: `P t` en `N t` zijn nutriënten.
- **Cognos meldt fouten met status 200** en een XML-body die met `<` begint.
- **Niet elk meetplaatsnummer is een getal.** "Timbers 15" bestaat. Sorteer op
  het nummer dat het punt draagt, niet op wat je uit de code terugrekent.

### Lucht

- **Normen slaan op verschillende statistieken.** Een norm draagt haar
  middelingstijd; een jaargrenswaarde wordt niet op een week losgelaten. Normen
  met een toegestaan aantal overschrijdingen zijn een telling en geen drempel op
  een gemiddelde.
- **`expanded=true` is niet optioneel.** Zonder die parameter komen de stofnaam
  en de eenheid niet mee, en heten de parameters naar hun interne reeksnummer.
- **Uurdata heeft een tijdstip nodig.** De grafiek rekende op de datum, waardoor
  24 metingen op dezelfde x-positie vielen. `tijdstipVan()` telt het uur mee, en
  de gatdrempel van de lijn schaalt mee met de meetdichtheid.
- **IRCELINE meet heel België**, niet alleen Vlaanderen.

### Grondwater

- **De BBOX gaat als lengte-, breedtegraad.** Omgekeerd geeft de server nul
  punten zonder foutmelding. En `bbox=` naast `CQL_FILTER=` mag niet, dus het
  venster staat ín de CQL: `BBOX(geom,…,'EPSG:4326')`.
- **`µg/l` versus `µg/L`.** DOV schrijft de liter klein. Zonder gelijktrekken
  faalt élke eenheidsvergelijking stil en krijgt alles "niet toetsbaar".
- **De parameternaam ís het symbool.** DOV schrijft "Arseen (As)" voluit; normen
  en categorieën zijn daarop gesleuteld, inclusief eigenaardigheden als "Ijzer"
  en "Chloriden".
- **Metalen zijn de opgeloste fractie**, ter plaatse gefiltreerd over 0,45 µm
  (WAC/I/A/005 §5.4.4.1). Een overschrijding telt zeker; een vinkje zegt niets
  over wat eruit gefilterd is. Kwik kan onderschat zijn door adsorptie aan het
  filter. Dit staat in `meetwijze` op het profiel.
- **Het meetpunt is de filter, niet de put.** Eén put kan meerdere filters op
  verschillende dieptes hebben, elk met eigen metingen.
- **Observaties hangen aan een monster, niet aan een filter.** Ophalen kost twee
  stappen, en DOV doet ongeveer drie seconden per monster; vandaar dat alleen de
  recentste staalnames opgehaald worden, parallel.

## Normen

Vijf sets in `src/data/normen.ts`, elk met bron per norm. Elke waarde is in de
primaire bron opgezocht en met een tweede bron nagerekend — dat is geen
formaliteit:

- De eerste drinkwaterronde kwam uit de ingetrokken richtlijn 98/83. Antimoon
  ging van 5 naar 10 µg/L, boor van 1,0 naar 1,5 mg/L, seleen van 10 naar 20.
- IRCELINE's eigen normenpagina geeft koolstofmonoxide als 10 µg/m³; de richtlijn
  zegt 10 mg/m³.
- Eerdere gokwaarden voor oppervlaktewater bleken fout: totaal stikstof 4 en niet
  6 mgN/L, nitraat 5,65–10 en niet 11,3, pH 5,5–9,0 en niet 6,5–8,5. Voor
  ammonium staat er géén norm; die is verwijderd in plaats van geraden.

Aandachtspunten:

- **Veel oppervlaktewaternormen verschillen per waterlooptype.** Wij kennen het
  type niet, dus die dragen `strengsteBovengrens` naast `bovengrens`; daartussen
  luidt het oordeel "hangt van type af".
- **Eenheden verschillen tussen recht en databank.** PFOS staat in VLAREM als
  0,00065 µg/L en in de databank als ng/L. Bij grondwater is er juist géén
  omrekening nodig: DOV rapporteert nitraat ook als NO₃, net als de richtlijn.
- **Lood (5) en chroom (25) in drinkwater gelden pas vanaf 12 januari 2036**; tot
  dan 10 respectievelijk 50, en dát past de app toe.
- **Richtlijn (EU) 2024/2881 verstrengt de luchtnormen** maar geldt pas vanaf
  1 januari 2030. We toetsen aan wat vandaag geldt.

## Openstaand

- De **VLAREM-grondwaterkwaliteitsnormen** ontbreken nog; grondwater wordt nu
  alleen aan de drinkwaternormen getoetst.
- PFAS heeft in VLAREM II alleen een norm voor PFOS. DOV rapporteert wel een
  parametergroep `Grondwater_chemisch_PFAS`, nog niet ontsloten.
- Een parameterfilter op de kaart ("toon enkel punten die PFOS meten") vraagt een
  index per meetpunt.
