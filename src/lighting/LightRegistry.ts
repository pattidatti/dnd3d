import * as THREE from 'three';

/**
 * Sentral data-container for alle aktive lyskilder i scenen. Speiler PropWorld-
 * mønsteret: mutasjoner går via upsert/remove/setPosition/setRadius og emittes
 * til lytter-sett. DarknessPass leser snapshot pr. frame; UI-paneler abonnerer
 * på add/remove for å holde slidere i sync.
 */

export type LightKind = 'player' | 'torch';

export interface LightSource {
  id: string;
  kind: LightKind;
  ownerUid?: string;       // for player-lys: hvilket avatar-UID dette tilhører
  position: THREE.Vector3; // world-koordinater (mutérbar)
  radius: number;          // soft falloff-radius i world-units (matchende CELL_SIZE * ruter)
  color: THREE.Color;      // farge på lysflekken
  intensity: number;       // 0..1 multiplier (1 = full reveal innenfor radius)
}

type Listener<T> = (arg: T) => void;

export class LightRegistry {
  private readonly lights = new Map<string, LightSource>();
  private readonly listenersAdded = new Set<Listener<LightSource>>();
  private readonly listenersRemoved = new Set<Listener<string>>();
  private readonly listenersUpdated = new Set<Listener<LightSource>>();

  upsert(source: LightSource): void {
    const existing = this.lights.get(source.id);
    if (existing) {
      existing.kind = source.kind;
      existing.ownerUid = source.ownerUid;
      existing.position.copy(source.position);
      existing.radius = source.radius;
      existing.color.copy(source.color);
      existing.intensity = source.intensity;
      for (const l of this.listenersUpdated) l(existing);
      return;
    }
    const copy: LightSource = {
      id: source.id,
      kind: source.kind,
      ownerUid: source.ownerUid,
      position: source.position.clone(),
      color: source.color.clone(),
      radius: source.radius,
      intensity: source.intensity,
    };
    this.lights.set(source.id, copy);
    for (const l of this.listenersAdded) l(copy);
  }

  remove(id: string): void {
    if (!this.lights.delete(id)) return;
    for (const l of this.listenersRemoved) l(id);
  }

  setPosition(id: string, x: number, y: number, z: number): void {
    const s = this.lights.get(id);
    if (!s) return;
    s.position.set(x, y, z);
    // Posisjon leses pr. frame av DarknessPass — ingen events.
  }

  setRadius(id: string, radius: number): void {
    const s = this.lights.get(id);
    if (!s) return;
    s.radius = radius;
    for (const l of this.listenersUpdated) l(s);
  }

  get(id: string): LightSource | undefined {
    return this.lights.get(id);
  }

  all(): LightSource[] {
    return [...this.lights.values()];
  }

  size(): number {
    return this.lights.size;
  }

  onAdded(cb: Listener<LightSource>): () => void {
    this.listenersAdded.add(cb);
    return () => this.listenersAdded.delete(cb);
  }

  onRemoved(cb: Listener<string>): () => void {
    this.listenersRemoved.add(cb);
    return () => this.listenersRemoved.delete(cb);
  }

  onUpdated(cb: Listener<LightSource>): () => void {
    this.listenersUpdated.add(cb);
    return () => this.listenersUpdated.delete(cb);
  }
}
