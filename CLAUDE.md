# CLAUDE.md

Guidance for Claude Code (claude.ai/code) når man jobber i dette repoet.

## Prosjekt

Nettleser-basert 3D virtual tabletop (VTT) for D&D. Vanilla TypeScript + Three.js direkte (ikke React). Firebase er installert men ikke wired — multiplayer er planlagt senere. All UI-tekst og inline-kommentarer er på bokmål; kode-identifikatorer på engelsk.

**Historie:** Motoren ble skrevet om fra bunnen av (april 2026). Fra et voxel-basert verden (`VoxelWorld` + `VoxelRenderer` + flat-farget AO) til heightmap-terreng + Kenney-GLTF-props + Rapier-fysikk + KayKit-karakterer med animasjoner. Den gamle koden ligger urørt i `src_legacy/` for sammenligning og kan slettes når som helst. `mvp.md` beskriver de **opprinnelige** fasene og er utdatert for dagens kode.

## Kommandoer

```bash
npm install
npm run dev       # Vite dev-server
npm run build     # tsc && vite build (tsc fungerer som lint — strict + noUnused*)
npm run preview   # preview produksjons-build
```

Ingen separat lint eller test. `npm run build` er den autoritative korrekthets-sjekken.

## Filstruktur

```
src/
├── main.ts                      # boot, lager App og starter tick
├── App.ts                       # lifecycle, event-wiring, hotkeys, UI-mount
├── assets/
│   ├── AssetRegistry.ts         # katalog over Kenney-props + KayKit-klasser + rig-animasjoner
│   ├── GltfCache.ts             # GLTFLoader + shared cache, PBR-materialoppgradering
│   ├── InstancedPropRenderer.ts # InstancedMesh per (asset, sub-mesh) med slot/free-list
│   └── AnimationLibrary.ts      # Rig_Medium-klipp lastet én gang, deles mellom karakterer
├── camera/
│   ├── CameraController.ts      # OrbitControls + T-topdown + F-fokus
│   └── ThirdPersonCamera.ts     # pointer-lock, mus/scroll, FOV-shift ved løp
├── character/
│   ├── AvatarManager.ts         # spawn/get/remove/tick
│   ├── CharacterAvatar.ts       # en KayKit-instans: SkeletonUtils.clone + AnimationMixer
│   └── LocalIdentity.ts         # localStorage v2: {uid, name, color, initial, isDM, classKey}
├── fog/
│   ├── FogOfWar.ts              # Set<FogKey> (2D per grid-rute)
│   ├── FogRenderer.ts           # én mesh som speiler terrenget, per-vertex alpha-shader
│   ├── FogPlacer.ts             # raycast mot terreng-mesh, toggle/reveal
│   └── ViewToggle.ts            # DM ↔ Spiller-fog-opacity
├── interaction/
│   └── PropPlacer.ts            # ghost-preview + raycast + add/delete via PropWorld
├── maps/
│   ├── MapStore.ts              # localStorage v2 + base64 (Float32/Uint8)
│   └── MapManager.ts            # snapshot/save/load: terrain heights+biome + props
├── physics/
│   ├── RapierWorld.ts           # RAPIER.init + world.step-wrapper
│   ├── TerrainCollider.ts       # Rapier heightfield fra Terrain.heights (transponert)
│   ├── PropCollider.ts          # statisk cuboid per prop-instans, event-drevet
│   └── CharacterController.ts   # Rapier KCC + kapsel + WASD-input
├── render/
│   ├── SkyEnvironment.ts        # Sky shader + sol + hemi + PMREM, mood-presets
│   ├── PostProcessing.ts        # EffectComposer-pipeline (IKKE wired — se kjente ting)
│   ├── Atmosphere.ts            # Points-partikler med custom shader
│   └── GraphicsQuality.ts       # low/medium/high-profil i localStorage
├── types/
│   └── three-addons.d.ts        # shim for SkeletonUtils.clone som @types/three mangler
├── ui/
│   ├── PropToolbar.ts           # bottom-left: kategori + asset-liste
│   ├── MapBar.ts                # top-right: Lagre/Last
│   ├── ClassPicker.ts           # top-left: KayKit-klasse-dropdown
│   ├── IdentityBadge.ts         # bottom-right: navn + DM-toggle
│   └── KeybindingsHelp.ts       # top-center "H"-chip + modal-overlay
├── world/
│   ├── Grid.ts                  # CELL_SIZE=5, cellIndex/cellCenter/snapToCell
│   ├── Terrain.ts               # heights + biome + sampling
│   ├── TerrainMesh.ts           # bygger Three-mesh fra Terrain, vertex-farget per biome
│   ├── PropWorld.ts             # Map<id, PropState> + event-emitter
│   └── DemoWorld.ts             # populateDemoTerrain + populateDemoProps
└── style.css                    # all UI-stil; én fil, ingen komponent-CSS
```

