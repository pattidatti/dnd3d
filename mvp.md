# D&D 3D VTT — MVP-spesifikasjon

## Konsept

Browser-basert 3D dungeon-VTT for D&D. DM og spillere kobler inn online, ser samme 3D-kart i sanntid, og beveger tokens på et taktisk grid — alt i nettleseren, ingen installasjon.

---

## Grafikk

- **Voxel-blokker** — Three.js `BoxGeometry`
- **Teksturer generert i kode** — 16×16 canvas-pikselkunst, ingen bildefiler
- **Atmosfærisk lys** — `PointLight` for fakler (oransje glød), mørk ambient + rettet directional for dybde
- **Material** — `MeshLambertMaterial` (flat, effektivt, reagerer på lys)
- **Estetikk** — Minecraft-vibes, lav-fi charm, stemningsfull dungeon-atmosfære

---

## Skala og grenser

| Enhet | Tilsvarer |
|-------|-----------|
| 1 voxel | 1 fot |
| 5×5 voksler | 1 D&D-rute (5 fot) |
| Rutenett-overlay | Viser 5-fots D&D-ruter |
| Token-snap | Til D&D-rute (5-fots grid) |

- **Kart-maks** — 100×100 D&D-ruter (500×500 voxels per lag)
- **Forventet belastning** — 5 000–20 000 faktisk plasserte blokker per kart
- **InstancedMesh-tak** — 250 000 per blokktype (stor margin)

---

## Kamera og navigasjon

- **OrbitControls** — fri rotasjon, zoom, pan
- **Venstre klikk** — roter
- **Høyre klikk** — pan
- **Scroll** — zoom
- **T-tast** — bytt til topdown-modus
- **F-tast** — fokuser kamera på valgt token
- **Minimap** — topdown-oversikt nederst i hjørnet, klikk for å senteres

---

## Rolle- og tilgangsmodell

- **Autentisering** — Firebase Auth med Google Sign-In (ingen anonym)
- **DM** — Rom-oppretter. `dmUid` lagres på rom-opprettelse og er autoritativ.
- **Spiller** — Alle andre innloggede som kobler til via rom-kode.
- **Modus-toggle (kun DM)** — `Bygge` / `Spille`
  - I **Bygge-modus** er blokk-plassering aktiv, token-interaksjon deaktivert.
  - I **Spille-modus** deaktiveres blokk-plassering; kun token-bevegelse og fog-kontroll.
  - Forhindrer feilklikk under aktivt spill.

### Firebase Security Rules (skisse)

```
/rooms/{roomId}/
  blocks      → write: auth.uid == dmUid
  fog         → write: auth.uid == dmUid
  tokens/{id} → write: auth.uid == dmUid || auth.uid == token.ownerUid
  meta        → write: auth.uid == dmUid (unntatt presence)
```

---

## Lobby og rom-håndtering

- **Landing-side** — etter Google-login vises liste over rom brukeren har besøkt eller eier, pluss knapper for `Opprett rom` og `Bli med via kode`.
- **Rom-kode** — brukervalgt, må være unik. Opprettelse bruker RTDB-transaction på `/rooms/{code}` for atomisk claim; ved kollisjon får brukeren feilmelding og må velge en annen.
- **Persistens** — rom lever for alltid i RTDB. DM kan alltid rejoin med samme kode. (Rydde-strategi er ute av MVP-scope.)
- **Reconnect** — ved nettverksbrudd forsøker klienten automatisk å reconnecte; UI viser tilstand (connected / reconnecting / offline). Session-state (valgt token, modus) bevares i `sessionStorage`.

---

## Kartbygging

- **Venstre klikk** på flate → plasser blokk (kun DM, i Bygge-modus)
- **Høyre klikk** på blokk → fjern blokk
- **Stabling** — klikk på toppen av en blokk for å stable (Minecraft-stil face detection)
- DM bygger kart både **før session** og **live under spill**

### Blokktyper

