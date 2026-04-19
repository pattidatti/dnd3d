interface Binding {
  keys: string[];
  label: string;
}
interface Section {
  title: string;
  bindings: Binding[];
}

const SECTIONS: Section[] = [
  {
    title: 'Kamera',
    bindings: [
      { keys: ['Tab'], label: 'Bytt orbit ↔ tredjeperson' },
      { keys: ['T'], label: 'Topdown-visning' },
      { keys: ['Esc'], label: 'Slipp musel\u00e5s' },
    ],
  },
  {
    title: 'Tredjeperson',
    bindings: [
      { keys: ['Klikk'], label: 'L\u00e5s mus' },
      { keys: ['W', 'A', 'S', 'D'], label: 'G\u00e5' },
      { keys: ['Mellomrom'], label: 'Hopp' },
      { keys: ['Shift'], label: 'L\u00f8p' },
      { keys: ['Mus'], label: 'Rot\u00e9r kamera' },
      { keys: ['Scroll'], label: 'Zoom avstand' },
    ],
  },
  {
    title: 'Props (orbit)',
    bindings: [
      { keys: ['Venstreklikk'], label: 'Plasser valgt prop' },
      { keys: ['H\u00f8yreklikk'], label: 'Slett prop' },
      { keys: ['Shift', '+', 'klikk'], label: 'Plasser med jitter' },
    ],
  },
  {
    title: 'DM',
    bindings: [
      { keys: ['R'], label: 'Fog reveal-modus' },
      { keys: ['V'], label: 'DM ↔ spiller-visning' },
      { keys: ['Shift', '+', 'klikk'], label: 'Fog: avsl\u00f8r 3×3' },
    ],
  },
  {
    title: 'Annet',
    bindings: [
      { keys: ['H'], label: 'Vis/skjul denne hjelpen' },
    ],
  },
];

export class KeybindingsHelp {
  private readonly chip: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private open = false;

  constructor(mount: HTMLElement) {
    this.chip = document.createElement('div');
    this.chip.className = 'kb-chip';
    this.chip.innerHTML = '<span class="kb-key">H</span><span>Hurtigtaster</span>';
    this.chip.addEventListener('click', () => this.toggle());
    mount.appendChild(this.chip);

    this.overlay = document.createElement('div');
    this.overlay.className = 'kb-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    mount.appendChild(this.overlay);

    this.renderOverlay();

    window.addEventListener('keydown', this.onKeyDown);
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  show(): void {
    this.open = true;
    this.overlay.classList.add('active');
  }

  close(): void {
    this.open = false;
    this.overlay.classList.remove('active');
  }

  private renderOverlay(): void {
    const panel = document.createElement('div');
    panel.className = 'kb-panel';

    const header = document.createElement('div');
    header.className = 'kb-header';
    header.innerHTML = '<h2>Hurtigtaster</h2><button class="kb-close" aria-label="Lukk">×</button>';
    header.querySelector('.kb-close')!.addEventListener('click', () => this.close());
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'kb-grid';
    for (const section of SECTIONS) {
      const col = document.createElement('div');
      col.className = 'kb-section';
      const h3 = document.createElement('h3');
      h3.textContent = section.title;
      col.appendChild(h3);

      const ul = document.createElement('ul');
      for (const b of section.bindings) {
        const li = document.createElement('li');
        const keys = document.createElement('span');
        keys.className = 'kb-keys';
        for (const k of b.keys) {
          if (k === '+' || k === '–' || k === 'eller') {
            const joiner = document.createElement('span');
            joiner.className = 'kb-join';
            joiner.textContent = k;
            keys.appendChild(joiner);
          } else {
            const kEl = document.createElement('span');
            kEl.className = 'kb-key';
            kEl.textContent = k;
            keys.appendChild(kEl);
          }
        }
        const lab = document.createElement('span');
        lab.className = 'kb-label';
        lab.textContent = b.label;
        li.appendChild(keys);
        li.appendChild(lab);
        ul.appendChild(li);
      }
      col.appendChild(ul);
      grid.appendChild(col);
    }
    panel.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'kb-footer';
    footer.textContent = 'Trykk H eller Esc for å lukke.';
    panel.appendChild(footer);

    this.overlay.appendChild(panel);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.pointerLockElement) return;
    const key = e.key.toLowerCase();
    if (key === 'h') {
      e.preventDefault();
      this.toggle();
    } else if (e.key === 'Escape' && this.open) {
      this.close();
    }
  };
}
