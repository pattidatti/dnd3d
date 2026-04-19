import type { Mood, SkyEnvironment } from '../render/SkyEnvironment';

const MOODS: { key: Mood; label: string; icon: string }[] = [
  { key: 'dawn',  label: 'Daggry',      icon: '🌅' },
  { key: 'day',   label: 'Dag',         icon: '☀️' },
  { key: 'dusk',  label: 'Skumring',    icon: '🌇' },
  { key: 'night', label: 'Natt',        icon: '🌙' },
];

/**
 * Lite panel for å bytte tid på døgnet. Kaller SkyEnvironment.setMood direkte;
 * den håndterer myk interpolering og PMREM-rebuild selv.
 */
export class MoodPanel {
  readonly root: HTMLDivElement;
  private readonly buttons = new Map<Mood, HTMLButtonElement>();

  constructor(mount: HTMLElement, private readonly sky: SkyEnvironment) {
    this.root = document.createElement('div');
    this.root.className = 'mood-panel';

    for (const m of MOODS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mood-panel__btn';
      btn.innerHTML = `<span class="mood-panel__icon">${m.icon}</span><span class="mood-panel__label">${m.label}</span>`;
      btn.addEventListener('click', () => this.sky.setMood(m.key));
      this.root.appendChild(btn);
      this.buttons.set(m.key, btn);
    }

    mount.appendChild(this.root);

    this.sky.onMoodChange((mood) => this.updateActive(mood));
    this.updateActive(this.sky.getMood());
  }

  private updateActive(mood: Mood): void {
    for (const [k, b] of this.buttons) {
      b.classList.toggle('is-active', k === mood);
    }
  }
}