## Arkitektur

### Data ↔ renderer-seam (event-drevet)

Alle state-containere er separate fra visualisering. Renderer subscriber på events og speiler state:

| Data | Renderer | Events |
|---|---|---|
| `Terrain` | `TerrainMesh` | (rebuild manuelt etter load) |
| `PropWorld` | `InstancedPropRenderer` | `onAdded` / `onUpdated` / `onRemoved` |
| `PropWorld` | `PropCollider` | samme events |
| `FogOfWar` | `FogRenderer` | `onCellRevealed` / `onCellHidden` / `onCleared` |

**Mutér alltid via data-klassen.** Aldri direkte på renderer (f.eks. `InstancedPropRenderer.addProp` manuelt). Dette er samme sømmen Firebase RTDB-sync skal plugges inn i senere.

Når du legger til et nytt state-system, følg samme pattern: Set<Listener> per event-type, emit i alle mutations.

### Terreng

`Terrain` holder to flat-arrays:
- `heights: Float32Array` — 101×101 vertex-hjørner for et 100×100-celle-grid (`WORLD_HALF_CELLS=50`, `CELL_SIZE=5`). Row-major: `heights[iz * (w+1) + ix]`.
- `biome: Uint8Array` — én byte per celle, verdier `Grass=0, Sand=1, Rock=2, Snow=3, Path=4, Water=5`.

Sampling i world-koordinater: `sampleHeight(x, z)` (bilineær), `sampleBiome(x, z)` (nærmeste celle).

`TerrainMesh` bygger én `MeshStandardMaterial`-mesh. Vertex-farger interpoleres fra de 4 nabo-cellenes `BIOME_COLORS`. `metalness=0`, `roughness=0.95`. Kall `rebuild()` etter at `heights`/`biome` endres (f.eks. etter load av lagret kart).

World-koordinater: X og Z går fra `-250` til `+250`. Y er høyde (vanligvis 0–10 for flat/åsete demo).

### Props: assets, cache, rendering

Alle GLBer fra Kenney Nature Kit og KayKit Adventurers 2.0 er symlinket under `public/kenney/`:

```
public/kenney/props/         → Kenny/Models/GLTF format/          (329 props)
public/kenney/characters/    → KayKit_Adventurers_2.0_FREE/…/gltf (6 klasser)
public/kenney/animations/    → KayKit_Adventurers_2.0_FREE/…/Rig_Medium (2 clip-GLBer)
```

`AssetRegistry.ts` eksporterer `allProps()`, `propsByCategory('vegetation'|'terrain'|'structure')`, `CHARACTER_CLASSES`, og `ANIMATION_GLBS`. Hvis du legger til nye props må de registreres her — filnavnet alene er ikke nok.

`GltfCache` har én `GLTFLoader`, deler resultater via `Map<url, Promise<GLTF>>` og kjører `upgradeMaterials(scene)` ved load: traverserer meshes, setter `castShadow=receiveShadow=true`, og bytter ikke-PBR-materialer (MeshBasic/Lambert) til `MeshStandardMaterial` med beholdt farge/texture. Uten dette blir Kenney-assets helt svarte siden de originale materialene ikke responderer på lys.

`InstancedPropRenderer` er tegn-systemet for props:
- Per asset-key, bygger én bucket ved første `ensureLoaded`: traverserer GLB-en og lager én `InstancedMesh` per submesh, kapasitet 2048.
- `addProp(state)` tar en ledig slot (fra free-list eller ny), skriver transform-matrisen per submesh.
- `removeProp(id, key)` legger slotten i free-list og skalerer matrise til 0.
- `propIdFromHit(mesh, instanceId)` søker revers fra raycaster-hit til prop-ID.

**Viktig:** GLBens submesh-er kan ha egne lokale transformer. Vi fanger `mesh.matrixWorld` ved bucket-bygging som offset, og komposerer `(propTransform * offset)` per slot. Ellers klipper sub-mesh-er feil.

### Lys, atmosfære og render-løkke

