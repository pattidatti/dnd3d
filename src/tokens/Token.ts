export const CELL_SIZE = 5; // 1 D&D-rute = 5 voxels = 5 fot

export interface Token {
  id: string;
  ownerUid: string;
  name: string;
  color: string;
  initial: string;
  x: number; // world-senter X av 5-fots-rute
  y: number; // base-Y (topp av voxel under token)
  z: number; // world-senter Z av 5-fots-rute
}

export function cellIndex(worldCoord: number): number {
  return Math.floor(worldCoord / CELL_SIZE);
}

export function cellCenter(cellIdx: number): number {
  return cellIdx * CELL_SIZE + CELL_SIZE / 2;
}

/** Snap en world-koordinat til 5-fot-celle-sentrum. */
export function snapToCell(worldCoord: number): number {
  return cellCenter(cellIndex(worldCoord));
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