| # | Navn | Canvas-tekstur |
|---|------|----------------|
| 1 | Stein | Grå med sprekker |
| 2 | Tregulv | Brun med planke-mønster |
| 3 | Jord | Mørk brun, ujamn |
| 4 | Gress | Grønn topp, brun side |
| 5 | Vann | Blå, semi-transparent |
| 6 | Lava | Rød/oransje, emissive glow |
| 7 | Fakkel | Emissive + PointLight-kilde |

### Belysning — fakler

Three.js med `MeshLambertMaterial` tåler ~4–8 aktive `PointLight`-er effektivt. Derfor:

- Alle fakkel-blokker lagres i verden og rendres med emissive material.
- Kun de **N nærmeste faklene til kameraet** (f.eks. N=6) får faktiske `PointLight`-instanser.
- Lys-poolen oppdateres ved kamerabevegelse (throttlet).

---

## Tokens

- **Three.js Sprite** — alltid vendt mot kamera
- **64×64 canvas-ikon** — farge + initialbokstav, pikselkunst-stil
- **Navnelabel** — CanvasTexture-sprite over tokenet
- **Grid-snap** — XY snapper til D&D-rute (5-fots grid)
- **3D-posisjon** — full Z-akse. Ved flytting gjør raycasting treff på voxel-side/-topp; token plasseres på truffet flate. Naturlig støtte for trapper, plattformer og flygende creatures (som krever eksisterende voxel under).
- **Eierskap** — spillere lager sin egen token ved første join (navn, farge, initial). `ownerUid` lagres på token. DM kan overstyre/slette.
- **MVP-begrensning** — én token per spiller. Flere tokens (familiars, summons) er stretch-mål.
- **Interaksjon** — klikk for å velge, klikk ny posisjon for å flytte. DM kan flytte alle; spiller kan kun flytte egen.

---

## Fog of War

- Per-rute hidden/revealed state (på 5-fots grid).
- **Skjulte ruter** — sort `InstancedMesh`-overlay.
- **Spillere** — ser bare avslørte ruter, skjulte er fullstendig sorte.
- **DM (standard)** — ser alt normalt, men skjulte ruter har semi-transparent mørk overlay, slik at DM alltid vet hva som er avslørt.
- **DM (toggle)** — hotkey for å veksle mellom `DM-view` og `Player-view` for å se nøyaktig det spillere ser.
- **DM** toggler fog ved å klikke ruter i DM-modus.

---

## Multiplayer — Firebase Realtime Database

```
DM oppretter rom → brukervalgt kode (f.eks. "CASTLE"), må være unik
Spillere kobler inn med koden
```

### Firebase-struktur

```
/rooms/{roomId}/
  meta/
    dmUid               → uid til rom-oppretter
    created             → timestamp
    name                → visningsnavn
  blocks/
    {x_y_z}: { type }   → kun plasserte blokker (ikke tomme voxler)
  tokens/
    {tokenId}: { ownerUid, name, color, initial, x, y, z }
  fog/
    {cellX_cellY}: true → revealed-ruter (fravær = skjult)
  presence/
    {uid}: { name, connected, lastSeen }
```

### Sync-strategi

- **Per-blokk noder** gir trivielt delta-sync via `child_added` / `child_changed` / `child_removed`.
- **Masse-sletting** (f.eks. rydde et område) bruker `update()` med multi-path for å batches i én skriving.
- **Join midt i session** — klienten leser hele `/rooms/{id}` én gang og subscriber deretter til child-events.

---

## MVP-faser

### Fase 1 — Lokal voxel-verden
1. Vite + TypeScript + Three.js setup
2. `VoxelWorld` (data) + `VoxelRenderer` (InstancedMesh per blokktype)
3. Canvas-genererte piksel-teksturer
4. OrbitControls + topdown-toggle (T-tast)
5. D&D-grid overlay (LineSegments)
6. Klikk-til-plasser / høyreklikk-fjern blokker
7. HTML-toolbar med blokkpalette
8. Fakkel-blokktype + N-nærmeste PointLight-pool
9. Minimap + F-fokus-hotkey

### Fase 2 — Tokens
10. Sprite-tokens med canvas-ikoner
11. Token-plassering med full 3D-posisjon (raycasting på voxel-flate)
12. Token-eierskap-modell (lokalt, uten auth enda)

