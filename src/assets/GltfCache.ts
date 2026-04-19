import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Delt GLTF-lader + cache. Samme URL lastes kun én gang; etterfølgende kall får
 * samme GLTF-objekt tilbake. Materialer oppgraderes til MeshStandardMaterial ved
 * første last så PBR/envmap virker riktig.
 */
export class GltfCache {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();
  private readonly loaded = new Map<string, GLTF>();

  load(url: string): Promise<GLTF> {
    const existing = this.cache.get(url);
    if (existing) return existing;
    const p = new Promise<GLTF>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          upgradeMaterials(gltf.scene);
          this.loaded.set(url, gltf);
          resolve(gltf);
        },
        undefined,
        (err) => reject(err),
      );
    });
    this.cache.set(url, p);
    return p;
  }

  /** Returner cached GLTF hvis ferdig lastet, ellers undefined. */
  get(url: string): GLTF | undefined {
    return this.loaded.get(url);
  }
}

/**
 * Kenney-pakkens GLBer har ofte enkle materialer (MeshBasic/Lambert) uten PBR-response.
 * Vi oppgraderer dem til MeshStandardMaterial slik at de lyses fra sun/hemi/envmap.
 * Vi beholder textur/map og vertex-color-støtte.
 */
function upgradeMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) {
      mesh.material = mat.map(upgradeOne);
    } else {
      mesh.material = upgradeOne(mat);
    }
  });
}

function upgradeOne(mat: THREE.Material): THREE.Material {
  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    return mat;
  }
  const anyMat = mat as THREE.Material & {
    color?: THREE.Color;
    map?: THREE.Texture | null;
    vertexColors?: boolean;
    transparent?: boolean;
    opacity?: number;
  };
  const upgraded = new THREE.MeshStandardMaterial({
    color: anyMat.color?.clone() ?? new THREE.Color(0xffffff),
    map: anyMat.map ?? null,
    metalness: 0.0,
    roughness: 0.85,
    vertexColors: anyMat.vertexColors ?? false,
    transparent: anyMat.transparent ?? false,
    opacity: anyMat.opacity ?? 1,
  });
  mat.dispose();
  return upgraded;
}
