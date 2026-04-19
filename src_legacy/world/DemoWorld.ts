import { BlockType } from './BlockPalette';
import type { VoxelWorld } from './VoxelWorld';

/**
 * Demo-verden: en majestetisk nordisk landsby med borg, elv, fjell
 * og skoger som dekker hele det spillbare kartet (±240 voxels).
 *
 * Skala: 1 voxel = 1 fot. Karakter ~6 fot (`CHAR_HEIGHT = 5.9`), så
 * vegger er 8 blokker, dører 6 høye, borgmurer 12+, tårn 22+.
 *
 * Soner (top-down):
 *   Nord (-Z): fjellkjede + borg på gresshøyde
 *   Midt: landsby, åpen slette, elv med broer
 *   Sør (+Z): skog, farmlandsby, skogstjern
 *   Vest (-X): ruintårn, åser, fjellflanke
 *   Øst (+X): jorder, åser, fjellflanke
 */
export function populateDemoWorld(world: VoxelWorld): void {
  buildGroundPlain(world);
  buildMountains(world);
  buildGentleHills(world);
  buildRiver(world);
  buildPond(world);
  buildPath(world);
  buildRoads(world);
  buildBridges(world);
  buildVillage(world);
  buildFarmstead(world);
  buildCastle(world);
  buildRuinedTower(world);
  buildStandingStones(world);
  buildDock(world);
  buildFields(world);
  scatterTrees(world);
  scatterPineForests(world);
  scatterBoulders(world);
}

const MAP_HALF = 240; // fog dekker ±250; la en myk margin

// ─────────────────────────────────────────────────────────────────────
// Terreng
// ─────────────────────────────────────────────────────────────────────

function buildGroundPlain(world: VoxelWorld): void {
  for (let x = -MAP_HALF; x <= MAP_HALF; x++) {
    for (let z = -MAP_HALF; z <= MAP_HALF; z++) {
      world.setBlock(x, 0, z, BlockType.Grass);
    }
  }
}

/**
 * Tre fjellkjeder: nord (ryggrad), nordvest-hjørne, nordøst-hjørne.
 * Bygd som "skall" — kun ytre blokker for å spare instanser.
 */
function buildMountains(world: VoxelWorld): void {
  const ranges: Array<{ cx: number; cz: number; rx: number; rz: number; h: number }> = [
    // Nord — lang ryggrad
    { cx: 0, cz: -215, rx: 230, rz: 25, h: 40 },
    { cx: -140, cz: -180, rx: 70, rz: 35, h: 52 },
    { cx: 160, cz: -190, rx: 60, rz: 30, h: 46 },
    // Vest
    { cx: -220, cz: -40, rx: 25, rz: 80, h: 32 },
    { cx: -215, cz: 110, rx: 28, rz: 50, h: 28 },
    // Øst
    { cx: 225, cz: 30, rx: 20, rz: 90, h: 30 },
    { cx: 220, cz: -80, rx: 25, rz: 40, h: 34 },
    // Sør — lavere åsrygger
    { cx: -80, cz: 225, rx: 60, rz: 18, h: 18 },
    { cx: 120, cz: 220, rx: 50, rz: 16, h: 20 },
  ];

  for (const r of ranges) {
    for (let x = r.cx - r.rx; x <= r.cx + r.rx; x++) {
      for (let z = r.cz - r.rz; z <= r.cz + r.rz; z++) {
        const nx = (x - r.cx) / r.rx;
        const nz = (z - r.cz) / r.rz;
        // Mjuk dome med smårufsete topp via sin-variasjon
        const base = 1 - (nx * nx + nz * nz);
        if (base <= 0) continue;
        const noise =
          Math.sin(x * 0.21 + z * 0.17) * 0.08 +
          Math.sin(x * 0.07 - z * 0.13) * 0.12;
        const height = Math.max(0, Math.round(r.h * (base + noise)));
        if (height <= 0) continue;

        // Bygg kun "skall": topp + ytre rand-blokker.
        for (let y = 1; y <= height; y++) {
          const isTop = y === height;
          const isOuterLayer = y >= height - 2;
          if (!isTop && !isOuterLayer) {
            // Sjekk om blokken ville vært synlig ved å se om noen av naboene
            // er utenfor (eller lavere enn) fjellet. Forenklet: bygg ytre rand.
            const edgeDist = Math.min(
              r.cx + r.rx - x,
              x - (r.cx - r.rx),
              r.cz + r.rz - z,
              z - (r.cz - r.rz),
            );
            if (edgeDist > 2) continue;
          }
          // Topp i lysere fjelltone, resten stein, aller øverste med "snø"
          // (puss fungerer som lys topp).
          let type: BlockType;
          if (isTop && height >= 30) type = BlockType.Plaster;
          else if (y >= height - 1 && y > 10) type = BlockType.Slate;
          else type = BlockType.Stone;
          world.setBlock(x, y, z, type);
        }
      }
    }
  }
}

