import { CELL_SIZE } from '../../world/Grid';
import { BIOME } from '../../world/Terrain';
import { type Rng } from '../Rng';
import type {
  Blueprint,
  Cluster,
  PathSegment,
  PlacedAsset,
  Point2,
  StoryPropSlot,
} from '../Blueprint';
import type { Tag } from '../AssetTags';

/**
 * Landsby-generator. Implementerer reglene fra docs/MAP_DESIGN_RULES.md:
 * - Focal point off-center (fontene/brønn)
 * - 2-4 stier som stråler ut fra focal med 1-2 knekkpunkter
 * - Hus klynges langs stiene, rotert i 90°-steg, min 5 units mellom vegger
 * - Markedsboder tett (0.5-2u) rundt focal
 * - Sekundærstrukturer (vindmølle) ved kanter
 * - Trær/hekker langs yttergrensen
 * - Min 3 story props (veltet kjerre, høystakk, ødelagt gjerde)
 */
export function generateVillage(rng: Rng, widthCells: number, depthCells: number): Blueprint {
  // World-grenser. Cell-koordinater er 0..widthCells; world-koordinater er sentrert om 0.
  const worldHalfX = (widthCells * CELL_SIZE) / 2;
  const worldHalfZ = (depthCells * CELL_SIZE) / 2;
  // Begrens generering til midtre 60 % for å unngå at landsby treffer kanten.
  const playableHalfX = worldHalfX * 0.6;
  const playableHalfZ = worldHalfZ * 0.6;

  // ── 1. Focal point: pick kvadrant, plasser off-center ──────────────────
  const quadrant = rng.quadrant();
  const signX = quadrant === 0 || quadrant === 3 ? -1 : 1;
  const signZ = quadrant === 0 || quadrant === 1 ? -1 : 1;
  const focal: Point2 = {
    x: signX * rng.range(playableHalfX * 0.25, playableHalfX * 0.5),
    z: signZ * rng.range(playableHalfZ * 0.25, playableHalfZ * 0.5),
  };

  // ── 2. Stier: 3 stier ut fra focal mot tilfeldige retninger ────────────
  const numPaths = rng.int(3, 4);
  const baseAngle = rng.range(0, Math.PI * 2);
  const paths: PathSegment[] = [];
  const pathEndpoints: Point2[] = [];
  for (let i = 0; i < numPaths; i++) {
    const angle = baseAngle + (i / numPaths) * Math.PI * 2 + rng.range(-0.3, 0.3);
    paths.push(makePathWithKnee(focal, angle, rng, worldHalfX, worldHalfZ));
    const last = paths[i].points[paths[i].points.length - 1];
    pathEndpoints.push(last);
  }

  // ── 3. Hus langs stier ────────────────────────────────────────────────
  const houses: HouseInstance[] = [];
  for (const seg of paths) {
    placeHousesAlongPath(seg, houses, rng);
  }

  // ── 4. Sekundærstrukturer: vindmølle ved kanten ────────────────────────
  const millEnd = pathEndpoints[rng.int(0, pathEndpoints.length - 1)];
  const millDir = normalize(sub(millEnd, focal));
  const mill: Point2 = {
    x: millEnd.x + millDir.x * 12,
    z: millEnd.z + millDir.z * 12,
  };

  // ── 5. Marked rundt focal ──────────────────────────────────────────────
  const stalls = placeStallsAroundFocal(focal, rng);

  // ── 6. Strukturer fra hus + mølle + boder ─────────────────────────────
  const structures: PlacedAsset[] = [];
  for (const h of houses) emitHouseAssets(h, structures);
  emitWindmill(mill, structures, rng);
  for (const s of stalls) structures.push(s);

  // Lanterner ved alle stikryss (focal point) + langs sti hver ~30 units
  for (const seg of paths) {
    placeLanterns(seg, structures, rng);
  }

  // Pillarer rundt focal point (kvadrant)
  const pillarR = 9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    structures.push({
      x: focal.x + pillarR * Math.cos(a),
      z: focal.z + pillarR * Math.sin(a),
      rotY: 0,
      scale: 4.0,
      tag: 'pillar-stone',
    });
    structures.push({
      x: focal.x + pillarR * Math.cos(a),
      z: focal.z + pillarR * Math.sin(a),
      rotY: 0,
      scale: 3.0,
      tag: 'lantern',
    });
  }

  // ── 7. Klynger: trær/hekker langs yttergrensen ────────────────────────
  const clusters: Cluster[] = [];
  // Trær i 4 hjørner av spillbart område
  const treeCorners: Point2[] = [
    { x: -playableHalfX * 1.1, z: -playableHalfZ * 1.1 },
    { x: playableHalfX * 1.1, z: -playableHalfZ * 1.1 },
    { x: -playableHalfX * 1.1, z: playableHalfZ * 1.1 },
    { x: playableHalfX * 1.1, z: playableHalfZ * 1.1 },
  ];
  for (const c of treeCorners) {
    // Forskyv litt slik at klyngene ikke er perfekt symmetriske
    const cx = c.x + rng.range(-15, 15);
    const cz = c.z + rng.range(-15, 15);
    clusters.push({
      cx, cz,
      radius: 35,
      primaryTag: rng.next() < 0.5 ? 'tree-deciduous' : 'tree-stylized',
      secondaryTags: ['stump', 'rock-small'],
      count: { min: 8, max: 14 },
      spacing: 4.5,
      scaleRange: [4.5, 6.5],
    });
  }

  // Hekk-klynger nær husene (men ikke oppå)
  for (const h of houses.slice(0, 3)) {
    clusters.push({
      cx: h.x + rng.range(-8, 8),
      cz: h.z + rng.range(8, 14),
      radius: 6,
      primaryTag: 'hedge',
      secondaryTags: ['hedge-large'],
      count: { min: 3, max: 5 },
      spacing: 3,
      scaleRange: [3.5, 4.5],
    });
  }

  // Stein-klynger langs minst én sti-kant
  if (paths.length > 0) {
    const seg = paths[0];
    const midPoint = midpoint(seg);
    clusters.push({
      cx: midPoint.x + rng.range(-6, 6),
      cz: midPoint.z + rng.range(-6, 6),
      radius: 5,
      primaryTag: 'rock-small',
      secondaryTags: ['rock-large'],
      count: { min: 2, max: 4 },
      spacing: 2.5,
      scaleRange: [3.0, 4.0],
    });
  }

  // ── 8. Story-props (minst 3) ──────────────────────────────────────────
  const storyProps: StoryPropSlot[] = [];
  // Veltet kjerre nær en sti
  const storyPath = paths[rng.int(0, paths.length - 1)];
  const cartPoint = pointAlong(storyPath, 0.6);
  storyProps.push({
    x: cartPoint.x + rng.range(-3, 3),
    z: cartPoint.z + rng.range(-3, 3),
    suggestedTag: 'cart',
    description: 'Veltet kjerre langs stien',
    rotY: rng.rot45(),
    scale: 4.0,
  });
  // Halvslukket bål utenfor en husklynge
  if (houses.length > 0) {
    const h = houses[rng.int(0, houses.length - 1)];
    storyProps.push({
      x: h.x + rng.range(8, 12),
      z: h.z + rng.range(8, 12),
      suggestedTag: 'campfire',
      description: 'Halvslukket leirbål bak hus',
      scale: 3.5,
    });
  }
  // Ødelagt gjerde nær hjørnet av landsbyen
  storyProps.push({
    x: focal.x + rng.range(20, 30) * (rng.next() < 0.5 ? 1 : -1),
    z: focal.z + rng.range(20, 30) * (rng.next() < 0.5 ? 1 : -1),
    suggestedTag: 'fence-broken',
    description: 'Ødelagt gjerde — antydning til at noe skjedde her',
    rotY: rng.rot45(),
    scale: 3.5,
  });
  // Ekstra: en stol/krakk veltet ved markedet
  storyProps.push({
    x: focal.x + rng.range(-4, 4),
    z: focal.z + rng.range(6, 10),
    suggestedTag: 'stool',
    description: 'Veltet krakk ved markedet',
    rotY: rng.rot45(),
    scale: 3.0,
  });

  // ── 9. Terrain: liten kolle der landsbyen ligger, vann i én kvadrant ──
  const blueprint: Blueprint = {
    label: 'Landsby',
    focalPoint: {
      x: focal.x,
      z: focal.z,
      tag: rng.next() < 0.5 ? 'fountain-base' : 'fountain-base',
      surround: [
        { tag: 'fountain-corner', offsetX: -3, offsetZ: -3, rotY: 0, scale: 3.5 },
        { tag: 'fountain-corner', offsetX: 3, offsetZ: -3, rotY: Math.PI / 2, scale: 3.5 },
        { tag: 'fountain-corner', offsetX: -3, offsetZ: 3, rotY: -Math.PI / 2, scale: 3.5 },
        { tag: 'fountain-corner', offsetX: 3, offsetZ: 3, rotY: Math.PI, scale: 3.5 },
      ],
    },
    paths,
    clusters,
    structures,
    storyProps,
    terrain: {
      baseBiome: BIOME.Grass,
      heightBumps: [
        // En slak kolle der landsbyen ligger
        {
          cx: focal.x / CELL_SIZE + widthCells / 2,
          cz: focal.z / CELL_SIZE + depthCells / 2,
          radius: 25,
          height: 1.8,
        },
      ],
      biomePatches: [],
    },
  };

  return blueprint;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

