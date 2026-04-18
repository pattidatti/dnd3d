import * as THREE from 'three';
import type { Token } from './Token';

const ICON_CANVAS_SIZE = 64;
const ICON_WORLD_SIZE = 4; // voxels
const LABEL_WORLD_HEIGHT = 0.8;

function createIconTexture(token: Token): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_CANVAS_SIZE;
  canvas.height = ICON_CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Gjennomsiktig bakgrunn
  ctx.clearRect(0, 0, ICON_CANVAS_SIZE, ICON_CANVAS_SIZE);

  // Sirkel fylt med token-farge
  const cx = ICON_CANVAS_SIZE / 2;
  const cy = ICON_CANVAS_SIZE / 2;
  const radius = ICON_CANVAS_SIZE / 2 - 3;

  ctx.fillStyle = token.color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Mørk kantlinje
  ctx.strokeStyle = 'rgba(10,10,14,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Indre lys kant for pikselkunst-vibe
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Initial-bokstav
  const initial = (token.initial || token.name[0] || '?').slice(0, 2).toUpperCase();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(10,10,14,0.9)';
  ctx.lineWidth = 3;
  ctx.font = `bold ${initial.length === 1 ? 40 : 30}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(initial, cx, cy + 1);
  ctx.fillText(initial, cx, cy + 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLabelTexture(name: string): THREE.CanvasTexture {
  const pad = 8;
  const font = 'bold 22px sans-serif';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const textWidth = measure.measureText(name).width;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(textWidth + pad * 2);
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,10,14,0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TokenSprite {
  readonly group: THREE.Group;
  readonly icon: THREE.Sprite;
  readonly label: THREE.Sprite;
  readonly selectionRing: THREE.Sprite;

  private iconTex: THREE.CanvasTexture;
  private labelTex: THREE.CanvasTexture;

  constructor(token: Token) {
    this.group = new THREE.Group();
    this.group.userData.tokenId = token.id;

    this.iconTex = createIconTexture(token);
    const iconMat = new THREE.SpriteMaterial({
      map: this.iconTex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    this.icon = new THREE.Sprite(iconMat);
    this.icon.scale.set(ICON_WORLD_SIZE, ICON_WORLD_SIZE, 1);
    this.icon.center.set(0.5, 0); // anchor bunn av sprite
    this.icon.userData.tokenId = token.id;
    this.group.add(this.icon);

    this.labelTex = createLabelTexture(token.name);
    const labelMat = new THREE.SpriteMaterial({
      map: this.labelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.label = new THREE.Sprite(labelMat);
    const labelImg = this.labelTex.image as HTMLCanvasElement;
    const labelAspect = labelImg.width / labelImg.height;
    this.label.scale.set(LABEL_WORLD_HEIGHT * labelAspect, LABEL_WORLD_HEIGHT, 1);
    this.label.position.y = ICON_WORLD_SIZE + 0.3;
    this.label.renderOrder = 10;
    this.group.add(this.label);

    // Seleksjonsring — skjult som standard
    const ringTex = this.createRingTexture();
    const ringMat = new THREE.SpriteMaterial({
      map: ringTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      color: 0xffee44,
    });
    this.selectionRing = new THREE.Sprite(ringMat);
    this.selectionRing.scale.set(ICON_WORLD_SIZE + 1.2, ICON_WORLD_SIZE + 1.2, 1);
    this.selectionRing.center.set(0.5, 0);
    this.selectionRing.position.y = -0.05;
    this.selectionRing.visible = false;
    this.selectionRing.renderOrder = -1;
    this.group.add(this.selectionRing);

    this.setPosition(token);
  }

  private createRingTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  setPosition(token: Token): void {
    this.group.position.set(token.x, token.y + 0.05, token.z);
  }

  updateFrom(token: Token, prev: Token): void {
    if (prev.color !== token.color || prev.initial !== token.initial) {
      this.iconTex.dispose();
      this.iconTex = createIconTexture(token);
      (this.icon.material as THREE.SpriteMaterial).map = this.iconTex;
      (this.icon.material as THREE.SpriteMaterial).needsUpdate = true;
    }
    if (prev.name !== token.name) {
      this.labelTex.dispose();
      this.labelTex = createLabelTexture(token.name);
      const mat = this.label.material as THREE.SpriteMaterial;
      mat.map = this.labelTex;
      mat.needsUpdate = true;
      const labelImg = this.labelTex.image as HTMLCanvasElement;
      const aspect = labelImg.width / labelImg.height;
      this.label.scale.set(LABEL_WORLD_HEIGHT * aspect, LABEL_WORLD_HEIGHT, 1);
    }
    this.setPosition(token);
  }

  setSelected(selected: boolean): void {
    this.selectionRing.visible = selected;
  }

  dispose(): void {
    this.iconTex.dispose();
    this.labelTex.dispose();
    (this.icon.material as THREE.SpriteMaterial).dispose();
    (this.label.material as THREE.SpriteMaterial).dispose();
    const ringMat = this.selectionRing.material as THREE.SpriteMaterial;
    ringMat.map?.dispose();
    ringMat.dispose();
  }
}