function buildGentleHills(world: VoxelWorld): void {
  const mounds: Array<{ cx: number; cz: number; r: number; h: number }> = [
    { cx: -55, cz: -30, r: 14, h: 4 },
    { cx: 58, cz: 35, r: 16, h: 4 },
    { cx: -30, cz: 60, r: 10, h: 2 },
    { cx: 45, cz: 65, r: 9, h: 2 },
    { cx: -70, cz: 45, r: 12, h: 3 },
    { cx: 100, cz: -40, r: 18, h: 5 },
    { cx: -110, cz: -90, r: 22, h: 6 },
    { cx: 140, cz: 90, r: 18, h: 4 },
    { cx: -150, cz: 140, r: 20, h: 5 },
    { cx: 175, cz: 140, r: 16, h: 4 },
    { cx: -60, cz: 180, r: 14, h: 3 },
    { cx: 80, cz: 170, r: 16, h: 4 },
  ];
  for (const m of mounds) {
    for (let x = m.cx - m.r; x <= m.cx + m.r; x++) {
      for (let z = m.cz - m.r; z <= m.cz + m.r; z++) {
        const d = Math.hypot(x - m.cx, z - m.cz);
        if (d > m.r) continue;
        const layers = Math.round(m.h * (1 - d / m.r));
        for (let y = 1; y <= layers; y++) {
          world.setBlock(x, y, z, BlockType.Grass);
        }
      }
    }
  }
}

/**
 * Elv som slynger seg fra nordvest (ved fjellfot) til sørøst.
 * Bredde ~7 voxels, sandkant, vann i midten.
 */
function buildRiver(world: VoxelWorld): void {
  const points: Array<[number, number]> = [];
  for (let t = 0; t <= 1.001; t += 0.005) {
    // Parametrisk kurve fra (-160, -120) til (200, 200)
    const baseX = -160 + t * 360;
    const baseZ = -120 + t * 320;
    const wobble = Math.sin(t * Math.PI * 4) * 28;
    const x = Math.round(baseX + wobble);
    const z = Math.round(baseZ + Math.cos(t * Math.PI * 3) * 18);
    points.push([x, z]);
  }
  const width = 4; // halv-bredde
  const bankW = 2;
  for (const [px, pz] of points) {
    for (let dx = -width - bankW; dx <= width + bankW; dx++) {
      for (let dz = -width - bankW; dz <= width + bankW; dz++) {
        const d = Math.hypot(dx, dz);
        if (d > width + bankW) continue;
        const x = px + dx;
        const z = pz + dz;
        // Ikke ødelegg fjell/eksisterende strukturer for mye
        if (world.getBlock(x, 1, z) === BlockType.Stone) continue;
        if (d <= width) {
          // Vann: fjern gress på y=0, legg vann
          world.setBlock(x, 0, z, BlockType.Water);
          // Fjern eventuelle haug-blokker over y=0
          for (let y = 1; y <= 8; y++) world.removeBlock(x, y, z);
        } else {
          // Sandkant
          world.setBlock(x, 0, z, BlockType.Sand);
        }
      }
    }
  }
}

