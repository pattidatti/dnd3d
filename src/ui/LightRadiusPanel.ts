import type { LightRegistry, LightSource } from '../lighting/LightRegistry';

/**
 * DM-only panel som lar DM justere lys-radien for hver aktive spiller-avatar.
 * Lytter på LightRegistry.onAdded/onRemoved for å holde slidere i sync. Ignorerer
 * torch-lys (kun 'player'-kind vises). Persisterer per-uid radius i localStorage
 * så valget overlever reload.
 */

const STORAGE_KEY = 'dnd3d.playerLightRadius.v1';
const MIN_RADIUS = 4;
const MAX_RADIUS = 60;

interface Row {
  uid: string;
  lightId: string;
  el: HTMLDivElement;
  slider: HTMLInputElement;
  valueEl: HTMLSpanElement;
}

function loadRadiusMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveRadiusMap(map: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export class LightRadiusPanel {
  readonly root: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly rows = new Map<string, Row>();
  private readonly persisted: Record<string, number>;
  private isDm = false;

  constructor(mount: HTMLElement, private readonly lights: LightRegistry) {
    this.persisted = loadRadiusMap();

    this.root = document.createElement('div');
    this.root.className = 'light-radius-panel';
    this.root.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'light-radius-panel__title';
    title.textContent = 'Spiller-lys (DM)';
    this.root.appendChild(title);

    this.listEl = document.createElement('div');
    this.listEl.className = 'light-radius-panel__list';
    this.root.appendChild(this.listEl);

    const empty = document.createElement('div');
    empty.className = 'light-radius-panel__empty';
    empty.textContent = 'Ingen aktive spillere ennå.';
    this.listEl.appendChild(empty);

    mount.appendChild(this.root);

    this.lights.onAdded((s) => {
      if (s.kind !== 'player') return;
      this.applyPersistedRadius(s);
      this.addRow(s);
    });
    this.lights.onRemoved((id) => {
      this.removeRow(id);
    });
    this.lights.onUpdated((s) => {
      if (s.kind !== 'player') return;
      const row = this.rows.get(s.id);
      if (row && Number(row.slider.value) !== s.radius) {
        row.slider.value = String(s.radius);
        row.valueEl.textContent = `${s.radius.toFixed(0)} u`;
      }
    });
  }

  setDmMode(isDm: boolean): void {
    this.isDm = isDm;
    this.root.style.display = isDm ? '' : 'none';
  }

  private applyPersistedRadius(s: LightSource): void {
    if (!s.ownerUid) return;
    const persisted = this.persisted[s.ownerUid];
    if (persisted && persisted !== s.radius) {
      this.lights.setRadius(s.id, persisted);
    }
  }

  private addRow(s: LightSource): void {
    if (this.rows.has(s.id)) return;
    // Fjern eventuell "ingen spillere"-melding første gang.
    if (this.rows.size === 0) {
      this.listEl.replaceChildren();
    }

    const row = document.createElement('div');
    row.className = 'light-radius-panel__row';

    const label = document.createElement('span');
    label.className = 'light-radius-panel__label';
    label.textContent = s.ownerUid ? s.ownerUid.replace(/^local_/, '').slice(0, 8) : s.id;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(MIN_RADIUS);
    slider.max = String(MAX_RADIUS);
    slider.step = '1';
    slider.value = String(s.radius);

    const valueEl = document.createElement('span');
    valueEl.className = 'light-radius-panel__value';
    valueEl.textContent = `${s.radius.toFixed(0)} u`;

    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      this.lights.setRadius(s.id, v);
      valueEl.textContent = `${v.toFixed(0)} u`;
      if (s.ownerUid) {
        this.persisted[s.ownerUid] = v;
        saveRadiusMap(this.persisted);
      }
    });

    row.appendChild(label);
    row.appendChild(slider);
    row.appendChild(valueEl);
    this.listEl.appendChild(row);

    this.rows.set(s.id, { uid: s.ownerUid ?? s.id, lightId: s.id, el: row, slider, valueEl });
    if (this.isDm) this.root.style.display = '';
  }

  private removeRow(id: string): void {
    const row = this.rows.get(id);
    if (!row) return;
    row.el.remove();
    this.rows.delete(id);
    if (this.rows.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'light-radius-panel__empty';
      empty.textContent = 'Ingen aktive spillere ennå.';
      this.listEl.appendChild(empty);
    }
  }
}
