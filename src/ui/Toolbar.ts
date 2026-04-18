import './styles.css';
import {
  ALL_BLOCK_TYPES,
  BLOCK_LABELS,
  BlockType,
  generateTexture,
} from '../world/BlockTypes';

export class Toolbar {
  private selected: BlockType = BlockType.Stone;
  private readonly buttons = new Map<BlockType, HTMLButtonElement>();
  private readonly listeners = new Set<(t: BlockType) => void>();

  constructor(mount: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'toolbar';

    ALL_BLOCK_TYPES.forEach((type, i) => {
      const hotkey = i + 1;
      const btn = document.createElement('button');
      btn.className = 'toolbar-btn';
      btn.title = `${BLOCK_LABELS[type]} (${hotkey})`;
      btn.dataset.type = String(type);

      const hk = document.createElement('span');
      hk.className = 'hotkey';
      hk.textContent = String(hotkey);

      const preview = this.renderPreview(type);

      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = BLOCK_LABELS[type];

      btn.appendChild(hk);
      btn.appendChild(preview);
      btn.appendChild(label);
      btn.addEventListener('click', () => this.select(type));

      this.buttons.set(type, btn);
      root.appendChild(btn);
    });

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

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const idx = Number(e.key) - 1;
    if (!Number.isNaN(idx) && idx >= 0 && idx < ALL_BLOCK_TYPES.length) {
      this.select(ALL_BLOCK_TYPES[idx]);
    }
  };

  private renderPreview(type: BlockType): HTMLCanvasElement {
    // Generer en liten canvas som viser side-teksturen (eller top for Grass)
    const face = type === BlockType.Grass ? 'top' : 'side';
    const tex = generateTexture(type, face);
    const img = tex.image as HTMLCanvasElement;
    const out = document.createElement('canvas');
    out.width = 32;
    out.height = 32;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 32, 32);
    return out;
  }
}
