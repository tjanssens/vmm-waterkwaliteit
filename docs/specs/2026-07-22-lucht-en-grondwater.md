# Lucht en grondwater op de kaart

Ontwerp, 22 juli 2026.

## Waarom dit een verbouwing is en geen uitbreiding

De app is nu overal impliciet oppervlaktewater. Dat zit niet in één bestand maar
in aannames die overal doorwerken:

- Het punttype heet `Meetplaats` en draagt `matrix` en `meetnetten` — begrippen
  die alleen bij de VMM-waterdatabank bestaan.
- De kop zegt letterlijk "Meetplaats oppervlaktewater".
- De tijdas heet `meetjaar` en komt uit `ParameterJaar.jaar`.
- `Normenset` kent precies twee waarden.
- Er is één puntenbestand, vooraf gebouwd, en één cluster op de kaart.
- De voettekst verwijst hard naar het Cognos-rapport.

Drie lagen naast elkaar betekent dat elk van die zes aannames los moet. Dat is
de kern van het werk; de nieuwe databronnen zelf zijn het makkelijkste deel.

## Uitgangspunten

1. **Dezelfde vormgeving.** Een burger die water heeft leren lezen, moet lucht
   en grondwater zonder uitleg herkennen. Zelfde paneel, zelfde statuslabels,
   zelfde evolutiegrafiek, zelfde afdrukbare rapportweergave.
2. **Lagen zijn zichtbaar verschillend en apart aan/uit te zetten** in de
   linkerkolom.
3. **Elke bronvermelding wijst naar de plek waar de burger het zelf kan
   raadplegen.** Bij voorkeur een webpagina; bestaat die niet, dan de JSON-URL
   die exact deze cijfers teruggeeft. Nooit een verwijzing naar onze eigen proxy.
4. **Liever niets zeggen dan iets fout zeggen.** De bestaande discipline blijft:
   waar een norm niet eerlijk toetsbaar is, luidt het oordeel "niet toetsbaar"
   in plaats van een vals vinkje.

## Architectuur

### De laag-abstractie

Eén gedeeld punttype, met per laag een eigen uitbreiding:

```ts
export type LaagId = "oppervlaktewater" | "lucht" | "grondwater";

export interface Meetpunt {
  laag: LaagId;
  /** Uniek binnen de laag. */
  id: string;
  /** Wat als titel getoond wordt, bv. "OW65000", "42R801", "200/32/10-1". */
  code: string;
  omschrijving: string;
  gemeente: string | null;
  lat: number;
  lon: number;
  /** Alles doorzoekbaar, kleine letters. */
  zoeksleutel: string;
}
```

En één strategie-object per laag, waar `Kaart` en `Paneel` tegenaan praten in
plaats van tegen concrete bronnen:

```ts
export interface Laagprofiel<P extends Meetpunt = Meetpunt> {
  id: LaagId;
  naam: string;          // "Grondwater"
  eyebrow: string;       // "Grondwatermeetpunt (DOV)"
  merk: Merk;            // vorm + kleur, zie Kaart

  /** Punten laden. Vooraf uit JSON, of per kaartvenster. */
  laden: "vooraf" | "per-venster";
  laad(venster: Vak | null, signaal?: AbortSignal): Promise<P[]>;

  /** Keuzes langs de tijdas: meetjaren bij water, vensters bij lucht. */
  periodes(punt: P, metingen: Meting[]): Periode[];
  haal(punt: P, periode: Periode, signaal?: AbortSignal): Promise<Meting[]>;

  normensetten: Normenset[];
  /** Regels voor de <dl> in de paneelkop. */
  feiten(punt: P): Array<[string, string]>;
  /** Bronvermelding: waar de burger deze cijfers zelf terugvindt. */
  bron(punt: P, periode: Periode): Bronverwijzing;
}
```

Dit is bewust een interface en geen `if (laag === …)` verspreid over het paneel.
Een vierde laag toevoegen mag daarna één bestand kosten, niet zeven.

