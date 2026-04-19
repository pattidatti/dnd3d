import * as THREE from 'three';
import { cellIndex } from '../world/Grid';
import { FogOfWar } from './FogOfWar';

const DRAG_THRESHOLD_PX = 4;
const WORLD_HALF_CELLS = 50;

/**
 * Fog-placer som raycaster mot terreng-mesh istedenfor en flat y=0-plane,
 * slik at avsløring treffer rett celle også på skråninger/høyder.
 */
export class FogPlacer {
  active = false;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private dragStart: { x: number; y: number; button: number; shift: boolean } | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
    private readonly fog: FogOfWar,
    private readonly terrainMesh: THREE.Mesh,
  ) {
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
    if (this.active) e.preventDefault();
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!this.active) return;
    this.dragStart = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey };
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.active || !this.dragStart || this.dragStart.button !== e.button) {
      this.dragStart = null;
      return;
    }
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    const dist = Math.hypot(dx, dy);
    const shift = this.dragStart.shift || e.shiftKey;
    this.dragStart = null;
    if (dist > DRAG_THRESHOLD_PX) return;

    this.updateNDC(e);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.terrainMesh, false)[0];
    if (!hit) return;

    const cellX = cellIndex(hit.point.x);
    const cellZ = cellIndex(hit.point.z);
    if (!this.inBounds(cellX, cellZ)) return;

    if (e.button === 0) {
      if (shift) this.fog.revealArea(cellX, cellZ, 1);
      else this.fog.toggle(cellX, cellZ);
    } else if (e.button === 2) {
      this.fog.hide(cellX, cellZ);
    }
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private inBounds(cellX: number, cellZ: number): boolean {
    return (
      cellX >= -WORLD_HALF_CELLS &&
      cellX < WORLD_HALF_CELLS &&
      cellZ >= -WORLD_HALF_CELLS &&
      cellZ < WORLD_HALF_CELLS
    );
  }
}
