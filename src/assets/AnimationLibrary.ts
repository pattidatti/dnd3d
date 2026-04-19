import * as THREE from 'three';
import { ANIMATION_GLBS } from './AssetRegistry';
import type { GltfCache } from './GltfCache';

/**
 * Laster KayKit's delte Rig_Medium-animasjoner én gang og gir tilgang til clips
 * per navn. Clips kan bindes til hvilken som helst karakter med kompatibel rig
 * via AnimationMixer.
 */
export class AnimationLibrary {
  private clips: THREE.AnimationClip[] = [];
  private loaded = false;

  constructor(private readonly cache: GltfCache) {}

  async load(): Promise<void> {
    if (this.loaded) return;
    const [general, movement] = await Promise.all([
      this.cache.load(ANIMATION_GLBS.general),
      this.cache.load(ANIMATION_GLBS.movement),
    ]);
    this.clips = [...general.animations, ...movement.animations];
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  findClip(name: string): THREE.AnimationClip | null {
    return (
      this.clips.find((c) => c.name === name) ??
      this.clips.find((c) => c.name.toLowerCase().includes(name.toLowerCase())) ??
      null
    );
  }

  /**
   * Prøv i rekkefølge å finne første klipp med et av navnene.
   * Returnerer null hvis ingen matcher.
   */
  findFirst(names: string[]): THREE.AnimationClip | null {
    for (const n of names) {
      const c = this.findClip(n);
      if (c) return c;
    }
    return null;
  }

  allClips(): THREE.AnimationClip[] {
    return this.clips;
  }

  allClipNames(): string[] {
    return this.clips.map((c) => c.name);
  }
}