### De tijdas losmaken

`vatSamen(metingen)` groepeert nu hard op `symbool + jaar`. Dat wordt:

```ts
vatSamen(metingen, bucket: (m: Meting) => string): ParameterSamenvatting[]
```

- Oppervlaktewater en grondwater bucketen op jaartal — daar is het meetjaar de
  juiste eenheid, want er wordt enkele keren per jaar bemonsterd.
- Lucht bucketet alles in één emmer. Bij lucht kiest de gebruiker niet *welk*
  jaar getoond wordt maar *welk venster opgehaald* wordt; het bucketen is dan
  niets meer dan "alles in de selectie".

`ParameterJaar` wordt `ParameterSamenvatting` met `bucket: string` in plaats van
`jaar: number`. De trendpijl ("▲ 12% t.o.v. 2023") wordt generiek: vergelijk met
de eerstvolgende bucket in de lijst. Bij lucht is er geen tweede bucket, dus
verdwijnt de pijl daar vanzelf — de evolutiegrafiek dekt trend daar veel beter.

### Wat níét verandert

`beoordeel()`, `Oordeel`, de statuschips, de filters, `evolutie.ts`, `grafiek.ts`
en `format.ts` blijven zoals ze zijn. Dat is precies de winst van de bestaande
opdeling: die werken al op `(waarde, eenheid, norm)` en weten niet waar het
water vandaan komt.

## De drie lagen

### 1. Oppervlaktewater — ongewijzigd van bron

Blijft `meetplaatsen.json` (7.534 punten, vooraf gebouwd) plus Cognos via de
Worker. Alleen het punttype en de tijdas schuiven mee in de nieuwe vorm.

### 2. Lucht — IRCELINE

| | |
|---|---|
| Punten | `https://geo.irceline.be/sos/api/v1/stations?format=json` — **137**, GeoJSON |
| Metingen | `POST /sos/api/v1/timeseries/getData`, alle reeksen van het station in één aanroep |
| Periode | ISO-interval, bv. `2025-07-22T00:00:00Z/2026-07-22T00:00:00Z` |
| CORS | geverifieerd: echoot onze eigen origin terug |
| Laden | vooraf; 137 punten is niets |

Geverifieerd tijdens het onderzoek: een jaar uurdata is 5.640 punten / 230 kB in
1,4 s. Een venster van 7 dagen is 6,9 kB. Beide zijn ruim werkbaar.

**Tijdas:** vier vensters — 48 uur, 7 dagen, 30 dagen, 1 jaar. Standaard 7 dagen.
Dit vervangt de jaarknoppen.

Let op de omgekeerde volgorde ten opzichte van water: bij water bepaalt het
gekozen jaar wat je *ziet* uit reeds opgehaalde data; bij lucht bepaalt het
venster wat er *opgehaald* wordt. Een vensterwissel is dus een nieuwe aanroep,
met laadtoestand.

**Bronvermelding:** de `getData`-URL van dit station voor exact dit venster.
Geen webpagina — IRCELINE's viewer is een JS-app zonder leesbaar deep-linkpatroon.
De JSON-URL is voor narekenen zelfs directer. Daarnaast een gewone link naar
irceline.be als context.

### 3. Grondwater — DOV

| | |
|---|---|
| Punten | `gw_meetnetten:grondwaterlocaties_met_metingen` — **19.024** |
| Monsters | `gw_meetnetten:grondwatermonsters`, CQL op `gekoppeld_aan_link` |
| Metingen | `gw_meetnetten:grondwaterobservaties`, CQL op de monster-links |
| CORS | `*` |
| Laden | **per kaartvenster** (`BBOX`), niet vooraf |

19.024 punten vooraf inbakken zou het puntenbestand ruim verdubbelen. Omdat DOV
CORS openzet én `BBOX` server-side ondersteunt, halen we ze per kaartvenster op.
Dat scheelt de bezoeker een download van megabytes en is altijd actueel.
Gevolg: grondwaterpunten verschijnen pas vanaf een zoomniveau waarop het venster
klein genoeg is (voorstel: zoom ≥ 11), met een duidelijke melding daarboven.

