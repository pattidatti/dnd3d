import type { Mood } from '../render/SkyEnvironment';
import type { GraphicsQuality } from '../render/GraphicsQuality';

interface MoodPanelOpts {
  initialMood: Mood;
  initialQuality: GraphicsQuality;
  onMood: (m: Mood) => void;
  onQuality: (q: GraphicsQuality) => void;
}

const MOODS: Array<{ id: Mood; label: string; icon: string }> = [
  { id: 'dawn', label: 'Daggry', icon: '🌅' },
  { id: 'day', label: 'Dag', icon: '☀️' },
  { id: 'dusk', label: 'Skumring', icon: '🌇' },
  { id: 'night', label: 'Natt', icon: '🌙' },
];

const QUALITIES: Array<{ id: GraphicsQuality; label: string }> = [
  { id: 'low', label: 'Lav' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'Høy' },
];

export class MoodPanel {
  private readonly root: HTMLDivElement;
  private readonly moodBtns = new Map<Mood, HTMLButtonElement>();
  private readonly qualityBtns = new Map<GraphicsQuality, HTMLButtonElement>();
  private currentMood: Mood;
  private currentQuality: GraphicsQuality;
  private isDm = false;

  constructor(mount: HTMLElement, opts: MoodPanelOpts) {
    this.currentMood = opts.initialMood;
    this.currentQuality = opts.initialQuality;

    this.root = document.createElement('div');
    this.root.className = 'mood-panel';
    this.root.style.display = 'none';

    const moodRow = document.createElement('div');
    moodRow.className = 'mood-row';
    const moodLabel = document.createElement('span');
    moodLabel.className = 'mood-label';
    moodLabel.textContent = 'Stemning';
    moodRow.appendChild(moodLabel);
    for (const m of MOODS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mood-btn';
      btn.title = m.label;
      btn.innerHTML = `<span class="ic">${m.icon}</span><span class="lb">${m.label}</span>`;
      btn.addEventListener('click', () => {
        this.setMood(m.id);
        opts.onMood(m.id);
      });
      moodRow.appendChild(btn);
      this.moodBtns.set(m.id, btn);
    }

    const qualRow = document.createElement('div');
    qualRow.className = 'mood-row';
    const qualLabel = document.createElement('span');
    qualLabel.className = 'mood-label';
    qualLabel.textContent = 'Kvalitet';
    qualRow.appendChild(qualLabel);
    for (const q of QUALITIES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quality-btn';
      btn.textContent = q.label;
      btn.addEventListener('click', () => {
        this.setQuality(q.id);
        opts.onQuality(q.id);
      });
      qualRow.appendChild(btn);
      this.qualityBtns.set(q.id, btn);
    }

    this.root.appendChild(moodRow);
    this.root.appendChild(qualRow);
    mount.appendChild(this.root);

    this.refresh();
  }

  setDmMode(isDm: boolean): void {
    this.isDm = isDm;
    this.root.style.display = isDm ? '' : 'none';
  }

  setMood(m: Mood): void {
    this.currentMood = m;
    this.refresh();
  }

  setQuality(q: GraphicsQuality): void {
    this.currentQuality = q;
    this.refresh();
  }

  private refresh(): void {
    for (const [id, btn] of this.moodBtns) {
      btn.classList.toggle('active', id === this.currentMood);
    }
    for (const [id, btn] of this.qualityBtns) {
      btn.classList.toggle('active', id === this.currentQuality);
    }
    void this.isDm;
  }
}
