# Waterkwaliteit in Vlaanderen

Kaart van de 7.534 meetplaatsen oppervlaktewater. Klik een punt, lees de
analyseresultaten.

De VMM publiceert die resultaten wel, maar verspreid over drie systemen: je
zoekt een meetplaatsnummer op een kaart, vertaalt dat zelf naar de code die het
databankrapport verwacht, en vult daar drie keuzelijsten in. Deze toepassing
doet die vertaalslag voor je en zet de cijfers om in iets leesbaars.

## Aan de slag

```bash
npm install
npm run data:meetplaatsen   # eenmalig: haalt de meetplaatsen op
npm run dev
```

Open http://localhost:5173. Tijdens ontwikkeling neemt een middleware in
`vite.config.ts` de rol van de proxy over, met dezelfde validatie.

## Uitrollen

De app is statisch en draait op GitHub Pages. De analyseresultaten komen van een
Cloudflare Worker, omdat de Cognos-server van de VMM geen CORS-header stuurt en
een browser de resultaten dus niet rechtstreeks mag lezen.

```bash
cd worker
npx wrangler deploy
```

Zet daarna in `worker/wrangler.toml` je Pages-URL bij `TOEGELATEN_ORIGINS`, en
in de repository-instellingen een variabele `VITE_PROXY_URL` met de URL van de
Worker. Zonder die variabele valt de app terug op het dev-pad en werkt ze in
productie niet.

## Wat de app voor je uitzoekt

- **De prefix.** Meetplaats `65000` op de kaart heet `OW65000` in de databank,
  waterbodempunten krijgen `WB`. Dat is de vertaalslag die je anders zelf moet
  maken. Zoeken werkt met of zonder prefix.
- **De gemeente.** De kaartlaag heeft geen gemeenteveld; die bepalen we
  ruimtelijk tegen de gemeentegrenzen.
- **De leesbaarheid.** Een meetpunt levert al snel honderden metingen op. Die
  worden samengevat tot één regel per parameter, gegroepeerd per thema, met de
  overschrijdingen bovenaan.

## Wat de app níét doet

De normtoetsing is **indicatief**. Ze gebruikt de algemene
basiskwaliteitsnormen voor oppervlaktewater; typespecifieke normen per
waterlooptype zijn nog niet verwerkt, en de drempelwaarden in
`src/data/normen.ts` zijn nog niet stuk voor stuk tegen VLAREM II geverifieerd.
Dit is geen officiële beoordeling van de VMM.

Waar toetsen zou misleiden, gebeurt het bewust niet: metalen worden als
totaalgehalte gemeten terwijl de norm op de opgeloste fractie slaat,
waterbodemwaarden staan in mg/kg droge stof, en parameters die nooit boven de
detectielimiet uitkwamen hebben geen bruikbaar gemiddelde. Die krijgen alle drie
"niet toetsbaar" in plaats van een vals vinkje.

## Bronnen

- Meetplaatsen: [WFS Meetplaatsen oppervlaktewaterkwaliteit](https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs), Digitaal Vlaanderen
- Gemeentegrenzen: [VRBG](https://geo.api.vlaanderen.be/VRBG/wfs), Digitaal Vlaanderen
- Analyseresultaten: [Databank waterkwaliteit](https://vmm.vlaanderen.be/feiten-cijfers/water/kwaliteit-waterlopen/databank-waterkwaliteit), Vlaamse Milieumaatschappij
- Kaartachtergrond: OpenStreetMap

Deze toepassing is geen officiële VMM-website.
