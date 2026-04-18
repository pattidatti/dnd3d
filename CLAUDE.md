# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based 3D voxel VTT (virtual tabletop) for D&D. Vanilla TypeScript + Three.js directly (no React, unlike most sibling projects in this workspace). Firebase is installed but not yet wired — multiplayer is planned for Fase 5. All UI text and inline comments are in Norwegian (bokmål).

The authoritative product spec is `mvp.md` — read it before non-trivial changes. It defines phases (Fase 0–6), file layout, and "ferdig-når" (done-when) criteria that are still driving implementation.

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

`VoxelWorld` emits `onBlockAdded` / `onBlockRemoved` events. Anything that visualizes or reacts to blocks (e.g. `VoxelRenderer`, `TorchLightPool`) subscribes to those events rather than polling. **Always mutate via `VoxelWorld.setBlock` / `removeBlock`** — never touch renderer state directly. This is the same seam that Firebase sync will plug into later.

### Instanced rendering

`VoxelRenderer` maintains one `THREE.InstancedMesh` per `BlockType` with capacity 250 000 each. It tracks a `keyToIndex` map + free-list for slot reuse. Materials come from `BlockTypes.getMaterial(type)` which caches canvas-generated 16×16 pixel-art textures (no image files — all procedural).

### Torch light pool

`TorchLightPool` owns a fixed-size pool of `THREE.PointLight` instances (N≈6) and reassigns them to the nearest torch blocks to the camera on a throttled interval. Torch blocks always look emissive via material; only the N nearest actually cast dynamic light. If you add block types that emit light, integrate via this pool — do **not** add unbounded PointLights to the scene.

### Interaction modes

`BlockPlacer` and `TokenPlacer` are two raycasting-based input handlers. Only one is active at a time, governed by `ToolModeToggle` ("blocks" | "tokens"). `App.applyToolMode` flips `.active` on both. When adding a new tool mode, follow the same pattern — a single `active` boolean gate, not conditional registration.

`BlockPlacer` uses `face.normal` from the raycast hit to compute the neighbour voxel position for Minecraft-style stacking. `TokenPlacer` uses the same face-normal trick to place tokens on top of voxel surfaces (supports stairs, platforms, flying creatures on existing voxels).

### Identity (interim)

`LocalIdentity` is stored in `localStorage` as an MVP stub. `ensureIdentity()` shows a modal on first load; `openIdentityModal` lets the user edit. When editing, `App.editIdentity` **preserves the existing `uid`** so existing tokens keep the same owner — do not regenerate uid on edit. This whole layer is expected to be replaced by Firebase Auth in Fase 4.

### Map seeding

`MapGenerator.fromImage(world, '/map.png')` reads `public/map.png` asynchronously on startup and classifies pixels into block types + heights via HSL thresholds. This is seed content, not the world model — users still build on top via `BlockPlacer`.

### Camera

`CameraController` owns OrbitControls and exposes `setTokenFocusResolver(() => Vector3 | null)` which `App` fills in with "selected token, else own token". The indirection exists so the camera module doesn't need to know about tokens. Follow the same pattern (resolver callback) when the camera needs access to other subsystems.

## Conventions

- **No React.** Plain classes, DOM APIs, and Three.js. `src/ui/*` builds UI imperatively under `#ui` div.
- **Norwegian first.** UI strings, user-facing labels, and inline comments are in Norwegian. Keep code identifiers in English.
- **File layout mirrors `mvp.md` § Filstruktur.** When adding a new subsystem, place it in the module that matches the spec (`world/`, `camera/`, `interaction/`, `tokens/`, `fog/`, `multiplayer/`, `ui/`, `auth/`, `lobby/`).
- **Debug hook:** `App` assigns itself to `window.app` for manual QA in the browser console.
- **PosKey format is load-bearing** — `"x_y_z"` is chosen to match planned RTDB paths. Don't switch to a tuple or bitpacked int without also updating the sync plan in `mvp.md`.
