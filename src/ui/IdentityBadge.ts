import type { LocalIdentity } from '../character/LocalIdentity';

type DmToggle = (isDm: boolean) => void;

/**
 * Identity-chip nede høyre. Viser navn + klasse, og lar bruker toggle DM-rolle.
 */
export class IdentityBadge {
  readonly root: HTMLDivElement;
  private dmBtn: HTMLButtonElement;

  constructor(
    mount: HTMLElement,
    private identity: LocalIdentity,
    private readonly onDmToggle: DmToggle,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'identity-badge';

    const name = document.createElement('span');
    name.className = 'identity-badge__name';
    name.textContent = `${identity.name} · ${identity.classKey}`;
    this.root.appendChild(name);

    this.dmBtn = document.createElement('button');
    this.dmBtn.type = 'button';
    this.dmBtn.className = 'identity-badge__dm';
    this.dmBtn.textContent = identity.isDM ? 'DM' : 'Spiller';
    this.dmBtn.classList.toggle('is-dm', identity.isDM);
    this.dmBtn.addEventListener('click', () => {
      const newDm = !this.identity.isDM;
      this.identity = { ...this.identity, isDM: newDm };
      this.dmBtn.textContent = newDm ? 'DM' : 'Spiller';
      this.dmBtn.classList.toggle('is-dm', newDm);
      this.onDmToggle(newDm);
    });
    this.root.appendChild(this.dmBtn);

    mount.appendChild(this.root);
  }

  update(identity: LocalIdentity): void {
    this.identity = identity;
    this.root.querySelector('.identity-badge__name')!.textContent =
      `${identity.name} · ${identity.classKey}`;
    this.dmBtn.textContent = identity.isDM ? 'DM' : 'Spiller';
    this.dmBtn.classList.toggle('is-dm', identity.isDM);
  }
}
