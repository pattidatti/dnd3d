import type { MapGenerator, MapType } from '../generator/MapGenerator';

type Toast = (msg: string) => void;

interface MapTypeOption {
  value: MapType;
  label: string;
  enabled: boolean;
}

const MAP_TYPES: MapTypeOption[] = [
  { value: 'village', label: 'Landsby', enabled: true },
  { value: 'forest', label: 'Skog (kommer)', enabled: false },
  { value: 'dungeon', label: 'Dungeon (kommer)', enabled: false },
  { value: 'tavern', label: 'Tavern (kommer)', enabled: false },
  { value: 'castle', label: 'Slott (kommer)', enabled: false },
  { value: 'harbor', label: 'Havn (kommer)', enabled: false },
];

/**
 * Liten panel for prosedyral map-generering. Plassert under MapBar (top-right).
 * - Dropdown for map-type (kun "Landsby" aktiv i Fase A)
 * - Seed-input (tom = tilfeldig)
 * - Generer-knapp som wiper terreng + props og bygger på nytt
 */
export class GeneratorBar {
  readonly root: HTMLDivElement;
  private readonly typeSelect: HTMLSelectElement;
  private readonly seedInput: HTMLInputElement;

  constructor(
    mount: HTMLElement,
    private readonly generator: MapGenerator,
    private readonly toast: Toast,
    private readonly onGenerated: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'generator-bar';

    const label = document.createElement('span');
    label.className = 'generator-bar__label';
    label.textContent = 'Generer:';
    this.root.appendChild(label);

    this.typeSelect = document.createElement('select');
    for (const opt of MAP_TYPES) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      o.disabled = !opt.enabled;
      this.typeSelect.appendChild(o);
    }
    this.root.appendChild(this.typeSelect);

    this.seedInput = document.createElement('input');
    this.seedInput.type = 'text';
    this.seedInput.placeholder = 'seed';
    this.seedInput.size = 8;
    this.root.appendChild(this.seedInput);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Generer';
    btn.addEventListener('click', () => this.generate());
    this.root.appendChild(btn);

    mount.appendChild(this.root);
  }

  private generate(): void {
    const type = this.typeSelect.value as MapType;
    const seedText = this.seedInput.value.trim();
    if (!confirm('Dette vil erstatte gjeldende kart. Fortsette?')) return;
    try {
      const result = this.generator.generate({ type, seed: seedText });
      this.onGenerated();
      this.toast(`${result.blueprint.label} generert (seed: ${result.seed})`);
    } catch (e) {
      this.toast((e as Error).message);
    }
  }
}
