import { loadIdentity, makeIdentity, saveIdentity, type LocalIdentity } from '../tokens/LocalIdentity';

const DEFAULT_COLORS = [
  '#e05b5b',
  '#e0a84b',
  '#4bc45b',
  '#3fbcd0',
  '#4f7ae0',
  '#b060e0',
  '#d04bb0',
  '#cccccc',
];

/**
 * Viser modalen dersom ingen lokal identitet finnes.
 * Returnerer en promise som resolves når brukeren har bekreftet identiteten.
 */
export function ensureIdentity(): Promise<LocalIdentity> {
  const existing = loadIdentity();
  if (existing) return Promise.resolve(existing);
  return openIdentityModal();
}

export function openIdentityModal(initial?: Partial<LocalIdentity>): Promise<LocalIdentity> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'identity-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'identity-modal';

    const title = document.createElement('h2');
    title.textContent = 'Hvem er du?';
    modal.appendChild(title);

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'Velg navn, farge og initial. Lagres lokalt i nettleseren.';
    modal.appendChild(hint);

    // Navn
    const nameWrap = document.createElement('label');
    nameWrap.className = 'field';
    nameWrap.textContent = 'Navn';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.maxLength = 24;
    nameInput.value = initial?.name ?? '';
    nameInput.placeholder = 'F.eks. Aragorn';
    nameWrap.appendChild(nameInput);
    modal.appendChild(nameWrap);

    // Initial
    const initWrap = document.createElement('label');
    initWrap.className = 'field';
    initWrap.textContent = 'Initial (1–2 bokstaver)';
    const initInput = document.createElement('input');
    initInput.type = 'text';
    initInput.maxLength = 2;
    initInput.value = initial?.initial ?? '';
    initInput.placeholder = 'A';
    initWrap.appendChild(initInput);
    modal.appendChild(initWrap);

    // Farge
    const colorWrap = document.createElement('div');
    colorWrap.className = 'field';
    const colorLabel = document.createElement('span');
    colorLabel.textContent = 'Farge';
    colorWrap.appendChild(colorLabel);
    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    let selectedColor = initial?.color ?? DEFAULT_COLORS[0];
    const swatchEls: HTMLButtonElement[] = [];
    for (const c of DEFAULT_COLORS) {
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'swatch';
      sw.style.background = c;
      if (c === selectedColor) sw.classList.add('active');
      sw.addEventListener('click', () => {
        selectedColor = c;
        for (const s of swatchEls) s.classList.toggle('active', s === sw);
      });
      swatches.appendChild(sw);
      swatchEls.push(sw);
    }
    colorWrap.appendChild(swatches);
    modal.appendChild(colorWrap);

    // DM-toggle
    const dmWrap = document.createElement('label');
    dmWrap.className = 'field checkbox';
    const dmInput = document.createElement('input');
    dmInput.type = 'checkbox';
    dmInput.checked = Boolean(initial?.isDM);
    const dmText = document.createElement('span');
    dmText.textContent = 'Jeg er DM (kan flytte alle tokens)';
    dmWrap.appendChild(dmInput);
    dmWrap.appendChild(dmText);
    modal.appendChild(dmWrap);

    // Error-linje
    const error = document.createElement('div');
    error.className = 'error';
    modal.appendChild(error);

    // Knapper
    const actions = document.createElement('div');
    actions.className = 'actions';
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'primary';
    submit.textContent = 'Fortsett';
    actions.appendChild(submit);
    modal.appendChild(actions);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    const finalize = (): void => {
      const name = nameInput.value.trim();
      const initText = initInput.value.trim().toUpperCase();
      if (!name) {
        error.textContent = 'Skriv inn et navn.';
        return;
      }
      if (!initText) {
        error.textContent = 'Skriv inn minst én initial-bokstav.';
        return;
      }
      const identity = makeIdentity(name, selectedColor, initText, dmInput.checked);
      saveIdentity(identity);
      document.body.removeChild(backdrop);
      resolve(identity);
    };

    submit.addEventListener('click', finalize);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finalize();
    });
    initInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finalize();
    });

    // Autofokus på navn
    setTimeout(() => nameInput.focus(), 0);
  });
}