function buildPond(world: VoxelWorld): void {
  // Skogtjern sørøst for landsbyen.
  const cx = -45;
  const cz = 40;
  const r = 8;
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d <= r - 2) {
        world.removeBlock(x, 0, z);
        world.setBlock(x, 0, z, BlockType.Water);
      } else if (d <= r) {
        world.setBlock(x, 0, z, BlockType.Sand);
      }
    }
  }

  // Ekstra lite tjern langt sørvest.
  const cx2 = -170;
  const cz2 = 160;
  for (let x = cx2 - 10; x <= cx2 + 10; x++) {
    for (let z = cz2 - 8; z <= cz2 + 8; z++) {
      const d = Math.hypot((x - cx2) * 0.8, z - cz2);
      if (d <= 6) {
        world.removeBlock(x, 0, z);
        world.setBlock(x, 0, z, BlockType.Water);
      } else if (d <= 8) {
        world.setBlock(x, 0, z, BlockType.Sand);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Stier og veier
// ─────────────────────────────────────────────────────────────────────

function buildPath(world: VoxelWorld): void {
  // Hovedsti fra sør (z=+70) opp til borgporten. 5 voxels bred.
  for (let t = 0; t <= 1.001; t += 0.008) {
    const z = Math.round(70 - t * 98);
    const x = Math.round(Math.sin(t * Math.PI * 1.3) * 18 * (1 - t));
    stampPath(world, x, z, 2);
  }
}

function buildRoads(world: VoxelWorld): void {
  // Landsbygate gjennom sentrum (øst-vest).
  for (let x = -50; x <= 30; x++) {
    for (let dz = -2; dz <= 2; dz++) {
      setTopBlock(world, x, dz, BlockType.Dirt);
    }
  }

  // Vei østover mot farmlandsbyen (start x=30, z=0 → (+140, +60)).
  for (let t = 0; t <= 1.001; t += 0.006) {
    const x = Math.round(30 + t * 110);
    const z = Math.round(Math.sin(t * Math.PI * 1.5) * 25 + t * 60);
    stampPath(world, x, z, 2);
  }

  // Vei vestover mot ruintårnet (start x=-50, z=0 → (-200, -120)).
  for (let t = 0; t <= 1.001; t += 0.006) {
    const x = Math.round(-50 - t * 150);
    const z = Math.round(Math.sin(t * Math.PI * 1.8) * 20 - t * 120);
    stampPath(world, x, z, 2);
  }

  // Sørlig vei ut i skogen.
  for (let t = 0; t <= 1.001; t += 0.006) {
    const x = Math.round(Math.sin(t * Math.PI * 2.2) * 35 - 30 * t);
    const z = Math.round(70 + t * 150);
    stampPath(world, x, z, 2);
  }
}

function stampPath(world: VoxelWorld, cx: number, cz: number, r: number): void {
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
      setTopBlock(world, cx + dx, cz + dz, BlockType.Dirt);
    }
  }
}

function setTopBlock(world: VoxelWorld, x: number, z: number, type: BlockType): void {
  for (let y = 20; y >= 0; y--) {
    if (world.hasBlock(x, y, z)) {
      const cur = world.getBlock(x, y, z);
      // Ikke overskriv stein/vann/stein-topper
      if (cur === BlockType.Stone || cur === BlockType.Slate || cur === BlockType.Water) return;
      world.setBlock(x, y, z, type);
      return;
    }
  }
}

function buildBridges(world: VoxelWorld): void {
  // To bruer over elven på strategiske kryssinger.
  const bridges: Array<{ x: number; z: number; horiz: boolean }> = [
    { x: 50, z: 30, horiz: true },
    { x: 130, z: 110, horiz: true },
  ];
  for (const b of bridges) {
    const len = 18;
    if (b.horiz) {
      // Bru langs X-aksen, bred 5
      for (let dx = -len / 2; dx <= len / 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          world.setBlock(b.x + dx, 1, b.z + dz, BlockType.Wood);
        }
      }
      // Rekkverk
      for (let dx = -len / 2; dx <= len / 2; dx += 3) {
        world.setBlock(b.x + dx, 2, b.z - 2, BlockType.Trunk);
        world.setBlock(b.x + dx, 3, b.z - 2, BlockType.Trunk);
        world.setBlock(b.x + dx, 2, b.z + 2, BlockType.Trunk);
        world.setBlock(b.x + dx, 3, b.z + 2, BlockType.Trunk);
      }
      // Hengeplanke langs rekkverk
      for (let dx = -len / 2; dx <= len / 2; dx++) {
        world.setBlock(b.x + dx, 3, b.z - 2, BlockType.Wood);
        world.setBlock(b.x + dx, 3, b.z + 2, BlockType.Wood);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Landsby (sentral)
// ─────────────────────────────────────────────────────────────────────

interface HouseSpec {
  x: number; // sørvestlig hjørne
  z: number;
  w: number;
  d: number;
  doorSide: 'south' | 'north' | 'east' | 'west';
}

const WALL_TOP = 8;

function buildVillage(world: VoxelWorld): void {
  const houses: HouseSpec[] = [
    { x: -34, z: 10, w: 12, d: 10, doorSide: 'south' },
    { x: -14, z: 18, w: 10, d: 8, doorSide: 'south' },
    { x: 10, z: 10, w: 12, d: 10, doorSide: 'south' },
    { x: -38, z: -10, w: 10, d: 10, doorSide: 'east' },
    { x: 18, z: -10, w: 10, d: 10, doorSide: 'west' },
    { x: -6, z: -4, w: 8, d: 6, doorSide: 'north' }, // bod
    { x: -60, z: -5, w: 12, d: 12, doorSide: 'east' }, // større hall
  ];
  for (const h of houses) buildHouse(world, h);

  // Gjerde med åpning foran landsbysentrum.
  for (let x = -9; x <= 5; x++) {
    if (x >= -2 && x <= 0) continue;
    world.setBlock(x, 1, 32, BlockType.Wood);
    world.setBlock(x, 2, 32, BlockType.Wood);
  }

  // Brønn i sentrum.
  buildWell(world, 0, 5);
}

function buildFarmstead(world: VoxelWorld): void {
  // Mindre landsby mot øst — låve + to hytter.
  buildHouse(world, { x: 130, z: 50, w: 16, d: 12, doorSide: 'west' }); // låve
  buildHouse(world, { x: 110, z: 70, w: 10, d: 8, doorSide: 'south' });
  buildHouse(world, { x: 148, z: 78, w: 10, d: 8, doorSide: 'west' });
  buildWell(world, 128, 68);
}

function buildWell(world: VoxelWorld, cx: number, cz: number): void {
  // Steinkrans + treoverbygg.
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (Math.abs(dx) === 1 || Math.abs(dz) === 1) {
        world.setBlock(cx + dx, 1, cz + dz, BlockType.Stone);
      } else {
        // Vann i bunn
        world.setBlock(cx + dx, 0, cz + dz, BlockType.Water);
      }
    }
  }
  // Støtter
  for (let y = 2; y <= 5; y++) {
    world.setBlock(cx - 1, y, cz - 1, BlockType.Trunk);
    world.setBlock(cx + 1, y, cz - 1, BlockType.Trunk);
    world.setBlock(cx - 1, y, cz + 1, BlockType.Trunk);
    world.setBlock(cx + 1, y, cz + 1, BlockType.Trunk);
  }
  // Tak
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      world.setBlock(cx + dx, 6, cz + dz, BlockType.Roof);
    }
  }
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(cx + dx, 7, cz + dz, BlockType.Roof);
    }
  }
  world.setBlock(cx, 8, cz, BlockType.Roof);
}

