export interface LocalIdentity {
  uid: string;
  name: string;
  color: string;
  initial: string;
  isDM: boolean;
}

const STORAGE_KEY = 'dnd3d.localIdentity';

export function loadIdentity(): LocalIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalIdentity>;
    if (!parsed.uid || !parsed.name || !parsed.color || !parsed.initial) return null;
    return {
      uid: parsed.uid,
      name: parsed.name,
      color: parsed.color,
      initial: parsed.initial,
      isDM: Boolean(parsed.isDM),
    };
  } catch {
    return null;
  }
}

export function saveIdentity(identity: LocalIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function makeIdentity(name: string, color: string, initial: string, isDM: boolean): LocalIdentity {
  return {
    uid: 'local_' + randomId(),
    name,
    color,
    initial,
    isDM,
  };
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
