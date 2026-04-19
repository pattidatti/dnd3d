import { CELL_SIZE } from './Grid';

export const WORLD_HALF_CELLS = 50; // ±50 celler → 100×100 rutenett, 500×500 world-units
export const GRID_WIDTH_CELLS = WORLD_HALF_CELLS * 2;
export const GRID_DEPTH_CELLS = WORLD_HALF_CELLS * 2;

export const BIOME = {
  Grass: 0,
  Sand: 1,
  Rock: 2,
  Snow: 3,
  Path: 4,
  Water: 5,
} as const;
export type BiomeId = (typeof BIOME)[keyof typeof BIOME];

export const BIOME_COLORS: Record<BiomeId, [number, number, number]> = {
  [BIOME.Grass]: [0.32, 0.52, 0.22],
  [BIOME.Sand]: [0.82, 0.74, 0.48],
  [BIOME.Rock]: [0.48, 0.46, 0.44],
  [BIOME.Snow]: [0.92, 0.94, 0.98],
  [BIOME.Path]: [0.55, 0.44, 0.32],
  [BIOME.Water]: [0.18, 0.36, 0.52],
};

/**
 * Heightmap-basert terreng. Én vertex per celle-hjørne, én biome per celle.
 * Koordinat-rom: X fra -WORLD_HALF_CELLS*CELL_SIZE til +WORLD_HALF_CELLS*CELL_SIZE (samme for Z).
 * heights[] indekseres som [iz * (widthCells+1) + ix] for ix i [0..widthCells], iz i [0..depthCells].
 * biome[] indekseres per celle som [iz * widthCells + ix].
 */
export class Terrain {
  readonly widthCells: number;
  readonly depthCells: number;
  readonly heights: Float32Array;
  readonly biome: Uint8Array;

  constructor(widthCells = GRID_WIDTH_CELLS, depthCells = GRID_DEPTH_CELLS) {
    this.widthCells = widthCells;
    this.depthCells = depthCells;
    this.heights = new Float32Array((widthCells + 1) * (depthCells + 1));
    this.biome = new Uint8Array(widthCells * depthCells).fill(BIOME.Grass);
  }

  private heightIndex(ix: number, iz: number): number {
    return iz * (this.widthCells + 1) + ix;
  }

  private biomeIndex(ix: number, iz: number): number {
    return iz * this.widthCells + ix;
  }

  /** Sett høyde direkte på en vertex (hjørne). */
  setVertexHeight(ix: number, iz: number, h: number): void {
    this.heights[this.heightIndex(ix, iz)] = h;
  }

  /** Sett biome for én celle. */
  setBiome(ix: number, iz: number, b: BiomeId): void {
    this.biome[this.biomeIndex(ix, iz)] = b;
  }

  /** Bilineær høyde-sampling i world-koordinater. */
  sampleHeight(worldX: number, worldZ: number): number {
    const half = this.widthCells / 2;
    const fx = worldX / CELL_SIZE + half;
    const fz = worldZ / CELL_SIZE + half;
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    if (ix < 0 || iz < 0 || ix >= this.widthCells || iz >= this.depthCells) {
      const cx = Math.max(0, Math.min(this.widthCells, ix));
      const cz = Math.max(0, Math.min(this.depthCells, iz));
      return this.heights[this.heightIndex(cx, cz)];
    }
    const tx = fx - ix;
    const tz = fz - iz;
    const h00 = this.heights[this.heightIndex(ix, iz)];
    const h10 = this.heights[this.heightIndex(ix + 1, iz)];
    const h01 = this.heights[this.heightIndex(ix, iz + 1)];
    const h11 = this.heights[this.heightIndex(ix + 1, iz + 1)];
    return (
      h00 * (1 - tx) * (1 - tz) +
      h10 * tx * (1 - tz) +
      h01 * (1 - tx) * tz +
      h11 * tx * tz
    );
  }

  /** Biome-lookup i world-koordinater. */
  sampleBiome(worldX: number, worldZ: number): BiomeId {
    const half = this.widthCells / 2;
    const ix = Math.floor(worldX / CELL_SIZE + half);
    const iz = Math.floor(worldZ / CELL_SIZE + half);
    if (ix < 0 || iz < 0 || ix >= this.widthCells || iz >= this.depthCells) {
      return BIOME.Grass;
    }
    return this.biome[this.biomeIndex(ix, iz)] as BiomeId;
  }

  /** Iterer over alle vertex-hjørner. Brukes av TerrainMesh for å bygge geometri. */
  forEachVertex(cb: (ix: number, iz: number, h: number) => void): void {
    for (let iz = 0; iz <= this.depthCells; iz++) {
      for (let ix = 0; ix <= this.widthCells; ix++) {
        cb(ix, iz, this.heights[this.heightIndex(ix, iz)]);
      }
    }
  }
}

/** World-X for en vertex-index ix. */
export function vertexWorldX(ix: number, widthCells = GRID_WIDTH_CELLS): number {
  return (ix - widthCells / 2) * CELL_SIZE;
}

export function vertexWorldZ(iz: number, depthCells = GRID_DEPTH_CELLS): number {
  return (iz - depthCells / 2) * CELL_SIZE;
}