function buildHouse(world: VoxelWorld, h: HouseSpec): void {
  const x0 = h.x;
  const z0 = h.z;
  const x1 = h.x + h.w - 1;
  const z1 = h.z + h.d - 1;

  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      world.setBlock(x, 0, z, BlockType.Plaster);
    }
  }

  for (let y = 1; y <= WALL_TOP; y++) {
    for (let x = x0; x <= x1; x++) {
      placeWall(world, x, y, z0, h);
      placeWall(world, x, y, z1, h);
    }
    for (let z = z0; z <= z1; z++) {
      placeWall(world, x0, y, z, h);
      placeWall(world, x1, y, z, h);
    }
  }

  const doorHeight = 6;
  if (h.doorSide === 'south' || h.doorSide === 'north') {
    const cx = Math.floor((x0 + x1) / 2);
    const dz = h.doorSide === 'south' ? z1 : z0;
    for (let y = 1; y <= doorHeight; y++) {
      world.removeBlock(cx, y, dz);
      world.removeBlock(cx + 1, y, dz);
    }
  } else {
    const cz = Math.floor((z0 + z1) / 2);
    const dx = h.doorSide === 'east' ? x1 : x0;
    for (let y = 1; y <= doorHeight; y++) {
      world.removeBlock(dx, y, cz);
      world.removeBlock(dx, y, cz + 1);
    }
  }

  // Vindu motsatt dør.
  if (h.doorSide === 'south' || h.doorSide === 'north') {
    const wz = h.doorSide === 'south' ? z0 : z1;
    const wx = Math.floor((x0 + x1) / 2);
    for (let y = 4; y <= 5; y++) {
      world.removeBlock(wx, y, wz);
      world.removeBlock(wx + 1, y, wz);
    }
  } else {
    const wx = h.doorSide === 'east' ? x0 : x1;
    const wz = Math.floor((z0 + z1) / 2);
    for (let y = 4; y <= 5; y++) {
      world.removeBlock(wx, y, wz);
      world.removeBlock(wx, y, wz + 1);
    }
  }

  // Gresstorv-tak
  const rBase = WALL_TOP + 1;
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    for (let z = z0 - 1; z <= z1 + 1; z++) {
      world.setBlock(x, rBase, z, BlockType.Grass);
    }
  }
  for (let x = x0 + 1; x <= x1 - 1; x++) {
    for (let z = z0 + 1; z <= z1 - 1; z++) {
      world.setBlock(x, rBase + 1, z, BlockType.Grass);
    }
  }
  const cxMid = Math.floor((x0 + x1) / 2);
  const czMid = Math.floor((z0 + z1) / 2);
  if (h.w >= h.d) {
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      world.setBlock(x, rBase + 2, czMid, BlockType.Grass);
    }
  } else {
    for (let z = z0 + 2; z <= z1 - 2; z++) {
      world.setBlock(cxMid, rBase + 2, z, BlockType.Grass);
    }
  }

  for (let dy = 0; dy < 3; dy++) {
    world.setBlock(cxMid, rBase + 3 + dy, czMid, BlockType.Stone);
  }
}

