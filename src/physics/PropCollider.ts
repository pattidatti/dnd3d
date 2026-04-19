import * as THREE from 'three';
import type { GltfCache } from '../assets/GltfCache';
import { getProp } from '../assets/AssetRegistry';
import type { PropWorld, PropState } from '../world/PropWorld';
import { RAPIER, type RapierWorld } from './RapierWorld';

/**
 * Bygger statiske AABB-kollidere per prop-instans. Bruker GLB-ens beregnede
 * boundingBox (skalert med prop.scale) som cuboid-shape. Det er en grov
 * tilnærming, men god nok for at tokens/karakterer stanser mot trær og
 * klipper. Lytter på PropWorld-events for å holde seg i sync.
 */
export class PropCollider {
  private readonly handles = new Map<string, number>();
  private readonly bboxCache = new Map<string, THREE.Box3>();

  constructor(
    private readonly rw: RapierWorld,
    private readonly cache: GltfCache,
    private readonly propWorld: PropWorld,
  ) {}

  attach(): () => void {
    const unAdded = this.propWorld.onAdded((p) => void this.addProp(p));
    const unUpdated = this.propWorld.onUpdated((p) => void this.updateProp(p));
    const unRemoved = this.propWorld.onRemoved((id) => this.removeProp(id));
    // Kompiler eksisterende props (som ble lagt inn før collider var klar).
    for (const p of this.propWorld.all()) void this.addProp(p);
    return () => {
      unAdded();
      unUpdated();
      unRemoved();
    };
  }

  private async addProp(p: PropState): Promise<void> {
    if (!this.rw.isReady()) return;
    if (this.handles.has(p.id)) return;
    const bb = await this.getBoundingBox(p.assetKey);
    if (!bb) return;
    const sx = (bb.max.x - bb.min.x) * p.scale * 0.5;
    const sy = (bb.max.y - bb.min.y) * p.scale * 0.5;
    const sz = (bb.max.z - bb.min.z) * p.scale * 0.5;
    const cx = (bb.max.x + bb.min.x) * 0.5 * p.scale;
    const cy = (bb.max.y + bb.min.y) * 0.5 * p.scale;
    const cz = (bb.max.z + bb.min.z) * 0.5 * p.scale;

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      p.x + cx * Math.cos(p.rotY) + cz * Math.sin(p.rotY),
      p.y + cy,
      p.z - cx * Math.sin(p.rotY) + cz * Math.cos(p.rotY),
    );
    bodyDesc.setRotation({ x: 0, y: Math.sin(p.rotY / 2), z: 0, w: Math.cos(p.rotY / 2) });
    const body = this.rw.world.createRigidBody(bodyDesc);

    const colDesc = RAPIER.ColliderDesc.cuboid(Math.max(0.1, sx), Math.max(0.1, sy), Math.max(0.1, sz));
    colDesc.setFriction(0.8);
    const collider = this.rw.world.createCollider(colDesc, body);
    this.handles.set(p.id, collider.handle);
  }

  private async updateProp(p: PropState): Promise<void> {
    this.removeProp(p.id);
    await this.addProp(p);
  }

  private removeProp(id: string): void {
    if (!this.rw.isReady()) return;
    const handle = this.handles.get(id);
    if (handle === undefined) return;
    const collider = this.rw.world.getCollider(handle);
    if (collider) {
      const body = collider.parent();
      this.rw.world.removeCollider(collider, true);
      if (body) this.rw.world.removeRigidBody(body);
    }
    this.handles.delete(id);
  }

  private async getBoundingBox(assetKey: string): Promise<THREE.Box3 | null> {
    const cached = this.bboxCache.get(assetKey);
    if (cached) return cached;
    const def = getProp(assetKey);
    if (!def) return null;
    try {
      const gltf = await this.cache.load(def.url);
      const bb = new THREE.Box3().setFromObject(gltf.scene);
      this.bboxCache.set(assetKey, bb);
      return bb;
    } catch {
      return null;
    }
  }
}
