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
- **"Meet PFAS" is een ingebakken index, geen meetnet.** De resultatendatabank
  kan die vraag niet beantwoorden zonder alle 7.534 punten te bevragen; DOV
  publiceert het antwoord als aparte laag (`pfas:pfas_oppwater`, veld
  `meetplaats` — dezelfde nummers als de onze). Het bouwscript zet er een vlag
  bij: 279 punten. **GeoServer kapt stilzwijgend op 10.000 rijen af**, dus dat
  ophalen pagineert; zonder paginering lijken het er 26 en klopt niets. Een
  test bewaakt het aantal.
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
- **Filteren op diepte gebeurt client-side**, op de punten die het venster al
  geladen heeft. De grenzen (10 m, 50 m) komen uit de verdeling over de 14.303
  filters met chemie, niet uit een ronde gok. Filters zonder ingevulde diepte —
  1.683 stuks — krijgen een eigen knop in plaats van weg te vallen. De klassen
  sluiten aan zonder overlap: de bovengrens hoort erbij, de ondergrens niet,
  anders telt de kaart een punt dubbel zodra twee klassen aanstaan.
- **Het meetpunt is de filter, niet de put.** Eén put kan meerdere filters op
  verschillende dieptes hebben, elk met eigen metingen.
- **Observaties hangen aan een monster, niet aan een filter.** Ophalen kost twee
  stappen, en DOV doet ongeveer drie seconden per monster; vandaar dat alleen de
  recentste staalnames opgehaald worden, parallel.

## Normen

Zes sets in `src/data/normen.ts`, elk met bron per norm. Elke waarde is in de
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

## Duiding bij de stoffen

`src/data/stoffen.ts` beantwoordt drie vragen per stof: wat is het, waar komt
het vandaan, waarom maakt het uit. Het verschijnt in het grafiekvenster, ook
wanneer er niets overschreden wordt — wie een vinkje ziet, mag evengoed weten
wat er dan binnen de norm blijft.

Bij een overschrijding staat de "wat het is"-zin ook in de tabelrij zelf, want
de lezer die nooit doorklikt is juist degene die ze nodig heeft. Alleen bij
"buiten norm": overal zou ze behang worden en de overschrijding verbergen.

Bewust los van `normen.ts`: een norm zegt óf een waarde te hoog is, deze teksten
waaróm dat uitmaakt.

- **Elke uitspraak draagt haar bron**, en de zwaarste twee: lood, arseen, fijn
  stof en PFAS zijn in twee bronnen nagegaan. Een test bewaakt dat.
- **Kennen we de stof niet, dan staat er niets.** Een tekst die op elke stof zou
  passen wekt de indruk van uitleg zonder er een te geven, en bij
  gezondheidsinformatie is dat erger dan zwijgen.
- **Dezelfde stof heet per bron anders**, dus de tekst hangt aan een eigen naam
  en `SLEUTELS` wijst er vanuit elke bronspelling heen. Nitraat is "NO3-" bij de
  VMM en "Nitraat (NO3)" bij DOV.
- **`T` betekent per laag iets anders**: luchttemperatuur bij IRCELINE,
  watertemperatuur bij de VMM. Vandaar `PER_LAAG`, en `stofprofiel` neemt de
  laag mee. Beide teksten gaan over temperatuur, dus een verwisseling zou
  niemand opvallen.
- **De fractie doet er voor de duiding niet toe.** "As t" en "As o" zijn allebei
  arseen; het achtervoegsel gaat eraf vóór het opzoeken.
- Honderden pesticiden en duizenden PFAS krijgen duiding **via hun groep**,
  net zoals de normen dat doen.

### PFAS krijgen tekst per stof, niet per familie

`stoffen.ts` beschrijft de PFAS afzonderlijk waar hun verhaal verschilt: PFOS
komt uit blusschuim, PFBS is de vervanger die daarvoor in de plaats kwam, diPAP
uit voedselverpakking, TFA regent uit de lucht. Homologe reeksen (korte en
lange perfluorcarbonzuren, de sulfonzuren) delen wél één tekst — daar is de
ketenlengte juist het verhaal.

- **Dezelfde stof komt in vier gedaanten binnen**: "PFOS totaal", "PFOS
  vertakt", "PFOStotal", "PFOSbranched". `pfasStam()` haalt die aanduiding
  eraf. Zonder dat krijgt alleen de kale vorm zijn eigen tekst.
- **DOV's namen zijn niet altijd netjes.** "…(DONA)) (DONA)" heeft een haakje
  te veel en "(EtPFOSAbranchedl)" een letter; dan blijft het symbool de hele
  naam. Vandaar de laatste terugval op de code tussen de haakjes achteraan.
- **De twee bronnen lopen niet gelijk.** DOV's PFAS-laag kent 48 namen, de
  VMM-databank rapporteert daarnaast PFPeDA en de som PFAS-43. Dat kwam boven
  door de tabel van OW834900 na te lopen, niet door de lijsten te vergelijken.