De observaties mappen bijna één-op-één op ons bestaande `Meting`-type:

| DOV | ons veld |
|---|---|
| `parameter` ("Arseen (As)") | `omschrijving` én `symbool` |
| `parametergroep` ("Zware metalen") | categorie |
| `resultaat` | `waarde` |
| `eenheid` ("µg/l") | `eenheid` |
| `fenomeentijd` | `datum` |
| `detectieconditie` = `"<"` | `onderDetectielimiet` |

**Ophalen kost twee stappen** (filter → monsters → observaties), want observaties
hangen aan een monster, niet aan een meetpunt. Gemeten op een echt punt:
25 monsters, 53 observaties per monster.

**Bronvermelding:** DOV levert die zelf mee in de puntdata — `putfiche`,
`filterfiche` en `filtergrafiek` zijn echte webpagina's per meetpunt. Dit is de
sterkste bronvermelding van de drie.

## Normen

Drie nieuwe sets bovenop de twee bestaande. Elke waarde wordt opgezocht in de
primaire bron en met dubbele bron gestaafd, zoals bij de drinkwaterset — dit is
het onderdeel waar eerder gokwaarden fout bleken.

| Set | Bron | Toepassing |
|---|---|---|
| `lucht-eu` | Richtlijn 2008/50/EG, bijlage XI (nu geldend) | grenswaarden |
| `lucht-who` | WHO global air quality guidelines 2021 | advieswaarden, strenger |
| `grondwater` | VLAREM II, grondwaterkwaliteitsnormen | milieukwaliteit |

Richtlijn (EU) 2024/2881 verstrengt de EU-waarden maar geldt pas vanaf
1 januari 2030. We toetsen aan wat nu geldt en vermelden de komende waarde in de
toelichting; we passen ze niet toe.

Bij grondwater blijft de bestaande drinkwaterset beschikbaar als vergelijking —
daar is die zelfs relevanter dan bij oppervlaktewater, want veel mensen pompen
grondwater op.

## Kaart en linkerkolom

### Punten onderscheiden

Kleur alleen volstaat niet — dat is onleesbaar voor kleurenblinde gebruikers en
op een afdruk. Vorm draagt het onderscheid, kleur versterkt het:

| Laag | Vorm | Kleur |
|---|---|---|
| Oppervlaktewater | cirkel | teal (bestaand `#0b5f63`) |
| Grondwater | vierkant | nader te bepalen, gevalideerd |
| Lucht | driehoek | nader te bepalen, gevalideerd |

De kleuren gaan door de palletvalidator voor onderling contrast, ook bij
kleurenblindheid.

Technisch: oppervlaktewater blijft `L.circleMarker` op canvas — dat is wat 7.534
punten vloeiend houdt. Lucht (137) en grondwater (per venster begrensd) krijgen
een `L.divIcon` met inline SVG. Verschillende techniek, bewust dezelfde
visuele taal.

Er komt een legenda op de kaart.

### Linkerkolom

Boven de bestaande meetnetfilters een groep **Lagen** met drie schakelaars, elk
met het vormsymbool en een telling. De bestaande meetnetfilters
(fysisch-chemisch, bacteriologisch, …) horen alleen bij oppervlaktewater en
verschijnen alleen wanneer die laag aanstaat.

De resultatenlijst voegt punten uit alle actieve lagen samen, met een
laagaanduiding per rij. Zoeken en "dichtstbijzijnde eerst" werken over de lagen
heen.

## Wat stil fout kan gaan

Dit zijn de plekken waar een verkeerd getal er juist uitziet. Elk krijgt een
test.

**Lucht**

