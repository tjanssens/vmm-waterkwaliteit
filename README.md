# Milieumetingen in je buurt

Kaart met meetpunten voor **oppervlaktewater**, **luchtkwaliteit** en
**grondwater**. Klik een punt, lees de resultaten.

Die metingen worden allemaal gepubliceerd, maar elk door een andere instantie,
in een eigen systeem, met een eigen zoekmethode. Bij de VMM-waterdatabank zoek
je een meetplaatsnummer op een kaart, vertaal je dat zelf naar de code die het
rapport verwacht, en vul je daar drie keuzelijsten in. Deze toepassing doet die
vertaalslag, zet de cijfers om in iets leesbaars, en brengt de drie bronnen
onder één kaart.

## Aan de slag

```bash
npm install
npm run data:meetplaatsen   # eenmalig: haalt de meetplaatsen oppervlaktewater op
npm run dev
```

Open http://localhost:5173. Tijdens ontwikkeling neemt een middleware in
`vite.config.ts` de rol van de proxy over, met dezelfde validatie.

## De drie lagen

Vorm draagt het onderscheid op de kaart, kleur versterkt het — kleur alleen zou
onleesbaar zijn voor kleurenblinde gebruikers en op een afdruk. De kleuren zijn
samen door een palletvalidator gehaald op lichtheid, chroma, onderling contrast
en kleurenblindheid.

| Laag | Vorm | Bron | Punten |
|---|---|---|---|
| Oppervlaktewater | cirkel | VMM-databank waterkwaliteit | 7.534 |
| Lucht | driehoek | IRCELINE | 137 |
| Grondwater | vierkant | Databank Ondergrond Vlaanderen | 14.303 |

**Oppervlaktewater** en **lucht** staan meteen op de kaart. **Grondwater** laadt
per kaartvenster: 19.024 filters vooraf inbakken zou de app ruim verdubbelen in
gewicht, en DOV kan server-side op een venster filteren. Die punten verschijnen
daarom pas vanaf zoomniveau 11.

Alleen grondwaterfilters die daadwerkelijk chemie meten komen op de kaart; van
de 19.024 houden er 4.721 enkel het waterpeil bij.

Oppervlaktewater heeft naast de meetnetten een knop **Meet PFAS**: 279 van de
7.534 punten. Die lijst komt uit de PFAS-laag van DOV, want de
resultatendatabank kan die vraag niet beantwoorden zonder elk punt apart te
bevragen.

Grondwater kun je filteren op **filterdiepte**: tot 10 m, 10–50 m, dieper dan
50 m, of diepte onbekend. Dat is geen cosmetische indeling. Een ondiepe filter
meet water dat kort geleden is ingesijpeld en volgt wat er vandaag op het
maaiveld gebeurt; op vijftig meter kan het water tientallen jaren oud zijn.
Nitraat en pesticiden van dezelfde akker duiken daar pas veel later op, dus wie
beide door elkaar bekijkt vergelijkt twee verschillende tijdvakken.

## De tijdas werkt niet overal hetzelfde

Bij water kiest het meetjaar wat je *ziet* uit wat al opgehaald is. Bij lucht
bepaalt het venster wat er *opgehaald wordt* — een jaar uurmetingen halen we
niet binnen om er twee dagen van te tonen. Vier vensters: 48 uur, 7 dagen,
30 dagen en 1 jaar.

Je keuzes blijven staan als je naar een ander punt gaat: periode en normenset
per laag, en welke categorieën je open- of dichtklapte.

## Normen

Per laag kun je toetsen aan verschillende sets:

| Laag | Sets |
|---|---|
| Oppervlaktewater | [VLAREM II bijlage 2.3.1](https://navigator.emis.vito.be/detail?woId=10071) · [drinkwater (EU 2020/2184)](https://eur-lex.europa.eu/eli/dir/2020/2184/oj) |
| Lucht | [EU-grenswaarden (2008/50/EG)](https://eur-lex.europa.eu/legal-content/NL/TXT/HTML/?uri=CELEX:32008L0050) · [WHO-advieswaarden 2021](https://www.who.int/publications/i/item/9789240034228) |
| Grondwater | [VLAREM II bijlage 2.4.1](https://navigator.emis.vito.be/mijn-navigator?woId=10076) · drinkwater (EU 2020/2184) |

Elke waarde is in de primaire bron opgezocht en met een tweede bron nagerekend.
Dat is geen formaliteit: de eerste ronde bevatte drie drinkwaterwaarden uit een
ingetrokken richtlijn, en IRCELINE's eigen normenpagina geeft koolstofmonoxide
als 10 µg/m³ waar de richtlijn 10 mg/m³ zegt — een factor duizend.

Het verschil tussen de sets is zelf informatie. Meetstation Borgerhout haalde
over het afgelopen jaar 16,4 µg/m³ PM10, 8,61 PM2,5 en 20 NO₂: drie keer conform
tegen de Europese grenswaarden, drie keer een overschrijding tegen die van de
WHO. Bij grondwater doet hetzelfde zich voor: mangaan op 0,325 mg/L blijft onder
de VLAREM-norm van 1 mg/L, maar gaat ruim over de drinkwaternorm van 0,05.

Honderden pesticiden delen één norm van 0,1 µg/L per stof. Die hangt aan de
parametergroep die DOV zelf meegeeft, niet aan een lijst stofnamen die wij
bijhouden — anders zou elke nieuwe stof stilzwijgend ongetoetst blijven.

## Wat betekent deze stof?

Klik een parameter aan en onder de grafiek staat wat het is, waar het vandaan
komt en waarom het uitmaakt — ook als er niets overschreden is. Wie een vinkje
ziet, mag evengoed weten wat er dan binnen de norm blijft.

Bij een overschrijding staat één zin meteen in de tabel: niet wat de stof is,
maar wat er misgaat.

> **Atrazine (Atraz)** — boven norm · norm ≤ 0,1 µg/L
> Verstoort de hormoonhuishouding van waterdieren, en duikt twintig jaar na het
> Europese verbod nog op.

PFAS krijgen tekst per stof en niet per familie, want hun herkomst verschilt:
PFOS komt uit blusschuim, PFBS is de vervanger die daarvoor in de plaats kwam,
fluortelomeerfosfaten uit vetwerende voedselverpakking, en TFA regent uit de
lucht. Een knop **Enkel aangetoond** laat de stoffen weg die nooit boven de
detectielimiet uitkwamen — aan een PFAS-meetpunt scheelt dat al snel 50 regels
tegenover 8.

Bij pesticiden speelt nog iets mee: sommige middelen zijn al twintig jaar
verboden en andere mogen vandaag nog gebruikt worden. Atrazine is een erfenis
die traag door de bodem zakt; terbutylazine verving het en is nog toegelaten, en
daar gaat een vondst dus over vandaag. Dat onderscheid staat er telkens bij.

Elke gezondheidsuitspraak draagt de bron waarin ze staat, en de zwaarste twee.
Kennen we een stof niet, dan verschijnt er niets: een tekst die op elke stof zou
passen wekt de indruk van uitleg zonder er een te geven.

## Elke parameter blijft zichtbaar

Geen enkele bron wordt gefilterd tegen een lijst die wij bijhouden. Wat de bron
meet komt op het scherm, en wat we niet kennen valt terug op "Overige
parameters" in plaats van te verdwijnen. Nagemeten: 108 van 108 bij een
grondwaterfilter, 46 van 46 bij een oppervlaktewaterpunt, en de 23 stoffen die
IRCELINE publiceert zijn alle 23 gedekt.

## Wat de app níét doet

De toetsing is **indicatief** en geen officiële beoordeling.

Waar toetsen zou misleiden, gebeurt het bewust niet:

- **Oppervlaktewater** meet metalen als totaalgehalte terwijl de norm op de
  opgeloste fractie slaat; waterbodemwaarden staan in mg/kg droge stof; en
  parameters die nooit boven de detectielimiet uitkwamen hebben geen bruikbaar
  gemiddelde.
- **Lucht**: een jaargrenswaarde wordt niet op een week metingen losgelaten, en
  normen met een toegestaan aantal overschrijdingen per jaar (ozon, SO₂) zijn een
  telling en geen drempel op een gemiddelde.
- **Grondwater**: metalen worden ter plaatse over 0,45 µm gefiltreerd
  ([WAC/I/A/005 §5.4.4.1](https://reflabos.vito.be/2020/WAC_I_A_005.pdf)), dus je
  ziet de opgeloste fractie. Een overschrijding telt daarom zeker; een vinkje
  zegt niets over wat eruit gefilterd is.

Elk meetpunt draagt onderaan een link naar de pagina waar de bron deze cijfers
zelf publiceert, zodat je elk getal kunt narekenen.

## Uitrollen

De app staat op **https://tjanssens.github.io/vmm-waterkwaliteit/** en rolt
zichzelf uit bij elke push naar `main`.

Alleen de VMM-waterdatabank heeft een proxy nodig: die server stuurt geen
CORS-header, dus een browser mag de resultaten niet rechtstreeks lezen. IRCELINE
en DOV staan CORS wel toe en worden rechtstreeks bevraagd.

```bash
# 1. Worker uitrollen (vraagt eenmalig om aan te melden bij Cloudflare)
cd worker
npx wrangler deploy
```

```bash
# 2. De URL die stap 1 teruggeeft als repository-variabele zetten
gh variable set VITE_PROXY_URL --body "https://vmm-waterkwaliteit-proxy.<subdomein>.workers.dev"
gh workflow run "Uitrollen naar GitHub Pages"
```

Zonder die Worker werken de kaart, het zoeken, de filters, lucht en grondwater
gewoon; alleen oppervlaktewater levert dan een melding op dat de
resultatenservice ontbreekt.

`TOEGELATEN_ORIGINS` in `worker/wrangler.toml` staat al op de Pages-URL; vul aan
bij een eigen domein.

## Bronnen

- Meetplaatsen oppervlaktewater: [WFS Meetplaatsen oppervlaktewaterkwaliteit](https://geo.api.vlaanderen.be/MeetplOppervlwaterkwal/wfs), Digitaal Vlaanderen
- Analyseresultaten oppervlaktewater: [Databank waterkwaliteit](https://vmm.vlaanderen.be/feiten-cijfers/water/kwaliteit-waterlopen/databank-waterkwaliteit), Vlaamse Milieumaatschappij
- Luchtkwaliteit: [IRCELINE](https://www.irceline.be/nl), Belgische Intergewestelijke Cel voor het Leefmilieu
- Grondwater: [Databank Ondergrond Vlaanderen](https://www.dov.vlaanderen.be/)
- Gemeentegrenzen: [VRBG](https://geo.api.vlaanderen.be/VRBG/wfs), Digitaal Vlaanderen
- Kaartachtergrond: OpenStreetMap

Voor de duiding bij de stoffen:

- [WHO, Guidelines for drinking-water quality](https://www.who.int/publications/i/item/9789240045064) (vierde editie, 2022)
- [WHO global air quality guidelines](https://www.who.int/publications/i/item/9789240034228) (2021), en de factsheets over [lood](https://www.who.int/news-room/fact-sheets/detail/lead-poisoning-and-health) en [arseen](https://www.who.int/news-room/fact-sheets/detail/arsenic)
- [EFSA over PFAS in voeding](https://www.efsa.europa.eu/en/efsajournal/pub/6223) (2020)
- [IARC Monographs](https://monographs.iarc.who.int/list-of-classifications), voor de indeling van kankerverwekkende stoffen

Deze toepassing is geen officiële website van een van deze instanties.