function placeWall(world: VoxelWorld, x: number, y: number, z: number, h: HouseSpec): void {
  const isCorner =
    (x === h.x || x === h.x + h.w - 1) && (z === h.z || z === h.z + h.d - 1);
  if (isCorner) {
    world.setBlock(x, y, z, BlockType.Trunk);
    return;
  }
  let type: BlockType;
  if (y <= 2) type = BlockType.Wood;
  else if (y >= 7) type = BlockType.Wood;
  else type = BlockType.Plaster;
  world.setBlock(x, y, z, type);
}

// ─────────────────────────────────────────────────────────────────────
// Borg
// ─────────────────────────────────────────────────────────────────────

function buildCastle(world: VoxelWorld): void {
  const cx = 0;
  const cz = -55;

  const hillR = 28;
  const hillH = 8;
  for (let x = cx - hillR; x <= cx + hillR; x++) {
    for (let z = cz - hillR; z <= cz + hillR; z++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > hillR) continue;
      const layers = Math.round(hillH * (1 - d / hillR));
      for (let y = 1; y <= layers; y++) {
        world.setBlock(x, y, z, BlockType.Grass);
      }
    }
  }

  const baseY = hillH + 1;
  const half = 11;

  for (let x = cx - half; x <= cx + half; x++) {
    for (let z = cz - half; z <= cz + half; z++) {
      world.setBlock(x, baseY, z, BlockType.Stone);
    }
  }

  const wallHeight = 12;
  const wallTop = baseY + wallHeight;
  for (let y = baseY + 1; y <= wallTop; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      world.setBlock(x, y, cz - half, BlockType.Stone);
      world.setBlock(x, y, cz + half, BlockType.Stone);
    }
    for (let z = cz - half; z <= cz + half; z++) {
      world.setBlock(cx - half, y, z, BlockType.Stone);
      world.setBlock(cx + half, y, z, BlockType.Stone);
    }
  }

  const crenY = wallTop + 1;
  for (let x = cx - half; x <= cx + half; x++) {
    if ((x - (cx - half)) % 2 === 0) {
      world.setBlock(x, crenY, cz - half, BlockType.Stone);
      world.setBlock(x, crenY, cz + half, BlockType.Stone);
    }
  }
  for (let z = cz - half + 1; z <= cz + half - 1; z++) {
    if ((z - (cz - half)) % 2 === 0) {
      world.setBlock(cx - half, crenY, z, BlockType.Stone);
      world.setBlock(cx + half, crenY, z, BlockType.Stone);
    }
  }

  // Port
  for (let y = baseY + 1; y <= baseY + 7; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.removeBlock(cx + dx, y, cz + half);
    }
  }

  const towerOffsets: Array<[number, number]> = [
    [-half, -half], [half, -half], [-half, half], [half, half],
  ];
  for (const [ox, oz] of towerOffsets) {
    buildTower(world, cx + ox, cz + oz, baseY + 1, 22);
  }

  buildKeep(world, cx, cz - 2, baseY + 1);
}

