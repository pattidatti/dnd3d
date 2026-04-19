import * as THREE from 'three';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { VoxelRenderer } from '../world/VoxelRenderer';
import type { AvatarManager, AvatarState } from '../character/AvatarManager';
import type { LocalIdentity } from '../character/LocalIdentity';
import { randomId } from '../character/LocalIdentity';

const DRAG_THRESHOLD_PX = 4;
const WORLD_SIZE_HALF = 250;
const CELL_SIZE = 5;

function cellIndex(coord: number): number {
  return Math.floor(coord / CELL_SIZE);
}
function cellCenter(idx: number): number {
  return idx * CELL_SIZE + CELL_SIZE / 2;
}

export class AvatarSpawner {
  /** Aktiv i orbit-modus, mens ToolMode = 'tokens'. */
  active = false;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tmpPoint = new THREE.Vector3();
  private dragStart: { x: number; y: number; button: number } | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
    private readonly world: VoxelWorld,
    private readonly voxelRenderer: VoxelRenderer,
    private readonly avatars: AvatarManager,
    private readonly getIdentity: () => LocalIdentity | undefined,
  ) {
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointerup', this.onPointerUp);
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    this.dom.removeEventListener('pointerup', this.onPointerUp);
  }

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
    this.dragStart = null;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;

    this.updateNDC(e);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    if (e.button === 0) this.handleLeft();
    else if (e.button === 2) this.handleRight();
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleLeft(): void {
    const identity = this.getIdentity();
    if (!identity) return;

    const avatarHit = this.raycastAvatar();
    const target = this.raycastPlacementTarget();

    const selectedId = this.avatars.getSelectedId();
    const selected = selectedId ? this.avatars.get(selectedId) ?? null : null;
    const own = this.avatars.getByOwner(identity.uid) ?? null;

    const moveable =
      selected && (identity.isDM || selected.ownerUid === identity.uid)
        ? selected
        : own && (identity.isDM || own.ownerUid === identity.uid)
          ? own
          : null;

    // Klikk på annen avatar enn den flyttbare → velg.
    if (avatarHit && avatarHit.id !== moveable?.id) {
      if (identity.isDM || avatarHit.ownerUid === identity.uid) {
        this.avatars.select(avatarHit.id);
      }
      return;
    }

    // Flytt til gyldig mål.
    if (moveable && target) {
      if (moveable.x !== target.x || moveable.y !== target.y || moveable.z !== target.z) {
        this.avatars.move(moveable.id, target.x, target.y, target.z);
      }
      this.avatars.select(moveable.id);
      return;
    }

    // Klikk på egen avatar uten mål → velg.
    if (avatarHit) {
      this.avatars.select(avatarHit.id);
      return;
    }

    // Første gang — spawn egen avatar.
    if (!own && target) {
      const state: AvatarState = {
        id: 'avatar_' + randomId(),
        ownerUid: identity.uid,
        name: identity.name,
        color: identity.color,
        initial: identity.initial,
        x: target.x,
        y: target.y,
        z: target.z,
        yaw: 0,
      };
      this.avatars.add(state);
      this.avatars.select(state.id);
    }
  }

  private handleRight(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    const hit = this.raycastAvatar();
    if (!hit) {
      this.avatars.select(null);
      return;
    }
    if (identity.isDM || hit.ownerUid === identity.uid) {
      this.avatars.remove(hit.id);
    }
  }

  private raycastAvatar(): AvatarState | null {
    const pickables = this.avatars.getPickables();
    if (pickables.length === 0) return null;
    const hits = this.raycaster.intersectObjects(pickables, true);
    const hit = hits[0];
    if (!hit) return null;
    const id = this.avatars.findIdForObject(hit.object);
    return id ? this.avatars.get(id) ?? null : null;
  }

  private raycastPlacementTarget(): { x: number; y: number; z: number } | null {
    const meshes = this.voxelRenderer.getMeshes();
    const hits = this.raycaster.intersectObjects(meshes, false);
    const hit = hits[0];

    if (hit && hit.instanceId !== undefined && hit.face) {
      const decoded = this.voxelRenderer.decodeHit(
        hit.object as THREE.InstancedMesh,
        hit.instanceId,
      );
      if (!decoded) return null;
      const ny = Math.round(hit.face.normal.y);
      const nx = Math.round(hit.face.normal.x);
      const nz = Math.round(hit.face.normal.z);
      if (ny === -1) return null;
      if (ny === 1) {
        return this.resolveGround(cellIndex(decoded.x), cellIndex(decoded.z), decoded.y + 1);
      }
      return this.resolveGround(
        cellIndex(decoded.x + nx),
        cellIndex(decoded.z + nz),
        decoded.y + 1,
      );
    }

    const ground = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpPoint);
    if (!ground) return null;
    const cx = cellIndex(ground.x);
    const cz = cellIndex(ground.z);
    if (!this.cellInBounds(cx, cz)) return null;
    return this.resolveGround(cx, cz, 0);
  }

  private resolveGround(
    cellX: number,
    cellZ: number,
    preferredY: number,
  ): { x: number; y: number; z: number } | null {
    if (!this.cellInBounds(cellX, cellZ)) return null;
    const worldX = cellCenter(cellX);
    const worldZ = cellCenter(cellZ);

    const startX = cellX * CELL_SIZE;
    const startZ = cellZ * CELL_SIZE;
    let maxTop = 0;
    let found = false;
    const probeY = preferredY - 1;
    if (probeY >= 0) {
      for (let vx = startX; vx < startX + CELL_SIZE; vx++) {
        for (let vz = startZ; vz < startZ + CELL_SIZE; vz++) {
          if (this.world.hasBlock(vx, probeY, vz)) {
            maxTop = probeY + 1;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    const y = found ? maxTop : preferredY;
    return { x: worldX, y, z: worldZ };
  }

  private cellInBounds(cellX: number, cellZ: number): boolean {
    const worldX = cellCenter(cellX);
    const worldZ = cellCenter(cellZ);
    return (
      worldX >= -WORLD_SIZE_HALF &&
      worldX < WORLD_SIZE_HALF &&
      worldZ >= -WORLD_SIZE_HALF &&
      worldZ < WORLD_SIZE_HALF
    );
  }
}
