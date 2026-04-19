import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AnimationLibrary } from '../assets/AnimationLibrary';
import type { GltfCache } from '../assets/GltfCache';
import { CHARACTER_CLASSES } from '../assets/AssetRegistry';

type Gait = 'idle' | 'walk' | 'run';

/**
 * Én KayKit-karakter i scenen. Eier egen AnimationMixer + aktive actions.
 * Rigg deles mellom alle klasser, så AnimationLibrary's clips binder direkte.
 */
export class CharacterAvatar {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<Gait, THREE.AnimationAction>> = {};
  private currentGait: Gait = 'idle';
  readonly id: string;
  readonly ownerUid: string;

  constructor(id: string, ownerUid: string) {
    this.id = id;
    this.ownerUid = ownerUid;
  }

  async load(classKey: string, cache: GltfCache, anims: AnimationLibrary): Promise<void> {
    const def = CHARACTER_CLASSES.find((c) => c.key === classKey) ?? CHARACTER_CLASSES[0];
    const gltf = await cache.load(def.url);
    // SkeletonUtils.clone dupliserer riggen korrekt så flere avatarer kan dele GLB.
    const model = skeletonClone(gltf.scene);
    model.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    // KayKit-karakterer er modellert for scale ~1 og vender +Z. Vår "forward"
    // i CharacterController er -Z, så roter modellen 180° inne i root-gruppen.
    // Skala 0.55 matcher ~6 fot D&D-høyde mot Kenney-props i demo-størrelse.
    model.rotation.y = Math.PI;
    model.scale.setScalar(0.55);
    this.root.add(model);

    if (anims.isLoaded()) {
      this.mixer = new THREE.AnimationMixer(model);
      const idle = anims.findFirst(['Idle', 'idle']);
      const walk = anims.findFirst(['Walking_A', 'Walking', 'Walk', 'walk']);
      const run = anims.findFirst(['Running_A', 'Running', 'Run', 'run']);
      if (idle) this.actions.idle = this.mixer.clipAction(idle);
      if (walk) this.actions.walk = this.mixer.clipAction(walk);
      if (run) this.actions.run = this.mixer.clipAction(run);
      this.setGait('idle');
    }
  }

  setGait(gait: Gait): void {
    if (this.currentGait === gait) return;
    const prev = this.actions[this.currentGait];
    const next = this.actions[gait];
    this.currentGait = gait;
    if (!next) {
      prev?.fadeOut(0.2);
      return;
    }
    next.reset().setEffectiveWeight(1).fadeIn(0.2).play();
    if (prev && prev !== next) prev.fadeOut(0.2);
  }

  setPose(x: number, y: number, z: number, yaw: number): void {
    this.root.position.set(x, y, z);
    this.root.rotation.y = yaw;
  }

  tick(dt: number): void {
    this.mixer?.update(dt);
  }
}
