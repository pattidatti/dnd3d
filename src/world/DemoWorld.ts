import { BIOME, type Terrain } from './Terrain';
import { PropWorld, randomPropId } from './PropWorld';

function place(
  world: PropWorld,
  terrain: Terrain,
  key: string,
  wx: number,
  wz: number,
  rotY: number,
  scale: number,
): void {
  world.add({
    id: randomPropId(),
    assetKey: key,
    x: wx,
    y: terrain.sampleHeight(wx, wz),
    z: wz,
    rotY,
    scale,
  });
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(ix: number, iz: number, cx: number, cz: number, r: number, h: number): number {
  const dx = ix - cx;
  const dz = iz - cz;
  return h * Math.exp(-(dx * dx + dz * dz) / (r * r));
}

export function populateDemoTerrain(terrain: Terrain): void {
  const { widthCells, depthCells } = terrain;

  for (let iz = 0; iz <= depthCells; iz++) {
    for (let ix = 0; ix <= widthCells; ix++) {
      const nx = ix / widthCells - 0.5;
      const nz = iz / depthCells - 0.5;

      let h =
        Math.sin(nx * 5.0) * Math.cos(nz * 4.0) * 0.7 +
        Math.sin(nx * 11.0 + nz * 8.0) * 0.25;

      h += gauss(ix, iz, 27, 27, 13, 9.0);
      h += gauss(ix, iz, 73, 18, 8, 14.0);
      h += gauss(ix, iz, 81, 26, 7, 11.0);
      h += gauss(ix, iz, 67, 30, 6, 8.0);
      h += gauss(ix, iz, 45, 73, 10, 5.0);
      h += gauss(ix, iz, 60, 76, 8, 4.5);
      h += gauss(ix, iz, 35, 68, 7, 4.0);
      h -= gauss(ix, iz, 5, 50, 18, 2.5);

      const riverIz = 50 + Math.sin(ix * 0.14) * 6;
      const distRiver = Math.abs(iz - riverIz);
      if (distRiver < 6) h -= (1.0 - distRiver / 6) * 2.5;

      const townDist = Math.sqrt((ix - 78) ** 2 + (iz - 52) ** 2);
      if (townDist < 11) {
        const blend = Math.max(0, 1 - townDist / 11);
        h = h * (1 - blend) + 3.5 * blend;
      }

      terrain.setVertexHeight(ix, iz, h);
    }
  }

  for (let iz = 0; iz < depthCells; iz++) {
    for (let ix = 0; ix < widthCells; ix++) {
      const nx = (ix + 0.5) / widthCells - 0.5;
      const nz = (iz + 0.5) / depthCells - 0.5;
      const edge = Math.max(Math.abs(nx), Math.abs(nz));

      const wx = (ix - 50 + 0.5) * 5;
      const wz = (iz - 50 + 0.5) * 5;
      const h = terrain.sampleHeight(wx, wz);

      const riverIzF = 50 + Math.sin(ix * 0.14) * 6;
      const distRiver = Math.abs(iz + 0.5 - riverIzF);

      const roadIz = 27 + 25 * (ix - 27) / 51;
      const onRoad =
        ix >= 27 && ix <= 78 &&
        Math.abs(iz + 0.5 - roadIz) < 1.3 &&
        h > 0.5 && h < 8;

      let b: number;
      if (edge > 0.46) {
        b = BIOME.Sand;
      } else if (h > 10.0) {
        b = BIOME.Snow;
      } else if (h > 6.0) {
        b = BIOME.Rock;
      } else if (h < 0.0 && distRiver < 2.5) {
        b = BIOME.Water;
      } else if (h < 1.5 && distRiver < 5) {
        b = BIOME.Sand;
      } else if (onRoad) {
        b = BIOME.Path;
      } else {
        b = BIOME.Grass;
      }

      terrain.setBiome(ix, iz, b as 0 | 1 | 2 | 3 | 4 | 5);
    }
  }
}

export function populateDemoProps(world: PropWorld, terrain: Terrain): void {
  const rand = mulberry32(0xdeadbeef);
  const r = rand;
  const PI = Math.PI;

  // ──────────────────────────────────────────────
  // 1. BORGEN — NV-platå, sentrum (-115, -115)
  // ──────────────────────────────────────────────
  {
    const cx = -115;
    const cz = -115;
    const half = 30;
    const ws = 5.0;
    const ts = 5.5;

    // Hjørnetårn
    place(world, terrain, 'castle_tower_square', cx - half, cz - half, 0,       ts);
    place(world, terrain, 'castle_tower_square', cx + half, cz - half, PI / 2,  ts);
    place(world, terrain, 'castle_tower_square', cx - half, cz + half, -PI / 2, ts);
    place(world, terrain, 'castle_tower_square', cx + half, cz + half, PI,      ts);

    // Nordvegg + overgangs-hjørnestykker
    for (let i = -2; i <= 2; i++) {
      place(world, terrain, 'castle_wall', cx + i * 10, cz - half, 0, ws);
    }
    place(world, terrain, 'castle_wall_corner', cx - half + 7, cz - half, 0,      ws * 0.9);
    place(world, terrain, 'castle_wall_corner', cx + half - 7, cz - half, PI / 2, ws * 0.9);

    // Sørvegg med port
    place(world, terrain, 'castle_wall',        cx - 20, cz + half, PI, ws);
    place(world, terrain, 'castle_wall',        cx - 10, cz + half, PI, ws);
    place(world, terrain, 'castle_gate',        cx,      cz + half, PI, ws);
    place(world, terrain, 'castle_wall',        cx + 10, cz + half, PI, ws);
    place(world, terrain, 'castle_wall',        cx + 20, cz + half, PI, ws);
    place(world, terrain, 'castle_bridge_draw', cx,      cz + half + 6, PI, ws);
    place(world, terrain, 'castle_bridge_pillar', cx - 8, cz + half + 3, 0, 4.5);
    place(world, terrain, 'castle_bridge_pillar', cx + 8, cz + half + 3, 0, 4.5);
    place(world, terrain, 'castle_wall_corner', cx - half + 7, cz + half, -PI / 2, ws * 0.9);
    place(world, terrain, 'castle_wall_corner', cx + half - 7, cz + half, PI,      ws * 0.9);

    // Øst- og vestvegger
    for (let i = -2; i <= 2; i++) {
      place(world, terrain, 'castle_wall', cx + half, cz + i * 10,  PI / 2,  ws);
      place(world, terrain, 'castle_wall', cx - half, cz + i * 10, -PI / 2,  ws);
    }
    place(world, terrain, 'castle_wall_pillar', cx + half, cz - half + 18,  PI / 2,  4.0);
    place(world, terrain, 'castle_wall_pillar', cx - half, cz - half + 18, -PI / 2,  4.0);

    // Indre hold — sekskant-tårn i nordlig gårdsplass
    {
      const ikx = cx;
      const ikz = cz - 8;
      const ikh = 12;

      place(world, terrain, 'castle_wall',         ikx - ikh, ikz - ikh,  0,       4.5);
      place(world, terrain, 'castle_wall_doorway', ikx,       ikz - ikh,  0,       4.5);
      place(world, terrain, 'castle_wall',         ikx + ikh, ikz - ikh,  0,       4.5);
      place(world, terrain, 'castle_wall',         ikx - ikh, ikz + ikh,  PI,      4.5);
      place(world, terrain, 'castle_wall_doorway', ikx,       ikz + ikh,  PI,      4.5);
      place(world, terrain, 'castle_wall',         ikx + ikh, ikz + ikh,  PI,      4.5);
      place(world, terrain, 'castle_wall',         ikx - ikh, ikz,       -PI / 2,  4.5);
      place(world, terrain, 'castle_wall',         ikx + ikh, ikz,        PI / 2,  4.5);

      place(world, terrain, 'castle_tower_hex_base', ikx, ikz, 0, 6.0);
      place(world, terrain, 'castle_tower_hex_mid',  ikx, ikz, 0, 6.0);
      place(world, terrain, 'castle_tower_hex_roof', ikx, ikz, 0, 6.0);
      place(world, terrain, 'castle_door',           ikx, ikz + ikh, PI,  4.0);
      place(world, terrain, 'castle_stairs_stone',   ikx, ikz + ikh + 5, PI, 4.5);
    }

    // Beleiringsscene utenfor sørmuren
    place(world, terrain, 'castle_siege_tower', cx - 45, cz + half + 20, PI,  5.5);
    place(world, terrain, 'castle_siege_ram',   cx + 8,  cz + half + 18, PI,  5.0);
    place(world, terrain, 'castle_trebuchet',   cx - 55, cz + half + 12, 0.8, 5.0);
    place(world, terrain, 'castle_catapult',    cx + 35, cz + half + 15, 2.1, 5.0);
    place(world, terrain, 'castle_ballista',    cx - 30, cz + half + 25, 4.5, 4.5);

    // Flagg og bannere
    place(world, terrain, 'castle_flag',              cx - half, cz - half, 0,  ws);
    place(world, terrain, 'castle_flag',              cx + half, cz - half, 0,  ws);
    place(world, terrain, 'castle_flag',              cx - half, cz + half, 0,  ws);
    place(world, terrain, 'castle_flag',              cx + half, cz + half, 0,  ws);
    place(world, terrain, 'castle_flag_pennant',      cx - half, cz,        0,  4.0);
    place(world, terrain, 'castle_flag_pennant',      cx + half, cz,        0,  4.0);
    place(world, terrain, 'castle_flag_banner_long',  cx,        cz - half, 0,  4.0);
    place(world, terrain, 'castle_flag_banner_long',  cx,        cz + half, 0,  4.0);
    place(world, terrain, 'castle_flag_banner_short', cx - half, cz,        0,  3.5);
    place(world, terrain, 'castle_flag_banner_short', cx + half, cz,        0,  3.5);

    // Natur og detaljer inne i borgen
    place(world, terrain, 'castle_tree_large',  cx - 15, cz + 8,  1.2, 4.5);
    place(world, terrain, 'castle_tree_large',  cx + 15, cz + 8,  3.7, 4.5);
    place(world, terrain, 'castle_tree_small',  cx - 18, cz - 18, 0.9, 4.0);
    place(world, terrain, 'castle_tree_small',  cx + 18, cz - 18, 2.3, 4.0);
    place(world, terrain, 'castle_tree_trunk',  cx - 8,  cz + 18, 1.5, 3.5);
    place(world, terrain, 'castle_rocks_large', cx - 22, cz + 12, 0.5, 4.0);
    place(world, terrain, 'castle_rocks_small', cx + 12, cz - 22, 2.1, 3.5);
    place(world, terrain, 'castle_rocks_small', cx + 22, cz + 8,  3.8, 3.5);

    place(world, terrain, 'castle_stairs_stone',    cx,           cz + half - 8,  PI,      4.5);
    place(world, terrain, 'castle_stairs_stone_sq', cx - half + 8, cz,           -PI / 2,  4.0);

    // Beleirings-leir utenfor
    place(world, terrain, 'tent_smallClosed', cx - 60, cz + half + 30, 1.5, 4.5);
    place(world, terrain, 'tent_smallOpen',   cx + 45, cz + half + 30, 4.0, 4.5);
    place(world, terrain, 'campfire_logs',    cx - 15, cz + half + 22, 0,   4.0);
  }

  // ──────────────────────────────────────────────
  // 2. RUINERT FORVAKT — NV-skråninga (-152, -142)
  // ──────────────────────────────────────────────
  {
    const rcx = -152, rcz = -142;

    place(world, terrain, 'castle_wall',        rcx - 10, rcz - 8,  0,       4.5);
    place(world, terrain, 'castle_wall_half',   rcx + 2,  rcz - 8,  0,       4.0);
    place(world, terrain, 'castle_wall_corner', rcx - 10, rcz - 8,  0,       4.0);
    place(world, terrain, 'castle_wall',        rcx - 10, rcz + 2, -PI / 2,  4.5);
    place(world, terrain, 'castle_wall_pillar', rcx - 10, rcz + 10, 0,       3.5);
    place(world, terrain, 'castle_wall',        rcx + 10, rcz - 8,  PI / 2,  4.5);
    place(world, terrain, 'castle_wall_half',   rcx + 10, rcz,      PI / 2,  4.0);

    place(world, terrain, 'town_fence_broken', rcx - 5,  rcz + 12, 0.3,  3.5);
    place(world, terrain, 'town_fence_broken', rcx + 3,  rcz + 14, -0.2, 3.5);
    place(world, terrain, 'town_fence',        rcx + 10, rcz + 12, 0,    3.5);

    place(world, terrain, 'campfire_logs',      rcx + 2, rcz + 2, 0,   3.5);
    place(world, terrain, 'castle_rocks_small', rcx + 6, rcz + 5, 2.1, 3.5);
    place(world, terrain, 'castle_rocks_large', rcx - 6, rcz + 6, 0.5, 3.5);
    place(world, terrain, 'stump_old',          rcx + 4, rcz - 4, 1.5, 4.0);
    place(world, terrain, 'stone_tallA',        rcx + 8, rcz - 12, PI / 3, 4.5);

    place(world, terrain, 'tree_oak',  rcx - 15, rcz - 5,  1.1, 6.5);
    place(world, terrain, 'tree_tall', rcx + 14, rcz + 8,  2.8, 6.0);
    place(world, terrain, 'tree_fat',  rcx - 8,  rcz + 16, 0.4, 5.5);
  }

  // ──────────────────────────────────────────────
  // 3. LANDSBYEN — Ø-platå, sentrum (140, 10)
  // ──────────────────────────────────────────────
  {
    const cx = 140;
    const cz = 10;
    const ws = 4.5;

    // B1 — Smed
    place(world, terrain, 'town_wall_corner',          cx - 43, cz - 18, 0,       ws);
    place(world, terrain, 'town_wall_window_shutters', cx - 35, cz - 18, 0,       ws);
    place(world, terrain, 'town_wall_corner',          cx - 27, cz - 18, PI / 2,  ws);
    place(world, terrain, 'town_wall_door',            cx - 35, cz - 10, PI,      ws);
    place(world, terrain, 'town_wall_window_glass',    cx - 43, cz - 14, -PI / 2, ws);
    place(world, terrain, 'town_wall',                 cx - 27, cz - 14,  PI / 2, ws);
    place(world, terrain, 'town_roof_gable',           cx - 35, cz - 14, 0,       ws);
    place(world, terrain, 'town_chimney',              cx - 37, cz - 16, 0.3,     3.0);

    // B2 — Ranger-forsyning (trevegger)
    place(world, terrain, 'town_wall_wood_corner',        cx - 12, cz - 30, 0,       ws);
    place(world, terrain, 'town_wall_wood_window_glass',  cx - 2,  cz - 30, 0,       ws);
    place(world, terrain, 'town_wall_wood_corner',        cx + 8,  cz - 30, PI / 2,  ws);
    place(world, terrain, 'town_wall_wood_door',          cx - 2,  cz - 22, PI,      ws);
    place(world, terrain, 'town_wall_wood',               cx - 12, cz - 26, -PI / 2, ws);
    place(world, terrain, 'town_wall_wood',               cx + 8,  cz - 26,  PI / 2, ws);
    place(world, terrain, 'town_roof_high_gable',         cx - 2,  cz - 26, 0,       ws);
    place(world, terrain, 'town_chimney',                 cx - 4,  cz - 28, 1.0,     3.0);

    // B3 — Kjøpmanns-hus
    place(world, terrain, 'town_wall_corner',          cx + 16, cz - 30, 0,       ws);
    place(world, terrain, 'town_wall_window_shutters', cx + 22, cz - 30, 0,       ws);
    place(world, terrain, 'town_wall_corner',          cx + 28, cz - 30, PI / 2,  ws);
    place(world, terrain, 'town_wall_door',            cx + 22, cz - 18, PI,      ws);
    place(world, terrain, 'town_wall_window_glass',    cx + 16, cz - 24, -PI / 2, ws);
    place(world, terrain, 'town_wall',                 cx + 28, cz - 24,  PI / 2, ws);
    place(world, terrain, 'town_roof_high',            cx + 22, cz - 24, 0,       ws);
    place(world, terrain, 'town_chimney',              cx + 20, cz - 27, 0.5,     3.0);
    place(world, terrain, 'town_banner_red',           cx + 22, cz - 32, 0,       4.0);

    // B4 — Garnison
    place(world, terrain, 'town_wall_corner',      cx + 32, cz - 8, 0,       ws);
    place(world, terrain, 'town_wall_arch',         cx + 38, cz - 8, 0,       ws);
    place(world, terrain, 'town_wall_corner',      cx + 44, cz - 8, PI / 2,  ws);
    place(world, terrain, 'town_wall_door',         cx + 38, cz + 6, PI,      ws);
    place(world, terrain, 'town_wall_window_glass', cx + 32, cz - 1, -PI / 2, ws);
    place(world, terrain, 'town_wall_window_glass', cx + 44, cz - 1,  PI / 2, ws);
    place(world, terrain, 'town_roof_flat',         cx + 38, cz - 1, 0,       ws);
    place(world, terrain, 'town_pillar_stone',      cx + 32, cz - 8, 0,       4.0);
    place(world, terrain, 'town_pillar_stone',      cx + 44, cz - 8, 0,       4.0);
    place(world, terrain, 'town_stairs_wide_stone', cx + 38, cz + 8, PI,      ws);

    // B5 — Kroen/hall
    place(world, terrain, 'town_wall_corner',          cx - 12, cz + 22, 0,       ws);
    place(world, terrain, 'town_wall_window_glass',    cx - 2,  cz + 22, 0,       ws);
    place(world, terrain, 'town_wall_corner',          cx + 8,  cz + 22, PI / 2,  ws);
    place(world, terrain, 'town_wall_door',            cx - 2,  cz + 34, PI,      ws);
    place(world, terrain, 'town_wall_window_shutters', cx - 12, cz + 28, -PI / 2, ws);
    place(world, terrain, 'town_wall_window_shutters', cx + 8,  cz + 28,  PI / 2, ws);
    place(world, terrain, 'town_wall_half',            cx + 12, cz + 28,  PI / 2, ws);
    place(world, terrain, 'town_roof_high',            cx - 2,  cz + 28, 0,       ws);
    place(world, terrain, 'town_balcony_wall',         cx - 2,  cz + 34, PI,      ws * 0.9);
    place(world, terrain, 'town_chimney',              cx + 4,  cz + 24, 0.5,     3.0);
    place(world, terrain, 'town_chimney',              cx - 6,  cz + 24, 1.2,     3.0);
    place(world, terrain, 'town_stairs_stone',         cx - 2,  cz + 36, PI,      ws);

    // B6 — Apoteker (trevegger)
    place(world, terrain, 'town_wall_wood_corner',        cx + 15, cz + 23, 0,       ws);
    place(world, terrain, 'town_wall_wood_door',          cx + 20, cz + 23, 0,       ws);
    place(world, terrain, 'town_wall_wood_corner',        cx + 25, cz + 23, PI / 2,  ws);
    place(world, terrain, 'town_wall_wood_window_glass',  cx + 25, cz + 28, PI / 2,  ws);
    place(world, terrain, 'town_wall_wood',               cx + 15, cz + 28, -PI / 2, ws);
    place(world, terrain, 'town_roof_point',              cx + 20, cz + 26, 0,       ws);

    // B7 — Kapell
    place(world, terrain, 'town_wall_corner',    cx - 38, cz + 12, 0,       ws);
    place(world, terrain, 'town_wall_arch',       cx - 32, cz + 12, 0,       ws);
    place(world, terrain, 'town_wall_corner',    cx - 26, cz + 12, PI / 2,  ws);
    place(world, terrain, 'town_wall_door',       cx - 32, cz + 24, PI,      ws);
    place(world, terrain, 'town_wall',            cx - 38, cz + 18, -PI / 2, ws);
    place(world, terrain, 'town_wall',            cx - 26, cz + 18,  PI / 2, ws);
    place(world, terrain, 'town_roof_high_gable', cx - 32, cz + 18, 0,       ws);
    place(world, terrain, 'town_pillar_wood',     cx - 36, cz + 26, 0,       4.0);
    place(world, terrain, 'town_pillar_wood',     cx - 28, cz + 26, 0,       4.0);
    place(world, terrain, 'town_banner_green',    cx - 32, cz + 28, 0,       4.0);

    // B8 — Vannmøllehus
    place(world, terrain, 'town_wall_wood_corner',       cx + 36, cz + 12, 0,       ws);
    place(world, terrain, 'town_wall_wood_window_glass', cx + 42, cz + 12, 0,       ws);
    place(world, terrain, 'town_wall_wood_corner',       cx + 48, cz + 12, PI / 2,  ws);
    place(world, terrain, 'town_wall_wood_door',         cx + 42, cz + 22, PI,      ws);
    place(world, terrain, 'town_wall_wood',              cx + 36, cz + 17, -PI / 2, ws);
    place(world, terrain, 'town_wall_wood',              cx + 48, cz + 17,  PI / 2, ws);
    place(world, terrain, 'town_roof_gable',             cx + 42, cz + 17, 0,       ws);

    // Torg: fontene-kompleks
    place(world, terrain, 'town_fountain_round',  cx,     cz,     0,        5.0);
    place(world, terrain, 'town_fountain_center', cx,     cz,     0,        5.0);
    place(world, terrain, 'town_fountain_corner', cx - 8, cz - 8, 0,        3.5);
    place(world, terrain, 'town_fountain_corner', cx + 8, cz - 8, PI / 2,   3.5);
    place(world, terrain, 'town_fountain_corner', cx - 8, cz + 8, -PI / 2,  3.5);
    place(world, terrain, 'town_fountain_corner', cx + 8, cz + 8, PI,       3.5);

    // Pilarer og lanterner ved torget
    place(world, terrain, 'town_pillar_stone', cx - 13, cz - 13, 0, 4.0);
    place(world, terrain, 'town_pillar_stone', cx + 13, cz - 13, 0, 4.0);
    place(world, terrain, 'town_pillar_stone', cx - 13, cz + 13, 0, 4.0);
    place(world, terrain, 'town_pillar_stone', cx + 13, cz + 13, 0, 4.0);
    place(world, terrain, 'town_lantern', cx - 13, cz - 13, 0, 3.0);
    place(world, terrain, 'town_lantern', cx + 13, cz - 13, 0, 3.0);
    place(world, terrain, 'town_lantern', cx - 13, cz + 13, 0, 3.0);
    place(world, terrain, 'town_lantern', cx + 13, cz + 13, 0, 3.0);
    place(world, terrain, 'town_lantern', cx - 30, cz - 18, 0, 3.0);
    place(world, terrain, 'town_lantern', cx + 30, cz - 18, 0, 3.0);
    place(world, terrain, 'town_lantern', cx - 30, cz + 18, 0, 3.0);

    // Marked
    place(world, terrain, 'town_stall',        cx - 25, cz + 5,  PI / 2, 4.0);
    place(world, terrain, 'town_stall_red',    cx - 25, cz,      PI / 2, 4.0);
    place(world, terrain, 'town_stall_green',  cx - 25, cz - 5,  PI / 2, 4.0);
    place(world, terrain, 'town_stall_bench',  cx - 22, cz + 2,  0,      3.5);
    place(world, terrain, 'town_stall_bench',  cx - 22, cz - 3,  0,      3.5);
    place(world, terrain, 'town_stall_stool',  cx - 20, cz + 4,  1.0,    3.0);
    place(world, terrain, 'town_stall_stool',  cx - 20, cz - 1,  0.5,    3.0);
    place(world, terrain, 'town_cart',         cx - 18, cz + 8,  1.2,    4.0);
    place(world, terrain, 'town_cart_high',    cx - 18, cz - 8,  0.5,    4.0);
    place(world, terrain, 'town_cart',         cx - 22, cz + 12, 2.8,    3.5);

    // Vindmølle og vannmølle
    place(world, terrain, 'town_windmill',  cx + 25, cz - 12, 1.0, 6.0);
    place(world, terrain, 'town_watermill', cx + 28, cz + 18, 0.5, 5.0);
    place(world, terrain, 'town_wheel',     cx + 26, cz + 20, 0.0, 4.5);

    // Gjerder
    const fenceXZ: Array<[number, number, number]> = [
      [cx - 30, cz - 15, PI / 2], [cx - 30, cz - 5,  PI / 2],
      [cx - 30, cz + 5,  PI / 2], [cx - 30, cz + 15, PI / 2],
      [cx + 30, cz - 15, PI / 2], [cx + 30, cz - 5,  PI / 2],
      [cx + 30, cz + 5,  PI / 2], [cx + 30, cz + 15, PI / 2],
    ];
    for (const [fx, fz, fr] of fenceXZ) {
      place(world, terrain, 'town_fence', fx, fz, fr, 4.0);
    }
    place(world, terrain, 'town_fence_gate', cx, cz - 28, 0,  4.0);
    place(world, terrain, 'town_fence_gate', cx, cz + 28, PI, 4.0);

    // Hekker
    place(world, terrain, 'town_hedge',        cx + 22, cz - 10, PI / 2, 4.0);
    place(world, terrain, 'town_hedge',        cx + 22, cz,      PI / 2, 4.0);
    place(world, terrain, 'town_hedge',        cx + 22, cz + 10, PI / 2, 4.0);
    place(world, terrain, 'town_hedge_large',  cx + 22, cz + 20, PI / 2, 4.0);
    place(world, terrain, 'town_hedge_gate',   cx + 22, cz - 20, PI / 2, 4.0);
    place(world, terrain, 'town_hedge_curved', cx - 26, cz + 8,  0,      4.0);

    // Trær og natur
    place(world, terrain, 'town_tree',            cx - 35, cz + 25, 0.5, 5.0);
    place(world, terrain, 'town_tree',            cx + 35, cz - 20, 1.8, 5.0);
    place(world, terrain, 'town_tree_high',       cx - 32, cz - 18, 3.1, 5.5);
    place(world, terrain, 'town_tree_high',       cx + 28, cz + 30, 0.9, 5.5);
    place(world, terrain, 'town_tree_crooked',    cx - 38, cz + 5,  2.2, 4.5);
    place(world, terrain, 'town_tree_high_round', cx - 40, cz,      0.7, 5.5);
    place(world, terrain, 'town_tree',            cx + 45, cz - 28, 1.4, 5.0);
    place(world, terrain, 'town_rock_large',      cx + 32, cz + 5,  1.0, 4.0);
    place(world, terrain, 'town_rock_small',      cx - 28, cz + 12, 2.5, 3.5);
    place(world, terrain, 'town_rock_wide',       cx + 30, cz - 8,  0.8, 3.5);
    place(world, terrain, 'town_banner_green',    cx + 14, cz - 28, 0,   4.0);
  }

  // ──────────────────────────────────────────────
  // 4. FURUSKOG — NØ (mot fjellene)
  // ──────────────────────────────────────────────
  {
    const pines = [
      'tree_pineDefaultA', 'tree_pineDefaultB',
      'tree_pineTallA', 'tree_pineTallB', 'tree_pineRoundA',
      'tree_cone',
    ];
    const stumps = ['stump_old', 'stump_round', 'stump_square'];
    const clusters: Array<[number, number]> = [
      [55, -60], [55, -80], [55, -100], [55, -120],
      [70, -165], [70, -145], [70, -125], [70, -105], [70, -80], [70, -65],
      [85, -165], [85, -145], [85, -125], [85, -105], [85, -82],
      [110, -90], [110, -75], [125, -90], [125, -75],
      [140, -90], [140, -75], [155, -90], [155, -75],
      [170, -165], [170, -150], [185, -150], [185, -122],
    ];
    for (const [bx, bz] of clusters) {
      const count = 4 + ((r() * 3) | 0);
      for (let i = 0; i < count; i++) {
        const dx = (r() - 0.5) * 22;
        const dz = (r() - 0.5) * 22;
        place(world, terrain, pines[(r() * pines.length) | 0], bx + dx, bz + dz, r() * PI * 2, 5.0 + r() * 3.5);
      }
    }
    for (let i = 0; i < 8; i++) {
      const bx = 60 + r() * 130;
      const bz = -165 + r() * 105;
      place(world, terrain, stumps[(r() * stumps.length) | 0], bx, bz, r() * PI * 2, 3.5 + r() * 1.5);
    }
  }

  // ──────────────────────────────────────────────
  // 5. FJELLKLIPPER — NØ-toppene
  // ──────────────────────────────────────────────
  {
    const cliffs = [
      'cliff_blockDiagonal_rock', 'cliff_blockDiagonal_stone',
      'cliff_blockCave_rock', 'cliff_blockCave_stone',
    ];
    const tallStones = ['stone_tallA', 'stone_tallB', 'stone_tallC'];
    const peak1: Array<[number, number]> = [
      [100, -145], [115, -145], [130, -145],
      [100, -155], [115, -160], [130, -155],
      [90, -135],  [105, -130], [120, -130],
    ];
    const peak2: Array<[number, number]> = [
      [140, -120], [155, -110], [170, -120],
      [150, -130], [165, -130],
    ];
    const peak3: Array<[number, number]> = [
      [75, -105], [85, -95], [95, -110],
      [80, -115], [90, -120],
    ];
    for (const [bx, bz] of [...peak1, ...peak2, ...peak3]) {
      const key = r() < 0.7
        ? cliffs[(r() * cliffs.length) | 0]
        : tallStones[(r() * tallStones.length) | 0];
      place(world, terrain, key, bx + (r() - 0.5) * 10, bz + (r() - 0.5) * 10, r() * PI * 2, 4.0 + r() * 3.5);
    }
    place(world, terrain, 'stone_tallA', 78,  -95,  0.3, 6.0);
    place(world, terrain, 'stone_tallC', 108, -128, 1.1, 5.5);
    place(world, terrain, 'stone_tallB', 132, -142, 2.7, 6.5);
    place(world, terrain, 'stone_tallA', 148, -110, 0.8, 5.0);
    place(world, terrain, 'stone_tallC', 168, -145, 3.5, 6.0);
  }

  // ──────────────────────────────────────────────
  // 6. STEINRING — rituell sirkel (-155, -70)
  // ──────────────────────────────────────────────
  {
    const CIRCLE_CX = -155, CIRCLE_CZ = -70;
    const CIRCLE_R = 22, CIRCLE_N = 9;
    const stoneTypes = ['stone_tallA', 'stone_tallB', 'stone_tallC'];

    for (let i = 0; i < CIRCLE_N; i++) {
      const angle = (i / CIRCLE_N) * 2 * PI;
      const sx = CIRCLE_CX + CIRCLE_R * Math.cos(angle);
      const sz = CIRCLE_CZ + CIRCLE_R * Math.sin(angle);
      place(world, terrain, stoneTypes[i % stoneTypes.length], sx, sz, angle + PI, 5.0 + (i % 3) * 0.5);
    }
    place(world, terrain, 'stone_tallB', CIRCLE_CX, CIRCLE_CZ, 0, 6.5);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 2 * PI + PI / 6;
      const sx = CIRCLE_CX + 12 * Math.cos(angle);
      const sz = CIRCLE_CZ + 12 * Math.sin(angle);
      place(world, terrain, 'castle_rocks_small', sx, sz, i * PI / 3, 3.5);
    }
    place(world, terrain, 'campfire_stones', CIRCLE_CX + 3, CIRCLE_CZ + 3, 1.2, 3.5);
    place(world, terrain, 'tree_oak', CIRCLE_CX - 30, CIRCLE_CZ,     0.8, 7.0);
    place(world, terrain, 'tree_fat', CIRCLE_CX + 30, CIRCLE_CZ + 5, 2.1, 7.0);
  }

  // ──────────────────────────────────────────────
  // 7. LØVSKOG — sørlige åser
  // ──────────────────────────────────────────────
  {
    const leaves = [
      'tree_oak', 'tree_fat', 'tree_tall', 'tree_detailed',
      'tree_default', 'tree_small', 'tree_blocks', 'tree_plateau',
    ];
    const stumps = ['stump_old', 'stump_round', 'stump_square'];
    const clusters: Array<[number, number]> = [
      [-100, 70], [-100, 85], [-100, 100], [-100, 115], [-90, 130],
      [-75, 65],  [-75, 80],  [-75, 100],  [-75, 115],  [-75, 135],
      [-70, 90],  [-55, 75],  [-55, 95],   [-55, 115],  [-55, 140],
      [-30, 80],  [-10, 75],  [-10, 95],   [-10, 115],  [-10, 140],
      [-25, 110], [10, 90],   [10, 110],   [10, 130],   [10, 160],
      [35, 80],   [50, 95],   [50, 120],   [50, 145],
      [75, 90],   [75, 110],  [100, 100],  [-35, 155],
    ];
    for (const [bx, bz] of clusters) {
      const count = 4 + ((r() * 4) | 0);
      for (let i = 0; i < count; i++) {
        const dx = (r() - 0.5) * 24;
        const dz = (r() - 0.5) * 24;
        place(world, terrain, leaves[(r() * leaves.length) | 0], bx + dx, bz + dz, r() * PI * 2, 5.0 + r() * 4.0);
      }
    }
    for (let i = 0; i < 12; i++) {
      const bx = -100 + r() * 200;
      const bz = 55 + r() * 110;
      place(world, terrain, stumps[(r() * stumps.length) | 0], bx, bz, r() * PI * 2, 3.5 + r() * 2.0);
    }
  }

  // ──────────────────────────────────────────────
  // 8. RANGER-LEIR — SØ (75, 145)
  // ──────────────────────────────────────────────
  {
    const rancx = 75, rancz = 145;

    place(world, terrain, 'tent_detailedClosed', rancx - 14, rancz - 8,  0.3, 5.0);
    place(world, terrain, 'tent_detailedClosed', rancx + 12, rancz - 10, 2.5, 5.0);
    place(world, terrain, 'tent_smallOpen',      rancx + 16, rancz + 8,  4.2, 4.5);
    place(world, terrain, 'tent_smallClosed',    rancx - 10, rancz + 12, 5.8, 4.5);
    place(world, terrain, 'campfire_stones',     rancx,      rancz,      0.0, 4.5);
    place(world, terrain, 'campfire_logs',       rancx - 6,  rancz + 6,  2.0, 3.5);
    place(world, terrain, 'canoe',               rancx + 22, rancz + 15, 0.8, 4.5);
    place(world, terrain, 'bed',                 rancx + 14, rancz - 6,  3.0, 4.0);
    place(world, terrain, 'stump_round',         rancx + 5,  rancz - 5,  1.5, 4.0);
    place(world, terrain, 'town_fence',          rancx - 22, rancz - 15, -PI / 2, 4.0);
    place(world, terrain, 'town_fence',          rancx - 22, rancz - 5,  -PI / 2, 4.0);
    place(world, terrain, 'town_fence',          rancx - 22, rancz + 5,  -PI / 2, 4.0);
    place(world, terrain, 'tree_detailed',       rancx - 28, rancz - 12, 1.5, 7.0);
    place(world, terrain, 'tree_oak',            rancx - 25, rancz + 18, 0.7, 6.5);
    place(world, terrain, 'tree_fat',            rancx + 28, rancz - 15, 2.8, 6.0);
    place(world, terrain, 'tree_tall',           rancx + 25, rancz + 20, 0.4, 6.5);
    place(world, terrain, 'tree_default',        rancx,      rancz + 30, 3.1, 6.0);
  }

  // ──────────────────────────────────────────────
  // 9. BANDITT-LEIR — dyp sørskog (-25, 175)
  // ──────────────────────────────────────────────
  {
    const bcx = -25, bcz = 175;

    place(world, terrain, 'tent_smallClosed',    bcx - 10, bcz - 12, 1.7, 5.0);
    place(world, terrain, 'tent_smallOpen',      bcx + 8,  bcz - 10, 4.1, 5.0);
    place(world, terrain, 'tent_detailedClosed', bcx + 14, bcz + 5,  3.3, 5.0);
    place(world, terrain, 'campfire_logs',       bcx,      bcz,      0.0, 4.5);
    place(world, terrain, 'campfire_stones',     bcx - 16, bcz + 6,  1.5, 3.5);
    place(world, terrain, 'canoe',               bcx + 20, bcz + 18, 2.2, 4.5);
    place(world, terrain, 'bed',                 bcx - 8,  bcz - 8,  5.8, 4.0);
    place(world, terrain, 'stump_square',        bcx + 4,  bcz + 4,  0.5, 4.0);
    place(world, terrain, 'tree_fat',            bcx - 22, bcz - 20, 2.1, 7.5);
    place(world, terrain, 'tree_detailed',       bcx + 22, bcz - 18, 0.9, 7.0);
    place(world, terrain, 'tree_tall',           bcx - 18, bcz + 22, 3.5, 7.0);
    place(world, terrain, 'tree_oak',            bcx + 25, bcz + 20, 1.4, 7.5);
    place(world, terrain, 'tree_blocks',         bcx,      bcz + 28, 0.3, 7.0);
  }

  // ──────────────────────────────────────────────
  // 10. ØRKENKYST — SV sandkyst
  // ──────────────────────────────────────────────
  {
    const cacti = ['cactus_tall', 'cactus_short'];
    const desertStones = ['stone_tallA', 'stone_tallB', 'cliff_blockDiagonal_rock'];
    const desertRocks = ['castle_rocks_large', 'castle_rocks_small'];
    const cactClusters: Array<[number, number]> = [
      [-230, 90], [-215, 105], [-200, 120],
      [-195, 145], [-215, 160], [-205, 180],
      [-185, 195], [-170, 175],
    ];
    for (const [bx, bz] of cactClusters) {
      const count = 3 + ((r() * 3) | 0);
      for (let i = 0; i < count; i++) {
        place(world, terrain, cacti[(r() * 2) | 0],
          bx + (r() - 0.5) * 18, bz + (r() - 0.5) * 18,
          r() * PI * 2, 3.5 + r() * 2.5);
      }
    }
    const rockClusters: Array<[number, number]> = [
      [-220, 85], [-200, 100], [-195, 155],
      [-225, 170], [-190, 200], [-175, 185],
      [-210, 130], [-235, 140],
    ];
    for (const [bx, bz] of rockClusters) {
      place(world, terrain, desertStones[(r() * desertStones.length) | 0],
        bx + (r() - 0.5) * 12, bz + (r() - 0.5) * 12, r() * PI * 2, 4.0 + r() * 2.5);
      place(world, terrain, desertRocks[(r() * 2) | 0],
        bx + (r() - 0.5) * 8, bz + (r() - 0.5) * 8, r() * PI * 2, 3.5);
    }
    place(world, terrain, 'tree_palm',     -245, 110, 0.5, 5.5);
    place(world, terrain, 'tree_palmTall', -245, 160, 2.1, 6.0);
  }

  // ──────────────────────────────────────────────
  // 11. VEITRÆR — borg→by-allee
  // ──────────────────────────────────────────────
  {
    const roadStartX = -115, roadStartZ = -115;
    const roadEndX = 140,    roadEndZ = 10;
    const rdx = roadEndX - roadStartX;
    const rdz = roadEndZ - roadStartZ;
    const rlen = Math.sqrt(rdx * rdx + rdz * rdz);
    const px = -rdz / rlen;
    const pz =  rdx / rlen;
    const roadTrees = [
      'tree_cone', 'tree_cone', 'tree_oak', 'tree_oak',
      'tree_tall', 'tree_tall', 'tree_default', 'tree_default', 'tree_oak', 'tree_oak',
    ];
    for (let i = 0; i < 10; i++) {
      const t = (i + 1) / 11;
      const rx = roadStartX + t * rdx;
      const rz = roadStartZ + t * rdz;
      const offset = 14 + r() * 4;
      const jitter = (r() - 0.5) * 6;
      const key = roadTrees[i];
      place(world, terrain, key,
        rx + px * offset + jitter, rz + pz * offset + jitter,
        r() * PI * 2, 5.5 + r() * 2.0);
      place(world, terrain, key,
        rx - px * offset + jitter, rz - pz * offset + jitter,
        r() * PI * 2, 5.5 + r() * 2.0);
    }
  }

  // ──────────────────────────────────────────────
  // 12. BROER over elven
  // ──────────────────────────────────────────────
  {
    const riverZ = (wx: number) => Math.sin((wx / 5 + 50) * 0.14) * 30;
    place(world, terrain, 'bridge_stone',      -50, riverZ(-50),  0, 5.5);
    place(world, terrain, 'bridge_stoneRound',  20, riverZ(20),   0, 5.5);
    place(world, terrain, 'bridge_wood',       100, riverZ(100),  0, 5.0);
  }
}
