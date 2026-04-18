import * as THREE from 'three';

export enum BlockType {
  Stone = 0,
  Plaster = 1,
  Brick = 2,
  Roof = 3,
  Wood = 4,
  Dirt = 5,
  Grass = 6,
  Leaf = 7,
  Trunk = 8,
  Sand = 9,
  Water = 10,
  Slate = 11,
}

export const ALL_BLOCK_TYPES: ReadonlyArray<BlockType> = [
  BlockType.Stone,
  BlockType.Plaster,
  BlockType.Brick,
  BlockType.Roof,
  BlockType.Wood,
  BlockType.Dirt,
  BlockType.Grass,
  BlockType.Leaf,
  BlockType.Trunk,
  BlockType.Sand,
  BlockType.Water,
  BlockType.Slate,
];

export type BlockCategory = 'natur' | 'arkitektur';

export const CATEGORY_LABELS: Record<BlockCategory, string> = {
  natur: 'Natur',
  arkitektur: 'Arkitektur',
};

export const BLOCKS_BY_CATEGORY: Record<BlockCategory, ReadonlyArray<BlockType>> = {
  natur: [
    BlockType.Dirt,
    BlockType.Grass,
    BlockType.Leaf,
    BlockType.Trunk,
    BlockType.Sand,
    BlockType.Water,
  ],
  arkitektur: [
    BlockType.Stone,
    BlockType.Plaster,
    BlockType.Brick,
    BlockType.Roof,
    BlockType.Wood,
    BlockType.Slate,
  ],
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  [BlockType.Stone]: 'Stein',
  [BlockType.Plaster]: 'Puss',
  [BlockType.Brick]: 'Tegl',
  [BlockType.Roof]: 'Takstein',
  [BlockType.Wood]: 'Tre',
  [BlockType.Dirt]: 'Jord',
  [BlockType.Grass]: 'Gress',
  [BlockType.Leaf]: 'Løv',
  [BlockType.Trunk]: 'Stamme',
  [BlockType.Sand]: 'Sand',
  [BlockType.Water]: 'Vann',
  [BlockType.Slate]: 'Skifer',
};

// Townscaper/Monument Valley-inspirert pastellpalett. Ingen teksturer —
// materialene er flate farger med varierende roughness.
export const BLOCK_COLORS: Record<BlockType, number> = {
  [BlockType.Stone]: 0xcfc9bf,
  [BlockType.Plaster]: 0xf1e6d0,
  [BlockType.Brick]: 0xc47a6a,
  [BlockType.Roof]: 0x9a4a3f,
  [BlockType.Wood]: 0xd9b384,
  [BlockType.Dirt]: 0x9c7b5b,
  [BlockType.Grass]: 0x94c08a,
  [BlockType.Leaf]: 0x7ca66a,
  [BlockType.Trunk]: 0x7d5a3f,
  [BlockType.Sand]: 0xe8d9a4,
  [BlockType.Water]: 0x7ec1c4,
  [BlockType.Slate]: 0x6b7079,
};

interface MaterialSpec {
  color: number;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
}

const SPECS: Record<BlockType, MaterialSpec> = {
  [BlockType.Stone]: { color: BLOCK_COLORS[BlockType.Stone], roughness: 0.95, metalness: 0 },
  [BlockType.Plaster]: { color: BLOCK_COLORS[BlockType.Plaster], roughness: 1.0, metalness: 0 },
  [BlockType.Brick]: { color: BLOCK_COLORS[BlockType.Brick], roughness: 0.9, metalness: 0 },
  [BlockType.Roof]: { color: BLOCK_COLORS[BlockType.Roof], roughness: 0.85, metalness: 0 },
  [BlockType.Wood]: { color: BLOCK_COLORS[BlockType.Wood], roughness: 0.9, metalness: 0 },
  [BlockType.Dirt]: { color: BLOCK_COLORS[BlockType.Dirt], roughness: 1.0, metalness: 0 },
  [BlockType.Grass]: { color: BLOCK_COLORS[BlockType.Grass], roughness: 1.0, metalness: 0 },
  [BlockType.Leaf]: { color: BLOCK_COLORS[BlockType.Leaf], roughness: 1.0, metalness: 0 },
  [BlockType.Trunk]: { color: BLOCK_COLORS[BlockType.Trunk], roughness: 0.95, metalness: 0 },
  [BlockType.Sand]: { color: BLOCK_COLORS[BlockType.Sand], roughness: 1.0, metalness: 0 },
  [BlockType.Water]: {
    color: BLOCK_COLORS[BlockType.Water],
    roughness: 0.25,
    metalness: 0.0,
    transparent: true,
    opacity: 0.72,
  },
  [BlockType.Slate]: { color: BLOCK_COLORS[BlockType.Slate], roughness: 0.9, metalness: 0 },
};

const materialCache = new Map<BlockType, THREE.MeshStandardMaterial>();

export function getMaterial(type: BlockType): THREE.MeshStandardMaterial {
  let mat = materialCache.get(type);
  if (mat) return mat;
  const spec = SPECS[type];
  // IKKE vertexColors: true — BoxGeometry har ingen 'color'-attributt, og
  // WebGL returnerer (0,0,0) fra manglende attributt, som nullstiller vColor.
  // InstancedMesh.instanceColor aktiverer USE_INSTANCING_COLOR uten dette
  // flagget og tinter per-instans mot material-fargen.
  mat = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    transparent: spec.transparent ?? false,
    opacity: spec.opacity ?? 1,
  });
  materialCache.set(type, mat);
  return mat;
}