`SkyEnvironment` eier atmosfæren:
- Three.js `Sky` shader (proc sky-dome)
- `DirectionalLight` (sol) med `castShadow`, shadowmap-størrelse styrt av `GraphicsQuality`
- `HemisphereLight` (hemi)
- `scene.background` + `THREE.Fog` med samme farge
- PMREM av sky-dome som `scene.environment` for IBL
- `setMood('day'|'dawn'|'dusk'|'night')` interpolerer alle parametre over 600ms; `tick()` driver overgang og debouncer PMREM-rebuild i rAF.

`Atmosphere` er et `Points`-mesh med custom shader for soft round + depth-fade. Driver-animasjon i vertex-shader via tids-uniform. Antall og farge skaleres med quality + mood. Følger kamera i XZ.

**Lys-tuning:** Kenney/KayKit-assets er **ikke PBR-authored** — de er modellert for flat-shading. Default tre.js PBR + HDR-sky gir dem tykk, overeksponert look. I `App.ts` demper vi derfor:

```ts
scene.environmentIntensity = 0.25;
sky.sun.intensity = 1.0;
sky.hemi.intensity = 0.3;
renderer.toneMappingExposure = 0.55;
```

Når/hvis vi bytter til PBR-authored assets eller skriver egen toon-shader, bør disse tunes opp igjen.

**Render-løkke:** `App.tick` kaller `renderer.render(scene, camera)` direkte. `PostProcessing.ts` er portert men **ikke wired inn** — under Fase 1 ga `EffectComposer` svart output; ikke rotroots-diagnostisert. Hvis man skal reaktivere: verifiser i ekte nettleser først.

`GraphicsQuality` (`low`/`medium`/`high`) styrer SSAO på/av + half-res, SMAA, partikkel-antall, shadowmap-størrelse. Persisteres i `localStorage["dnd3d.graphicsQuality"]`. Foreløpig ingen UI for å bytte (MoodPanel ikke portert).

### Physics

`RapierWorld` initialiserer `@dimforge/rapier3d-compat` asynkront via `await RAPIER.init()` og eksponerer `world` + `step(dt)`. Gravity default `(0, -24, 0)`. Fordi init er async, er `App.controller`/`terrainCollider`/`propCollider` `null` frem til `App.initPhysics()` fullfører; Tab (orbit↔tredjeperson) sjekker dette og viser toast hvis ikke klar.

`TerrainCollider` bygger en Rapier `Heightfield` direkte fra `Terrain.heights`. Rapier forventer column-major layout (`heights[ix * (nrows+1) + iz]`); vårt format er row-major, så vi transponerer i `build()`. Scale-vektoren setter XZ-strekk til `(widthCells*CELL_SIZE, 1, depthCells*CELL_SIZE)`. Bygges på nytt i `App.rebuildTerrain()` etter kart-load.

`PropCollider` lytter på `PropWorld` og bygger én `fixed` rigid body + cuboid-collider per prop. Cuboid-halvstørrelser hentes fra GLBens bounding-box × prop.scale. Grovt, men nok til at karakterer stopper mot trær/klipper. Ved `PropWorld.update` kastes og bygges om.

`CharacterController` wrapper Rapier's `KinematicCharacterController`:
- Kapsel: `CHAR_HEIGHT=1.4`, `RADIUS=0.3` (matcher rendert karakter-størrelse)
- Step-height `0.2`, max-slope `45°`, snap-to-ground `0.3`
- WASD inn er kamera-relativ (yaw kommer fra `ThirdPersonCamera`), roteres til world-rom
- Gravity applyes manuelt på vertikal-komponenten; hopp setter `verticalVelocity = 6`

### Karakterer

`CharacterAvatar` laster en KayKit-GLB (`Knight`, `Barbarian`, `Mage`, `Ranger`, `Rogue`, `Rogue_Hooded`). Riggen klones med `SkeletonUtils.clone` slik at flere instanser kan dele samme GLB. Modellen:
- Skaleres `0.55` (for å matche ~6 fot i world-skala sammen med 5-8×-skalerte props)
- Roteres `Math.PI` inne i `root`-gruppen, siden KayKit-modellene vender +Z, men vår CharacterController definerer "forward" som -Z

`AnimationLibrary` laster `Rig_Medium_General.glb` + `Rig_Medium_MovementBasic.glb` én gang og eksponerer `findClip(name)`. Rigg-strukturen er delt på tvers av alle 6 klassene, så samme clip binder direkte på alle avatarer.