interface HouseInstance {
  x: number;
  z: number;
  rotY: number;     // 0 / PI/2 / PI / 3PI/2
  style: 'stone' | 'wood';
  size: 'small' | 'large';
  hasChimney: boolean;
}

function makePathWithKnee(
  focal: Point2,
  angle: number,
  rng: Rng,
  worldHalfX: number,
  worldHalfZ: number,
): PathSegment {
  // Sti slutter et stykke før kant
  const maxR = Math.min(worldHalfX, worldHalfZ) * 0.7;
  const totalLen = rng.range(maxR * 0.7, maxR);
  const kneeT = rng.range(0.4, 0.65);
  const kneeAngle = angle + rng.range(-0.5, 0.5);

  const knee: Point2 = {
    x: focal.x + Math.cos(angle) * (totalLen * kneeT),
    z: focal.z + Math.sin(angle) * (totalLen * kneeT),
  };
  const end: Point2 = {
    x: knee.x + Math.cos(kneeAngle) * (totalLen * (1 - kneeT)),
    z: knee.z + Math.sin(kneeAngle) * (totalLen * (1 - kneeT)),
  };

  return {
    points: [{ ...focal }, knee, end],
    widthCells: 1,
  };
}

function placeHousesAlongPath(seg: PathSegment, houses: HouseInstance[], rng: Rng): void {
  // Plasser 2-4 hus langs stien, alternerende side, med min 5u offset fra sti
  const numHouses = rng.int(2, 4);
  for (let i = 0; i < numHouses; i++) {
    const t = (i + 1) / (numHouses + 1) + rng.range(-0.05, 0.05);
    const p = pointAlong(seg, t);
    const tangent = tangentAt(seg, t);
    const normal = { x: -tangent.z, z: tangent.x };
    const sideSign = i % 2 === 0 ? 1 : -1;
    const offset = rng.range(14, 18);
    const houseX = p.x + normal.x * offset * sideSign;
    const houseZ = p.z + normal.z * offset * sideSign;

    // Avgjør rotasjon: snap til nærmeste 90° slik at huset "vender" mot stien
    const facing = Math.atan2(p.z - houseZ, p.x - houseX);
    const rotY = snapTo90(facing);

    // Sjekk min-avstand til andre hus (5u vegg-til-vegg → ~22u senter-til-senter for store hus)
    let tooClose = false;
    for (const h of houses) {
      const dx = h.x - houseX;
      const dz = h.z - houseZ;
      if (dx * dx + dz * dz < 22 * 22) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    houses.push({
      x: houseX,
      z: houseZ,
      rotY,
      style: rng.next() < 0.6 ? 'stone' : 'wood',
      size: rng.next() < 0.7 ? 'small' : 'large',
      hasChimney: rng.next() < 0.7,
    });
  }
}

function placeStallsAroundFocal(focal: Point2, rng: Rng): PlacedAsset[] {
  const result: PlacedAsset[] = [];
  const numStalls = rng.int(3, 5);
  const ringR = rng.range(5.5, 7);
  const startA = rng.range(0, Math.PI * 2);
  for (let i = 0; i < numStalls; i++) {
    const a = startA + (i / numStalls) * Math.PI * 2;
    result.push({
      x: focal.x + ringR * Math.cos(a),
      z: focal.z + ringR * Math.sin(a),
      rotY: snapTo45(a + Math.PI),
      scale: 4.0,
      tag: 'market-stall',
    });
  }
  // En benk og en krakk i tillegg
  result.push({
    x: focal.x + (ringR + 1.5) * Math.cos(startA + 0.5),
    z: focal.z + (ringR + 1.5) * Math.sin(startA + 0.5),
    rotY: snapTo45(startA + 0.5 + Math.PI),
    scale: 3.5,
    tag: 'bench',
  });
  return result;
}

function emitWindmill(p: Point2, out: PlacedAsset[], rng: Rng): void {
  out.push({
    x: p.x,
    z: p.z,
    rotY: rng.rot45(),
    scale: 6.0,
    tag: 'windmill',
  });
  // Et gjerde rundt møllen
  const fenceOffsets = [
    { dx: -5, dz: 0, rot: Math.PI / 2 },
    { dx: 5, dz: 0, rot: Math.PI / 2 },
    { dx: 0, dz: 5, rot: 0 },
  ];
  for (const f of fenceOffsets) {
    out.push({
      x: p.x + f.dx,
      z: p.z + f.dz,
      rotY: f.rot,
      scale: 3.5,
      tag: 'fence',
    });
  }
}

function placeLanterns(seg: PathSegment, out: PlacedAsset[], rng: Rng): void {
  // Én lykt nær endepunktet av stien
  const last = seg.points[seg.points.length - 1];
  out.push({
    x: last.x + rng.range(-1.5, 1.5),
    z: last.z + rng.range(-1.5, 1.5),
    rotY: 0,
    scale: 3.0,
    tag: 'lantern',
  });
}

function emitHouseAssets(h: HouseInstance, out: PlacedAsset[]): void {
  // Mønster matchet eksakt mot DemoWorld B3 (Kjøpmanns-hus) — eneste kombinasjon
  // av posisjoner+rotasjoner som rendrer pent. 12u × 12u footprint, ws=4.5.
  // Avvik fra DemoWorld: vi har 4 hjørner for visuell konsistens, ikke bare 2.
  const halfW = 6;
  const halfD = 6;
  const ws = 4.5;
  const corner = (h.style === 'stone' ? 'wall-stone-corner' : 'wall-wood-corner') as Tag;
  const side = (h.style === 'stone' ? 'wall-stone-side' : 'wall-wood-side') as Tag;
  const door = (h.style === 'stone' ? 'wall-stone-door' : 'wall-wood-door') as Tag;
  const window = (h.style === 'stone' ? 'wall-stone-window' : 'wall-wood-window') as Tag;
  // town_roof_high er det eneste skråtaket som sitter på vegger riktig (DemoWorld B3, B5).
  const roof: Tag = 'roof-high';

  // Hjørner (i lokalkoordinat før rotasjon).
  // Kenney-konvensjon (validert mot DemoWorld B1): NW=0, NE=π/2, SW=-π/2, SE=π.
  const corners: Array<{ lx: number; lz: number; rotLocal: number }> = [
    { lx: -halfW, lz: -halfD, rotLocal: 0 },
    { lx: halfW,  lz: -halfD, rotLocal: Math.PI / 2 },
    { lx: -halfW, lz: halfD,  rotLocal: -Math.PI / 2 },
    { lx: halfW,  lz: halfD,  rotLocal: Math.PI },
  ];
  for (const c of corners) {
    pushRotated(out, h, c.lx, c.lz, c.rotLocal, ws, corner);
  }

  // N-vegg (z=-halfD): vindu i midten
  pushRotated(out, h, 0, -halfD, 0, ws, window);
  // S-vegg: dør i midten
  pushRotated(out, h, 0, halfD, Math.PI, ws, door);
  // V-vegg: vegg i midten
  pushRotated(out, h, -halfW, 0, -Math.PI / 2, ws, side);
  // Ø-vegg: vegg i midten
  pushRotated(out, h, halfW, 0, Math.PI / 2, ws, side);

  // Tak. town_roof_high har innebygd Y-offset slik at det sitter på veggtopp.
  pushRotated(out, h, 0, 0, 0, ws, roof);

  // Valgfri pipe
  if (h.hasChimney) {
    pushRotated(out, h, halfW * 0.4, -halfD * 0.4, 0, 3.0, 'chimney');
  }
}

function pushRotated(
  out: PlacedAsset[],
  h: HouseInstance,
  lx: number,
  lz: number,
  rotLocal: number,
  scale: number,
  tag: Tag,
): void {
  const c = Math.cos(h.rotY);
  const s = Math.sin(h.rotY);
  const wx = h.x + lx * c - lz * s;
  const wz = h.z + lx * s + lz * c;
  out.push({ x: wx, z: wz, rotY: h.rotY + rotLocal, scale, tag });
}

// ─────────────────────────────────────────────────────────────────────────
// Geometri-helpers
// ─────────────────────────────────────────────────────────────────────────

function pointAlong(seg: PathSegment, t: number): Point2 {
  // t i [0, 1] langs hele stien, ikke segmentvis
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < seg.points.length - 1; i++) {
    const d = dist(seg.points[i], seg.points[i + 1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const u = target / segs[i];
      return lerp(seg.points[i], seg.points[i + 1], u);
    }
    target -= segs[i];
  }
  return seg.points[seg.points.length - 1];
}

function tangentAt(seg: PathSegment, t: number): Point2 {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < seg.points.length - 1; i++) {
    const d = dist(seg.points[i], seg.points[i + 1]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      return normalize(sub(seg.points[i + 1], seg.points[i]));
    }
    target -= segs[i];
  }
  const a = seg.points[seg.points.length - 2];
  const b = seg.points[seg.points.length - 1];
  return normalize(sub(b, a));
}

function midpoint(seg: PathSegment): Point2 {
  return pointAlong(seg, 0.5);
}

function lerp(a: Point2, b: Point2, t: number): Point2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

function sub(a: Point2, b: Point2): Point2 {
  return { x: a.x - b.x, z: a.z - b.z };
}

function dist(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function normalize(v: Point2): Point2 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len < 1e-6) return { x: 1, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

function snapTo90(angle: number): number {
  const step = Math.PI / 2;
  return Math.round(angle / step) * step;
}

function snapTo45(angle: number): number {
  const step = Math.PI / 4;
  return Math.round(angle / step) * step;
}
