# MAP DESIGN RULES
### For 3D VTT med Kenney Assets — Claude Code Reference

Les denne filen i sin helhet før du genererer eller modifiserer et map.
Disse reglene overstyrer din egen intuisjon om asset-plassering.

---

## UNIVERSELLE REGLER (gjelder alle map-typer)

### Focal Point — alltid først
Hvert map MÅ ha ett primært focal point som bestemmes FØR noe annet plasseres.
Dette er punktet spillernes øyne trekkes mot når de entrer scenen.
Eksempler: en brennende bål, et alter, et stort tre, en fontene, en trone.
Plasser focal point alltid litt off-center (ikke midt på kartet).

### Layering — tre dybdenivåer
Hvert map skal ha assets i tre lag:
- **Bakgrunn**: store strukturer, terreng, vegger — setter rammen
- **Midtgrunn**: møbler, trær, boder, statuer — fyller rommet
- **Forgrunn/detaljer**: småting nær spillerne — kanner, bøker, rester av mat, spor

Uten alle tre lagene virker kartet tomt selv om det har mange assets.

### Asymmetri er realistisk
Ekte steder er aldri symmetriske. Regler:
- Roter hus i intervaller på 0°, 45°, 90°, 135° — aldri random float
- Forskyvv klynger av samme asset-type: to trær tett, ett tre 4 units unna
- Dører og vinduer trenger ikke matche mellom bygninger

### Fortell en historie med props
Hvert map skal ha minst 3 "story props" — detaljer som antyder hva som har skjedd her:
- Veltet krus på et bord
- Spor i snøen/sanden som leder mot noe
- Et bål som er halvt slukket
- En glemt kappe hengt over en stol
- Blodflekker, sprekker i veggen, en ødelagt dør

### Spacing-regler
- Hus til hus (vegg til vegg): minimum 5 units
- Tre til tre (stamme til stamme): minimum 2 units, maks 6 units i klynger
- Props rundt focal point: tett (0.5–2 units) for å skape fokus
- Åpne areas mellom klynger: minst én stor åpning (8+ units) per map

---

## LANDSBY / UTENDØRS

### Struktur
```
Sentrum (torg/brønn/statue) — alltid off-center, aldri midt på
    ↓
Primærstier stråler ut fra sentrum (2-4 stier)
    ↓
Hus klynges langs stiene, IKKE i grid
    ↓
Sekundærstrukturer (låve, smed, marked) ved kanter
    ↓
Overgang til natur (busker, trær) langs yttergrensen
```

### Detaljer som løfter atmosfæren
- Markedsboder med varierende varer (tøy, mat, verktøy)
- Hønsegård eller grisesti bak minst ett hus
- Søppel/høystakk ved låven
- Blomsterpotter ved minst to husinnganger
- Et hus som ser forfallent ut (skiller seg fra de andre)
- Barn-props eller lekegjenstander i ett hjørne
- Vannpytt eller gjørmepatch langs stien

### Stier
- Stier er aldri perfekt rette — legg inn ett eller to knekkpunkter
- Der to stier møtes: plasser alltid noe (brønn, tre, benk, bål)
- Stikanter har gressbusker eller småstein

---

## SKOG / NATUR

### Struktur
Trær plantes ALDRI jevnt spredt. Bruk denne formelen:
```
Klynge A: 5-8 trær tett (1.5–3 units mellom stammene)
Åpning: 6-12 units uten trær
Klynge B: 3-5 trær tett
Lysning: stor åpning (10-20 units) — her skjer action
Klynge C: spredte enkelttrær som "lekker" inn i lysningen
```

### Variasjon
- Bland minst 3 ulike tre-assets per map
- Variger høyde (scale 0.8–1.3) på samme asset-type
- Legg døde trær eller fallne stammer inn i klyngene (1-2 per map)

### Bakkedetaljer (kritisk for atmosfære)
- Sopp-klynger ved røttene til store trær
- Steiner i grupper på 2-4, aldri enkeltvis
- Bekk eller liten dam — gir naturlig navigasjonspunkt
- Spor (dyre- eller menneskespor) som leder mot noe
- Tåkeeffekt ved kanter hvis mulig

---

## DUNGEON / UNDERJORDISK

### Struktur
```
Inngang — alltid dramatisk (stor dør, kollaps, bratt trapp)
    ↓
Korridor — aldri rett, alltid minst ett hjørne
    ↓
Forrom — lite rom før hovedrommet (gir spenningsoppbygging)
    ↓
Hovedrom — størst rom, her er focal point
    ↓
Sideganger — minst én blindvei med loot/fare
```

### Atmosfæreregler
- Flakkende fakler eller lysende runes langs vegger (hvert 4-6 units)
- Aldri to like rom på rad — varier form (rektangel, L-form, rund)
- Minst ett rom med vann (dam, dryppende tak, oversvømt gulv)
- Knokler, rustne våpen, eller gamle leirer fra tidligere eventyrere
- Spindelvev i hjørner og over ubrukte passasjer
- Vegger har sprekker og utbuler — ikke perfekte overflater