`CharacterAvatar.setGait('idle'|'walk'|'run')` gjør en 0.2s cross-fade mellom actions. App.tick leser `controller.isMoving()` + `input.run` og kaller `setGait` per frame.

`AvatarManager` er enkel: spawn (med async load), get/getByOwner/remove, og `tick(dt)` som kjører alle mixers.

### Interaksjon og modus-eksklusivitet

Tre input-modi som ikke skal kollidere:

1. **PropPlacer** (orbit-modus, valgt asset i `PropToolbar`): raycast mot terreng-mesh for plassering, mot alle prop-InstancedMesh-er for sletting. Ghost-preview er en GLB-klon med transparent material (opacity 0.55, depthWrite off). Shift+klikk legger til random rotasjon + scale-jitter.
2. **FogPlacer** (orbit-modus, DM-only, aktivert med **R**): raycast mot terreng-mesh → celle-koordinater. Venstreklikk toggler celle, Shift+klikk avslører 3×3. Høyreklikk tvangs-hider.
3. **ThirdPersonCamera** (aktivert med **Tab**): pointer-lock på klikk, mus = yaw/pitch, scroll = avstand 1.5–10, WASD + Shift + Space til CharacterController.

`App.ts` håndterer eksklusivitet: når én aktiveres slås de andre av. Orbit-kontroller deaktiveres når PropPlacer eller FogPlacer er aktive.

### UI

All UI bygges imperativt mot `#ui` div. Ingen komponenter, ingen JSX. Stil i én `style.css`.

| Panel | Plassering | Funksjon |
|---|---|---|
| `PropToolbar` | bottom-left | Kategori-rad + scrollende asset-knapper |
| `MapBar` | top-right | Lagre / Last — prompt-basert, ikke modal |
| `ClassPicker` | top-left | Dropdown med KayKit-klasse, trigger avatar-respawn |
| `IdentityBadge` | bottom-right | Navn + klasse + DM/Spiller-toggle |
| `KeybindingsHelp` | top-center | "H"-chip åpner modal med hurtigtaster |
| `ViewToggle` | top-right (DM-only) | DM (35% fog) ↔ Spiller (100% fog) |
| Camera-mode-indicator | toast-style | Viser Orbit/Tredjeperson etter Tab |

### Fog of War

`FogOfWar` holder `Set<FogKey>` over **avslørte** celler. `FogKey = "cellX_cellZ"` (2D per grid-rute, ikke per voxel). Operasjoner: `isRevealed`, `reveal`, `hide`, `toggle`, `revealArea(cx,cz,radius)`.

`FogRenderer` er **én sammenhengende mesh** som speiler terreng-geometrien (samme vertex-grid, løftet 0.08 enheter). Custom `ShaderMaterial` med per-vertex alpha-attributt: hver vertex eier snittet av `(1 - revealed)` for opp til 4 nabo-celler. Dette gir myke kanter mellom avslørt og skjult uten synlige fliser (forrige iterasjon hadde tiled planes som så ut som 2D-blokker på bakken).

Ved reveal/hide oppdateres kun de 4 hjørne-vertexene for berørt celle. PMREM eller lignende ikke involvert — fog er pure fragment-output.

`ViewToggle.setOpacity` endrer uniform `uGlobalOpacity` som multipliseres med vertex-alpha.

### Identitet (interim)

`LocalIdentity` i localStorage v2: `{uid, name, color, initial, isDM, classKey}`. `ensureIdentity()` returnerer eksisterende eller lager ny med random-navn og default `classKey='Knight'`. DM-toggling skjer via `IdentityBadge`-knappen og emitter til `App.applyDmRole`. Hele laget forventet erstattet av Firebase Auth.

### Maps (serialisering v2)

```ts
interface MapSnapshotV2 {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  terrain: {
    widthCells: number;
    depthCells: number;
    heights: string;   // base64(Float32Array)
    biome: string;     // base64(Uint8Array)
  };
  props: PropState[];
}
```

Lagres under `localStorage["dnd3d.maps.v2"]`. Ingen migrering fra v1 (voxel-maps). `MapManager.applySnapshot` krever samme terreng-størrelse som nåværende `Terrain`-instans, kopierer `heights`/`biome`, og gjør `propWorld.clear()` + re-add. App.ts kaller så `rebuildTerrain()` som bygger TerrainMesh, TerrainCollider og FogRenderer på nytt.

## Hurtigtaster

