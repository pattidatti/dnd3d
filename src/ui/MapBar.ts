import type { MapManager } from '../maps/MapManager';
import type { MapStore } from '../maps/MapStore';

type Toast = (msg: string) => void;

/**
 * Knipset save/load-panel øverst til høyre. Foreløpig minimalt — lagrer til
 * siste navngitte kart og gir en enkel dropdown for å laste tidligere kart.
 * Vil bli erstattet av full MapModal senere.
 */
export class MapBar {
  readonly root: HTMLDivElement;
  private currentId: string | null = null;

  constructor(
    mount: HTMLElement,
    private readonly manager: MapManager,
    private readonly store: MapStore,
    private readonly toast: Toast,
    private readonly onLoaded: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'map-bar';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Lagre';
    saveBtn.addEventListener('click', () => this.save());
    this.root.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.textContent = 'Last…';
    loadBtn.addEventListener('click', () => this.load());
    this.root.appendChild(loadBtn);

    mount.appendChild(this.root);
  }

  private save(): void {
    try {
      if (this.currentId) {
        const snap = this.manager.overwrite(this.currentId);
        if (snap) {
          this.toast(`Lagret: ${snap.name}`);
          return;
        }
      }
      const name = prompt('Navn på kart:', 'Nytt kart');
      if (!name) return;
      const snap = this.manager.saveAs(name);
      this.currentId = snap.id;
      this.toast(`Lagret som: ${name}`);
    } catch (e) {
      this.toast((e as Error).message);
    }
  }

  private load(): void {
    const list = this.store.list();
    if (list.length === 0) {
      this.toast('Ingen lagrede kart');
      return;
    }
    const lines = list.map((m, i) => `${i + 1}. ${m.name}`).join('\n');
    const pick = prompt(`Velg kart (1–${list.length}):\n${lines}`);
    if (!pick) return;
    const idx = parseInt(pick, 10) - 1;
    const chosen = list[idx];
    if (!chosen) {
      this.toast('Ugyldig valg');
      return;
    }
    const ok = this.manager.load(chosen.id);
    if (ok) {
      this.currentId = chosen.id;
      this.onLoaded();
      this.toast(`Lastet: ${chosen.name}`);
    } else {
      this.toast('Lasting feilet');
    }
  }
}
