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
  [BlockType.Stone]: 0xb0aba2,
  [BlockType.Plaster]: 0xf5ede0,
  [BlockType.Brick]: 0xd46040,
  [BlockType.Roof]: 0x8a3028,
  [BlockType.Wood]: 0xe0b560,
  [BlockType.Dirt]: 0x8a6040,
  [BlockType.Grass]: 0x5fb856,
  [BlockType.Leaf]: 0x4a9e40,
  [BlockType.Trunk]: 0x624530,
  [BlockType.Sand]: 0xe8cf70,
  [BlockType.Water]: 0x40b4c0,
  [BlockType.Slate]: 0x4e5a6a,
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

// Felles tids-uniform for animert vann. Deles av alle Water-instanser så vi
// kan oppdatere én verdi per frame fra App.tick.
const waterTimeUniform = { value: 0 };

export function tickWater(elapsedSeconds: number): void {
  waterTimeUniform.value = elapsedSeconds;
}

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

  if (type === BlockType.Water) {
    applyWaterShader(mat);
  }

  materialCache.set(type, mat);
  return mat;
}

// Injiserer vertex-bølger og lett fresnel-glød i Water-materialet. Bruker
// onBeforeCompile slik at vi beholder hele PBR-pipelinen (tonemap, env, AO).
function applyWaterShader(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterTimeUniform;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `
        #include <common>
        uniform float uTime;
        varying float vWaveTop;
        varying vec3 vWorldPosLocal;
        `,
      )
      .replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3( position );
        // Sentrert i [-0.5, 0.5]^3 — top-flaten ligger på y = +0.5.
        // Vi vil bare bevege topp-vertices så bunnen forblir flat mot
        // underliggende blokker.
        float topMask = step(0.4, position.y);
        vWaveTop = topMask;

        // Bruk verdens-XZ til bølgene (via instansens worldMatrix) slik at
        // tilstøtende vannblokker danner sammenhengende bølger.
        vec4 wp = instanceMatrix * vec4(position, 1.0);
        wp = modelMatrix * wp;
        vWorldPosLocal = wp.xyz;
        float t = uTime;
        float w1 = sin(wp.x * 0.55 + t * 1.4) * 0.06;
        float w2 = sin(wp.z * 0.42 - t * 1.1) * 0.05;
        float w3 = sin((wp.x + wp.z) * 0.3 + t * 0.7) * 0.04;
        transformed.y += (w1 + w2 + w3) * topMask;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `
        #include <common>
        varying float vWaveTop;
        varying vec3 vWorldPosLocal;
        `,
      )
      .replace(
        '#include <opaque_fragment>',
        `
        // Lett fresnel-glød — øker reflektivitet på flate vinkler.
        vec3 viewDir = normalize(cameraPosition - vWorldPosLocal);
        float fres = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
        outgoingLight += vec3(0.18, 0.32, 0.4) * fres * vWaveTop * 0.5;
        #include <opaque_fragment>
        `,
      );
  };
  // Tving recompile dersom materialet allerede er brukt.
  mat.needsUpdate = true;
}