| Tast | Handling |
|---|---|
| Tab | Orbit ↔ tredjeperson (krever at fysikk er ferdig-lastet) |
| WASD | Bevegelse (tredjeperson) |
| Mellomrom | Hopp (tredjeperson) |
| Shift | Løp (tredjeperson) |
| Mus | Se rundt (tredjeperson, pointer-lock) |
| Scroll | Juster kamera-avstand (tredjeperson) |
| Klikk | Aktivér pointer-lock (tredjeperson) |
| Esc | Slipp pointer-lock / lukk hjelp |
| T | Topdown-toggle (orbit) |
| F | Fokuser valgt/egen avatar (orbit — resolver må settes) |
| H | Vis/skjul hurtigtast-hjelp |
| R | Fog-reveal-modus (DM, i orbit) |
| V | DM ↔ Spillervisning (DM, styrt av `ViewToggle`) |
| Venstreklikk (prop-modus) | Plasser prop |
| Høyreklikk (prop-modus) | Slett prop under cursor |
| Shift+klikk (prop-modus) | Plasser med random rot + scale-jitter |
| Venstreklikk (fog-modus) | Toggle celle |
| Shift+klikk (fog-modus) | Avslør 3×3 |
| Høyreklikk (fog-modus) | Hide celle |

## Konvensjoner

- **Ingen React.** Plain classes, DOM APIs, Three.js. Hvis du ser for deg komponenter: du må gjøre det imperativt.
- **Bokmål i UI + kommentarer.** Kode-identifikatorer på engelsk (class names, metode-navn, state-nøkler).
- **Event-pattern for nye subsystemer.** `Set<Listener>` per event-type, emit i mutations, renderer subscriber. Se `PropWorld`/`FogOfWar` som mal.
- **PosKey/FogKey-format er load-bearing** for Firebase-sync — `"x_y_z"`/`"cellX_cellZ"` matcher planlagte RTDB-baner. Ikke bytt til tuple eller bitpacked uten å oppdatere sync-planen.
- **Debug-hook:** `App` tilgjengelig som `window.app` i nettleser-konsollen.
- **Konstanter duplisert:** `WORLD_HALF_CELLS=50` finnes i `world/Terrain.ts`, `fog/FogRenderer.ts`, `fog/FogPlacer.ts`. `CELL_SIZE=5` i `world/Grid.ts` og brukt bredt. Hold i sync manuelt til evt. delt `constants.ts`.
- **Kenney vs KayKit-stil:** begge pakker er flat-farget low-poly. Når de blandes med PBR-shading + tone mapping blir resultatet litt glatt-plast-aktig. Kan forbedres med HDRI-environment eller egen toon-shader-pass — men aksepter det er bytte av estetikk.

## Kjente mangler og risiko

- **PostProcessing ikke wired.** `EffectComposer` ga svart output under Fase 1; ikke rotroots-diagnostisert. Må verifiseres i ekte nettleser før reaktivering. Bloom/SSAO/SMAA/color-grade er skrevet men av.
- **MoodPanel ikke portert.** `SkyEnvironment.setMood` fungerer, men har ingen UI. For å bytte stemning nå må du kjøre `window.app.sky.setMood('dusk')` i konsollen.
- **Minimap ikke portert.** `src_legacy/camera/Minimap.ts` finnes som referanse.
- **Tokens + TokenPlacer ikke implementert.** For nå spawner tredjeperson alltid bare egen avatar via `App.respawnOwnAvatar`. DM har ingen måte å flytte flere tokens på grid-et. Må bygges når man trenger det.
- **Firebase-sync ikke påbegynt.** Arkitekturen er klargjort (event-seam, string-keys), men RTDB-kobling gjenstår.
- **Scale-konvensjon ikke konsolidert.** `CELL_SIZE=5` arves fra voxel-æraen (1 unit = 1 foot, 5 units = 1 D&D-rute). Kenney/KayKit er modellert for `1 unit ≈ 1 meter`. Dagens kompromiss: karakterer skalert 0.55, props skalert 5-8. Hvis man vil rydde: standardiser på meter, sett `CELL_SIZE=1.524`, skaler assets til 1.0, juster kamera + fysikk-hastigheter tilsvarende. Ikke-trivielt.
- **`@types/three` mangler SkeletonUtils.** Vi har egen shim i `src/types/three-addons.d.ts`. Hvis typer endrer seg ved three.js-oppgradering, må shim-en oppdateres.
- **Bundle er 2.9MB** (Rapier WASM + full three.js/examples). Code-splitting med dynamic import er naturlig neste skritt hvis loadtime blir et issue.
