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
| Grondwater | drinkwaternormen (EU 2020/2184) |

Elke waarde is in de primaire bron opgezocht en met een tweede bron nagerekend.
Dat is geen formaliteit: de eerste ronde bevatte drie drinkwaterwaarden uit een
ingetrokken richtlijn, en IRCELINE's eigen normenpagina geeft koolstofmonoxide
als 10 µg/m³ waar de richtlijn 10 mg/m³ zegt — een factor duizend.

Het verschil tussen de sets is zelf informatie. Meetstation Borgerhout haalde
over het afgelopen jaar 16,4 µg/m³ PM10, 8,61 PM2,5 en 20 NO₂: drie keer conform
tegen de Europese grenswaarden, drie keer een overschrijding tegen die van de
WHO.

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

Deze toepassing is geen officiële website van een van deze instanties.
