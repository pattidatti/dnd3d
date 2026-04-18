import { BlockType } from './BlockPalette';
import type { VoxelWorld } from './VoxelWorld';

/**
 * Demo-verden inspirert av en nordisk landsby med borg på lav høyde.
 *
 * Skala: 1 voxel = 1 fot. Karakter ~6 fot (`CHAR_HEIGHT = 5.9`), så
 * vegger er 8 blokker, dører 6 høye, borgmurer 12+, tårn >20.
 *
 * Layout (top-down, innenfor ±90 voxels):
 *   -Z (nord): borg på gresshøyde
 *    0 midt: landsby + åpen slette
 *   +Z (sør): sti inn, trær, dam
 */
export function populateDemoWorld(world: VoxelWorld): void {
  buildGroundPlain(world);
  buildGentleHills(world);
  buildPond(world);
  buildPath(world);
  buildVillage(world);
  buildCastle(world);
  scatterTrees(world);
}

// ─────────────────────────────────────────────────────────────────────
// Terreng
// ─────────────────────────────────────────────────────────────────────

const PLAIN_HALF = 80;

function buildGroundPlain(world: VoxelWorld): void {
  for (let x = -PLAIN_HALF; x <= PLAIN_HALF; x++) {
    for (let z = -PLAIN_HALF; z <= PLAIN_HALF; z++) {
      world.setBlock(x, 0, z, BlockType.Grass);
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

function buildPond(world: VoxelWorld): void {
  // Liten tjønn sørvest — diameter ~16 voxels (litt over 2 D&D-celler).
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
}

// ─────────────────────────────────────────────────────────────────────
// Sti
// ─────────────────────────────────────────────────────────────────────

function buildPath(world: VoxelWorld): void {
  // Sti fra sør (z=+70) opp til borgporten (rundt x=0, z=-28).
  // 5 voxels bred (1 D&D-celle).
  for (let t = 0; t <= 1.001; t += 0.008) {
    const z = Math.round(70 - t * 98);
    const x = Math.round(Math.sin(t * Math.PI * 1.3) * 18 * (1 - t));
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        setTopBlock(world, x + dx, z + dz, BlockType.Dirt);
      }
    }
  }
}

/** Finn høyeste eksisterende blokk i kolonnen (x,*,z) og bytt den til `type`. */
function setTopBlock(world: VoxelWorld, x: number, z: number, type: BlockType): void {
  for (let y = 12; y >= 0; y--) {
    if (world.hasBlock(x, y, z)) {
      world.setBlock(x, y, z, type);
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Landsby
// ─────────────────────────────────────────────────────────────────────

interface HouseSpec {
  x: number; // sørvestlig hjørne
  z: number;
  w: number; // bredde (langs x)
  d: number; // dybde (langs z)
  doorSide: 'south' | 'north' | 'east' | 'west';
}

// Vegghøyde (8) → tak starter på y=9. Karakter (5.9) kommer komfortabelt under.
const WALL_TOP = 8;

function buildVillage(world: VoxelWorld): void {
  const houses: HouseSpec[] = [
    { x: -34, z: 10, w: 12, d: 10, doorSide: 'south' },
    { x: -14, z: 18, w: 10, d: 8, doorSide: 'south' },
    { x: 10, z: 10, w: 12, d: 10, doorSide: 'south' },
    { x: -38, z: -10, w: 10, d: 10, doorSide: 'east' },
    { x: 18, z: -10, w: 10, d: 10, doorSide: 'west' },
    { x: -6, z: -4, w: 8, d: 6, doorSide: 'north' }, // liten bod
  ];
  for (const h of houses) buildHouse(world, h);

  // Lite gjerde med åpning foran landsbysentrum.
  for (let x = -9; x <= 5; x++) {
    if (x >= -2 && x <= 0) continue; // åpning
    world.setBlock(x, 1, 32, BlockType.Wood);
    world.setBlock(x, 2, 32, BlockType.Wood);
  }
}

function buildHouse(world: VoxelWorld, h: HouseSpec): void {
  const x0 = h.x;
  const z0 = h.z;
  const x1 = h.x + h.w - 1;
  const z1 = h.z + h.d - 1;

  // Gulv i puss.
  for (let x = x0; x <= x1; x++) {
    for (let z = z0; z <= z1; z++) {
      world.setBlock(x, 0, z, BlockType.Plaster);
    }
  }

  // Vegger — bjelkeverk. Nederste 2 rader i tre (sokkel),
  // midtsjikt i puss, øverste rad i tre (lekt under tak).
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

  // Døråpning — 6 høy, 2 bred, midt på valgt side (+Z = sør mot kamera).
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

  // Vindu — en 2×2-åpning i en langside (motsatt av døren hvis sør/nord).
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

  // Tak i gresstorv: full fotavtrykk med overheng på y=WALL_TOP+1,
  // innrykket ring på +2, mønestokk på +3.
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
  // Mønestokk langs lengste akse.
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

  // Pipe — 3 blokker i stein over mønet.
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
  // Sokkel (y=1-2) i tre, midtsjikt (y=3-6) i puss, topplekt (y=7-8) i tre.
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

  // Grønn borghøyde — stor nok til at muren får et tydelig "svev".
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

  const baseY = hillH + 1; // 9 — øverst på høyden
  const half = 11; // ytre ring ±11 → 23×23

  // Steinfundament — ett lag.
  for (let x = cx - half; x <= cx + half; x++) {
    for (let z = cz - half; z <= cz + half; z++) {
      world.setBlock(x, baseY, z, BlockType.Stone);
    }
  }

  // Ringmur: 12 blokker høy (y = baseY+1 .. baseY+12)
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

  // Kreneleringer — annenhver blokk langs ytterkant på wallTop+1.
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

  // Port — 3 bred, 7 høy, mot sør (+Z, mot kamera).
  for (let y = baseY + 1; y <= baseY + 7; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.removeBlock(cx + dx, y, cz + half);
    }
  }

  // Hjørnetårn — 5×5 basis, reiser seg 22 over baseY, med pyramidetak.
  const towerOffsets: Array<[number, number]> = [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ];
  for (const [ox, oz] of towerOffsets) {
    buildTower(world, cx + ox, cz + oz, baseY + 1, 22);
  }

  // Sentralt keep.
  buildKeep(world, cx, cz - 2, baseY + 1);
}

function buildTower(
  world: VoxelWorld,
  cx: number,
  cz: number,
  baseY: number,
  height: number,
): void {
  // 5×5 — klassisk hjørnetårn.
  const r = 2;
  for (let y = baseY; y < baseY + height; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // Hul fra y ≥ baseY+3 slik at man kan se igjennom vinduer.
        const onEdge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (onEdge) world.setBlock(cx + dx, y, cz + dz, BlockType.Stone);
        else if (y < baseY + 2) world.setBlock(cx + dx, y, cz + dz, BlockType.Stone);
      }
    }
  }
  // Skifer-kjegletak: 5×5 → 3×3 → 1×1.
  const roofBase = baseY + height;
  for (let step = 0; step <= r; step++) {
    const s = r - step;
    for (let dx = -s; dx <= s; dx++) {
      for (let dz = -s; dz <= s; dz++) {
        world.setBlock(cx + dx, roofBase + step, cz + dz, BlockType.Slate);
      }
    }
  }
  // Flaggstang.
  for (let i = 1; i <= 3; i++) {
    world.setBlock(cx, roofBase + r + i, cz, BlockType.Wood);
  }
}

function buildKeep(world: VoxelWorld, cx: number, cz: number, baseY: number): void {
  const r = 4; // 9×9
  const h = 18;
  for (let y = baseY; y < baseY + h; y++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const onEdge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (onEdge) world.setBlock(cx + dx, y, cz + dz, BlockType.Brick);
      }
    }
  }
  // Port inn til keep (sør) — 3 bred, 7 høy.
  for (let y = baseY; y <= baseY + 6; y++) {
    for (let dx = -1; dx <= 1; dx++) {
      world.removeBlock(cx + dx, y, cz + r);
    }
  }
  // Vinduer langs sidene.
  for (let y = baseY + 10; y <= baseY + 11; y++) {
    for (const side of [-r, r] as const) {
      world.removeBlock(cx - 2, y, cz + side);
      world.removeBlock(cx + 2, y, cz + side);
      world.removeBlock(cx + side, y, cz - 2);
      world.removeBlock(cx + side, y, cz + 2);
    }
  }
  // Skifer-pyramidetak, 9×9 → 1×1.
  const roofBase = baseY + h;
  for (let step = 0; step <= r; step++) {
    const s = r - step;
    for (let dx = -s; dx <= s; dx++) {
      for (let dz = -s; dz <= s; dz++) {
        world.setBlock(cx + dx, roofBase + step, cz + dz, BlockType.Slate);
      }
    }
  }
  // Langt spir.
  for (let i = 1; i <= 5; i++) {
    world.setBlock(cx, roofBase + r + i, cz, BlockType.Wood);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Trær
// ─────────────────────────────────────────────────────────────────────

function scatterTrees(world: VoxelWorld): void {
  const trees: Array<[number, number]> = [
    [-60, 20],
    [-65, -5],
    [55, 0],
    [65, 18],
    [-18, 45],
    [28, 50],
    [-40, -55],
    [45, -60],
    [72, 55],
    [-72, -40],
    [38, 28],
    [-16, 65],
    [-30, 30],
    [35, 45],
  ];
  for (const [x, z] of trees) buildTree(world, x, z);
}

function buildTree(world: VoxelWorld, x: number, z: number): void {
  // Hopp over dersom terrenget/bygg allerede okkuperer plassen.
  if (world.hasBlock(x, 1, z) && world.getBlock(x, 1, z) !== BlockType.Grass) return;
  if (world.hasBlock(x, 2, z)) return;

  const trunkH = 9 + ((Math.abs(x) + Math.abs(z)) % 4); // 9..12
  for (let y = 1; y <= trunkH; y++) {
    world.setBlock(x, y, z, BlockType.Trunk);
  }
  // Løvverk: avrundet "ball" i radius ~4.
  const cy = trunkH + 2;
  const R = 4;
  for (let dy = -2; dy <= 3; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dy * 1.2, dz);
        if (d > R) continue;
        // Ikke overskriv stammen nedenfor krona.
        if (dx === 0 && dz === 0 && dy < 0) continue;
        world.setBlock(x + dx, cy + dy, z + dz, BlockType.Leaf);
      }
    }
  }
}
