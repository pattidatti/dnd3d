// D&D-rutenett-matematikk. 5 voxler = 1 D&D-rute (5 fot).
export const CELL_SIZE = 5;

export function cellIndex(worldCoord: number): number {
  return Math.floor(worldCoord / CELL_SIZE);
}

export function cellCenter(cellIdx: number): number {
  return cellIdx * CELL_SIZE + CELL_SIZE / 2;
}

export function snapToCell(worldCoord: number): number {
  return cellCenter(cellIndex(worldCoord));
}
