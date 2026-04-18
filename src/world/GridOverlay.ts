import * as THREE from 'three';

const GRID_SIZE_VOXELS = 500; // 100 D&D-ruter × 5 fot
const CELL_VOXELS = 5;

export class GridOverlay {
  readonly object: THREE.LineSegments;

  constructor() {
    const half = GRID_SIZE_VOXELS / 2;
    const positions: number[] = [];

    for (let i = -half; i <= half; i += CELL_VOXELS) {
      // Linjer parallelt med Z
      positions.push(i, 0, -half, i, 0, half);
      // Linjer parallelt med X
      positions.push(-half, 0, i, half, 0, i);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });

    this.object = new THREE.LineSegments(geometry, material);
    this.object.position.y = 0.01;
    this.object.renderOrder = 1;
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  get visible(): boolean {
    return this.object.visible;
  }
}
