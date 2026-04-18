import { randomId } from '../character/LocalIdentity';

export interface MapSnapshot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  blocks: [number, number, number, number][];
}

interface MapStoreData {
  version: 1;
  maps: MapSnapshot[];
}

const STORAGE_KEY = 'dnd3d.maps';

export class MapStore {
  private data: MapStoreData;

  constructor() {
    this.data = this.load();
  }

  list(): MapSnapshot[] {
    return [...this.data.maps].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id: string): MapSnapshot | undefined {
    return this.data.maps.find((m) => m.id === id);
  }

  save(snapshot: MapSnapshot): void {
    const idx = this.data.maps.findIndex((m) => m.id === snapshot.id);
    if (idx >= 0) {
      this.data.maps[idx] = snapshot;
    } else {
      this.data.maps.push(snapshot);
    }
    this.persist();
  }

  delete(id: string): void {
    this.data.maps = this.data.maps.filter((m) => m.id !== id);
    this.persist();
  }

  rename(id: string, name: string): void {
    const m = this.data.maps.find((entry) => entry.id === id);
    if (!m) return;
    m.name = name;
    m.updatedAt = Date.now();
    this.persist();
  }

  makeId(): string {
    return randomId();
  }

  private load(): MapStoreData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.empty();
      const parsed = JSON.parse(raw) as MapStoreData;
      if (parsed.version !== 1 || !Array.isArray(parsed.maps)) return this.empty();
      return parsed;
    } catch {
      return this.empty();
    }
  }

  private empty(): MapStoreData {
    return { version: 1, maps: [] };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      if (
        e instanceof DOMException &&
        (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        throw new Error('Lagringsplass full – slett noen kart og prøv igjen');
      }
      throw e;
    }
  }
}