### Fase 3 — Fog of War
13. Per-rute fog state
14. Sort overlay-mesh for skjulte ruter
15. DM-kontroll for å avsløre ruter
16. DM-view / Player-view toggle

### Fase 4 — Auth + lobby
17. Firebase Auth med Google Sign-In
18. Lobby-side: rom-liste, opprett, bli med
19. Rom-kode unik-sjekk via RTDB transaction
20. Bygge/Spille-modus-toggle (kun DM)

### Fase 5 — Multiplayer
21. Firebase RTDB-oppsett + Security Rules
22. Sanntids-sync av blokker, tokens, fog
23. Reconnect-håndtering + connection-status-UI
24. Presence (hvem er koblet til)

---

## Detaljert implementeringsplan

Den korte `## MVP-faser`-seksjonen over gir oversikten. Denne seksjonen bryter hver fase ned i konkrete sub-steg med filnavn, rekkefølge og "ferdig-når"-kriterier slik at implementering kan starte uten flere avklaringer.

### Fase 0 — Prosjekt-setup

- `npm create vite@latest . -- --template vanilla-ts` (vanilla TS, ikke React — MVP bruker Three.js direkte)
- Installer: `three`, `@types/three`, `firebase`
- Dev-deps: `eslint`, `prettier` (TypeScript kommer med Vite-templaten)
- Grunnfiler: `index.html` (canvas-mount), `src/main.ts` (entry), `src/App.ts` (hoved-klasse), tom `src/styles.css`
- `tsconfig.json` med `strict: true`
- `vite.config.ts` default, `base: "./"` for senere Firebase Hosting
- **Ferdig-når:** `npm run dev` åpner tom side uten feil i konsoll.

### Fase 1 — Lokal voxel-verden (detaljering av steg 1–9)

**1.1 Scene-skjelett** (`src/App.ts`)
- `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer`, ambient + directional light
- Render-loop via `requestAnimationFrame`
- Resize-handler på `window.resize`
- **Ferdig-når:** grå bakgrunn + ett test-kube synlig.

**1.2 Blokktype-enum + tekstur-generator** (`src/world/BlockTypes.ts`)
- `enum BlockType { Stone, Wood, Dirt, Grass, Water, Lava, Torch }`
- `generateTexture(type): CanvasTexture` — 16×16 off-screen canvas per type, seeded noise for variasjon
- `getMaterial(type): MeshLambertMaterial` — cacher materiale per type; Water får `transparent: true`, Lava/Torch får `emissive`
- **Ferdig-når:** syv teksturer kan hentes og vises på enkel-kuber.

**1.3 Voxel-datamodell** (`src/world/VoxelWorld.ts`)
- `Map<string, BlockType>` med nøkkel `` `${x}_${y}_${z}` `` (string for enkelt delta-sync senere)
- API: `setBlock(x,y,z,type)`, `removeBlock(x,y,z)`, `getBlock(x,y,z)`, `forEach(cb)`
- Event-emitter: `onBlockAdded`, `onBlockRemoved` (brukes av renderer og senere Firebase-sync)
- **Ferdig-når:** set/get/remove verifisert via konsoll eller enkel test.

**1.4 InstancedMesh-renderer** (`src/world/VoxelRenderer.ts`)
- Én `InstancedMesh(geometry, material, 250_000)` per blokktype
- Holder `Map<posKey, instanceIndex>` + ledig-liste for gjenbruk av slots
- Lytter på `VoxelWorld`-events og oppdaterer matrix + `instanceMatrix.needsUpdate`
- **Ferdig-når:** 1 000 tilfeldig plasserte blokker rendres på <16 ms frametime.

**1.5 OrbitControls + hotkeys** (`src/camera/CameraController.ts`)
- `OrbitControls` fra `three/examples/jsm/controls/OrbitControls.js`
- T = topdown (kamera til `(0, 100, 0)`, lookAt origin, disable rotate)
- F = fokuser valgt token (no-op så lenge token er null — kobles i Fase 2)
- Lagre kamera-state i `sessionStorage` (per rom senere)
- **Ferdig-når:** musekontroll + T-toggle virker.