### Rom-typer å inkludere
Hvert dungeon bør ha minst 4 av disse:
Fangehull / fengselsceller, bibliotek/scriptorium, smedja, skattkammer (låst), alter/tempel, torturkammer, vaktrom, magisk sirkelsrom

---

## TAVERN / INTERIØR

### Struktur
```
Inngang med vindfang (liten buffer-sone)
    ↓
Bardisk — alltid langs én vegg, aldri midt i rommet
    ↓
Bordrekker — uregelmessig arrangement, ikke grid
    ↓
Ildsted/peis — focal point, gjerne i hjørne
    ↓
Trapp til overetasje — legg alltid inn selv om overetasje ikke er på kartet
    ↓
Bakrom/kjøkken — antyd med en halvåpen dør
```

### Detaljer
- Hvert bord har ulikt antall stoler (2, 3, 4) og er rotert forskjellig
- Minst ett bord er veltet eller har en full drikkestein
- Musikant-hjørne (lute, tambourine) selv uten musikant-asset
- Notisboard eller kart på veggen
- Katter eller hunder som sover ved peisen
- Hemmelig dør eller løs planke (subtle prop som antyder)
- Vinduer med utsynsprop (lykter utenfor, regneffekt)

---

## SLOTT / FESTNING

### Struktur — utendørs
```
Vollgrav eller mur — definerer grensen tydelig
    ↓
Portrom — tydelig inngang med vaktposter
    ↓
Ytre borggård — staller, vakthus, smedja
    ↓
Indre borggård — representativ, pent vedlikeholdt
    ↓
Hovedtårn (keep) — focal point, alltid høyest
```

### Atmosfæreregler
- Vaktposter ved alle innganger (tomme vaktboder er like fine)
- Hengte skjold eller bannere langs vegger
- Kanonkuler/piler stablet ved forsvarspunkter
- Slitasje på høytrafikksområder (gressløs jord ved stallen)
- Pragmatisk og representativ sone skal føles tydelig forskjellig

---

## HAVN / KYST

### Struktur
```
Vannlinje — defines kartkanten eller diagonal
    ↓
Kai/brygge — strekker seg ut i vann, varierende lengde
    ↓
Lager og pakkhus — store, grove bygninger langs kaia
    ↓
Fiskerboder og verksteder — mindre, rotete
    ↓
Bakgate — tavernaer, bordeller, pengebytte (slitt og mørkt)
```

### Atmosfæreregler
- Tau, ankere, og tønner overalt langs kaia — i uordnede stabler
- Minst ett skip (eller masten av ett) synlig
- Fugler (måse-props) på tak og fortøyningspæler
- Fiskegarn hengt til tørk mellom to punkt
- Lukt-antydning via props: fiskeslo, tjære, saltstein
- Kjøpmann eller tollbod med papirer/kasser utenfor
- Minst én søyle med offisielle kunngjøringer

---

## PROMPT-TEMPLATE — bruk dette i Claude Code

Kopier og fyll ut når du vil generere et map:

```
Les MAP_DESIGN_RULES.md i sin helhet før du starter.

Generer et [MAP-TYPE] map med følgende:

SCENE-KONTEKST:
- Hva har skjedd her nylig: [beskriv]
- Tidspunkt: [dag/natt/solnedgang/storm]
- Stemning: [farlig/rolig/mystisk/travel/forlatt]

SPILLERFOKUS:
- Hvor entrer spillerne: [retning/punkt]
- Hva skal de finne/oppdage: [hint til DM]
- Forventet encounter-type: [kamp/utforskning/sosial]

KRAV:
- Kartdimensjoner: [X x Z units]
- Tilgjengelige asset-kategorier: [liste fra kenney]
- Focal point: [spesifiser eller la Claude velge]

FREMGANGSMÅTE:
1. Beskriv layout i tekst først (blueprint)
2. Identifiser focal point og 3 story props
3. Plasser bakgrunnsstrukturer
4. Plasser midtgrunn-assets med spacing-regler
5. Legg til detalj-props sist
6. Generer koden

IKKE generer kode før du har skrevet blueprintet i tekst og fått godkjenning.
```

---

## RASK SJEKKLISTE før koden genereres

- [ ] Har kartet ett tydelig focal point (off-center)?
- [ ] Er det tre dybdelag (bakgrunn / midtgrunn / detaljer)?
- [ ] Er det minst 3 story props?
- [ ] Er hus/trær i organiske klynger, ikke grid?
- [ ] Er rotasjoner i 45°-steg?
- [ ] Er spacing-reglene fulgt?
- [ ] Har kartet én stor åpen sone (for action)?
- [ ] Antyder noe hva som har skjedd her?
