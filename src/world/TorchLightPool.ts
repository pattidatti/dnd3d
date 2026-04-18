import * as THREE from 'three';
import { BlockType } from './BlockTypes';
import { VoxelWorld, parsePosKey, posKey, type PosKey } from './VoxelWorld';

const POOL_SIZE = 6;
const RANGE = 18;
const INTENSITY = 2.2;
const COLOR = 0xffaa55;
const UPDATE_INTERVAL_MS = 200;

export class TorchLightPool {
  private readonly torches = new Set<PosKey>();
  private readonly lights: THREE.PointLight[] = [];
  private readonly camera: THREE.Camera;
  private lastUpdate = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    world: VoxelWorld,
  ) {
    this.camera = camera;

    for (let i = 0; i < POOL_SIZE; i++) {
      const light = new THREE.PointLight(COLOR, 0, RANGE, 1.2);
      light.position.set(0, -1000, 0);
      scene.add(light);
      this.lights.push(light);
    }

    world.onBlockAdded((e) => {
      if (e.type === BlockType.Torch) this.torches.add(e.key);
    });
    world.onBlockRemoved((e) => {
      if (e.type === BlockType.Torch) this.torches.delete(e.key);
    });
    // Dersom world allerede har fakler
    world.forEach((x, y, z, t) => {
      if (t === BlockType.Torch) this.torches.add(posKey(x, y, z));
    });
  }

  update(nowMs: number): void {
    if (nowMs - this.lastUpdate < UPDATE_INTERVAL_MS) return;
    this.lastUpdate = nowMs;

    const camPos = this.camera.position;
    const entries: Array<{ key: PosKey; dist2: number }> = [];
    for (const key of this.torches) {
      const [x, y, z] = parsePosKey(key);
      const dx = x + 0.5 - camPos.x;
      const dy = y + 0.5 - camPos.y;
      const dz = z + 0.5 - camPos.z;
      entries.push({ key, dist2: dx * dx + dy * dy + dz * dz });
    }
    entries.sort((a, b) => a.dist2 - b.dist2);

    const n = Math.min(POOL_SIZE, entries.length);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = parsePosKey(entries[i].key);
      const light = this.lights[i];
      light.position.set(x + 0.5, y + 0.7, z + 0.5);
      light.intensity = INTENSITY;
    }
    for (let i = n; i < POOL_SIZE; i++) {
      const light = this.lights[i];
      light.intensity = 0;
      light.position.set(0, -1000, 0);
    }
  }

  get activeCount(): number {
    return this.lights.filter((l) => l.intensity > 0).length;
  }
}
