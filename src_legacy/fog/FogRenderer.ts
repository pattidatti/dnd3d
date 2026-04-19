import * as THREE from 'three';
import { CELL_SIZE, cellCenter } from '../world/Grid';
import { FogOfWar, fogKey, type FogEvent, type FogKey } from './FogOfWar';

const WORLD_HALF_CELLS = 50; // ±50 celler = 100×100 = 10 000
const MAX_FOG = WORLD_HALF_CELLS * 2 * (WORLD_HALF_CELLS * 2);
const FOG_Y = 0.02; // over grid (0.01), under tokens
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

export class FogRenderer {
  readonly root = new THREE.Group();
  readonly mesh: THREE.InstancedMesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly keyToIndex = new Map<FogKey, number>();
  private readonly indexToKey: string[] = new Array(MAX_FOG);
  private count = 0;

  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);

  constructor(fog: FogOfWar) {
    const geometry = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
    geometry.rotateX(-Math.PI / 2); // ligg flatt i XZ-planet
    this.material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35, // default = DM-view; ViewToggle setter til 1.0 i Player-view
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, MAX_FOG);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1; // tegn over voxler/grid for forutsigbar transparency-rekkefølge
    this.root.add(this.mesh);

    fog.onCellRevealed((e) => this.removeInstance(e.key));
    fog.onCellHidden((e) => this.addInstance(e));
    fog.onCleared(() => this.reset());

    // Initial state: alle celler i bounds som IKKE er avslørt får fog-instans.
    for (let cz = -WORLD_HALF_CELLS; cz < WORLD_HALF_CELLS; cz++) {
      for (let cx = -WORLD_HALF_CELLS; cx < WORLD_HALF_CELLS; cx++) {
        if (!fog.isRevealed(cx, cz)) {
          this.addInstance({ key: fogKey(cx, cz), cellX: cx, cellZ: cz });
        }
      }
    }
  }

  reset(): void {
    this.keyToIndex.clear();
    this.count = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    for (let cz = -WORLD_HALF_CELLS; cz < WORLD_HALF_CELLS; cz++) {
      for (let cx = -WORLD_HALF_CELLS; cx < WORLD_HALF_CELLS; cx++) {
        this.addInstance({ key: fogKey(cx, cz), cellX: cx, cellZ: cz });
      }
    }
  }

  setOpacity(opacity: number): void {
    this.material.opacity = opacity;
    this.material.needsUpdate = true;
  }

  private addInstance(e: FogEvent): void {
    if (this.keyToIndex.has(e.key)) return;
    if (this.count >= MAX_FOG) return;
    const index = this.count;
    this.tmpPos.set(cellCenter(e.cellX), FOG_Y, cellCenter(e.cellZ));
    this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
    this.mesh.setMatrixAt(index, this.tmpMatrix);
    this.keyToIndex.set(e.key, index);
    this.indexToKey[index] = e.key;
    this.count += 1;
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private removeInstance(key: FogKey): void {
    const index = this.keyToIndex.get(key);
    if (index === undefined) return;

    const lastIndex = this.count - 1;
    if (index !== lastIndex) {
      const lastKey = this.indexToKey[lastIndex];
      this.mesh.getMatrixAt(lastIndex, this.tmpMatrix);
      this.mesh.setMatrixAt(index, this.tmpMatrix);
      this.indexToKey[index] = lastKey;
      this.keyToIndex.set(lastKey, index);
    }

    this.mesh.setMatrixAt(lastIndex, HIDDEN_MATRIX);
    this.keyToIndex.delete(key);
    this.indexToKey[lastIndex] = '';
    this.count -= 1;
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