- Een test loopt alle 111 namen van beide bronnen af en faalt zodra er één op
  de familietekst terugvalt.

### Pesticiden: per stof waar het uitmaakt, per familie waar niet

Hetzelfde als bij PFAS, met één onderscheid dat zwaarder weegt: **sommige
middelen zijn al twintig jaar verboden en andere mogen vandaag nog**. Atrazine
is een erfenis, terbutylazine verving het en is nog toegelaten — een vondst
betekent dus iets heel anders. Eén gedeelde tekst wist dat verschil uit.

- **Namen zijn niet op te sommen.** DOV verzint per metaboliet een schrijfwijze
  ("Metazachloor ESA (479M08)", "metolachlor-OA", "S-Metolachlor"). Vandaar
  `PESTICIDE_PATRONEN`: regexen op de stofnaam, gecontroleerd vóór de
  groepsterugval. Het patroon is stabiel, de spelling niet.
- **De volle databank is niet opgehaald.** 448.000 metingen binnenhalen om een
  namenlijst te krijgen staat niet in verhouding; een steekproef van 30.000
  levert 84 namen, en die dekken het beeld. De familie- en groepsteksten vangen
  de rest — dat is geen tekortkoming maar het ontwerp.
- **"Niet-relevante metabolieten" hebben een eigen tekst**, want dat label
  bepaalt of de norm van 0,1 µg/L geldt.
- Twee tests: één op de dekking, één die faalt zodra een tekst geen gevolg voor
  mens of milieu meer noemt.

### Metalen: het gevolg, met de instantie die het uitsprak

Metalen hadden al tekst per element; wat ontbrak was het gevolg en een
verwijzing die de zwaarste uitspraken draagt.

- **Kankerverwekkend is de zwaarste uitspraak die deze app doet.** Arseen,
  cadmium, chroom(VI), nikkelverbindingen en beryllium staan in IARC-groep 1;
  dat staat er nu bij mét de kankersoort en met een verwijzing naar de
  IARC-lijst zelf. Een test faalt als zo'n uitspraak zonder die bron staat.
- **Kwik heeft een eigen verdrag** — Minamata — en dat wordt genoemd waar het
  ertoe doet. Kwik in lucht en kwik in water houden aparte teksten: het eerste
  gaat over neerslag en verspreiding, het tweede over methylkwik in vis.
- **Geen effect is ook een gevolg.** Bij ijzer staat expliciet dat een
  overschrijding geen gezondheidsvraag oproept maar leidingen doet dichtslibben.
  Dat is informatie, geen leegte.
- De fractie (" t" totaal, " o" opgelost) zegt iets over de meetwijze en niet
  over de stof; beide komen op dezelfde tekst uit.

### De indeling volgt de duiding

`categorieVan` leest `categorie` van het stofprofiel wanneer symbool en
parametergroep niets opleveren. Zo staat er maar op één plek wat een stof is.

Dat was nodig omdat het al misging: op meetplaats OW72000 stonden 75 van de
155 parameters in "Overige parameters" — geneesmiddelen, organofosfaat-
insecticiden en ultrakorte PFAS, onder afkortingen die de VMM zelf verzint.
"AzinfosEy" is azinfos-ethyl en "Carbamaze" is carbamazepine; daar past geen
patroon op, die moeten met de hand. Nu is die categorie er leeg.

## Elke parameter blijft zichtbaar

Geen enkele bron wordt gefilterd op een lijst die wij bijhouden — wat de bron
meet, komt op het scherm. `categorieVan` valt terug op "Overige parameters" en
`deelIn` verliest niets; dat is met tellingen per bron nagegaan (108 = 108 bij
grondwater, 46 = 46 bij oppervlaktewater). Bij lucht dekken de 23 stoffen in
`STOFFEN` exact de 23 fenomenen van IRCELINE, en wat er niet in staat komt onder
zijn eigen Engelse label door in plaats van te verdwijnen.

De stille fout hier is niet verlies maar verbanning: een nieuwe stof die geen
categorie krijgt, zakt naar "Overige" waar niemand naar ozon of kwik zoekt. Een
test bewaakt dat voor de luchtstoffen.

## Openstaand

- Hetzelfde filter voor **grondwater** kan nog niet eerlijk. DOV's `pfas:pfas_gw`
  telt 484 filters, maar dat is een campagne en geen index: filter 2003-005059
  in Landen rapporteert PFAS (TFA) en zit er niet in. Een volledige lijst zou
  betekenen dat je de observaties op parametergroep filtert en die via de
  monsters naar filters terugrekent — twee grote gepagineerde bevragingen.
- Bijlage 2.4.1 noemt normen voor barium, antimoon, seleen, cyanide, minerale
  oliën, fenolen, PAK's en gechloreerde ethenen. DOV's parameternaam daarvoor is
  niet vastgesteld, en een norm op een gegokte sleutel toetst stilzwijgend niets.
- De **drempelwaarden per grondwaterlichaam** uit de Kaderrichtlijn Water
  verschillen per waterlichaam; DOV laat dat veld vaak leeg.