- **Normen slaan op verschillende statistieken.** NO₂ heeft een jaargrenswaarde
  én een uurgrenswaarde; PM10 een daggrenswaarde met een toegestaan aantal
  overschrijdingen per jaar. Een gemiddelde over 7 dagen toetsen aan een
  *jaar*grenswaarde is fout. Regel: een norm draagt de periode waarop ze slaat,
  en wordt alleen toegepast als het gekozen venster daarbij past. Anders "niet
  toetsbaar op dit venster".
- **Toegestane overschrijdingen.** "50 µg/m³, maximaal 35 dagen per jaar" is geen
  simpele drempel. Op een kort venster kunnen we dat niet beoordelen.
- **Eenheden.** Meestal µg/m³, maar CO in mg/m³. Bestaande eenheidscontrole
  dekt dit al, mits elke norm haar eenheid draagt.
- **Niet elk station meet alles.** Station 1030 had er maar twee. Geen enkele
  parameter is geen fout.

**Grondwater**

- **`µg/l` versus `µg/L`.** DOV schrijft kleine l, onze normen hoofdletter.
  Normaliseren, anders faalt elke eenheidsvergelijking stil en krijgt alles
  "niet toetsbaar".
- **Parameternamen in plaats van symbolen.** "Arseen (As)" is geen `As`. De
  grondwaternormen worden op de DOV-schrijfwijze gesleuteld, niet op de
  VMM-symbolen.
- **Diepte doet ertoe.** Een freatische filter op 2,5 m en een diepe filter in een
  afgesloten aquifer zijn niet vergelijkbaar. Filterdiepte en aquifer horen bij
  de feiten in de kop.
- **Meerdere filters per put.** Eén put kan meerdere filters op verschillende
  dieptes hebben, elk met eigen metingen. Het meetpunt is de *filter*, niet de put.

## Testplan

Nieuwe tests, in de stijl van de bestaande:

- `lucht/client`: parsen van `getData`, meerdere reeksen, lege reeks, tijdstempel
  naar ISO-datum.
- `lucht/normen`: een jaargemiddelde-norm wordt *niet* toegepast op een venster
  van 7 dagen.
- `grondwater/client`: CQL-opbouw ontsnapt de invoer; `detectieconditie` "<"
  wordt `onderDetectielimiet`; `µg/l` normaliseert naar `µg/L`.
- `aggregate`: `vatSamen` met een eigen bucketfunctie; de bestaande jaartests
  blijven, met de jaarbucket als functie doorgegeven.
- `lagen`: elk profiel levert een bronverwijzing met een niet-lege URL die niet
  naar onze eigen proxy wijst — de bestaande regel, nu voor drie lagen.

De 175 bestaande tests moeten groen blijven. Waar ze op `jaar` leunen, verschuiven
ze naar `bucket`; dat is een hernoeming, geen gedragswijziging.

## Fasering

Vier stappen, elk apart bruikbaar en apart te publiceren.

1. **Verbouwing zonder nieuwe laag.** `Meetpunt`, `Laagprofiel`, `vatSamen` met
   bucketfunctie, oppervlaktewater omgezet naar een profiel. De app doet daarna
   precies wat ze nu doet — dat is het bewijs dat de verbouwing klopt.
2. **Lucht.** Bron, normen (opgezocht en geverifieerd), profiel, kaartlaag,
   schakelaar, legenda.
3. **Grondwater.** Bron met laden per venster, normen, profiel, kaartlaag.
4. **Afwerken.** Legenda, README en CLAUDE.md bij, browsercontrole, uitrollen.

Stap 1 is de risicovolle: die raakt bestaande, werkende code. Vandaar dat er geen
nieuwe functionaliteit in zit — zo is elke afwijking een fout en niet een feature.

## Open punten

- De exacte normwaarden voor lucht en grondwater zijn nog niet opgezocht. Dat
  gebeurt in stap 2 en 3, met dezelfde dubbele bronverificatie als bij drinkwater.
- Kleuren voor grondwater en lucht moeten nog door de palletvalidator.
- Bij lucht is het de vraag of "48 uur" en "1 jaar" allebei nodig zijn. Te
  beslissen als het werkt en er iets te zien valt.
