import * as THREE from 'three';
import type { CameraController } from './CameraController';

const MINIMAP_SIZE_PX = 220;
const WORLD_SIZE = 500;
const HALF = WORLD_SIZE / 2;
const FRAME_THROTTLE = 6; // render hver 6. frame (~10 fps ved 60fps hoved)

export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.OrthographicCamera;
  private readonly marker: THREE.Mesh;
  private frameCounter = 0;

  constructor(
    parent: HTMLElement,
    private readonly scene: THREE.Scene,
    private readonly mainCamera: THREE.PerspectiveCamera,
    private readonly cameraController: CameraController,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap';
    this.canvas.width = MINIMAP_SIZE_PX;
    this.canvas.height = MINIMAP_SIZE_PX;
    parent.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(MINIMAP_SIZE_PX, MINIMAP_SIZE_PX, false);

    this.camera = new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 1, 500);
    this.camera.position.set(0, 200, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);

    // Liten markør som viser hoved-kameraets plassering
    const markerGeom = new THREE.ConeGeometry(4, 8, 4);
    markerGeom.rotateX(Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, depthTest: false });
    this.marker = new THREE.Mesh(markerGeom, markerMat);
    this.marker.renderOrder = 999;
    this.scene.add(this.marker);

    this.canvas.addEventListener('click', this.onClick);
  }

  render(): void {
    this.frameCounter = (this.frameCounter + 1) % FRAME_THROTTLE;
    if (this.frameCounter !== 0) return;

    // Plasser markør på hoved-kameraets XZ med høyde over bakken for synlighet
    this.marker.position.set(this.mainCamera.position.x, 100, this.mainCamera.position.z);
    // Rotér markøren slik at den peker i kameraets look-retning (XZ)
    const look = new THREE.Vector3();
    this.mainCamera.getWorldDirection(look);
    const yaw = Math.atan2(look.x, look.z);
    this.marker.rotation.set(0, yaw, 0);

    this.renderer.render(this.scene, this.camera);
  }

  private readonly onClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    const worldX = cx * WORLD_SIZE - HALF;
    const worldZ = cy * WORLD_SIZE - HALF;
    this.cameraController.moveTo(worldX, worldZ);
  };

  dispose(): void {
    this.canvas.removeEventListener('click', this.onClick);
    this.renderer.dispose();
    this.scene.remove(this.marker);
  }
}
