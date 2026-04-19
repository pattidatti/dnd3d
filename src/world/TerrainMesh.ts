import * as THREE from 'three';
import { BIOME, BIOME_COLORS, Terrain, vertexWorldX, vertexWorldZ, type BiomeId } from './Terrain';

const WATER_VERT = /* glsl */ `
  #include <fog_pars_vertex>
  uniform float uTime;
  varying float vWave;

  void main() {
    float wave = sin(position.x * 0.8 + uTime * 0.6) * cos(position.z * 0.56 + uTime * 0.5);
    vWave = wave;
    vec3 displaced = position + vec3(0.0, wave * 0.12, 0.0);
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const WATER_FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  varying float vWave;

  void main() {
    float t = clamp(vWave * 0.5 + 0.5, 0.0, 1.0);
    vec3 color = mix(uDeepColor, uShallowColor, t);
    color += vec3(0.06) * pow(1.0 - t, 2.0);
    gl_FragColor = vec4(color, 0.88);
    #include <fog_fragment>
  }
`;

export class TerrainMesh {
  readonly mesh: THREE.Mesh;
  readonly group: THREE.Group;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly terrain: Terrain;

  private waterGeom: THREE.BufferGeometry | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private readonly waterMat: THREE.ShaderMaterial;

  constructor(terrain: Terrain) {
    this.terrain = terrain;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0,
      roughness: 0.95,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    this.waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x1a4d6e) },
        uShallowColor: { value: new THREE.Color(0x2a8090) },
        fogColor: { value: new THREE.Color(0x9ab8d4) },
        fogNear: { value: 140 },
        fogFar: { value: 500 },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      depthWrite: false,
      fog: true,
    });

    this.group = new THREE.Group();
    this.group.add(this.mesh);

    this.rebuild();
  }

  rebuild(): void {
    this.buildTerrain();
    this.buildWater();
  }

  tick(elapsedTime: number): void {
    this.waterMat.uniforms.uTime.value = elapsedTime;
  }

  private buildTerrain(): void {
    const { widthCells, depthCells } = this.terrain;
    const vertCount = (widthCells + 1) * (depthCells + 1);
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);

    this.terrain.forEachVertex((ix, iz, h) => {
      const i = iz * (widthCells + 1) + ix;
      positions[i * 3 + 0] = vertexWorldX(ix, widthCells);
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = vertexWorldZ(iz, depthCells);
      uvs[i * 2 + 0] = ix / widthCells;
      uvs[i * 2 + 1] = iz / depthCells;

      const [r, g, b] = vertexBlendedColor(this.terrain, ix, iz);
      colors[i * 3 + 0] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
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
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingBox();
    this.geometry.computeBoundingSphere();
  }

  private buildWater(): void {
    // Rydd opp forrige vannmesh
    if (this.waterMesh) {
      this.group.remove(this.waterMesh);
      this.waterGeom?.dispose();
      this.waterMesh = null;
      this.waterGeom = null;
    }

    const { widthCells, depthCells } = this.terrain;
    const LIFT = 0.05;

    // Samle vertices for vannbiotop-celler (6 vertices per celle, ingen deling)
    const waterPos: number[] = [];

    for (let iz = 0; iz < depthCells; iz++) {
      for (let ix = 0; ix < widthCells; ix++) {
        if (this.terrain.biome[iz * widthCells + ix] !== BIOME.Water) continue;

        const i00 = iz * (widthCells + 1) + ix;
        const i10 = i00 + 1;
        const i01 = i00 + (widthCells + 1);
        const i11 = i01 + 1;

        const x00 = vertexWorldX(ix, widthCells);
        const x10 = vertexWorldX(ix + 1, widthCells);
        const z00 = vertexWorldZ(iz, depthCells);
        const z10 = vertexWorldZ(iz + 1, depthCells);

        const h00 = this.terrain.heights[i00] + LIFT;
        const h10 = this.terrain.heights[i10] + LIFT;
        const h01 = this.terrain.heights[i01] + LIFT;
        const h11 = this.terrain.heights[i11] + LIFT;

        // Triangel 1: i00, i01, i11
        waterPos.push(x00, h00, z00, x00, h01, z10, x10, h11, z10);
        // Triangel 2: i00, i11, i10
        waterPos.push(x00, h00, z00, x10, h11, z10, x10, h10, z00);
      }
    }

    if (waterPos.length === 0) return;

    this.waterGeom = new THREE.BufferGeometry();
    this.waterGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(waterPos), 3));
    this.waterGeom.computeBoundingBox();
    this.waterGeom.computeBoundingSphere();

    this.waterMesh = new THREE.Mesh(this.waterGeom, this.waterMat);
    this.waterMesh.renderOrder = 1;
    this.group.add(this.waterMesh);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.waterGeom?.dispose();
    this.waterMat.dispose();
  }
}

function vertexBlendedColor(terrain: Terrain, ix: number, iz: number): [number, number, number] {
  let r = 0, g = 0, b = 0, n = 0;
  const ws = terrain.widthCells;
  const ds = terrain.depthCells;
  const samples: Array<[number, number]> = [
    [ix - 1, iz - 1],
    [ix, iz - 1],
    [ix - 1, iz],
    [ix, iz],
  ];
  for (const [cx, cz] of samples) {
    if (cx < 0 || cz < 0 || cx >= ws || cz >= ds) continue;
    const bid = terrain.biome[cz * ws + cx] as BiomeId;
    const c = BIOME_COLORS[bid];
    r += c[0];
    g += c[1];
    b += c[2];
    n++;
  }
  if (n === 0) return BIOME_COLORS[0];
  return [r / n, g / n, b / n];
}
