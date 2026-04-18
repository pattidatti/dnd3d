import './styles.css';
import {
  BLOCKS_BY_CATEGORY,
  BLOCK_COLORS,
  BLOCK_LABELS,
  BlockType,
  CATEGORY_LABELS,
  type BlockCategory,
} from '../world/BlockPalette';

// Hotkeys: Natur 1–6, Arkitektur 7–9 + q, w, e.
const NATUR_KEYS = ['1', '2', '3', '4', '5', '6'];
const ARK_KEYS = ['7', '8', '9', 'q', 'w', 'e'];

export class BlockPaletteToolbar {
  private selected: BlockType = BlockType.Stone;
  private readonly buttons = new Map<BlockType, HTMLButtonElement>();
  private readonly listeners = new Set<(t: BlockType) => void>();
  private readonly keyToType = new Map<string, BlockType>();

  constructor(mount: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'palette-toolbar';

    const categories: BlockCategory[] = ['natur', 'arkitektur'];
    for (const cat of categories) {
      const row = document.createElement('div');
      row.className = 'palette-row';

      const label = document.createElement('span');
      label.className = 'palette-row-label';
      label.textContent = CATEGORY_LABELS[cat];
      row.appendChild(label);

      const keys = cat === 'natur' ? NATUR_KEYS : ARK_KEYS;
      BLOCKS_BY_CATEGORY[cat].forEach((type, i) => {
        const key = keys[i];
        if (key) this.keyToType.set(key, type);
        const btn = this.renderButton(type, key);
        row.appendChild(btn);
        this.buttons.set(type, btn);
      });

      root.appendChild(row);
    }

    mount.appendChild(root);
    this.select(BlockType.Stone);
    window.addEventListener('keydown', this.onKeyDown);
  }

  getSelected(): BlockType {
    return this.selected;
  }

  onChange(cb: (t: BlockType) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  select(type: BlockType): void {
    this.selected = type;
    for (const [t, btn] of this.buttons) {
      btn.classList.toggle('active', t === type);
    }
    for (const l of this.listeners) l(type);
  }

  private renderButton(type: BlockType, hotkey: string | undefined): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.title = hotkey ? `${BLOCK_LABELS[type]} (${hotkey.toUpperCase()})` : BLOCK_LABELS[type];
    btn.dataset.type = String(type);

    if (hotkey) {
      const hk = document.createElement('span');
      hk.className = 'hotkey';
      hk.textContent = hotkey.toUpperCase();
      btn.appendChild(hk);
    }

    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `#${BLOCK_COLORS[type].toString(16).padStart(6, '0')}`;
    btn.appendChild(swatch);

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = BLOCK_LABELS[type];
    btn.appendChild(label);

    btn.addEventListener('click', () => this.select(type));
    return btn;
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    // Ikke "snap" blokk-hotkey når man er i pointer-lock (tredjeperson);
    // WASD+shift brukes der og 1-3 burde ikke lekke inn.
    if (document.pointerLockElement) return;
    const key = e.key.toLowerCase();
    const type = this.keyToType.get(key);
    if (type !== undefined) this.select(type);
  };
}
