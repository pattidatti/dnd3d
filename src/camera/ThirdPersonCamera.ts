import * as THREE from 'three';
import type { VoxelCollider } from '../physics/VoxelCollider';

const MIN_DIST = 2.8;
const MAX_DIST = 12;
const DEFAULT_DIST = 6.5;
const ANCHOR_HEIGHT = 4.8;      // lokalt y-offset fra avatar-fot; ~skulderh\u00f8yde
const ANCHOR_FORWARD = 0.0;     // liten fremover-forskyvning p\u00e5 ankeret
const CAM_RADIUS = 0.35;        // sjekkradius for spring-arm
const DIST_LERP = 10;           // pr sekund
const PITCH_LIMIT_UP = 0.85;
const PITCH_LIMIT_DOWN = -1.15;
const FOV_BASE = 60;
const FOV_RUN = 68;
const FOV_LERP = 6;

/**
 * Tredjepersons-kamera. Spring-arm bak avataren med:
 *  - smooth avstands-lerp slik at kamera ikke "popper" fra/til hindringer
 *  - multi-ray klem (4 kant-samples rundt \u00f8nsket posisjon)
 *  - FOV-shift ved l\u00f8p
 *  - mus-styring via pointer lock, scroll = \u00f8nsket avstand
 */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = -0.18;
  private targetDistance = DEFAULT_DIST;
  private currentDistance = DEFAULT_DIST;
  private targetFov = FOV_BASE;
  enabled = false;

  private readonly tmpAnchor = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpDesired = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
    private readonly collider: VoxelCollider,
  ) {
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
  }

  dispose(): void {
    this.dom.removeEventListener('mousemove', this.onMouseMove);
    this.dom.removeEventListener('wheel', this.onWheel);
  }

  requestPointerLock(): void {
    this.dom.requestPointerLock?.();
  }

  exitPointerLock(): void {
    document.exitPointerLock?.();
  }

  setRunningHint(running: boolean): void {
    this.targetFov = running ? FOV_RUN : FOV_BASE;
  }

  /** footPos = avatarens fot-sentrum (base-Y). */
  update(footPos: THREE.Vector3, dt: number): void {
    // Anker: litt fram for bedre over-skulder-f\u00f8lelse.
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    this.tmpAnchor.set(
      footPos.x - sinY * ANCHOR_FORWARD,
      footPos.y + ANCHOR_HEIGHT,
      footPos.z - cosY * ANCHOR_FORWARD,
    );

    // Retning fra anker mot kamera.
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    this.tmpDir.set(sinY * cosP, -sinP, cosY * cosP);

    // Multi-sample spring-arm: sjekk fire hj\u00f8rner rundt hovedstr\u00e5len.
    const clamped = this.clampDistance(
      this.tmpAnchor.x, this.tmpAnchor.y, this.tmpAnchor.z,
      this.tmpDir.x, this.tmpDir.y, this.tmpDir.z,
      this.targetDistance,
    );

    // Smooth lerp av avstand. Klem inn raskere enn \u00e5 skli ut.
    const shrinking = clamped < this.currentDistance;
    const speed = shrinking ? DIST_LERP * 2 : DIST_LERP;
    this.currentDistance = approach(this.currentDistance, clamped, speed * dt);

    const d = this.currentDistance;
    this.tmpDesired.set(
      this.tmpAnchor.x + this.tmpDir.x * d,
      this.tmpAnchor.y + this.tmpDir.y * d,
      this.tmpAnchor.z + this.tmpDir.z * d,
    );
    this.camera.position.copy(this.tmpDesired);
    this.camera.lookAt(this.tmpAnchor);

    // FOV-lerp.
    if (this.camera.fov !== this.targetFov) {
      this.camera.fov = approach(this.camera.fov, this.targetFov, FOV_LERP * dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private clampDistance(
    ax: number, ay: number, az: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): number {
    // Fire samples p\u00e5 en liten sirkel vinkelrett p\u00e5 retningen for \u00e5 simulere
    // at kamera har volum — unng\u00e5r at smale vegger klipper inn.
    const offsets = this.buildPerpendicularOffsets(dx, dy, dz, CAM_RADIUS);
    let best = maxDist;
    for (const [ox, oy, oz] of offsets) {
      const d = this.castRay(ax + ox, ay + oy, az + oz, dx, dy, dz, maxDist);
      if (d < best) best = d;
    }
    const centerD = this.castRay(ax, ay, az, dx, dy, dz, maxDist);
    if (centerD < best) best = centerD;
    return Math.max(MIN_DIST, best);
  }

  private buildPerpendicularOffsets(
    dx: number, dy: number, dz: number, r: number,
  ): Array<[number, number, number]> {
    // Finn to ortogonale akser til (dx,dy,dz).
    let ux: number, uy: number, uz: number;
    if (Math.abs(dy) < 0.95) {
      // cross med world-up
      ux = dz; uy = 0; uz = -dx;
    } else {
      ux = 1; uy = 0; uz = 0;
    }
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul; uy /= ul; uz /= ul;
    // v = d × u
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;
    return [
      [ux * r, uy * r, uz * r],
      [-ux * r, -uy * r, -uz * r],
      [vx * r, vy * r, vz * r],
      [-vx * r, -vy * r, -vz * r],
    ];
  }

  private castRay(
    ax: number, ay: number, az: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
  ): number {
    // Enkel DDA steg-basert sjekk. Stegst\u00f8rrelse 0.2 fot — nok for 1-fot-voxels.
    const steps = Math.ceil(maxDist / 0.2);
    const stepLen = maxDist / steps;
    for (let i = 1; i <= steps; i++) {
      const t = i * stepLen;
      const x = Math.floor(ax + dx * t);
      const y = Math.floor(ay + dy * t);
      const z = Math.floor(az + dz * t);
      if (this.collider.solid(x, y, z)) {
        return Math.max(MIN_DIST, t - 0.25);
      }
    }
    return maxDist;
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;
    if (document.pointerLockElement !== this.dom) return;
    const sens = 0.0022;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;
    this.pitch = Math.max(PITCH_LIMIT_DOWN, Math.min(PITCH_LIMIT_UP, this.pitch));
  };

  private readonly onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.targetDistance = Math.max(
      MIN_DIST,
      Math.min(MAX_DIST, this.targetDistance + e.deltaY * 0.01),
    );
  };
}

function approach(cur: number, target: number, maxDelta: number): number {
  if (cur < target) return Math.min(target, cur + maxDelta);
  if (cur > target) return Math.max(target, cur - maxDelta);
  return cur;
}
