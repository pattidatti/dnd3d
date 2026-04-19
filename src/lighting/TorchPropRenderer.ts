import * as THREE from 'three';
import type { PropWorld, PropState } from '../world/PropWorld';
import type { LightRegistry } from './LightRegistry';

/**
 * Renderer for torch-props (procedural geometri, ikke GLTF). Lytter på PropWorld
 * og opprettholder en Group per torch-id. Speiler PropWorld→InstancedPropRenderer-
 * mønsteret men med per-instans Object3D fordi vi vil animere flammen og fordi
 * antallet er beskjedent (10–30).
 *
 * Hver torch registrerer også en LightSource hos LightRegistry slik at
 * DarknessPass kan tegne lys-radien rundt den.
 */

const TORCH_ASSET_KEY = 'torch';
const TORCH_LIGHT_RADIUS = 25;     // ca 5 D&D-ruter med CELL_SIZE=5
const TORCH_LIGHT_INTENSITY = 1.0;
const TORCH_LIGHT_COLOR = 0xffaa55;

const HANDLE_COLOR = 0x4a2f1a;
const HEAD_COLOR = 0x231410;
const FLAME_COLOR_HOT = 0xffd070;
const FLAME_COLOR_COOL = 0xff7a2c;

interface TorchInstance {
  id: string;
  group: THREE.Group;
  flame: THREE.Mesh;
  flameMat: THREE.MeshBasicMaterial;
  glow: THREE.Mesh;
  glowMat: THREE.MeshBasicMaterial;
  glowGeo: THREE.BufferGeometry;
  lightId: string;
  flicker: number;             // randomisert offset for ut-av-fase flickering
}

export class TorchPropRenderer {
  readonly root = new THREE.Group();
  private readonly instances = new Map<string, TorchInstance>();
  private readonly meshes: THREE.Mesh[] = [];           // for raycaster (deletion)
  private readonly meshIdByMesh = new Map<THREE.Mesh, string>();

  // Delte geometrier + materialer for handle/head (statisk, deles av alle torches).
  private handleGeo: THREE.CylinderGeometry | null = null;
  private headGeo: THREE.CylinderGeometry | null = null;
  private flameGeo: THREE.ConeGeometry | null = null;
  private handleMat: THREE.MeshStandardMaterial | null = null;
  private headMat: THREE.MeshStandardMaterial | null = null;

  constructor(
    private readonly propWorld: PropWorld,
    private readonly lights: LightRegistry,
  ) {
    this.root.name = 'TorchPropRenderer';
    this.propWorld.onAdded((p) => {
      if (p.assetKey === TORCH_ASSET_KEY) this.addTorch(p);
    });
    this.propWorld.onUpdated((p) => {
      if (p.assetKey === TORCH_ASSET_KEY) this.updateTorch(p);
    });
    this.propWorld.onRemoved((id, key) => {
      if (key === TORCH_ASSET_KEY) this.removeTorch(id);
    });
  }

  /** Driv flicker-animasjon. Kalles fra App.tick. */
  tick(elapsed: number): void {
    for (const inst of this.instances.values()) {
      const t = elapsed * 6 + inst.flicker;
      const sx = 1 + Math.sin(t) * 0.07 + Math.sin(t * 2.3) * 0.04;
      const sy = 1 + Math.sin(t * 1.7) * 0.12;
      inst.flame.scale.set(sx, sy, sx);
      inst.glow.scale.set(sx * 0.95, sy * 0.95, sx * 0.95);
    }
  }

  /** PropPlacer trenger meshes for raycast-deletion. */
  getRaycastMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  /** Slå opp prop-id fra raycast-hit. Returnerer null hvis ikke en torch-mesh. */
  propIdFromHit(mesh: THREE.Object3D): string | null {
    return this.meshIdByMesh.get(mesh as THREE.Mesh) ?? null;
  }