function buildTower(
  world: VoxelWorld,
  cx: number,
  cz: number,
  baseY: number,
  height: number,
): void {
  const r = 2;
  for (let y = baseY; y < baseY + height; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const onEdge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (onEdge) world.setBlock(cx + dx, y, cz + dz, BlockType.Stone);
        else if (y < baseY + 2) world.setBlock(cx + dx, y, cz + dz, BlockType.Stone);
      }
    }
  }
  const roofBase = baseY + height;
  for (let step = 0; step <= r; step++) {
    const s = r - step;
    for (let dx = -s; dx <= s; dx++) {
      for (let dz = -s; dz <= s; dz++) {
        world.setBlock(cx + dx, roofBase + step, cz + dz, BlockType.Slate);
      }
    }
  }
  for (let i = 1; i <= 3; i++) {
    world.setBlock(cx, roofBase + r + i, cz, BlockType.Wood);
  }
}

function buildKeep(world: VoxelWorld, cx: number, cz: number, baseY: number): void {
  const r = 4;
  const h = 18;
  for (let y = baseY; y < baseY + h; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const onEdge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (onEdge) world.setBlock(cx + dx, y, cz + dz, BlockType.Brick);
      }
    }
  }
  for (let y = baseY; y <= baseY + 6; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.removeBlock(cx + dx, y, cz + r);
    }
  }
  for (let y = baseY + 10; y <= baseY + 11; y++) {
    for (const side of [-r, r] as const) {
      world.removeBlock(cx - 2, y, cz + side);
      world.removeBlock(cx + 2, y, cz + side);
      world.removeBlock(cx + side, y, cz - 2);
      world.removeBlock(cx + side, y, cz + 2);
    }
  }
  const roofBase = baseY + h;
  for (let step = 0; step <= r; step++) {
    const s = r - step;
    for (let dx = -s; dx <= s; dx++) {
      for (let dz = -s; dz <= s; dz++) {
        world.setBlock(cx + dx, roofBase + step, cz + dz, BlockType.Slate);
      }
    }
  }
  for (let i = 1; i <= 5; i++) {
    world.setBlock(cx, roofBase + r + i, cz, BlockType.Wood);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Ruintårn
// ─────────────────────────────────────────────────────────────────────

function buildRuinedTower(world: VoxelWorld): void {
  const cx = -200;
  const cz = -130;
  const r = 3;
  const height = 18;

  // Ru-nedslitte vegger — med hull
  for (let y = 1; y <= height; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const onEdge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (!onEdge) continue;
        // Hopp over noen blokker for ruin-effekt
        const gap = (dx * 3 + dz * 5 + y * 7) % 11;
        if (gap < 3 && y > 8) continue;
        if (y === height && gap < 5) continue;
        world.setBlock(cx + dx, y, cz + dz, BlockType.Stone);
      }
    }
  }
  // Noen fallne blokker rundt basen
  const rubble: Array<[number, number, number]> = [
    [cx + 5, 1, cz + 1], [cx + 5, 2, cz + 1],
    [cx - 5, 1, cz - 2], [cx - 6, 1, cz + 2],
    [cx + 2, 1, cz + 6], [cx - 3, 1, cz - 5],
    [cx + 6, 1, cz - 4],
  ];
  for (const [x, y, z] of rubble) {
    world.setBlock(x, y, z, BlockType.Stone);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Steinsirkel
// ─────────────────────────────────────────────────────────────────────

function buildStandingStones(world: VoxelWorld): void {
  const cx = -130;
  const cz = 90;
  const r = 10;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(angle) * r);
    const z = Math.round(cz + Math.sin(angle) * r);
    const height = 5 + (i % 3);
    for (let y = 1; y <= height; y++) {
      world.setBlock(x, y, z, BlockType.Slate);
    }
    // Lite "topp" for hvert annet
    if (i % 2 === 0) {
      world.setBlock(x, height + 1, z, BlockType.Slate);
    }
  }
  // Alter i midten
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      world.setBlock(cx + dx, 1, cz + dz, BlockType.Slate);
    }
  }
  world.setBlock(cx, 2, cz, BlockType.Slate);
}

