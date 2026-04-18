import * as THREE from 'three';
import { ALL_BLOCK_TYPES, BlockType, getMaterial } from './BlockTypes';
import { VoxelWorld, posKey, type BlockEvent, type PosKey } from './VoxelWorld';

const MAX_PER_TYPE = 250_000;
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);

interface PerTypeState {
  mesh: THREE.InstancedMesh;
  keyToIndex: Map<PosKey, number>;
  indexToKey: string[];
  count: number;
}

export interface RaycastHit {
  type: BlockType;
  x: number;
  y: number;
  z: number;
  face: THREE.Vector3;
}

export class VoxelRenderer {
  readonly root = new THREE.Group();
  private readonly perType = new Map<BlockType, PerTypeState>();
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);

  constructor(world: VoxelWorld) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    for (const type of ALL_BLOCK_TYPES) {
      const material = getMaterial(type);
      const mesh = new THREE.InstancedMesh(geometry, material, MAX_PER_TYPE);
      mesh.count = 0;
      mesh.frustumCulled = false; // kart kan være stort; skip frustum-regning per instans
      mesh.userData.blockType = type;
      this.root.add(mesh);

      this.perType.set(type, {
        mesh,
        keyToIndex: new Map(),
        indexToKey: new Array(MAX_PER_TYPE),
        count: 0,
      });
    }

    world.onBlockAdded((e) => this.onAdded(e));
    world.onBlockRemoved((e) => this.onRemoved(e));

    // Initial state: rebygg dersom world ikke er tom
    world.forEach((x, y, z, type) => {
      this.addInstance(type, posKey(x, y, z), x, y, z);
    });
  }

  getMeshes(): THREE.InstancedMesh[] {
    return [...this.perType.values()].map((s) => s.mesh);
  }

  /** Map en raycast-instanceId + mesh-referanse tilbake til koordinater. */
  decodeHit(mesh: THREE.InstancedMesh, instanceId: number): RaycastHit | null {
    const type = mesh.userData.blockType as BlockType | undefined;
    if (type === undefined) return null;
    const state = this.perType.get(type);
    if (!state) return null;
    const key = state.indexToKey[instanceId];
    if (key === undefined) return null;
    const parts = key.split('_');
    return {
      type,
      x: Number(parts[0]),
      y: Number(parts[1]),
      z: Number(parts[2]),
      face: new THREE.Vector3(),
    };
  }

  private onAdded(e: BlockEvent): void {
    this.addInstance(e.type, e.key, e.x, e.y, e.z);
  }

  private onRemoved(e: BlockEvent): void {
    this.removeInstance(e.type, e.key);
  }

  private addInstance(type: BlockType, key: PosKey, x: number, y: number, z: number): void {
    const state = this.perType.get(type)!;
    if (state.count >= MAX_PER_TYPE) {
      console.warn(`[VoxelRenderer] capacity reached for type ${type}`);
      return;
    }
    const index = state.count;
    this.tmpPos.set(x + 0.5, y + 0.5, z + 0.5);
    this.tmpMatrix.compose(this.tmpPos, this.tmpQuat, this.tmpScale);
    state.mesh.setMatrixAt(index, this.tmpMatrix);
    state.keyToIndex.set(key, index);
    state.indexToKey[index] = key;
    state.count += 1;
    state.mesh.count = state.count;
    state.mesh.instanceMatrix.needsUpdate = true;
  }

  private removeInstance(type: BlockType, key: PosKey): void {
    const state = this.perType.get(type);
    if (!state) return;
    const index = state.keyToIndex.get(key);
    if (index === undefined) return;

    const lastIndex = state.count - 1;
    if (index !== lastIndex) {
      // Swap-and-pop: flytt siste instans inn i slotet som frigjøres.
      const lastKey = state.indexToKey[lastIndex];
      state.mesh.getMatrixAt(lastIndex, this.tmpMatrix);
      state.mesh.setMatrixAt(index, this.tmpMatrix);
      state.indexToKey[index] = lastKey;
      state.keyToIndex.set(lastKey, index);
    }

    state.mesh.setMatrixAt(lastIndex, HIDDEN_MATRIX);
    state.keyToIndex.delete(key);
    state.indexToKey[lastIndex] = '';
    state.count -= 1;
    state.mesh.count = state.count;
    state.mesh.instanceMatrix.needsUpdate = true;
  }
}
