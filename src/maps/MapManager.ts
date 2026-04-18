import type { BlockType } from '../world/BlockPalette';
import { VoxelWorld } from '../world/VoxelWorld';
import { FogOfWar } from '../fog/FogOfWar';
import { MapStore, type MapSnapshot } from './MapStore';

export class MapManager {
  constructor(
    private readonly world: VoxelWorld,
    private readonly fog: FogOfWar,
    private readonly store: MapStore,
  ) {}

  saveMap(name: string, id?: string): MapSnapshot {
    const blocks: [number, number, number, number][] = [];
    this.world.forEach((x, y, z, type) => blocks.push([x, y, z, type as number]));
    const now = Date.now();
    const existing = id ? this.store.get(id) : undefined;
    const snapshot: MapSnapshot = {
      id: id ?? this.store.makeId(),
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      blocks,
    };
    this.store.save(snapshot);
    return snapshot;
  }

  loadMap(id: string): void {
    const snapshot = this.store.get(id);
    if (!snapshot) return;
    this.world.clear();
    this.fog.clearAll();
    for (const [x, y, z, type] of snapshot.blocks) {
      this.world.setBlock(x, y, z, type as BlockType);
    }
  }

  deleteMap(id: string): void {
    this.store.delete(id);
  }

  renameMap(id: string, name: string): void {
    this.store.rename(id, name);
  }

  listMaps(): MapSnapshot[] {
    return this.store.list();
  }
}
