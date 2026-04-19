import { CELL_SIZE } from '../world/Grid';
import type { Terrain } from '../world/Terrain';
import { RAPIER, type RapierWorld } from './RapierWorld';

/**
 * Rapier heightfield-collider bygget fra Terrain.heights. Heightfield-shape
 * er en uniform 2D-grid av høyder; vi matcher (widthCells+1)×(depthCells+1)
 * og passer XZ-skalering via scale = (widthCells*CELL_SIZE, 1, depthCells*CELL_SIZE).
 */
export class TerrainCollider {
  private handle: number | null = null;

  constructor(
    private readonly rw: RapierWorld,
    private readonly terrain: Terrain,
  ) {}

  build(): void {
    if (!this.rw.isReady()) return;
    this.dispose();

    const w = this.terrain.widthCells;
    const d = this.terrain.depthCells;
    // Rapier expects heights as (nrows+1) * (ncols+1) entries. Its layout is
    // column-major: heights[j * (nrows+1) + i] with i in rows (z), j in cols (x).
    // Our Terrain.heights is [iz * (w+1) + ix] (row-major with X fastest).
    // Rotate into Rapier's expected layout.
    const nrows = d;
    const ncols = w;
    const heights = new Float32Array((nrows + 1) * (ncols + 1));
    for (let iz = 0; iz <= nrows; iz++) {
      for (let ix = 0; ix <= ncols; ix++) {
        const src = iz * (w + 1) + ix;
        const dst = ix * (nrows + 1) + iz;
        heights[dst] = this.terrain.heights[src];
      }
    }

    const scale = {
      x: ncols * CELL_SIZE,
      y: 1,
      z: nrows * CELL_SIZE,
    };

    const rigidDesc = RAPIER.RigidBodyDesc.fixed();
    const body = this.rw.world.createRigidBody(rigidDesc);

    const colliderDesc = RAPIER.ColliderDesc.heightfield(nrows, ncols, heights, scale);
    colliderDesc.setFriction(0.9);
    const collider = this.rw.world.createCollider(colliderDesc, body);
    this.handle = collider.handle;
  }

  dispose(): void {
    if (this.handle === null) return;
    const collider = this.rw.world.getCollider(this.handle);
    if (collider) this.rw.world.removeCollider(collider, true);
    this.handle = null;
  }
}
