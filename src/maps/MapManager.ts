import type { Terrain } from '../world/Terrain';
import type { PropWorld } from '../world/PropWorld';
import {
  decodeFloat32,
  decodeUint8,
  encodeFloat32,
  encodeUint8,
  MapStore,
  type MapSnapshotV2,
} from './MapStore';

/**
 * Broker mellom verden-objekter og MapStore. Serialiserer terreng-heights +
 * biome + props, og laster dem tilbake.
 */
export class MapManager {
  constructor(
    private readonly terrain: Terrain,
    private readonly propWorld: PropWorld,
    private readonly store: MapStore,
  ) {}

  snapshot(id: string, name: string): MapSnapshotV2 {
    const now = Date.now();
    const existing = this.store.get(id);
    return {
      id,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      terrain: {
        widthCells: this.terrain.widthCells,
        depthCells: this.terrain.depthCells,
        heights: encodeFloat32(this.terrain.heights),
        biome: encodeUint8(this.terrain.biome),
      },
      props: this.propWorld.all(),
    };
  }

  saveAs(name: string): MapSnapshotV2 {
    const snap = this.snapshot(this.store.makeId(), name);
    this.store.save(snap);
    return snap;
  }

  overwrite(id: string, name?: string): MapSnapshotV2 | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const snap = this.snapshot(id, name ?? existing.name);
    this.store.save(snap);
    return snap;
  }

  load(id: string): boolean {
    const snap = this.store.get(id);
    if (!snap) return false;
    this.applySnapshot(snap);
    return true;
  }

  applySnapshot(snap: MapSnapshotV2): void {
    const { widthCells, depthCells, heights, biome } = snap.terrain;
    if (widthCells !== this.terrain.widthCells || depthCells !== this.terrain.depthCells) {
      // For nå krever vi samme størrelse. Senere kan vi støtte resizing.
      console.warn('MapManager: terrain-størrelse mismatch, hopper over load');
      return;
    }
    const decodedH = decodeFloat32(heights);
    const decodedB = decodeUint8(biome);
    this.terrain.heights.set(decodedH);
    this.terrain.biome.set(decodedB);

    // Fjern alle eksisterende props og legg inn de lagrede.
    this.propWorld.clear();
    for (const p of snap.props) this.propWorld.add(p);
  }
}
