import { MapManager } from '../maps/MapManager';
import type { MapSnapshot } from '../maps/MapStore';
import './styles.css';

export class MapModal {
  private readonly triggerBtn: HTMLButtonElement;
  private readonly backdrop: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly nameInput: HTMLInputElement;
  private isOpen = false;

  constructor(
    mount: HTMLElement,
    private readonly manager: MapManager,
    private readonly onToast: (msg: string) => void,
  ) {
    this.triggerBtn = document.createElement('button');
    this.triggerBtn.className = 'map-toggle';
    this.triggerBtn.textContent = '🗺 Kart';
    this.triggerBtn.style.display = 'none';
    this.triggerBtn.addEventListener('click', () => this.toggle());
    mount.appendChild(this.triggerBtn);

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'map-modal-backdrop';
    this.backdrop.style.display = 'none';
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });
    mount.appendChild(this.backdrop);

    const panel = document.createElement('div');
    panel.className = 'map-modal';
    this.backdrop.appendChild(panel);

    const header = document.createElement('div');
    header.className = 'map-modal-header';
    const title = document.createElement('h2');
    title.textContent = 'Kartstyring';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'map-modal-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Lukk');
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const saveSection = document.createElement('div');
    saveSection.className = 'map-modal-save';
    const saveLabel = document.createElement('label');
    saveLabel.textContent = 'Lagre nåværende kart';
    saveSection.appendChild(saveLabel);
    const saveRow = document.createElement('div');
    saveRow.className = 'map-modal-save-row';
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.placeholder = 'Kartnavn…';
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSave();
    });
    const saveBtn = document.createElement('button');
    saveBtn.className = 'map-modal-btn primary';
    saveBtn.textContent = 'Lagre';
    saveBtn.addEventListener('click', () => this.handleSave());
    saveRow.appendChild(this.nameInput);
    saveRow.appendChild(saveBtn);
    saveSection.appendChild(saveRow);
    panel.appendChild(saveSection);

    const divider = document.createElement('hr');
    divider.className = 'map-modal-divider';
    panel.appendChild(divider);

    const listSection = document.createElement('div');
    listSection.className = 'map-modal-list-section';
    const listTitle = document.createElement('h3');
    listTitle.textContent = 'Lagrede kart';
    listSection.appendChild(listTitle);
    this.listEl = document.createElement('div');
    this.listEl.className = 'map-modal-list';
    listSection.appendChild(this.listEl);
    panel.appendChild(listSection);

    window.addEventListener('keydown', this.onKeyDown);
  }

  show(): void {
    this.isOpen = true;
    this.backdrop.style.display = 'flex';
    this.renderList();
    setTimeout(() => this.nameInput.focus(), 0);
  }

  close(): void {
    this.isOpen = false;
    this.backdrop.style.display = 'none';
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.show();
  }

  setDmMode(isDm: boolean): void {
    this.triggerBtn.style.display = isDm ? '' : 'none';
    if (!isDm && this.isOpen) this.close();
  }

  private renderList(): void {
    this.listEl.innerHTML = '';
    const maps = this.manager.listMaps();
    if (maps.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'maps-empty';
      empty.textContent = 'Ingen kart lagret ennå.';
      this.listEl.appendChild(empty);
      return;
    }
    for (const m of maps) {
      this.listEl.appendChild(this.buildRow(m));
    }
  }

  private buildRow(m: MapSnapshot): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'map-modal-row';

    const name = document.createElement('span');
    name.className = 'map-modal-row-name';
    name.textContent = m.name;
    row.appendChild(name);

    const actions = document.createElement('div');
    actions.className = 'map-modal-row-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'map-modal-btn';
    loadBtn.textContent = 'Last inn';
    loadBtn.addEventListener('click', () => this.handleLoad(m.id, m.name));
    actions.appendChild(loadBtn);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'map-modal-btn icon';
    renameBtn.title = 'Gi nytt navn';
    renameBtn.textContent = '✎';
    renameBtn.addEventListener('click', () => this.startRename(row, m));
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'map-modal-btn danger icon';
    deleteBtn.title = 'Slett';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => this.handleDelete(m.id, m.name));
    actions.appendChild(deleteBtn);

    row.appendChild(actions);
    return row;
  }

  private startRename(row: HTMLDivElement, m: MapSnapshot): void {
    row.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'map-modal-rename-input';
    input.value = m.name;
    row.appendChild(input);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'map-modal-btn primary';
    confirmBtn.textContent = 'Lagre navn';
    confirmBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      this.manager.renameMap(m.id, name);
      this.renderList();
    });
    row.appendChild(confirmBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'map-modal-btn';
    cancelBtn.textContent = 'Avbryt';
    cancelBtn.addEventListener('click', () => this.renderList());
    row.appendChild(cancelBtn);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') this.renderList();
    });

    setTimeout(() => { input.focus(); input.select(); }, 0);
  }

  private handleSave(): void {
    const name = this.nameInput.value.trim();
    if (!name) { this.nameInput.focus(); return; }
    try {
      const snapshot = this.manager.saveMap(name);
      this.nameInput.value = '';
      this.renderList();
      this.onToast(`Kart lagret: ${snapshot.name}`);
    } catch (e) {
      this.onToast(e instanceof Error ? e.message : 'Lagring feilet');
    }
  }

  private handleLoad(id: string, name: string): void {
    this.manager.loadMap(id);
    this.close();
    this.onToast(`Kart lastet: ${name}`);
  }

  private handleDelete(id: string, name: string): void {
    if (!confirm(`Slett kartet «${name}»?`)) return;
    this.manager.deleteMap(id);
    this.renderList();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'Escape' && this.isOpen) this.close();
  };
}
