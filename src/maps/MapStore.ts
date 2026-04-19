import type { PropState } from '../world/PropWorld';

export interface MapSnapshotV2 {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  terrain: {
    widthCells: number;
    depthCells: number;
    heights: string; // base64(Float32Array)
    biome: string;   // base64(Uint8Array)
  };
  props: PropState[];
}

interface MapStoreData {
  version: 2;
  maps: MapSnapshotV2[];
}

const STORAGE_KEY = 'dnd3d.maps.v2';

export class MapStore {
  private data: MapStoreData;

  constructor() {
    this.data = this.load();
  }

  list(): MapSnapshotV2[] {
    return [...this.data.maps].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  get(id: string): MapSnapshotV2 | undefined {
    return this.data.maps.find((m) => m.id === id);
  }

  save(snapshot: MapSnapshotV2): void {
    const idx = this.data.maps.findIndex((m) => m.id === snapshot.id);
    if (idx >= 0) this.data.maps[idx] = snapshot;
    else this.data.maps.push(snapshot);
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
    return 'm_' + Math.random().toString(36).slice(2, 10);
  }

  private load(): MapStoreData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.empty();
      const parsed = JSON.parse(raw) as MapStoreData;
      if (parsed.version !== 2 || !Array.isArray(parsed.maps)) return this.empty();
      return parsed;
    } catch {
      return this.empty();
    }
  }

  private empty(): MapStoreData {
    return { version: 2, maps: [] };
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

export function encodeFloat32(arr: Float32Array): string {
  return bufferToBase64(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
}
export function decodeFloat32(b64: string): Float32Array {
  const u8 = base64ToBuffer(b64);
  return new Float32Array(u8.buffer, u8.byteOffset, u8.byteLength / 4);
}
export function encodeUint8(arr: Uint8Array): string {
  return bufferToBase64(arr);
}
export function decodeUint8(b64: string): Uint8Array {
  return base64ToBuffer(b64);
}

function bufferToBase64(bytes: Uint8Array): string {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + chunk)));
  }
  return btoa(s);
}

function base64ToBuffer(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
