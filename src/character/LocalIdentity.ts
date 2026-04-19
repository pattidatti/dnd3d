export interface LocalIdentity {
  uid: string;
  name: string;
  color: string;
  initial: string;
  isDM: boolean;
  classKey: string; // KayKit-klasse (Knight, Mage, ...)
}

const STORAGE_KEY = 'dnd3d.localIdentity.v2';

const DEFAULT_NAMES = ['Aldrin', 'Brynja', 'Cassia', 'Dovre', 'Elwyn', 'Finn'];
const DEFAULT_COLORS = ['#d9534f', '#4a7bd6', '#5cb85c', '#f0ad4e', '#9b59b6', '#20c997'];

export function loadIdentity(): LocalIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalIdentity>;
    if (!parsed.uid || !parsed.name) return null;
    return {
      uid: parsed.uid,
      name: parsed.name,
      color: parsed.color ?? '#4a7bd6',
      initial: parsed.initial ?? parsed.name[0].toUpperCase(),
      isDM: Boolean(parsed.isDM),
      classKey: parsed.classKey ?? 'Knight',
    };
  } catch {
    return null;
  }
}

export function saveIdentity(id: LocalIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(id));
}

export function ensureIdentity(): LocalIdentity {
  const existing = loadIdentity();
  if (existing) return existing;
  const name = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
  const color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  const id: LocalIdentity = {
    uid: 'local_' + randomId(),
    name,
    color,
    initial: name[0].toUpperCase(),
    isDM: false,
    classKey: 'Knight',
  };
  saveIdentity(id);
  return id;
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
