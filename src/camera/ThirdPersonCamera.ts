import * as THREE from 'three';

const MIN_DIST = 1.5;
const MAX_DIST = 10;
const DEFAULT_DIST = 4;
const ANCHOR_HEIGHT = 1.2;
const PITCH_LIMIT_UP = 0.85;
const PITCH_LIMIT_DOWN = -1.15;
const FOV_BASE = 60;
const FOV_RUN = 68;
const FOV_LERP = 6;

/**
 * Forenklet tredjepersons-kamera uten collider-klem (kommer tilbake når
 * vi legger til raycast mot prop-collidere). Pointer-lock for mus-styring,
 * scroll for avstand, FOV-shift ved løp.
 */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = -0.18;
  enabled = false;
  private distance = DEFAULT_DIST;
  private targetFov = FOV_BASE;

  private readonly tmpAnchor = new THREE.Vector3();
  private readonly tmpPos = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly dom: HTMLCanvasElement,
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

  update(footPos: { x: number; y: number; z: number }, dt: number): void {
    this.tmpAnchor.set(footPos.x, footPos.y + ANCHOR_HEIGHT, footPos.z);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    this.tmpPos.set(
      this.tmpAnchor.x + sinY * cosP * this.distance,
      this.tmpAnchor.y - sinP * this.distance,
      this.tmpAnchor.z + cosY * cosP * this.distance,
    );
    this.camera.position.copy(this.tmpPos);
    this.camera.lookAt(this.tmpAnchor);

    if (this.camera.fov !== this.targetFov) {
      this.camera.fov = approach(this.camera.fov, this.targetFov, FOV_LERP * dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled || document.pointerLockElement !== this.dom) return;
    const sens = 0.0022;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;
    this.pitch = Math.max(PITCH_LIMIT_DOWN, Math.min(PITCH_LIMIT_UP, this.pitch));
  };

  private readonly onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    this.distance = Math.max(MIN_DIST, Math.min(MAX_DIST, this.distance + e.deltaY * 0.01));
  };
}

function approach(cur: number, target: number, maxDelta: number): number {
  if (cur < target) return Math.min(target, cur + maxDelta);
  if (cur > target) return Math.max(target, cur - maxDelta);
  return cur;
}
