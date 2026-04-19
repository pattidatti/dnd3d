import * as THREE from 'three';
import type { GltfCache } from '../assets/GltfCache';
import type { AnimationLibrary } from '../assets/AnimationLibrary';
import { CharacterAvatar } from './CharacterAvatar';

export interface AvatarInit {
  id: string;
  ownerUid: string;
  classKey: string;
  x: number; y: number; z: number;
  yaw: number;
}

/**
 * Samling av karakter-avatarer i scenen. Laster GLB + animasjoner per klasse
 * via GltfCache (som deler på tvers av instanser).
 */
export class AvatarManager {
  readonly root = new THREE.Group();
  private readonly avatars = new Map<string, CharacterAvatar>();

  constructor(
    private readonly cache: GltfCache,
    private readonly anims: AnimationLibrary,
  ) {}

  async spawn(init: AvatarInit): Promise<CharacterAvatar> {
    const avatar = new CharacterAvatar(init.id, init.ownerUid);
    await avatar.load(init.classKey, this.cache, this.anims);
    avatar.setPose(init.x, init.y, init.z, init.yaw);
    this.avatars.set(init.id, avatar);
    this.root.add(avatar.root);
    return avatar;
  }

  get(id: string): CharacterAvatar | undefined {
    return this.avatars.get(id);
  }

  getByOwner(uid: string): CharacterAvatar | undefined {
    for (const a of this.avatars.values()) {
      if (a.ownerUid === uid) return a;
    }
    return undefined;
  }

  remove(id: string): void {
    const a = this.avatars.get(id);
    if (!a) return;
    this.root.remove(a.root);
    this.avatars.delete(id);
  }

  all(): CharacterAvatar[] {
    return [...this.avatars.values()];
  }

  tick(dt: number): void {
    for (const a of this.avatars.values()) a.tick(dt);
  }
}
