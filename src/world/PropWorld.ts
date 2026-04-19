/**
 * Data-container for prop-instanser. Rendering er separat (InstancedPropRenderer).
 * Event-pattern identisk med VoxelWorld/FogOfWar/TokenManager: endringer går via
 * add/update/remove og emittes til subscribers.
 */

export interface PropState {
  id: string;
  assetKey: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
}

export class PropWorld {
  private readonly props = new Map<string, PropState>();
  private readonly listenersAdded = new Set<(p: PropState) => void>();
  private readonly listenersUpdated = new Set<(p: PropState) => void>();
  private readonly listenersRemoved = new Set<(id: string, assetKey: string) => void>();

  add(p: PropState): void {
    this.props.set(p.id, { ...p });
    for (const l of this.listenersAdded) l(p);
  }

  update(p: PropState): void {
    if (!this.props.has(p.id)) return;
    this.props.set(p.id, { ...p });
    for (const l of this.listenersUpdated) l(p);
  }

  remove(id: string): void {
    const p = this.props.get(id);
    if (!p) return;
    this.props.delete(id);
    for (const l of this.listenersRemoved) l(id, p.assetKey);
  }

  get(id: string): PropState | undefined {
    return this.props.get(id);
  }

  all(): PropState[] {
    return [...this.props.values()];
  }

  clear(): void {
    const snapshot = [...this.props.values()];
    this.props.clear();
    for (const p of snapshot) {
      for (const l of this.listenersRemoved) l(p.id, p.assetKey);
    }
  }

  onAdded(cb: (p: PropState) => void): () => void {
    this.listenersAdded.add(cb);
    return () => this.listenersAdded.delete(cb);
  }
  onUpdated(cb: (p: PropState) => void): () => void {
    this.listenersUpdated.add(cb);
    return () => this.listenersUpdated.delete(cb);
  }
  onRemoved(cb: (id: string, assetKey: string) => void): () => void {
    this.listenersRemoved.add(cb);
    return () => this.listenersRemoved.delete(cb);
  }
}

export function randomPropId(): string {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}
