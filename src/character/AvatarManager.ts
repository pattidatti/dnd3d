import * as THREE from 'three';
import type { GltfCache } from '../assets/GltfCache';
import type { AnimationLibrary } from '../assets/AnimationLibrary';
import type { LightRegistry } from '../lighting/LightRegistry';
import { CharacterAvatar } from './CharacterAvatar';

export interface AvatarInit {
  id: string;
  ownerUid: string;
  classKey: string;
  x: number; y: number; z: number;
  yaw: number;
}

const DEFAULT_PLAYER_LIGHT_RADIUS = 18;       // ~3.5 D&D-ruter
const DEFAULT_PLAYER_LIGHT_COLOR = 0xffe2b0;  // varm aura — D&D dim light-stemning
const DEFAULT_PLAYER_LIGHT_INTENSITY = 0.95;

function avatarLightId(avatarId: string): string {
  return `player_${avatarId}`;
}

/**
 * Samling av karakter-avatarer i scenen. Laster GLB + animasjoner per klasse
 * via GltfCache (som deler på tvers av instanser). Vedlikeholder også en
 * personlig LightSource per avatar via LightRegistry — slik at hver karakter
 * lyser opp et område rundt seg i mørke-renderen.
 */
export class AvatarManager {
  readonly root = new THREE.Group();
  private readonly avatars = new Map<string, CharacterAvatar>();
  private readonly lights: LightRegistry | null;

  constructor(
    private readonly cache: GltfCache,
    private readonly anims: AnimationLibrary,
    lights: LightRegistry | null = null,
  ) {
    this.lights = lights;
  }

  async spawn(init: AvatarInit): Promise<CharacterAvatar> {
    const avatar = new CharacterAvatar(init.id, init.ownerUid);
    await avatar.load(init.classKey, this.cache, this.anims);
    avatar.setPose(init.x, init.y, init.z, init.yaw);
    this.avatars.set(init.id, avatar);
    this.root.add(avatar.root);

    if (this.lights) {
      this.lights.upsert({
        id: avatarLightId(init.id),
        kind: 'player',
        ownerUid: init.ownerUid,
        position: new THREE.Vector3(init.x, init.y + 1.0, init.z),
        radius: DEFAULT_PLAYER_LIGHT_RADIUS,
        color: new THREE.Color(DEFAULT_PLAYER_LIGHT_COLOR),
        intensity: DEFAULT_PLAYER_LIGHT_INTENSITY,
      });
    }
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
    this.lights?.remove(avatarLightId(id));
  }

  all(): CharacterAvatar[] {
    return [...this.avatars.values()];
  }

  tick(dt: number): void {
    for (const a of this.avatars.values()) {
      a.tick(dt);
      // Hold lyset på avatar-posisjon (litt opp fra føttene mot brystet).
      if (this.lights) {
        const p = a.root.position;
        this.lights.setPosition(avatarLightId(a.id), p.x, p.y + 1.0, p.z);
      }
    }
  }
}

export { avatarLightId };