**1.6 D&D-grid-overlay** (`src/world/GridOverlay.ts`)
- `THREE.LineSegments` i Y=0.01 (over bakken), linjer hver 5. voxel
- Togglebar visibility (spiller skal alltid se; DM kan skjule)
- **Ferdig-når:** 5-fots rutenett synlig, skalerer med kart.

**1.7 Klikk-til-plasser + høyreklikk-fjern** (`src/interaction/BlockPlacer.ts`)
- `Raycaster` mot alle `InstancedMesh`-er
- Treff returnerer `instanceId` + `face.normal` → regner ut "naboposisjon" for stabling
- Venstreklikk: plasser valgt blokktype på nabo-posisjon
- Høyreklikk: fjern truffet blokk
- Bakke-plan (usynlig `PlaneGeometry` i Y=0) fanger første-klikk
- **Ferdig-når:** bygge/rive voxel-verden som Minecraft.

**1.8 Toolbar-UI** (`src/ui/Toolbar.ts`)
- Plain DOM: syv knapper (én per blokktype), aktiv highlight
- CSS i `src/ui/styles.css`, minimalistisk bunnlinje-palette
- Keyboard 1–7 velger blokktype
- **Ferdig-når:** bytte blokktype endrer hva som plasseres.

**1.9 Fakkel-lys-pool** (`src/world/TorchLightPool.ts`)
- Ved fakkel-plassering: registrer posisjon i `Set<posKey>`
- Hver 200ms (throttle): finn N=6 nærmeste fakler til kamera, reassign `PointLight[6]` til disse posisjonene
- Emissive material gir alltid glød; PointLight gir faktisk lys
- **Ferdig-når:** 50 fakler i scenen, kun 6 kaster lys, ingen stutter ved panorering.

**1.10 Minimap** (`src/camera/Minimap.ts`)
- Egen `OrthographicCamera` + lite WebGL render-target (256×256)
- Render samme scene i Y-down, vises i `<canvas>` nederst til høyre via CSS
- Klikk på minimap → flytt hoved-kamera til tilsvarende posisjon
- **Ferdig-når:** minimap oppdateres live, klikk-navigasjon virker.

**Fase 1 ferdig-kriterium samlet:** DM-kandidat kan bygge 5 000-blokk-dungeon lokalt, navigere fritt, bruke minimap, og fakkel-lys fungerer.

### Fase 2 — Tokens (detaljering av steg 10–12)

**2.1 Token-datamodell** (`src/tokens/Token.ts`, `TokenManager.ts`)
- `interface Token { id, ownerUid, name, color, initial, x, y, z }`
- `TokenManager` med `Map<id, Token>` + events (add/update/remove)

**2.2 Sprite-renderer** (`src/tokens/TokenSprite.ts`)
- `THREE.Sprite(SpriteMaterial({ map: CanvasTexture }))`
- 64×64 canvas: fylt farge + hvit initial-bokstav sentrert
- Label-sprite over token med navn (egen `CanvasTexture`, mindre)

**2.3 Token-plassering med raycasting** (`src/interaction/TokenPlacer.ts`)
- Klikk på voxel-flate → bruk `face.normal`, sett token på tilstøtende grid-rute
- Snap XY til nærmeste 5-fot-rute; Z = topp av truffet voxel
- Krever eksisterende voxel under → flygende creature fungerer naturlig
- **Ferdig-når:** token kan plasseres på gulv, trapper, plattformer.

**2.4 Token-eierskap (lokal stub)**
- UI-modal ved første "join": velg navn/farge/initial
- Lagre i `localStorage` som MVP-stub, bytt til Firebase i Fase 4
- Klikk token → velg; klikk ny rute → flytt (kun egen token med mindre DM-flagg)

**Fase 2 ferdig-kriterium:** DM og "fake player" (separat browser-profil) kan ha hver sin token i samme lokale scene.

### Fase 3 — Fog of War (detaljering av steg 13–16)

**3.1 Fog-datamodell** (`src/fog/FogOfWar.ts`)
- `Set<string>` over revealed celler (nøkkel `` `${cellX}_${cellY}` ``)
- Fravær = skjult (sparer minne og sync-byte)

