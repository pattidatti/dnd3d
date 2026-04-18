import type { LocalIdentity } from '../character/LocalIdentity';

export class IdentityBadge {
  private readonly root: HTMLDivElement;
  private readonly dot: HTMLSpanElement;
  private readonly nameEl: HTMLSpanElement;
  private readonly dmTag: HTMLSpanElement;

  constructor(
    mount: HTMLElement,
    identity: LocalIdentity,
    private readonly onEdit: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'identity-badge';

    this.dot = document.createElement('span');
    this.dot.className = 'dot';
    this.root.appendChild(this.dot);

    this.nameEl = document.createElement('span');
    this.root.appendChild(this.nameEl);

    this.dmTag = document.createElement('span');
    this.dmTag.className = 'dm-tag';
    this.dmTag.textContent = 'DM';
    this.root.appendChild(this.dmTag);

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.textContent = 'Endre';
    editBtn.addEventListener('click', () => this.onEdit());
    this.root.appendChild(editBtn);

    mount.appendChild(this.root);
    this.update(identity);
  }

  update(identity: LocalIdentity): void {
    this.dot.style.background = identity.color;
    this.nameEl.textContent = `${identity.name} (${identity.initial.toUpperCase()})`;
    this.dmTag.style.display = identity.isDM ? 'inline-block' : 'none';
  }
}
