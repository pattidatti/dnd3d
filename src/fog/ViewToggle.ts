import { FogRenderer } from './FogRenderer';

export type ViewMode = 'dm' | 'player';

const DM_OPACITY = 0.35;
const PLAYER_OPACITY = 1.0;

export class ViewToggle {
  private mode: ViewMode = 'dm';
  private isDm = false;
  private readonly btn: HTMLButtonElement;

  constructor(mount: HTMLElement, private readonly fogRenderer: FogRenderer) {
    this.btn = document.createElement('button');
    this.btn.className = 'view-toggle';
    this.btn.type = 'button';
    this.btn.title = 'Veksle DM-/Spillervisning (V)';
    this.btn.addEventListener('click', () => this.toggle());
    this.btn.style.display = 'none';
    mount.appendChild(this.btn);

    this.applyMode();

    window.addEventListener('keydown', this.onKeyDown);
  }

  setDmMode(isDm: boolean): void {
    this.isDm = isDm;
    if (!isDm) {
      // Spillere skal alltid se opaque fog
      this.mode = 'player';
      this.fogRenderer.setOpacity(PLAYER_OPACITY);
      this.btn.style.display = 'none';
    } else {
      this.mode = 'dm';
      this.fogRenderer.setOpacity(DM_OPACITY);
      this.btn.style.display = '';
      this.applyMode();
    }
  }

  toggle(): void {
    if (!this.isDm) return;
    this.mode = this.mode === 'dm' ? 'player' : 'dm';
    this.applyMode();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private applyMode(): void {
    const opacity = this.mode === 'dm' ? DM_OPACITY : PLAYER_OPACITY;
    this.fogRenderer.setOpacity(opacity);
    this.btn.textContent = this.mode === 'dm' ? '👁 DM-visning' : '👁 Spillervisning';
    this.btn.classList.toggle('player-mode', this.mode === 'player');
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isDm) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key.toLowerCase() === 'v') this.toggle();
  };
}