// ─────────────────────────────────────────────────────────────────────
// Brygge / jorder
// ─────────────────────────────────────────────────────────────────────

function buildDock(world: VoxelWorld): void {
  // Brygge ved sørvestre tjern.
  const cx = -158;
  const cz = 158;
  for (let dx = 0; dx <= 8; dx++) {
    world.setBlock(cx + dx, 1, cz, BlockType.Wood);
    world.setBlock(cx + dx, 1, cz + 1, BlockType.Wood);
  }
  // Pullerter
  world.setBlock(cx + 8, 2, cz, BlockType.Trunk);
  world.setBlock(cx + 8, 2, cz + 1, BlockType.Trunk);
}

function buildFields(world: VoxelWorld): void {
  // Jorder rundt farmlandsbyen — dirt-ruter med tre-gjerde.
  const fields: Array<{ x: number; z: number; w: number; d: number }> = [
    { x: 110, z: 30, w: 20, d: 15 },
    { x: 160, z: 95, w: 18, d: 14 },
    { x: 90, z: 95, w: 14, d: 12 },
  ];
  for (const f of fields) {
    for (let x = f.x; x < f.x + f.w; x++) {
      for (let z = f.z; z < f.z + f.d; z++) {
        setTopBlock(world, x, z, BlockType.Dirt);
      }
    }
    // Gjerde-staur rundt
    for (let x = f.x - 1; x <= f.x + f.w; x += 3) {
      world.setBlock(x, 1, f.z - 1, BlockType.Trunk);
      world.setBlock(x, 1, f.z + f.d, BlockType.Trunk);
    }
    for (let z = f.z - 1; z <= f.z + f.d; z += 3) {
      world.setBlock(f.x - 1, 1, z, BlockType.Trunk);
      world.setBlock(f.x + f.w, 1, z, BlockType.Trunk);
    }
    // "Avling" — leaf-blokker i rader
    for (let x = f.x + 1; x < f.x + f.w - 1; x += 2) {
      for (let z = f.z + 1; z < f.z + f.d - 1; z++) {
        world.setBlock(x, 1, z, BlockType.Leaf);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Trær og skog
// ─────────────────────────────────────────────────────────────────────

function scatterTrees(world: VoxelWorld): void {
  // Spredte løvtrær nær sentrum.
  const trees: Array<[number, number]> = [
    [-60, 20], [-65, -5], [55, 0], [65, 18], [-18, 45],
    [28, 50], [-40, -55], [45, -60], [72, 55], [-72, -40],
    [38, 28], [-16, 65], [-30, 30], [35, 45], [-85, 10],
    [85, -10], [-95, -30], [95, 40], [-110, 80], [115, 65],
  ];
  for (const [x, z] of trees) buildTree(world, x, z);
}

function scatterPineForests(world: VoxelWorld): void {
  // Tre skogsoner med dense furutrær.
  const forests: Array<{ cx: number; cz: number; r: number; count: number }> = [
    { cx: -130, cz: 140, r: 40, count: 55 },
    { cx: 150, cz: 160, r: 35, count: 45 },
    { cx: -170, cz: 0, r: 40, count: 50 },
    { cx: 90, cz: -130, r: 35, count: 40 },
  ];
  for (const f of forests) {
    let placed = 0;
    let seed = f.cx * 31 + f.cz * 17;
    for (let attempt = 0; attempt < f.count * 3 && placed < f.count; attempt++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const ang = (seed % 10000) / 10000 * Math.PI * 2;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const rad = (seed % 10000) / 10000 * f.r;
      const x = Math.round(f.cx + Math.cos(ang) * rad);
      const z = Math.round(f.cz + Math.sin(ang) * rad);
      if (buildPine(world, x, z)) placed++;
    }
  }
}

function buildTree(world: VoxelWorld, x: number, z: number): boolean {
  // Grunn må være gress, og ikke noe annet allerede der.
  const ground = world.getBlock(x, 0, z);
  if (ground !== BlockType.Grass) return false;
  if (world.hasBlock(x, 1, z)) return false;
  if (world.hasBlock(x, 2, z)) return false;

  const trunkH = 9 + ((Math.abs(x) + Math.abs(z)) % 4); // 9..12
  for (let y = 1; y <= trunkH; y++) {
    world.setBlock(x, y, z, BlockType.Trunk);
  }
  const cy = trunkH + 2;
  const R = 4;
  for (let dy = -2; dy <= 3; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dy * 1.2, dz);
        if (d > R) continue;
        if (dx === 0 && dz === 0 && dy < 0) continue;
        world.setBlock(x + dx, cy + dy, z + dz, BlockType.Leaf);
      }
    }
  }
  return true;
}

function buildPine(world: VoxelWorld, x: number, z: number): boolean {
  const ground = world.getBlock(x, 0, z);
  if (ground !== BlockType.Grass) return false;
  if (world.hasBlock(x, 1, z)) return false;

  const trunkH = 11 + ((Math.abs(x) + Math.abs(z) * 3) % 5); // 11..15
  for (let y = 1; y <= trunkH; y++) {
    world.setBlock(x, y, z, BlockType.Trunk);
  }
  // Furutre: flere lag med krympende radius (koniform).
  const layers = 4;
  let r = 3;
  let y = trunkH - 3;
  for (let i = 0; i < layers; i++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.hypot(dx, dz) > r) continue;
        // Ikke overskriv stammen nede
        if (dx === 0 && dz === 0 && i < layers - 1) continue;
        world.setBlock(x + dx, y + i * 2, z + dz, BlockType.Leaf);
      }
    }
    r = Math.max(1, r - 1);
  }
  // Topp-spiss
  world.setBlock(x, trunkH + 4, z, BlockType.Leaf);
  return true;
}

function scatterBoulders(world: VoxelWorld): void {
  // Kampesteiner spredt rundt for mer detalj.
  const boulders: Array<[number, number, number]> = [
    [-95, 100, 2], [110, -50, 3], [-50, -140, 2], [150, -30, 2],
    [-180, 50, 3], [40, 150, 2], [-140, -60, 2], [170, 110, 3],
    [-40, 200, 2], [60, -180, 2], [-75, 150, 2], [180, 60, 2],
  ];
  for (const [x, z, r] of boulders) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dy = 0; dy < r; dy++) {
          const d = Math.hypot(dx, dy * 1.3, dz);
          if (d > r) continue;
          world.setBlock(x + dx, 1 + dy, z + dz, BlockType.Stone);
        }
      }
    }
  }
}