**3.2 Overlay-rendering**
- `InstancedMesh` av 5×5-flate-quads på skjulte ruter
- Spiller: helt sort, opaque
- DM: semi-transparent sort (`opacity: 0.35`)
- Kun skjulte ruter har instans; reveal fjerner instansen

**3.3 DM reveal-kontroll**
- I DM-modus: klikk på rute toggler reveal (separat raycaster-modus)
- Modifier-key (Shift) for drag-reveal av område

**3.4 View-toggle** (`src/fog/ViewToggle.ts`)
- Hotkey `V`: DM bytter mellom DM-view og Player-view
- I Player-view skjules alle DM-overlay-forskjeller → DM ser nøyaktig det spillere ser

**Fase 3 ferdig-kriterium:** DM kan avsløre ruter; åpne to faner (DM + spiller-fake), fog reflekterer begge perspektiv.

### Fase 4 — Auth + lobby (detaljering av steg 17–20)

**4.1 Firebase-prosjekt + config** (`src/firebase.ts`)
- Opprett prosjekt i Firebase Console, aktiver Auth (Google) + RTDB
- `initializeApp` med config; eksporter `auth`, `db`
- `.env.local` for config-verdier, `.gitignore` den

**4.2 Google Sign-In** (`src/auth/GoogleAuth.ts`)
- `signInWithPopup(GoogleAuthProvider)`
- `onAuthStateChanged` router mellom lobby og spill

**4.3 Lobby-side** (`src/lobby/LobbyPage.ts`, `RoomList.ts`, `CreateRoom.ts`)
- Etter login: vis rom-liste fra `/users/{uid}/rooms` + `/rooms/*` der `uid==dmUid`
- Knapper: `Opprett rom` (input rom-kode + navn), `Bli med via kode`
- Routing: enkel hash-route (`#/lobby`, `#/room/CASTLE`) — ingen React Router

**4.4 Rom-kode unik-sjekk** (`src/multiplayer/RoomCode.ts`)
- RTDB `runTransaction` på `/rooms/{code}/meta` — returner abort hvis `dmUid` finnes
- Ved kollisjon: vis "Koden er tatt, velg en annen"

**4.5 Bygge/Spille-modus** (`src/interaction/ModeToggle.ts`)
- DM-only UI-toggle øverst i spill-view
- Bygge: BlockPlacer aktiv, TokenPlacer passiv
- Spille: motsatt + fog-kontroll tilgjengelig
- Persist i `sessionStorage`

**Fase 4 ferdig-kriterium:** Login → lobby → opprett rom → inn i tom scene med korrekt DM-rolle.

### Fase 5 — Multiplayer (detaljering av steg 21–24)

**5.1 Firebase-sync-lag** (`src/multiplayer/FirebaseSync.ts`)
- Én klasse, instansieres med `roomId`
- Metoder: `subscribeBlocks`, `subscribeTokens`, `subscribeFog`, `subscribePresence`
- Lokale mutasjoner (`VoxelWorld.setBlock` osv.) går via Sync-laget → skriver til RTDB → child-events patcher lokal state
- Bruk `onChildAdded`/`onChildRemoved`/`onChildChanged`, ikke `onValue` på hele noden

**5.2 Initial load**
- Ved join: `get(ref('/rooms/{id}'))` én gang → bygg lokal world → deretter subscribe
- Loader-UI mens initial load pågår

**5.3 Multi-path updates for masse-operasjoner**
- Rydde-område = `update()` med `{ 'blocks/x1_y1_z1': null, 'blocks/x2_y2_z2': null, ... }` i én skriving

**5.4 Security Rules** (`firebase.rules.json`)
- Implementer skissen over (se "Firebase Security Rules (skisse)")
- Test med `firebase emulators:exec` + manuelle skriv-forsøk

**5.5 Reconnect + connection-status** (`src/multiplayer/Reconnect.ts`, `src/ui/ConnectionStatus.ts`)
- RTDB `.info/connected` → grønn/gul/rød indikator i hjørnet
- Firebase håndterer retry automatisk; vis "Reconnecting..." når offline

