import * as THREE from 'three';

export enum BlockType {
  Stone = 0,
  Wood = 1,
  Dirt = 2,
  Grass = 3,
  Water = 4,
  Lava = 5,
  Torch = 6,
}

export const ALL_BLOCK_TYPES: ReadonlyArray<BlockType> = [
  BlockType.Stone,
  BlockType.Wood,
  BlockType.Dirt,
  BlockType.Grass,
  BlockType.Water,
  BlockType.Lava,
  BlockType.Torch,
];

export const BLOCK_LABELS: Record<BlockType, string> = {
  [BlockType.Stone]: 'Stein',
  [BlockType.Wood]: 'Tregulv',
  [BlockType.Dirt]: 'Jord',
  [BlockType.Grass]: 'Gress',
  [BlockType.Water]: 'Vann',
  [BlockType.Lava]: 'Lava',
  [BlockType.Torch]: 'Fakkel',
};

type Face = 'top' | 'bottom' | 'side';

const TEXTURE_SIZE = 16;

// Deterministisk LCG slik at hver blokktype får identisk pikselkunst hver gang.
function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function paintVariegated(
  ctx: CanvasRenderingContext2D,
  base: [number, number, number],
  variations: Array<[number, number, number, number]>,
  seed: number,
): void {
  const rng = seededRandom(seed);
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const r = rng();
      let color = base;
      let total = 0;
      for (const v of variations) {
        total += v[3];
        if (r < total) {
          color = [v[0], v[1], v[2]];
          break;
        }
      }
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function paintStone(ctx: CanvasRenderingContext2D): void {
  paintVariegated(
    ctx,
    [128, 128, 132],
    [
      [96, 96, 100, 0.2],
      [156, 156, 160, 0.15],
      [76, 76, 80, 0.08],
    ],
    1,
  );
  // Et par sprekker
  ctx.fillStyle = 'rgba(40,40,44,0.9)';
  ctx.fillRect(3, 4, 1, 5);
  ctx.fillRect(4, 8, 1, 1);
  ctx.fillRect(10, 1, 1, 3);
  ctx.fillRect(11, 3, 1, 1);
  ctx.fillRect(7, 12, 4, 1);
}

function paintWoodPlanks(ctx: CanvasRenderingContext2D): void {
  paintVariegated(
    ctx,
    [150, 98, 52],
    [
      [120, 78, 40, 0.25],
      [170, 114, 62, 0.2],
      [96, 62, 32, 0.1],
    ],
    2,
  );
  // Horisontale plankeskiller hver 4. piksel
  ctx.fillStyle = 'rgba(60,36,18,0.9)';
  for (let y = 3; y < TEXTURE_SIZE; y += 4) {
    ctx.fillRect(0, y, TEXTURE_SIZE, 1);
  }
  // Noen vertikale skjøter
  ctx.fillRect(6, 0, 1, 4);
  ctx.fillRect(10, 4, 1, 4);
  ctx.fillRect(4, 8, 1, 4);
  ctx.fillRect(12, 12, 1, 4);
}

function paintDirt(ctx: CanvasRenderingContext2D, seed: number): void {
  paintVariegated(
    ctx,
    [92, 62, 38],
    [
      [70, 46, 28, 0.3],
      [110, 76, 48, 0.2],
      [52, 34, 20, 0.12],
    ],
    seed,
  );
}

function paintGrassTop(ctx: CanvasRenderingContext2D): void {
  paintVariegated(
    ctx,
    [66, 128, 52],
    [
      [52, 108, 42, 0.3],
      [82, 148, 66, 0.2],
      [40, 88, 32, 0.1],
    ],
    4,
  );
}

function paintGrassSide(ctx: CanvasRenderingContext2D): void {
  paintDirt(ctx, 5);
  // Gress-topp
  const rng = seededRandom(6);
  for (let x = 0; x < TEXTURE_SIZE; x++) {
    const height = 2 + Math.floor(rng() * 3);
    for (let y = 0; y < height; y++) {
      const shade = rng();
      let color: [number, number, number] = [66, 128, 52];
      if (shade < 0.3) color = [52, 108, 42];
      else if (shade > 0.75) color = [82, 148, 66];
      ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function paintWater(ctx: CanvasRenderingContext2D): void {
  paintVariegated(
    ctx,
    [46, 108, 200],
    [
      [38, 92, 176, 0.3],
      [62, 132, 224, 0.25],
      [30, 74, 152, 0.1],
    ],
    7,
  );
}

function paintLava(ctx: CanvasRenderingContext2D): void {
  paintVariegated(
    ctx,
    [220, 80, 32],
    [
      [180, 56, 20, 0.3],
      [252, 148, 48, 0.25],
      [140, 36, 16, 0.1],
    ],
    8,
  );
  // Noen bright spots for glød
  ctx.fillStyle = 'rgb(255,220,120)';
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(11, 6, 1, 1);
  ctx.fillRect(7, 11, 1, 1);
}

function paintTorchSide(ctx: CanvasRenderingContext2D): void {
  // Mørk bakgrunn — fakkelen "henger" midt i blokken
  ctx.fillStyle = 'rgb(36,28,20)';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  // Trepinne i midten (nederste 3/4)
  ctx.fillStyle = 'rgb(120,78,40)';
  ctx.fillRect(7, 5, 2, 10);
  ctx.fillStyle = 'rgb(96,62,32)';
  ctx.fillRect(8, 5, 1, 10);
  // Flamme på toppen
  ctx.fillStyle = 'rgb(255,200,80)';
  ctx.fillRect(6, 2, 4, 3);
  ctx.fillStyle = 'rgb(255,240,160)';
  ctx.fillRect(7, 1, 2, 3);
  ctx.fillStyle = 'rgb(255,120,40)';
  ctx.fillRect(5, 4, 1, 1);
  ctx.fillRect(10, 4, 1, 1);
  ctx.fillRect(7, 0, 2, 1);
}

function paintTorchTop(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgb(36,28,20)';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.fillStyle = 'rgb(255,240,160)';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = 'rgb(255,200,80)';
  ctx.fillRect(5, 5, 1, 6);
  ctx.fillRect(10, 5, 1, 6);
  ctx.fillRect(5, 5, 6, 1);
  ctx.fillRect(5, 10, 6, 1);
}

function paintTorchBottom(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgb(36,28,20)';
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  ctx.fillStyle = 'rgb(96,62,32)';
  ctx.fillRect(7, 7, 2, 2);
}

function createCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TEXTURE_SIZE;
  c.height = TEXTURE_SIZE;
  return c;
}

function finalizeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function generateTexture(type: BlockType, face: Face = 'side'): THREE.CanvasTexture {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case BlockType.Stone:
      paintStone(ctx);
      break;
    case BlockType.Wood:
      paintWoodPlanks(ctx);
      break;
    case BlockType.Dirt:
      paintDirt(ctx, 3);
      break;
    case BlockType.Grass:
      if (face === 'top') paintGrassTop(ctx);
      else if (face === 'bottom') paintDirt(ctx, 3);
      else paintGrassSide(ctx);
      break;
    case BlockType.Water:
      paintWater(ctx);
      break;
    case BlockType.Lava:
      paintLava(ctx);
      break;
    case BlockType.Torch:
      if (face === 'top') paintTorchTop(ctx);
      else if (face === 'bottom') paintTorchBottom(ctx);
      else paintTorchSide(ctx);
      break;
  }

  return finalizeTexture(canvas);
}

// Material-cache. Grass/Torch trenger per-face materialer (array av 6),
// resten har ett felles material.
const materialCache = new Map<BlockType, THREE.Material | THREE.Material[]>();

function buildMaterial(type: BlockType): THREE.Material | THREE.Material[] {
  if (type === BlockType.Grass || type === BlockType.Torch) {
    // BoxGeometry-face-rekkefølge: +X, -X, +Y (top), -Y (bottom), +Z, -Z
    const side = new THREE.MeshLambertMaterial({ map: generateTexture(type, 'side') });
    const top = new THREE.MeshLambertMaterial({ map: generateTexture(type, 'top') });
    const bottom = new THREE.MeshLambertMaterial({ map: generateTexture(type, 'bottom') });
    if (type === BlockType.Torch) {
      top.emissive = new THREE.Color(0xffaa44);
      top.emissiveIntensity = 0.9;
      side.emissive = new THREE.Color(0xff8833);
      side.emissiveIntensity = 0.35;
    }
    return [
      side.clone(),
      side.clone(),
      top,
      bottom,
      side.clone(),
      side.clone(),
    ];
  }

  const tex = generateTexture(type, 'side');
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  if (type === BlockType.Water) {
    mat.transparent = true;
    mat.opacity = 0.7;
  }
  if (type === BlockType.Lava) {
    mat.emissive = new THREE.Color(0xff5522);
    mat.emissiveIntensity = 0.6;
  }
  return mat;
}

export function getMaterial(type: BlockType): THREE.Material | THREE.Material[] {
  let m = materialCache.get(type);
  if (!m) {
    m = buildMaterial(type);
    materialCache.set(type, m);
  }
  return m;
}
