import { CHARACTER_CLASSES } from '../assets/AssetRegistry';

type Change = (classKey: string) => void;

/**
 * Enkel dropdown for karakter-klasse. Plasseres øverst venstre under en
 * label. Viser kun KayKit-klassene (Knight, Barbarian, Mage, Ranger, Rogue,
 * Rogue_Hooded). Bytter umiddelbart; ny avatar må spawnes på nytt.
 */
export class ClassPicker {
  readonly root: HTMLDivElement;
  private readonly select: HTMLSelectElement;
  private readonly listeners = new Set<Change>();

  constructor(mount: HTMLElement, initialKey: string) {
    this.root = document.createElement('div');
    this.root.className = 'class-picker';

    const label = document.createElement('label');
    label.textContent = 'Klasse';
    this.root.appendChild(label);

    this.select = document.createElement('select');
    for (const c of CHARACTER_CLASSES) {
      const opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = c.label;
      if (c.key === initialKey) opt.selected = true;
      this.select.appendChild(opt);
    }
    this.select.addEventListener('change', () => {
      for (const l of this.listeners) l(this.select.value);
    });
    this.root.appendChild(this.select);

    mount.appendChild(this.root);
  }

  onChange(cb: Change): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  setValue(classKey: string): void {
    this.select.value = classKey;
  }
}
