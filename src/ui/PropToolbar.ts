import { allProps, propsByCategory, type AssetCategory, type AssetDef } from '../assets/AssetRegistry';

type Change = (assetKey: string | null) => void;

const CATEGORIES: { id: AssetCategory; label: string }[] = [
  { id: 'vegetation', label: 'Vegetasjon' },
  { id: 'terrain', label: 'Terreng' },
  { id: 'structure', label: 'Bygg' },
  { id: 'castle', label: 'Slott' },
  { id: 'town', label: 'By' },
];

/**
 * Enkel toolbar: kategori-rad øverst, asset-knapper under. Klikk på knapp
 * velger asset; klikk igjen deselekter. Emitterer via onChange.
 */
export class PropToolbar {
  readonly root: HTMLDivElement;
  private selectedKey: string | null = null;
  private activeCategory: AssetCategory = 'vegetation';
  private readonly listeners = new Set<Change>();
  private readonly assetListEl: HTMLDivElement;

  constructor(mount: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'prop-toolbar';

    const catRow = document.createElement('div');
    catRow.className = 'prop-toolbar__cats';
    for (const c of CATEGORIES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'prop-toolbar__cat';
      b.textContent = c.label;
      b.dataset.id = c.id;
      b.addEventListener('click', () => this.setCategory(c.id));
      catRow.appendChild(b);
    }
    this.root.appendChild(catRow);

    this.assetListEl = document.createElement('div');
    this.assetListEl.className = 'prop-toolbar__assets';
    this.root.appendChild(this.assetListEl);

    mount.appendChild(this.root);
    this.renderAssets();
    this.updateCatActive();
  }

  onChange(cb: Change): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getSelected(): string | null {
    return this.selectedKey;
  }

  setSelected(key: string | null): void {
    if (key === this.selectedKey) return;
    this.selectedKey = key;
    const asset = key ? allProps().find((a) => a.key === key) : null;
    if (asset) this.activeCategory = asset.category;
    this.renderAssets();
    this.updateCatActive();
    for (const l of this.listeners) l(this.selectedKey);
  }

  private setCategory(id: AssetCategory): void {
    this.activeCategory = id;
    this.renderAssets();
    this.updateCatActive();
  }

  private updateCatActive(): void {
    const buttons = this.root.querySelectorAll<HTMLButtonElement>('.prop-toolbar__cat');
    buttons.forEach((b) => {
      b.classList.toggle('is-active', b.dataset.id === this.activeCategory);
    });
  }

  private renderAssets(): void {
    this.assetListEl.replaceChildren();
    const assets = propsByCategory(this.activeCategory);
    for (const a of assets) {
      const b = this.makeAssetButton(a);
      this.assetListEl.appendChild(b);
    }
  }

  private makeAssetButton(asset: AssetDef): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'prop-toolbar__asset';
    b.textContent = asset.label ?? asset.key;
    b.classList.toggle('is-selected', asset.key === this.selectedKey);
    b.addEventListener('click', () => {
      const next = this.selectedKey === asset.key ? null : asset.key;
      this.setSelected(next);
    });
    return b;
  }
}
