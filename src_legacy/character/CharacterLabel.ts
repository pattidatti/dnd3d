import * as THREE from 'three';

const W = 384;
const H = 96;

export class CharacterLabel {
  readonly sprite: THREE.Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private current = '';

  constructor(name: string) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.sprite = new THREE.Sprite(mat);
    // Sprite-skala: bredde 3 fot, høyde 0.75 fot — lesbart fra litt avstand.
    this.sprite.scale.set(3.2, 0.8, 1);
    this.sprite.renderOrder = 10;

    this.setText(name);
  }

  setText(name: string): void {
    if (name === this.current) return;
    this.current = name;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const padX = 14;
    const padY = 10;
    const r = 24;

    ctx.fillStyle = 'rgba(18, 20, 26, 0.82)';
    roundedRect(ctx, padX, padY, W - padX * 2, H - padY * 2, r);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText(name, W / 2, H / 2 + 2);

    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    (this.sprite.material as THREE.SpriteMaterial).dispose();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
