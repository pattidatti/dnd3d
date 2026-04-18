import type { Token } from './Token';

type AddListener = (t: Token) => void;
type UpdateListener = (t: Token, prev: Token) => void;
type RemoveListener = (t: Token) => void;
type SelectListener = (id: string | null) => void;

export class TokenManager {
  private readonly tokens = new Map<string, Token>();
  private selectedId: string | null = null;

  private readonly addListeners = new Set<AddListener>();
  private readonly updateListeners = new Set<UpdateListener>();
  private readonly removeListeners = new Set<RemoveListener>();
  private readonly selectListeners = new Set<SelectListener>();

  add(token: Token): void {
    if (this.tokens.has(token.id)) {
      this.update(token);
      return;
    }
    this.tokens.set(token.id, { ...token });
    for (const l of this.addListeners) l(this.tokens.get(token.id)!);
  }

  update(token: Token): void {
    const prev = this.tokens.get(token.id);
    if (!prev) {
      this.add(token);
      return;
    }
    const next = { ...prev, ...token };
    this.tokens.set(token.id, next);
    for (const l of this.updateListeners) l(next, prev);
  }

  move(id: string, x: number, y: number, z: number): void {
    const prev = this.tokens.get(id);
    if (!prev) return;
    if (prev.x === x && prev.y === y && prev.z === z) return;
    this.update({ ...prev, x, y, z });
  }

  remove(id: string): void {
    const t = this.tokens.get(id);
    if (!t) return;
    this.tokens.delete(id);
    if (this.selectedId === id) this.select(null);
    for (const l of this.removeListeners) l(t);
  }

  get(id: string): Token | undefined {
    return this.tokens.get(id);
  }

  getByOwner(ownerUid: string): Token | undefined {
    for (const t of this.tokens.values()) {
      if (t.ownerUid === ownerUid) return t;
    }
    return undefined;
  }

  all(): Token[] {
    return [...this.tokens.values()];
  }

  select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    for (const l of this.selectListeners) l(id);
  }

  getSelectedId(): string | null {
    return this.selectedId;
  }

  onAdded(cb: AddListener): () => void {
    this.addListeners.add(cb);
    return () => this.addListeners.delete(cb);
  }

  onUpdated(cb: UpdateListener): () => void {
    this.updateListeners.add(cb);
    return () => this.updateListeners.delete(cb);
  }

  onRemoved(cb: RemoveListener): () => void {
    this.removeListeners.add(cb);
    return () => this.removeListeners.delete(cb);
  }

  onSelectionChanged(cb: SelectListener): () => void {
    this.selectListeners.add(cb);
    return () => this.selectListeners.delete(cb);
  }
}
