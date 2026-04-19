import * as THREE from 'three';
import { CELL_SIZE } from '../world/Grid';
import { Terrain, vertexWorldX, vertexWorldZ } from '../world/Terrain';
import { FogOfWar } from './FogOfWar';

const FOG_LIFT = 0.08;
const WORLD_HALF_CELLS = 50;

/**
 * Fog of war som én sammenhengende mesh som speiler terrenget. Per-vertex
 * alpha beregnes fra omkringliggende celler: alpha = (antall skjulte naboer
 * / antall nabo-celler). Dette gir soft overganger mellom avslørte og
 * skjulte områder, uten synlige cellefliser.
 */
export class FogRenderer {
  readonly root = new THREE.Group();
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly alphaAttr: THREE.BufferAttribute;
  private currentOpacity = 0.75;

  constructor(
    private readonly fog: FogOfWar,
    private readonly terrain: Terrain,
  ) {
    this.geometry = new THREE.BufferGeometry();
    this.build();
    const vertCount = (terrain.widthCells + 1) * (terrain.depthCells + 1);
    const alpha = new Float32Array(vertCount);
    this.alphaAttr = new THREE.BufferAttribute(alpha, 1);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(0x050812) },
        uGlobalOpacity: { value: this.currentOpacity },
      },
      vertexShader: /* glsl */ `
        attribute float aAlpha;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uGlobalOpacity;
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.001) discard;
          gl_FragColor = vec4(uColor, vAlpha * uGlobalOpacity);
        }
      `,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.root.add(this.mesh);

    this.recomputeAllAlpha();

    this.fog.onCellRevealed((e) => this.updateCellVertices(e.cellX, e.cellZ));
    this.fog.onCellHidden((e) => this.updateCellVertices(e.cellX, e.cellZ));
    this.fog.onCleared(() => this.recomputeAllAlpha());
  }

  rebuildGeometryForTerrainChange(): void {
    this.build();
    this.recomputeAllAlpha();
  }

  setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.material.uniforms.uGlobalOpacity.value = opacity;
  }

  private build(): void {
    const { widthCells, depthCells } = this.terrain;
    const vertCount = (widthCells + 1) * (depthCells + 1);
    const positions = new Float32Array(vertCount * 3);
    this.terrain.forEachVertex((ix, iz, h) => {
      const i = iz * (widthCells + 1) + ix;
      positions[i * 3 + 0] = vertexWorldX(ix, widthCells);
      positions[i * 3 + 1] = h + FOG_LIFT;
      positions[i * 3 + 2] = vertexWorldZ(iz, depthCells);
    });

    const indices = new Uint32Array(widthCells * depthCells * 6);
    let k = 0;
    for (let iz = 0; iz < depthCells; iz++) {
      for (let ix = 0; ix < widthCells; ix++) {
        const i00 = iz * (widthCells + 1) + ix;
        const i10 = i00 + 1;
        const i01 = i00 + (widthCells + 1);
        const i11 = i01 + 1;
        indices[k++] = i00;
        indices[k++] = i01;
        indices[k++] = i11;
        indices[k++] = i00;
        indices[k++] = i11;
        indices[k++] = i10;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  private recomputeAllAlpha(): void {
    const { widthCells, depthCells } = this.terrain;
    for (let iz = 0; iz <= depthCells; iz++) {
      for (let ix = 0; ix <= widthCells; ix++) {
        this.writeVertexAlpha(ix, iz);
      }
    }
    this.alphaAttr.needsUpdate = true;
  }

  private updateCellVertices(cellX: number, cellZ: number): void {
    // En celle påvirker de 4 vertex-hjørnene. Vertex-koordinater i terreng-
    // grid-rom: ix = cellX + WORLD_HALF_CELLS.
    const ix0 = cellX + WORLD_HALF_CELLS;
    const iz0 = cellZ + WORLD_HALF_CELLS;
    for (const ix of [ix0, ix0 + 1]) {
      for (const iz of [iz0, iz0 + 1]) {
        this.writeVertexAlpha(ix, iz);
      }
    }
    this.alphaAttr.needsUpdate = true;
  }

  private writeVertexAlpha(ix: number, iz: number): void {
    const { widthCells, depthCells } = this.terrain;
    if (ix < 0 || iz < 0 || ix > widthCells || iz > depthCells) return;
    // Hver vertex deler opp til 4 nabo-celler. Alpha = snitt av (1 - revealed).
    let hidden = 0;
    let total = 0;
    const samples: Array<[number, number]> = [
      [ix - 1, iz - 1],
      [ix, iz - 1],
      [ix - 1, iz],
      [ix, iz],
    ];
    for (const [cx, cz] of samples) {
      if (cx < 0 || cz < 0 || cx >= widthCells || cz >= depthCells) continue;
      // Konverter tilbake til verden-celle-koordinater.
      const worldCellX = cx - WORLD_HALF_CELLS;
      const worldCellZ = cz - WORLD_HALF_CELLS;
      if (!this.fog.isRevealed(worldCellX, worldCellZ)) hidden++;
      total++;
    }
    const a = total > 0 ? hidden / total : 0;
    const vi = iz * (widthCells + 1) + ix;
    this.alphaAttr.array[vi] = a;
  }
}

// Eksport for å unngå unused-import varsel ved rebuild.
export { CELL_SIZE };
