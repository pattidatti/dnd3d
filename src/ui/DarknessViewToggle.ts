import type { DarknessPass } from '../lighting/DarknessPass';

/**
 * DM-overlay-toggle: erstatter den gamle ViewToggle. DM ser alltid full
 * scene, men kan velge om mørket vises som transparent overlay (slik at DM
 * skjønner hva spillere ser) eller som full opasitet (samme som spillere).
 *
 * Spillere har alltid full opasitet og ser ikke knappen.
 */

export type ViewMode = 'dm' | 'player';

const DM_OPACITY = 0.40;
const PLAYER_OPACITY = 1.0;

export class DarknessViewToggle {
  private mode: ViewMode = 'dm';
  private isDm = false;
  private readonly btn: HTMLButtonElement;

  constructor(mount: HTMLElement, private readonly darkness: DarknessPass) {
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
      this.mode = 'player';
      this.darkness.setGlobalOpacity(PLAYER_OPACITY);
      this.btn.style.display = 'none';
    } else {
      this.mode = 'dm';
      this.darkness.setGlobalOpacity(DM_OPACITY);
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
    this.darkness.setGlobalOpacity(opacity);
    this.btn.textContent = this.mode === 'dm' ? '👁 DM-visning' : '👁 Spillervisning';
    this.btn.classList.toggle('player-mode', this.mode === 'player');
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isDm) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.pointerLockElement) return;
    if (e.key.toLowerCase() === 'v') this.toggle();
  };
}