  private ensureSharedAssets(): void {
    if (this.handleGeo) return;
    this.handleGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.9, 8);
    this.handleGeo.translate(0, 0.45, 0);
    this.headGeo = new THREE.CylinderGeometry(0.10, 0.08, 0.16, 10);
    this.headGeo.translate(0, 0.98, 0);
    this.flameGeo = new THREE.ConeGeometry(0.12, 0.45, 10, 1, true);
    this.flameGeo.translate(0, 1.28, 0);
    this.handleMat = new THREE.MeshStandardMaterial({
      color: HANDLE_COLOR,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.headMat = new THREE.MeshStandardMaterial({
      color: HEAD_COLOR,
      roughness: 0.95,
      metalness: 0.0,
    });
  }

  /** Bygg en visuell torch-modell. Lager per-instans flamme/glow (egne mat+geo). */
  private buildTorchVisual(): {
    group: THREE.Group;
    handle: THREE.Mesh;
    head: THREE.Mesh;
    flame: THREE.Mesh;
    flameMat: THREE.MeshBasicMaterial;
    glow: THREE.Mesh;
    glowMat: THREE.MeshBasicMaterial;
    glowGeo: THREE.BufferGeometry;
  } {
    this.ensureSharedAssets();
    const group = new THREE.Group();

    const handle = new THREE.Mesh(this.handleGeo!, this.handleMat!);
    handle.castShadow = true;
    handle.receiveShadow = true;

    const head = new THREE.Mesh(this.headGeo!, this.headMat!);
    head.castShadow = true;
    head.receiveShadow = true;

    const flameMat = new THREE.MeshBasicMaterial({
      color: FLAME_COLOR_HOT,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flame = new THREE.Mesh(this.flameGeo!, flameMat);
    flame.castShadow = false;
    flame.receiveShadow = false;

    const glowGeo = this.flameGeo!.clone();
    glowGeo.scale(2.0, 1.4, 2.0);
    const glowMat = new THREE.MeshBasicMaterial({
      color: FLAME_COLOR_COOL,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.castShadow = false;
    glow.receiveShadow = false;

    group.add(handle);
    group.add(head);
    group.add(flame);
    group.add(glow);

    return { group, handle, head, flame, flameMat, glow, glowMat, glowGeo };
  }

  /** Eksternt: bygg ghost-modell for PropPlacer. Bruker semitransparent material. */
  buildGhost(): THREE.Group {
    const v = this.buildTorchVisual();
    // Marker handle/head som transparent for ghost-look.
    // (Fordi handle/head bruker delt material, lager vi clone-mat for ghost.)
    const ghostHandleMat = (v.handle.material as THREE.MeshStandardMaterial).clone();
    ghostHandleMat.transparent = true;
    ghostHandleMat.opacity = 0.55;
    ghostHandleMat.depthWrite = false;
    v.handle.material = ghostHandleMat;
    const ghostHeadMat = (v.head.material as THREE.MeshStandardMaterial).clone();
    ghostHeadMat.transparent = true;
    ghostHeadMat.opacity = 0.55;
    ghostHeadMat.depthWrite = false;
    v.head.material = ghostHeadMat;
    v.handle.castShadow = false;
    v.handle.receiveShadow = false;
    v.head.castShadow = false;
    v.head.receiveShadow = false;
    v.flameMat.opacity = 0.4;
    v.glowMat.opacity = 0.2;
    return v.group;
  }

  private addTorch(prop: PropState): void {
    if (this.instances.has(prop.id)) return;
    const v = this.buildTorchVisual();
    v.group.position.set(prop.x, prop.y, prop.z);
    v.group.rotation.y = prop.rotY;
    v.group.scale.setScalar(prop.scale);
    this.root.add(v.group);

    // Bare handle + head registreres for raycast-deletion (klikk på flammen
    // bør ikke slette torchen, fordi additiv blending er upresist).
    this.meshes.push(v.handle, v.head);
    this.meshIdByMesh.set(v.handle, prop.id);
    this.meshIdByMesh.set(v.head, prop.id);

    const lightWorld = new THREE.Vector3(0, 1.3, 0)
      .multiplyScalar(prop.scale)
      .add(new THREE.Vector3(prop.x, prop.y, prop.z));
    const lightId = `torch_${prop.id}`;
    this.lights.upsert({
      id: lightId,
      kind: 'torch',
      position: lightWorld,
      radius: TORCH_LIGHT_RADIUS,
      color: new THREE.Color(TORCH_LIGHT_COLOR),
      intensity: TORCH_LIGHT_INTENSITY,
    });

    this.instances.set(prop.id, {
      id: prop.id,
      group: v.group,
      flame: v.flame,
      flameMat: v.flameMat,
      glow: v.glow,
      glowMat: v.glowMat,
      glowGeo: v.glowGeo,
      lightId,
      flicker: Math.random() * Math.PI * 2,
    });
  }

  private updateTorch(prop: PropState): void {
    const inst = this.instances.get(prop.id);
    if (!inst) return;
    inst.group.position.set(prop.x, prop.y, prop.z);
    inst.group.rotation.y = prop.rotY;
    inst.group.scale.setScalar(prop.scale);
    const lx = prop.x;
    const ly = prop.y + 1.3 * prop.scale;
    const lz = prop.z;
    this.lights.setPosition(inst.lightId, lx, ly, lz);
  }

  private removeTorch(id: string): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    this.root.remove(inst.group);
    this.lights.remove(inst.lightId);

    inst.flameMat.dispose();
    inst.glowMat.dispose();
    inst.glowGeo.dispose();

    // Fjern handle/head fra raycast (de delte geo/mat skal ikke disposes).
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      if (this.meshIdByMesh.get(this.meshes[i]) === id) {
        this.meshIdByMesh.delete(this.meshes[i]);
        this.meshes.splice(i, 1);
      }
    }
    this.instances.delete(id);
  }
}

export const TORCH_KEY = TORCH_ASSET_KEY;
