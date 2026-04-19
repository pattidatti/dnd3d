export type FogKey = string; // `${cellX}_${cellZ}`

export interface FogEvent {
  key: FogKey;
  cellX: number;
  cellZ: number;
}

type Listener = (e: FogEvent) => void;
type ClearListener = () => void;

export function fogKey(cellX: number, cellZ: number): FogKey {
  return `${cellX}_${cellZ}`;
}

export class FogOfWar {
  private readonly revealed = new Set<FogKey>();
  private readonly revealListeners = new Set<Listener>();
  private readonly hideListeners = new Set<Listener>();
  private readonly fogClearListeners = new Set<ClearListener>();

  isRevealed(cellX: number, cellZ: number): boolean {
    return this.revealed.has(fogKey(cellX, cellZ));
  }

  reveal(cellX: number, cellZ: number): void {
    const key = fogKey(cellX, cellZ);
    if (this.revealed.has(key)) return;
    this.revealed.add(key);
    this.emit(this.revealListeners, { key, cellX, cellZ });
  }

  hide(cellX: number, cellZ: number): void {
    const key = fogKey(cellX, cellZ);
    if (!this.revealed.has(key)) return;
    this.revealed.delete(key);
    this.emit(this.hideListeners, { key, cellX, cellZ });
  }

  toggle(cellX: number, cellZ: number): void {
    if (this.isRevealed(cellX, cellZ)) this.hide(cellX, cellZ);
    else this.reveal(cellX, cellZ);
  }

  /** Avslør et kvadratisk område (2*radius+1) sentrert på cellen. */
  revealArea(cellX: number, cellZ: number, radius = 1): void {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        this.reveal(cellX + dx, cellZ + dz);
      }
    }
  }

  forEachRevealed(cb: (cellX: number, cellZ: number) => void): void {
    for (const key of this.revealed) {
      const parts = key.split('_');
      cb(Number(parts[0]), Number(parts[1]));
    }
  }

  get size(): number {
    return this.revealed.size;
  }

  onCellRevealed(cb: Listener): () => void {
    this.revealListeners.add(cb);
    return () => this.revealListeners.delete(cb);
  }

  onCellHidden(cb: Listener): () => void {
    this.hideListeners.add(cb);
    return () => this.hideListeners.delete(cb);
  }

  onCleared(cb: ClearListener): () => void {
    this.fogClearListeners.add(cb);
    return () => this.fogClearListeners.delete(cb);
  }

  clearAll(): void {
    this.revealed.clear();
    for (const l of this.fogClearListeners) l();
  }

  private emit(listeners: Set<Listener>, e: FogEvent): void {
    for (const l of listeners) l(e);
  }
}
