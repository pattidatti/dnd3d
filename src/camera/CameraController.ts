import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Mode = 'orbit' | 'topdown';

export class CameraController {
  readonly controls: OrbitControls;
  private mode: Mode = 'orbit';
  private savedPosition = new THREE.Vector3();
  private savedTarget = new THREE.Vector3();
  private tokenFocusResolver: (() => THREE.Vector3 | null) | null = null;

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
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
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
    // Ikke reager n\u00e5r OrbitControls er deaktivert (tredjeperson) eller
    // n\u00e5r musen er l\u00e5st (gameplay).
    if (!this.controls.enabled || document.pointerLockElement) return;
    const key = e.key.toLowerCase();
    if (key === 't') {
      this.toggleTopdown();
    } else if (key === 'f') {
      this.focusSelectedToken();
    }
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
