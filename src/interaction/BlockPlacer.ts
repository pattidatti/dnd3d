import * as THREE from 'three';
import { BlockType } from '../world/BlockTypes';
import { VoxelWorld } from '../world/VoxelWorld';
import { VoxelRenderer } from '../world/VoxelRenderer';

const DRAG_THRESHOLD_PX = 4;
const WORLD_SIZE_HALF = 250; // må matche GridOverlay

export class BlockPlacer {
  selectedType: BlockType = BlockType.Stone;
  /** Satt av App. Når false, ignoreres klikk (f.eks. i token-modus). */
  active = true;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly groundPlane: THREE.Plane;
  private readonly tmpPoint = new THREE.Vector3();
  private dragStart: { x: number; y: number; button: number } | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
    private readonly world: VoxelWorld,
    private readonly renderer: VoxelRenderer,
  ) {
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    this.dom.removeEventListener('pointerup', this.onPointerUp);
    this.dom.removeEventListener('contextmenu', this.onContextMenu);
  }

  private readonly onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!this.active) return;
    this.dragStart = { x: e.clientX, y: e.clientY, button: e.button };
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.active || !this.dragStart || this.dragStart.button !== e.button) {
      this.dragStart = null;
      return;
    }
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    const dist = Math.hypot(dx, dy);
    this.dragStart = null;
    if (dist > DRAG_THRESHOLD_PX) return;

    this.updateNDC(e);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    if (e.button === 0) {
      this.handlePlace();
    } else if (e.button === 2) {
      this.handleRemove();
    }
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handlePlace(): void {
    const meshes = this.renderer.getMeshes();
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits[0];

    if (hit && hit.instanceId !== undefined && hit.face) {
      const mesh = hit.object as THREE.InstancedMesh;
      const decoded = this.renderer.decodeHit(mesh, hit.instanceId);
      if (!decoded) return;
      // face.normal er i object-space; InstancedMesh-roten har identity-rotation,
      // så normalen i verdenskoordinater er den samme. Den peker alltid ± en akse.
      const nx = Math.round(hit.face.normal.x);
      const ny = Math.round(hit.face.normal.y);
      const nz = Math.round(hit.face.normal.z);
      const x = decoded.x + nx;
      const y = decoded.y + ny;
      const z = decoded.z + nz;
      if (this.inBounds(x, y, z)) {
        this.world.setBlock(x, y, z, this.selectedType);
      }
      return;
    }

    // Ingen blokk truffet — prøv bakken
    const ground = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpPoint);
    if (!ground) return;
    const x = Math.floor(ground.x);
    const z = Math.floor(ground.z);
    const y = 0;
    if (this.inBounds(x, y, z)) {
      this.world.setBlock(x, y, z, this.selectedType);
    }
  }

  private handleRemove(): void {
    const meshes = this.renderer.getMeshes();
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits[0];
    if (!hit || hit.instanceId === undefined) return;
    const decoded = this.renderer.decodeHit(hit.object as THREE.InstancedMesh, hit.instanceId);
    if (!decoded) return;
    this.world.removeBlock(decoded.x, decoded.y, decoded.z);
  }

  private inBounds(x: number, y: number, z: number): boolean {
    if (y < 0 || y > 200) return false;
    if (x < -WORLD_SIZE_HALF || x >= WORLD_SIZE_HALF) return false;
    if (z < -WORLD_SIZE_HALF || z >= WORLD_SIZE_HALF) return false;
    return true;
  }
}
