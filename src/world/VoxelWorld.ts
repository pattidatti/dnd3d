import type { BlockType } from './BlockTypes';

export type PosKey = string;

export function posKey(x: number, y: number, z: number): PosKey {
  return `${x}_${y}_${z}`;
}

export function parsePosKey(key: PosKey): [number, number, number] {
  const parts = key.split('_');
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

export interface BlockEvent {
  key: PosKey;
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

type AddListener = (e: BlockEvent) => void;
type RemoveListener = (e: BlockEvent) => void;

export class VoxelWorld {
  private readonly blocks = new Map<PosKey, BlockType>();
  private readonly addListeners = new Set<AddListener>();
  private readonly removeListeners = new Set<RemoveListener>();

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    const key = posKey(x, y, z);
    const existing = this.blocks.get(key);
    if (existing !== undefined) {
      if (existing === type) return;
      this.blocks.delete(key);
      this.emitRemove({ key, x, y, z, type: existing });
    }
    this.blocks.set(key, type);
    this.emitAdd({ key, x, y, z, type });
  }

  removeBlock(x: number, y: number, z: number): boolean {
    const key = posKey(x, y, z);
    const existing = this.blocks.get(key);
    if (existing === undefined) return false;
    this.blocks.delete(key);
    this.emitRemove({ key, x, y, z, type: existing });
    return true;
  }

  getBlock(x: number, y: number, z: number): BlockType | undefined {
    return this.blocks.get(posKey(x, y, z));
  }

  hasBlock(x: number, y: number, z: number): boolean {
    return this.blocks.has(posKey(x, y, z));
  }

  get size(): number {
    return this.blocks.size;
  }

  forEach(cb: (x: number, y: number, z: number, type: BlockType) => void): void {
    for (const [key, type] of this.blocks) {
      const [x, y, z] = parsePosKey(key);
      cb(x, y, z, type);
    }
  }

  onBlockAdded(cb: AddListener): () => void {
    this.addListeners.add(cb);
    return () => this.addListeners.delete(cb);
  }

  onBlockRemoved(cb: RemoveListener): () => void {
    this.removeListeners.add(cb);
    return () => this.removeListeners.delete(cb);
  }

  private emitAdd(e: BlockEvent): void {
    for (const l of this.addListeners) l(e);
  }

  private emitRemove(e: BlockEvent): void {
    for (const l of this.removeListeners) l(e);
  }
}
