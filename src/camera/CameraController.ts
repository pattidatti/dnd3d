import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Mode = 'orbit' | 'topdown';

export class CameraController {
  readonly controls: OrbitControls;
  private mode: Mode = 'orbit';
  private savedPosition = new THREE.Vector3();
  private savedTarget = new THREE.Vector3();
  private tokenFocusResolver: (() => THREE.Vector3 | null) | null = null;

  private readonly keys = { w: false, s: false, a: false, d: false, shift: false };
  private readonly _forward = new THREE.Vector3();
  private readonly _right   = new THREE.Vector3();
  private readonly _delta   = new THREE.Vector3();
  private readonly _up      = new THREE.Vector3(0, 1, 0);

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    dom: HTMLElement,
  ) {
    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 300;
    this.controls.maxPolarAngle = Math.PI * 0.49; // hindre kamera under bakken
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  update(): void {
    this.controls.update();
  }

  tick(dt: number): void {
    if (this.mode !== 'orbit') return;
    if (document.pointerLockElement) return;
    if (!this.keys.w && !this.keys.s && !this.keys.a && !this.keys.d) return;

    const distance = this.camera.position.distanceTo(this.controls.target);
    const speed = (this.keys.shift ? 3 : 1) * Math.max(10, distance * 0.5);

    this._forward.subVectors(this.controls.target, this.camera.position).setY(0).normalize();
    this._right.crossVectors(this._forward, this._up).normalize();
    this._delta.set(0, 0, 0);

    if (this.keys.w) this._delta.addScaledVector(this._forward,  speed * dt);
    if (this.keys.s) this._delta.addScaledVector(this._forward, -speed * dt);
    if (this.keys.a) this._delta.addScaledVector(this._right,   -speed * dt);
    if (this.keys.d) this._delta.addScaledVector(this._right,    speed * dt);

    this.controls.target.add(this._delta);
    this.camera.position.add(this._delta);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.controls.dispose();
  }

  /** Kalles av Fase 2 for å la F-hotkey finne valgt token-posisjon. */
  setTokenFocusResolver(resolver: (() => THREE.Vector3 | null) | null): void {
    this.tokenFocusResolver = resolver;
  }

  moveTo(worldX: number, worldZ: number): void {
    if (this.mode === 'topdown') {
      this.camera.position.set(worldX, this.camera.position.y, worldZ);
      this.controls.target.set(worldX, 0, worldZ);
    } else {
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      this.controls.target.set(worldX, this.controls.target.y, worldZ);
      this.camera.position.copy(this.controls.target).add(offset);
    }
    this.controls.update();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();

    if (this.mode === 'orbit' && !document.pointerLockElement) {
      if (key === 'w') { this.keys.w = true; return; }
      if (key === 's') { this.keys.s = true; return; }
      if (key === 'a') { this.keys.a = true; return; }
      if (key === 'd') { this.keys.d = true; return; }
      if (key === 'shift') { this.keys.shift = true; }
    }

    if (!this.controls.enabled || document.pointerLockElement) return;
    if (key === 't') { this.toggleTopdown(); }
    else if (key === 'f') { this.focusSelectedToken(); }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (key === 'w') this.keys.w = false;
    else if (key === 's') this.keys.s = false;
    else if (key === 'a') this.keys.a = false;
    else if (key === 'd') this.keys.d = false;
    else if (key === 'shift') this.keys.shift = false;
  };

  private toggleTopdown(): void {
    if (this.mode === 'orbit') {
      this.savedPosition.copy(this.camera.position);
      this.savedTarget.copy(this.controls.target);
      this.camera.position.set(this.controls.target.x, 100, this.controls.target.z);
      this.camera.lookAt(this.controls.target);
      this.controls.enableRotate = false;
      this.mode = 'topdown';
    } else {
      this.camera.position.copy(this.savedPosition);
      this.controls.target.copy(this.savedTarget);
      this.controls.enableRotate = true;
      this.mode = 'orbit';
    }
    this.controls.update();
  }

  private focusSelectedToken(): void {
    // Stub for Fase 2 — ingen tokens ennå. Resolveren settes når TokenManager eksisterer.
    const pos = this.tokenFocusResolver?.();
    if (!pos) return;
    this.controls.target.copy(pos);
    const offset = new THREE.Vector3(12, 10, 12);
    this.camera.position.copy(pos).add(offset);
    this.controls.update();
  }
}
