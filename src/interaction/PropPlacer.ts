import * as THREE from 'three';
import { getProp } from '../assets/AssetRegistry';
import type { GltfCache } from '../assets/GltfCache';
import type { InstancedPropRenderer } from '../assets/InstancedPropRenderer';
import { PropWorld, randomPropId, type PropState } from '../world/PropWorld';

/**
 * Håndterer placering og sletting av props. Raycaster mot terreng-mesh (for
 * plassering) og mot alle InstancedMesh-er i PropRenderer (for sletting).
 * Venstreklikk = commit, høyreklikk = slett, Shift+klikk = litt jitter på rot+scale.
 */
export class PropPlacer {
  active = false;
  selectedAsset: string | null = null;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly ghostGroup = new THREE.Group();
  private ghostPromise = 0; // generasjonsteller for å ignorere utdaterte loads

  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly canvas: HTMLCanvasElement,
    private readonly terrainMesh: THREE.Mesh,
    private readonly propRenderer: InstancedPropRenderer,
    private readonly propWorld: PropWorld,
    private readonly gltfCache: GltfCache,
  ) {
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.scene.remove(this.ghostGroup);
  }

  async selectAsset(assetKey: string | null): Promise<void> {
    this.selectedAsset = assetKey;
    this.clearGhost();
    if (!assetKey) return;
    const def = getProp(assetKey);
    if (!def) return;
    const gen = ++this.ghostPromise;
    // Sørg for at asset er lastet i InstancedPropRenderer (for raycast), og bygg ghost.
    await this.propRenderer.ensureLoaded(assetKey);
    if (gen !== this.ghostPromise) return;
    const gltf = this.gltfCache.get(def.url);
    if (!gltf) return;
    const ghost = gltf.scene.clone(true);
    ghost.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
      const clone = mat.clone();
      (clone as THREE.MeshStandardMaterial & { transparent: boolean; opacity: number }).transparent =
        true;
      (clone as THREE.MeshStandardMaterial & { opacity: number }).opacity = 0.55;
      (clone as THREE.MeshStandardMaterial).depthWrite = false;
      m.material = clone;
      m.castShadow = false;
      m.receiveShadow = false;
    });
    this.ghostGroup.clear();
    this.ghostGroup.add(ghost);
  }

  private clearGhost(): void {
    this.ghostGroup.clear();
    this.ghostGroup.visible = false;
  }

  private setNdc(ev: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    this.ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  }

  private readonly onPointerMove = (ev: PointerEvent): void => {
    if (!this.active || !this.selectedAsset || this.ghostGroup.children.length === 0) {
      this.ghostGroup.visible = false;
      return;
    }
    this.setNdc(ev);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.terrainMesh, false)[0];
    if (!hit) {
      this.ghostGroup.visible = false;
      return;
    }
    this.ghostGroup.position.copy(hit.point);
    this.ghostGroup.scale.setScalar(5.0);
    this.ghostGroup.visible = true;
  };

  private readonly onPointerDown = (ev: PointerEvent): void => {
    if (!this.active) return;
    if (ev.button === 0) {
      this.commitPlacement(ev);
    } else if (ev.button === 2) {
      this.deleteHit(ev);
    }
  };

  private readonly onContextMenu = (ev: MouseEvent): void => {
    if (this.active) ev.preventDefault();
  };

  private commitPlacement(ev: PointerEvent): void {
    if (!this.selectedAsset) return;
    this.setNdc(ev);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.terrainMesh, false)[0];
    if (!hit) return;
    const jitter = ev.shiftKey;
    const prop: PropState = {
      id: randomPropId(),
      assetKey: this.selectedAsset,
      x: hit.point.x,
      y: hit.point.y,
      z: hit.point.z,
      rotY: jitter ? Math.random() * Math.PI * 2 : 0,
      scale: jitter ? 4.0 + Math.random() * 3.0 : 5.0,
    };
    this.propWorld.add(prop);
  }

  private deleteHit(ev: PointerEvent): void {
    this.setNdc(ev);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const meshes = this.propRenderer.getAllMeshes();
    const hits = this.raycaster.intersectObjects(meshes, false);
    for (const h of hits) {
      const id = this.propRenderer.propIdFromHit(h.object, h.instanceId);
      if (id) {
        this.propWorld.remove(id);
        return;
      }
    }
  }
}
