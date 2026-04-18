import * as THREE from 'three';
import { CharacterAvatar } from './CharacterAvatar';

export interface AvatarState {
  id: string;
  ownerUid: string;
  name: string;
  color: string;
  initial: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export class AvatarManager {
  readonly root = new THREE.Group();
  private readonly states = new Map<string, AvatarState>();
  private readonly avatars = new Map<string, CharacterAvatar>();
  private selectedId: string | null = null;
  private readonly selectListeners = new Set<(id: string | null) => void>();

  add(state: AvatarState): void {
    if (this.states.has(state.id)) {
      this.update(state);
      return;
    }
    const avatar = new CharacterAvatar(state);
    avatar.setPosition(state.x, state.y, state.z);
    avatar.setYaw(state.yaw);
    this.root.add(avatar.root);
    this.avatars.set(state.id, avatar);
    this.states.set(state.id, { ...state });
  }

  update(next: AvatarState): void {
    const prev = this.states.get(next.id);
    if (!prev) {
      this.add(next);
      return;
    }
    const avatar = this.avatars.get(next.id)!;
    if (prev.x !== next.x || prev.y !== next.y || prev.z !== next.z) {
      avatar.setPosition(next.x, next.y, next.z);
    }
    if (prev.yaw !== next.yaw) avatar.setYaw(next.yaw);
    if (prev.color !== next.color || prev.initial !== next.initial || prev.name !== next.name) {
      avatar.applyAppearance(next);
    }
    this.states.set(next.id, { ...next });
  }

  move(id: string, x: number, y: number, z: number): void {
    const s = this.states.get(id);
    if (!s) return;
    if (s.x === x && s.y === y && s.z === z) return;
    this.update({ ...s, x, y, z });
  }

  remove(id: string): void {
    const avatar = this.avatars.get(id);
    if (!avatar) return;
    this.root.remove(avatar.root);
    avatar.dispose();
    this.avatars.delete(id);
    this.states.delete(id);
    if (this.selectedId === id) this.select(null);
  }

  get(id: string): AvatarState | undefined {
    return this.states.get(id);
  }

  getByOwner(ownerUid: string): AvatarState | undefined {
    for (const s of this.states.values()) {
      if (s.ownerUid === ownerUid) return s;
    }
    return undefined;
  }

  all(): AvatarState[] {
    return [...this.states.values()];
  }

  select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    for (const l of this.selectListeners) l(id);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  onSelectionChanged(cb: (id: string | null) => void): () => void {
    this.selectListeners.add(cb);
    return () => this.selectListeners.delete(cb);
  }

  /** Alle meshes som kan raycastes (for klikk-velg). */
  getPickables(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    for (const a of this.avatars.values()) out.push(a.root);
    return out;
  }

  /** Slå opp avatar-id fra et raycast-hit. */
  findIdForObject(obj: THREE.Object3D): string | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      for (const [id, a] of this.avatars) {
        if (a.root === cur) return id;
      }
      cur = cur.parent;
    }
    return null;
  }
}
