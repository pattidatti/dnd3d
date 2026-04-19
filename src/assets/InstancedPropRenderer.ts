import * as THREE from 'three';
import type { GltfCache } from './GltfCache';
import { getProp } from './AssetRegistry';
import type { PropState } from '../world/PropWorld';

/**
 * Tegner props via InstancedMesh per (asset-key, sub-mesh-index). Når et asset
 * lastes, ekstraheres alle undermesh-er og hver får sin egen InstancedMesh med
 * MAX_INSTANCES-kapasitet. En prop er summen av submeshene. Indeksen hver prop
 * okkuperer holdes i `slots` med free-list for gjenbruk etter sletting.
 */

const MAX_INSTANCES = 2048;

interface AssetBucket {
  assetKey: string;
  meshes: THREE.InstancedMesh[];    // én per sub-mesh i det originale GLTF
  offsets: THREE.Matrix4[];         // lokal transform for hver sub-mesh (identitet hvis ikke brukt)
  count: number;                    // brukte instanser (= antall props av denne type)
  freeSlots: number[];              // gjenbrukbare slot-indekser (fra slettede props)
  slotByPropId: Map<string, number>;
}

const TMP_MATRIX = new THREE.Matrix4();
const TMP_POSITION = new THREE.Vector3();
const TMP_QUATERNION = new THREE.Quaternion();
const TMP_SCALE = new THREE.Vector3();
const TMP_EULER = new THREE.Euler();

export class InstancedPropRenderer {
  readonly root = new THREE.Group();
  private readonly buckets = new Map<string, AssetBucket>();
  private readonly pendingLoads = new Map<string, Promise<AssetBucket | null>>();
  private readonly cache: GltfCache;

  constructor(cache: GltfCache) {
    this.cache = cache;
    this.root.name = 'InstancedPropRenderer';
  }

  /** Sørg for at asset er lastet og bucket finnes. Returnerer null ved feil. */
  async ensureLoaded(assetKey: string): Promise<AssetBucket | null> {
    const existing = this.buckets.get(assetKey);
    if (existing) return existing;
    const pending = this.pendingLoads.get(assetKey);
    if (pending) return pending;

    const def = getProp(assetKey);
    if (!def) {
      console.warn(`InstancedPropRenderer: unknown asset "${assetKey}"`);
      return null;
    }

    const p = (async () => {
      try {
        const gltf = await this.cache.load(def.url);
        const bucket = this.buildBucket(assetKey, gltf.scene);
        this.buckets.set(assetKey, bucket);
        for (const m of bucket.meshes) this.root.add(m);
        return bucket;
      } catch (e) {
        console.error(`Kunne ikke laste ${def.url}:`, e);
        return null;
      } finally {
        this.pendingLoads.delete(assetKey);
      }
    })();
    this.pendingLoads.set(assetKey, p);
    return p;
  }

  /**
   * Legg til én prop-instans. Returnerer slot-indeks (for debug/sletting).
   * Asset må være forhåndslastet via `ensureLoaded`; hvis ikke, ignoreres kallet.
   */
  addProp(prop: PropState): boolean {
    const bucket = this.buckets.get(prop.assetKey);
    if (!bucket) return false;

    let slot: number;
    if (bucket.freeSlots.length > 0) {
      slot = bucket.freeSlots.pop() as number;
    } else {
      slot = bucket.count;
      bucket.count++;
      for (const m of bucket.meshes) m.count = bucket.count;
    }
    bucket.slotByPropId.set(prop.id, slot);
    this.writeTransform(bucket, slot, prop);
    return true;
  }

  /** Oppdater transform for en eksisterende prop. */
  updateProp(prop: PropState): void {
    const bucket = this.buckets.get(prop.assetKey);
    if (!bucket) return;
    const slot = bucket.slotByPropId.get(prop.id);
    if (slot === undefined) return;
    this.writeTransform(bucket, slot, prop);
  }

  /**
   * Slå opp prop-ID fra en raycaster-hit. Returnerer null hvis meshen ikke er
   * en av våre buckets, eller hvis instanceId ikke tilhører en aktiv prop.
   */
  propIdFromHit(mesh: THREE.Object3D, instanceId: number | undefined): string | null {
    if (instanceId === undefined) return null;
    for (const bucket of this.buckets.values()) {
      if (!bucket.meshes.includes(mesh as THREE.InstancedMesh)) continue;
      for (const [id, slot] of bucket.slotByPropId.entries()) {
        if (slot === instanceId) return id;
      }
      return null;
    }
    return null;
  }

  /** Få alle InstancedMesh-er (for raycaster). */
  getAllMeshes(): THREE.InstancedMesh[] {
    const all: THREE.InstancedMesh[] = [];
    for (const bucket of this.buckets.values()) all.push(...bucket.meshes);
    return all;
  }

  /** Fjern prop. Slot legges i free-list og instansen flyttes uendelig langt bort. */
  removeProp(propId: string, assetKey: string): void {
    const bucket = this.buckets.get(assetKey);
    if (!bucket) return;
    const slot = bucket.slotByPropId.get(propId);
    if (slot === undefined) return;
    bucket.slotByPropId.delete(propId);
    bucket.freeSlots.push(slot);
    // Skjul slot ved å sette skala 0.
    TMP_MATRIX.makeScale(0, 0, 0);
    for (const m of bucket.meshes) {
      m.setMatrixAt(slot, TMP_MATRIX);
      m.instanceMatrix.needsUpdate = true;
    }
  }

  private writeTransform(bucket: AssetBucket, slot: number, prop: PropState): void {
    for (let i = 0; i < bucket.meshes.length; i++) {
      TMP_POSITION.set(prop.x, prop.y, prop.z);
      TMP_EULER.set(0, prop.rotY, 0);
      TMP_QUATERNION.setFromEuler(TMP_EULER);
      TMP_SCALE.setScalar(prop.scale);
      TMP_MATRIX.compose(TMP_POSITION, TMP_QUATERNION, TMP_SCALE);
      // Kombiner med sub-mesh lokal offset.
      TMP_MATRIX.multiply(bucket.offsets[i]);
      const m = bucket.meshes[i];
      m.setMatrixAt(slot, TMP_MATRIX);
      m.instanceMatrix.needsUpdate = true;
    }
  }

  private buildBucket(assetKey: string, root: THREE.Object3D): AssetBucket {
    const meshes: THREE.InstancedMesh[] = [];
    const offsets: THREE.Matrix4[] = [];

    root.updateMatrixWorld(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const im = new THREE.InstancedMesh(mesh.geometry, mat, MAX_INSTANCES);
      im.name = `${assetKey}__${mesh.name || meshes.length}`;
      im.count = 0;
      im.castShadow = true;
      im.receiveShadow = true;
      // Sub-mesh har lokal transform relativ til GLB-rota; behold den som offset.
      offsets.push(mesh.matrixWorld.clone());
      // Skjul alle slots inntil de blir brukt.
      const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let s = 0; s < MAX_INSTANCES; s++) im.setMatrixAt(s, hideMatrix);
      im.instanceMatrix.needsUpdate = true;
      meshes.push(im);
    });

    return {
      assetKey,
      meshes,
      offsets,
      count: 0,
      freeSlots: [],
      slotByPropId: new Map(),
    };
  }

  dispose(): void {
    for (const bucket of this.buckets.values()) {
      for (const m of bucket.meshes) {
        m.geometry?.dispose();
        m.dispose();
      }
    }
    this.buckets.clear();
  }
}