**5.6 Presence** (`src/multiplayer/Presence.ts`)
- Ved join: `set('/rooms/{id}/presence/{uid}')` med `onDisconnect().remove()`
- Vis spillerliste i sidebar med online-status

**Fase 5 ferdig-kriterium:** To ekte brukere i to nettlesere kan åpne samme rom, se hverandres blokker/tokens/fog live, og reconnecte etter avbrudd.

### Fase 6 — Polish + deploy

- Manuell QA-runde: bygg lite dungeon, inviter test-spiller, kjør 10-min session
- Fiks synlige bugs (ikke feature-creep)
- `npm run build` + `firebase deploy --only hosting,database`
- Verifiser produksjons-URL fungerer
- **Ferdig-når:** MVP er live og kan deles med venner.

### Rekkefølge-prinsipper

- **Fase 1 først, alltid** — alt annet bygger på at voxel-scenen fungerer.
- **Lokal token-modell før Firebase-token-modell** (Fase 2 før 4) — unngår å debugge raycasting og Firebase samtidig.
- **Fog før multiplayer** — fog-logikken er komplisert nok uten sync-lag.
- **Vertikal integrasjon per fase** — hver fase skal være kjørbar/testbar før neste starter; ikke bygg halve systemer bredt.

---

## Filstruktur

```
dnd3d/
├── mvp.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── firebase.rules.json
└── src/
    ├── main.ts
    ├── App.ts
    ├── auth/
    │   └── GoogleAuth.ts
    ├── lobby/
    │   ├── LobbyPage.ts
    │   ├── RoomList.ts
    │   └── CreateRoom.ts
    ├── world/
    │   ├── VoxelWorld.ts       # Data: Map<key, BlockType>
    │   ├── VoxelRenderer.ts    # InstancedMesh per blokktype
    │   ├── BlockTypes.ts       # Enum + canvas-tekstur-generator
    │   ├── GridOverlay.ts      # LineSegments D&D-grid
    │   └── TorchLightPool.ts   # N-nærmeste PointLight-håndtering
    ├── camera/
    │   ├── CameraController.ts
    │   └── Minimap.ts
    ├── interaction/
    │   ├── BlockPlacer.ts      # Raycasting, face detection
    │   ├── TokenPlacer.ts      # 3D-posisjon via voxel-flate
    │   └── ModeToggle.ts       # Bygge / Spille
    ├── tokens/
    │   ├── Token.ts
    │   ├── TokenManager.ts
    │   └── TokenSprite.ts      # Canvas-pikselkunst sprite
    ├── fog/
    │   ├── FogOfWar.ts
    │   └── ViewToggle.ts       # DM-view / Player-view
    ├── multiplayer/
    │   ├── FirebaseSync.ts
    │   ├── RoomCode.ts         # Unik-sjekk via transaction
    │   └── Reconnect.ts
    └── ui/
        ├── Toolbar.ts
        ├── ConnectionStatus.ts
        └── styles.css
```

---

## Viktige Three.js-mønstre

- `InstancedMesh` for blokker — én per blokktype, kapasitet opp til 250 000
- `THREE.Sprite` + `CanvasTexture` for tokens og labels
- `Raycaster.intersectObject()` støtter InstancedMesh nativt (returnerer `instanceId`)
- Face-normal fra raycasting-treff for Minecraft-stil stabling og token-plassering
- `EffectComposer` + `SSAOPass` for dybde-skygger (fase 2+)

---

## Åpne spørsmål (utenfor MVP-scope)

- Rydde-strategi for gamle/forlatte rom (RTDB-kvote)
- Undo/redo for DM
- Touch/mobil-støtte
- Rom-kode-lengde og tegn-sett

---

## Stretch-mål (etter MVP)

- Flere tokens per spiller (familiars, summons)
- Animerte 3D-terninger som rulles i verdenen
- HP-sporing per token
- Initiative tracker
- Lagre/laste kart som JSON (eksport/import)
- Chunking av blokk-lagring (hvis ytelse krever det)
- SSAO + bloom post-processing
- Lydseffekter (terningkast, kamp)
- Undo/redo for DM
- Touch/mobil-kontroller
