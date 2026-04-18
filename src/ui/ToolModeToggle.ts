export type ToolMode = 'blocks' | 'tokens' | 'fog-reveal';

export class ToolModeToggle {
  private mode: ToolMode = 'blocks';
  private isDm = false;
  private readonly blockBtn: HTMLButtonElement;
  private readonly tokenBtn: HTMLButtonElement;
  private readonly fogBtn: HTMLButtonElement;
  private readonly listeners = new Set<(m: ToolMode) => void>();

  constructor(mount: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'tool-mode';

    this.blockBtn = this.makeBtn('🧱', 'Bygge-modus (B)');
    this.tokenBtn = this.makeBtn('⛋', 'Token-modus (N)');
    this.fogBtn = this.makeBtn('🌫', 'Fog-modus (R)');
    this.fogBtn.style.display = 'none';

    this.blockBtn.addEventListener('click', () => this.setMode('blocks'));
    this.tokenBtn.addEventListener('click', () => this.setMode('tokens'));
    this.fogBtn.addEventListener('click', () => this.setMode('fog-reveal'));

    root.appendChild(this.blockBtn);
    root.appendChild(this.tokenBtn);
    root.appendChild(this.fogBtn);
    mount.appendChild(root);

    this.applyActive();

    window.addEventListener('keydown', this.onKeyDown);
  }

  getMode(): ToolMode {
    return this.mode;
  }

  setMode(mode: ToolMode): void {
    if (mode === 'fog-reveal' && !this.isDm) return;
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyActive();
    for (const l of this.listeners) l(mode);
  }

  setDmMode(isDm: boolean): void {
    this.isDm = isDm;
    this.fogBtn.style.display = isDm ? '' : 'none';
    if (!isDm && this.mode === 'fog-reveal') {
      this.setMode('blocks');
    }
  }

  onChange(cb: (m: ToolMode) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private makeBtn(icon: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tool-mode-btn';
    btn.type = 'button';
    btn.title = title;
    btn.textContent = icon;
    return btn;
  }

  private applyActive(): void {
    this.blockBtn.classList.toggle('active', this.mode === 'blocks');
    this.tokenBtn.classList.toggle('active', this.mode === 'tokens');
    this.fogBtn.classList.toggle('active', this.mode === 'fog-reveal');
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if (key === 'b') this.setMode('blocks');
    else if (key === 'n') this.setMode('tokens');
    else if (key === 'r' && this.isDm) this.setMode('fog-reveal');
  };
}
