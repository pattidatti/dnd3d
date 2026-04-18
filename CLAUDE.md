# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based 3D voxel VTT (virtual tabletop) for D&D. Vanilla TypeScript + Three.js directly (no React, unlike most sibling projects in this workspace). Firebase is installed but not yet wired — multiplayer is planned for Fase 5. All UI text and inline comments are in Norwegian (bokmål).

The product spec `mvp.md` still defines phases and file layout at a high level, but the implementation has diverged in several places — see **Avvik fra mvp.md** below. Read the spec for intent, not as ground truth.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # tsc && vite build
npm run preview   # preview production build
```

No lint or test scripts are configured. Type safety is enforced via `tsc` (strict + `noUnusedLocals`/`noUnusedParameters`) as part of `build`. Run `npm run build` to typecheck.

## Architecture

### Data ↔ renderer separation (event-driven)

`VoxelWorld` is the source of truth for blocks — a `Map<PosKey, BlockType>` where `PosKey` is the string `"x_y_z"`. The string key is a deliberate choice for future Firebase RTDB sync (child paths map 1:1 to keys).

`VoxelWorld` emits `onBlockAdded` / `onBlockRemoved` events. Anything that visualizes or reacts to blocks (e.g. `VoxelRenderer`) subscribes to those events rather than polling. **Always mutate via `VoxelWorld.setBlock` / `removeBlock`** — never touch renderer state directly. This is the same seam that Firebase sync will plug into later.

The same event-pattern is used by `FogOfWar` (`onCellRevealed` / `onCellHidden`) and `TokenManager` (`onAdded` / `onUpdated` / `onRemoved` / `onSelectionChanged`). New state containers should follow this pattern.

### Blokk-palett og materialer

`BlockPalette.ts` (tidligere `BlockTypes.ts` i spec) definerer 12 blokktyper: Stone, Plaster, Brick, Roof, Wood, Dirt, Grass, Leaf, Trunk, Sand, Water, Slate. Det finnes **ingen canvas-teksturer** — hver blokk er `MeshStandardMaterial` med flat pastellfarge + `vertexColors: true`. Water er `transparent` med `opacity 0.72`. Ingen Torch/Lava/emissive blokktyper lenger.

Materialer caches per type i `getMaterial()`. Hvis du trenger teksturer senere må `vertexColors: true` beholdes slik at AO fortsatt virker (se under).

### Instanced rendering + AO

`VoxelRenderer` maintains one `THREE.InstancedMesh` per `BlockType` with capacity 250 000 each. It tracks a `keyToIndex` map + free-list for slot reuse and exposes `decodeHit(mesh, instanceId)` for raycasters.

**Per-instance ambient occlusion**: `instanceColor` brukes til å mørkne blokker basert på antall av 6 kardinale naboer — `brightness = 1 - buried * 0.07`. `refreshAO` kalles på blokken selv ved add og på 6 naboer ved add/remove. Dette er grunnen til at materialet må ha `vertexColors: true`.

### Belysning og atmosfære

`SkyEnvironment` eier atmosfæren: three.js `Sky` shader, `DirectionalLight` (sol med shadowmap 2048²), `HemisphereLight`, pluss scene-bakgrunn + `THREE.Fog` for dybde. Skygger er på (`renderer.shadowMap.enabled = true`, PCFSoft).

**Det finnes ingen TorchLightPool lenger** — spec nevner den, men Torch-blokktypen ble fjernet sammen med pool-klassen. Hvis dynamiske lys gjeninnføres, implementer en ny pool fremfor å legge ubegrenset antall `PointLight` i scenen.

### Interaksjonsmodi

Tre modi gated av `ToolModeToggle`: `"blocks" | "tokens" | "fog-reveal"`. `App.applyToolMode` flipper `.active` på `BlockPlacer`, `TokenPlacer` og `FogPlacer`. `fog-reveal` er kun synlig når `isDM` er satt. Hotkeys: **B** blocks, **N** tokens, **R** fog (DM). Når du legger til ny modus: én `active`-bool per handler, ikke conditional registrering — og oppdater `applyToolMode` + `ToolModeToggle`.

`BlockPlacer` bruker `face.normal` fra raycast-hit for Minecraft-stil stabling. `TokenPlacer` bruker samme face-normal-trick og i tillegg `resolveGround` som probe-søker i 5×5-cellen for å finne korrekt base-Y (støtter trapper/plattformer). `FogPlacer` raycaster kun mot bakkeplanet (`y=0`) siden fog er per grid-celle, ikke per voxel; Shift+klikk avslører 3×3-område.

### Fog of War

`FogOfWar` holder `Set<FogKey>` over **avslørte** celler. `FogKey` er `"cellX_cellZ"` (ikke `x_y_z`) — fog er 2D per grid-rute, ikke per voxel. `FogRenderer` bruker én `InstancedMesh` av 5×5-quads og har **inverter logikk**: alle ikke-avslørte celler innenfor ±50 (100×100 kart) har en instans; reveal fjerner instansen. `ViewToggle` flipper materialets `opacity` mellom DM-view (0.35) og Player-view (1.0). Spillere er låst til 1.0.

`WORLD_HALF_CELLS = 50` er duplisert i `FogRenderer` og `FogPlacer`. Hold dem i sync hvis kartstørrelsen endres.

### Tokens

`Token` har `x, y, z` i world-koordinater (senter av 5-fots-ruten, base-Y på truffet flate). `CELL_SIZE = 5`. `cellIndex` / `cellCenter` / `snapToCell` i `Token.ts` er kanon for grid-matematikk — ikke dupliser.

`TokenPlacer.handleClick` har en overraskende del: hvis det ikke finnes valgt token eller egen token, og klikk-målet er gyldig, **opprettes** tokenet automatisk ved første klikk. Høyreklikk i tom-rom deselektrerer; høyreklikk på token sletter den (DM eller eier).

### Identity (interim)

`LocalIdentity` lagres i `localStorage` med felt `{ uid, name, color, initial, isDM }`. `ensureIdentity()` viser modal ved førstegangs last; `openIdentityModal` redigerer. `App.editIdentity` **bevarer eksisterende uid** og oppdaterer egen token (navn/farge/initial) etterpå. `applyDmRole()` videreformidler `isDM` til `ToolModeToggle.setDmMode` og `ViewToggle.setDmMode`. Hele laget er forventet erstattet av Firebase Auth i Fase 4.

### Camera

`CameraController` eier OrbitControls, T-toggle for topdown og F-fokus. `setTokenFocusResolver(() => Vector3 | null)` fylles av `App` med "selected token, else own token". Bruk samme resolver-mønster når kamera trenger tilgang til andre subsystemer.

`Minimap` (i `camera/`) er en egen `OrthographicCamera` + render-target som vises i et hjørne; ikke forvekslet med hoved-rendering.

## Hotkeys (samlet)

- **B / N / R** — tool mode (blocks / tokens / fog-reveal; fog er DM-only)
- **1–9** — velg blokktype (Toolbar)
- **T** — topdown-kamera
- **F** — fokuser valgt/egen token
- **G** — toggle grid
- **V** — DM/Player view-toggle (DM-only)
- **Esc** — deselekter token

## Avvik fra mvp.md

Spec-et er ikke løpende oppdatert. Per i dag:

- **BlockTypes → BlockPalette**: 12 blokker, ingen Torch/Lava/emissive, ingen canvas-teksturer — flate pastellfarger + AO.
- **TorchLightPool fjernet**.
- **MapGenerator.fromImage fjernet** — `public/map.png` brukes ikke lenger ved oppstart.
- **Fog of War er implementert** (Fase 3 mesteparten ferdig) som egen toolmode, ikke via `ModeToggle`-klassen spec-et beskriver.
- **SkyEnvironment** (Sky shader, sol, skygger, scene-fog) er lagt til; spec-en nevner bare directional + ambient.
- **Fase 4/5** (Firebase Auth, lobby, RTDB-sync) er fortsatt ikke påbegynt.

Hvis du endrer noe av det ovenfor, oppdater både denne seksjonen og `mvp.md`.

## Conventions

- **No React.** Plain classes, DOM APIs, and Three.js. `src/ui/*` builds UI imperatively under `#ui` div.
- **Norwegian first.** UI-strenger og inline-kommentarer er på bokmål. Kode-identifikatorer på engelsk.
- **File layout mirrors `mvp.md` § Filstruktur der det gir mening**, men spec-en er foreldet på enkelte moduler (se over). Når du legger til nytt subsystem: sjekk eksisterende mapper (`world/`, `camera/`, `interaction/`, `tokens/`, `fog/`, `render/`, `ui/`) før du lager ny.
- **Debug hook:** `App` assigns itself to `window.app` for manual QA in the browser console.
- **PosKey-format er load-bearing** — `"x_y_z"` matcher planlagte RTDB-baner. Ikke bytt til tuple/bitpacked uten å også oppdatere sync-planen i `mvp.md`. Samme gjelder `FogKey = "cellX_cellZ"`.
- **Constants duplisert på tvers av moduler** (`WORLD_HALF_CELLS`, `CELL_SIZE`, `WORLD_SIZE_HALF`) — hold dem i sync manuelt til en delt konstantfil eventuelt lages.
