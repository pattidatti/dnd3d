import * as THREE from 'three';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { VoxelRenderer } from '../world/VoxelRenderer';
import type { TokenManager } from '../tokens/TokenManager';
import type { TokenRenderer } from '../tokens/TokenRenderer';
import type { LocalIdentity } from '../tokens/LocalIdentity';
import { CELL_SIZE, cellCenter, cellIndex, randomId, type Token } from '../tokens/Token';

const DRAG_THRESHOLD_PX = 4;
const WORLD_SIZE_HALF = 250;

function samePos(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export class TokenPlacer {
  /** Satt av App. Når false, ignoreres klikk. */
  active = false;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly groundPlane: THREE.Plane;
  private readonly tmpPoint = new THREE.Vector3();
  private dragStart: { x: number; y: number; button: number } | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
    private readonly world: VoxelWorld,
    private readonly voxelRenderer: VoxelRenderer,
    private readonly tokenManager: TokenManager,
    private readonly tokenRenderer: TokenRenderer,
    private readonly getIdentity: () => LocalIdentity | undefined,
  ) {
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
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
    const dist = Math.hypot(dx, dy);
    this.dragStart = null;
    if (dist > DRAG_THRESHOLD_PX) return;

    this.updateNDC(e);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    if (e.button === 0) {
      this.handleClick();
    } else if (e.button === 2) {
      this.handleRightClick();
    }
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    const target = this.raycastPlacementTarget();
    const tokenHit = this.raycastToken();

    const selectedId = this.tokenManager.getSelectedId();
    const selected = selectedId ? this.tokenManager.get(selectedId) ?? null : null;
    const ownToken = this.tokenManager.getByOwner(identity.uid) ?? null;

    // Hvilken token kan vi flytte akkurat nå?
    const moveable =
      selected && (identity.isDM || selected.ownerUid === identity.uid)
        ? selected
        : ownToken && (identity.isDM || ownToken.ownerUid === identity.uid)
          ? ownToken
          : null;

    // Hvis klikket traff en annen token (ikke den vi kan flytte), velg den.
    if (tokenHit && tokenHit.id !== moveable?.id) {
      if (identity.isDM || tokenHit.ownerUid === identity.uid) {
        this.tokenManager.select(tokenHit.id);
      }
      return;
    }

    // Klikk med gyldig mål og en flyttbar token som ikke allerede står der → flytt.
    if (moveable && target && !samePos(moveable, target)) {
      this.tokenManager.move(moveable.id, target.x, target.y, target.z);
      this.tokenManager.select(moveable.id);
      return;
    }

    // Klikk traff egen token uten flytting → bare velg (no-op hvis allerede valgt).
    if (tokenHit) {
      this.tokenManager.select(tokenHit.id);
      return;
    }

    // Ingen egen token ennå og vi har et gyldig mål → opprett.
    if (!ownToken && target) {
      const newToken: Token = {
        id: randomId(),
        ownerUid: identity.uid,
        name: identity.name,
        color: identity.color,
        initial: identity.initial,
        x: target.x,
        y: target.y,
        z: target.z,
      };
      this.tokenManager.add(newToken);
      this.tokenManager.select(newToken.id);
    }
  }

  private handleRightClick(): void {
    const identity = this.getIdentity();
    if (!identity) return;
    const tokenHit = this.raycastToken();
    if (!tokenHit) {
      // Høyreklikk på tomrom: opphev seleksjon
      this.tokenManager.select(null);
      return;
    }
    // Høyreklikk på token → slett (DM eller eier)
    if (identity.isDM || tokenHit.ownerUid === identity.uid) {
      this.tokenManager.remove(tokenHit.id);
    }
  }

  private raycastToken(): Token | null {
    const sprites = this.tokenRenderer.getIconSprites();
    if (sprites.length === 0) return null;
    const hits = this.raycaster.intersectObjects(sprites, false);
    const hit = hits[0];
    if (!hit) return null;
    const tokenId = hit.object.userData.tokenId as string | undefined;
    if (!tokenId) return null;
    return this.tokenManager.get(tokenId) ?? null;
  }

  /**
   * Finn plasserings-mål (sentrum av 5-fots-rute + base-Y).
   * Raycast mot voxel-flater først; faller tilbake til bakken.
   */
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
      const nx = Math.round(hit.face.normal.x);
      const ny = Math.round(hit.face.normal.y);
      const nz = Math.round(hit.face.normal.z);

      // Finn voxel-koordinater for plassering:
      //  - topp-flate: samme XZ, y+1
      //  - side-flate: naboens XZ på samme lag
      //  - bunn-flate: ignoreres
      if (ny === 1) {
        const cx = cellIndex(decoded.x);
        const cz = cellIndex(decoded.z);
        return this.resolveGround(cx, cz, decoded.y + 1);
      } else if (ny === -1) {
        return null;
      } else {
        const adjX = decoded.x + nx;
        const adjZ = decoded.z + nz;
        const cx = cellIndex(adjX);
        const cz = cellIndex(adjZ);
        return this.resolveGround(cx, cz, decoded.y + 1);
      }
    }

    // Bakke-plan
    const ground = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpPoint);
    if (!ground) return null;
    const cx = cellIndex(ground.x);
    const cz = cellIndex(ground.z);
    if (!this.cellInBounds(cx, cz)) return null;
    return this.resolveGround(cx, cz, 0);
  }

  /**
   * Finn faktisk base-Y for en celle. Sjekker høyeste voxel innenfor cellen
   * (opp til preferredY) slik at token står på toppen av celle-gulvet.
   */
  private resolveGround(
    cellX: number,
    cellZ: number,
    preferredY: number,
  ): { x: number; y: number; z: number } | null {
    if (!this.cellInBounds(cellX, cellZ)) return null;
    const worldX = cellCenter(cellX);
    const worldZ = cellCenter(cellZ);

    // Se etter høyeste voxel innenfor cellen på preferredY-1 (støtter
    // plassering på trapper/plattformer uansett hvilken voxel man traff).
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
