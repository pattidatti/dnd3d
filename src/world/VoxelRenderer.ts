import * as THREE from 'three';
import { ALL_BLOCK_TYPES, BlockType, getMaterial } from './BlockPalette';
import { VoxelWorld, posKey, type BlockEvent, type PosKey } from './VoxelWorld';

const MAX_PER_TYPE = 250_000;
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
const HIDDEN_COLOR = new THREE.Color(1, 1, 1);

// Nabo-offsets for AO (6 kardinale retninger).
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

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
  private readonly world: VoxelWorld;
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpPos = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpScale = new THREE.Vector3(1, 1, 1);
  private readonly tmpColor = new THREE.Color();

  constructor(world: VoxelWorld) {
    this.world = world;
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    for (const type of ALL_BLOCK_TYPES) {
      const material = getMaterial(type);
      const mesh = new THREE.InstancedMesh(geometry, material, MAX_PER_TYPE);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.blockType = type;
      const colors = new Float32Array(MAX_PER_TYPE * 3);
      colors.fill(1); // start hvitt — AO-refresh mørkner senere
      mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
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

    world.forEach((x, y, z, type) => {
      this.addInstance(type, posKey(x, y, z), x, y, z);
    });
    world.forEach((x, y, z) => this.refreshAO(x, y, z));
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
    this.refreshAO(e.x, e.y, e.z);
    this.refreshNeighborAO(e.x, e.y, e.z);
  }

  private onRemoved(e: BlockEvent): void {
    this.removeInstance(e.type, e.key);
    this.refreshNeighborAO(e.x, e.y, e.z);
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
      const lastKey = state.indexToKey[lastIndex];
      state.mesh.getMatrixAt(lastIndex, this.tmpMatrix);
      state.mesh.setMatrixAt(index, this.tmpMatrix);
      if (state.mesh.instanceColor) {
        state.mesh.getColorAt(lastIndex, this.tmpColor);
        state.mesh.setColorAt(index, this.tmpColor);
      }
      state.indexToKey[index] = lastKey;
      state.keyToIndex.set(lastKey, index);
    }

    state.mesh.setMatrixAt(lastIndex, HIDDEN_MATRIX);
    if (state.mesh.instanceColor) {
      state.mesh.setColorAt(lastIndex, HIDDEN_COLOR);
      state.mesh.instanceColor.needsUpdate = true;
    }
    state.keyToIndex.delete(key);
    state.indexToKey[lastIndex] = '';
    state.count -= 1;
    state.mesh.count = state.count;
    state.mesh.instanceMatrix.needsUpdate = true;
  }

  private refreshNeighborAO(x: number, y: number, z: number): void {
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
      this.refreshAO(x + dx, y + dy, z + dz);
    }
  }

  private refreshAO(x: number, y: number, z: number): void {
    const type = this.world.getBlock(x, y, z);
    if (type === undefined) return;
    const state = this.perType.get(type);
    if (!state) return;
    const index = state.keyToIndex.get(posKey(x, y, z));
    if (index === undefined) return;

    // Tell hvor mange av de 6 nabofelter som er solide. Jo flere,
    // jo mer "begravet" — darker brightness. Rent enkelt AO-approx.
    let buried = 0;
    for (const [dx, dy, dz] of NEIGHBOR_OFFSETS) {
      if (this.world.hasBlock(x + dx, y + dy, z + dz)) buried += 1;
    }
    const brightness = 1 - buried * 0.07; // 1.0 (fritt) → 0.58 (helt begravet)
    this.tmpColor.setScalar(brightness);
    state.mesh.setColorAt(index, this.tmpColor);
    if (state.mesh.instanceColor) state.mesh.instanceColor.needsUpdate = true;
  }
}
