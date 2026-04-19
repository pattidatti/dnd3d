import * as THREE from 'three';
import { CharacterLabel } from './CharacterLabel';

// 1 voxel = 1 fot. Karakter ~6 fot h\u00f8y.
const LEG_H = 3;
const TORSO_H = 2;
const HEAD_H = 1;

export interface AvatarAppearance {
  color: string;
  initial: string;
  name: string;
}

export class CharacterAvatar {
  readonly root = new THREE.Group();
  private readonly body: THREE.MeshStandardMaterial;
  private readonly skin: THREE.MeshStandardMaterial;
  private readonly head: THREE.Mesh;
  private readonly headMaterial: THREE.MeshStandardMaterial;
  private readonly label: CharacterLabel;
  private currentInitial = '';
  private currentColor = '';

  constructor(appearance: AvatarAppearance) {
    const bodyColor = new THREE.Color(appearance.color);
    this.body = new THREE.MeshStandardMaterial({
      color: bodyColor.clone(),
      roughness: 0.85,
      metalness: 0,
    });
    const skinColor = bodyColor.clone().multiplyScalar(1).lerp(new THREE.Color(0xf2d6b3), 0.55);
    this.skin = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.9,
      metalness: 0,
    });
    this.headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0,
    });

    // Bein (to avstivede bokser for å antyde to bein)
    const legGeo = new THREE.BoxGeometry(0.45, LEG_H, 0.55);
    const legL = new THREE.Mesh(legGeo, this.body);
    legL.position.set(-0.25, LEG_H / 2, 0);
    const legR = new THREE.Mesh(legGeo, this.body);
    legR.position.set(0.25, LEG_H / 2, 0);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(1.15, TORSO_H, 0.6);
    const torso = new THREE.Mesh(torsoGeo, this.body);
    torso.position.set(0, LEG_H + TORSO_H / 2, 0);

    // Armer
    const armGeo = new THREE.BoxGeometry(0.35, TORSO_H, 0.55);
    const armL = new THREE.Mesh(armGeo, this.skin);
    armL.position.set(-0.76, LEG_H + TORSO_H / 2, 0);
    const armR = new THREE.Mesh(armGeo, this.skin);
    armR.position.set(0.76, LEG_H + TORSO_H / 2, 0);

    // Hode med canvas-tekstur (initial)
    const headGeo = new THREE.BoxGeometry(HEAD_H, HEAD_H, HEAD_H);
    this.head = new THREE.Mesh(headGeo, this.headMaterial);
    this.head.position.set(0, LEG_H + TORSO_H + HEAD_H / 2, 0);

    for (const m of [legL, legR, torso, armL, armR, this.head]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.root.add(m);
    }

    this.label = new CharacterLabel(appearance.name);
    this.root.add(this.label.sprite);

    this.applyAppearance(appearance);

    // Avatar fremstår som en liten spillbrikke — blokker virker større.
    // Fysikk-AABB (CHAR_HEIGHT 5.9) er uendret; bare det visuelle skaleres.
    const VISUAL_SCALE = 0.5;
    this.root.scale.setScalar(VISUAL_SCALE);
    this.label.sprite.position.set(0, (LEG_H + TORSO_H + HEAD_H + 1.0) / VISUAL_SCALE, 0);
    this.label.sprite.scale.set(3.2 / VISUAL_SCALE, 0.8 / VISUAL_SCALE, 1);
  }

  /** Plasser avataren ved fot-sentrum (base-Y = toppen av voxelen under). */
  setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  setYaw(yawRad: number): void {
    this.root.rotation.y = yawRad;
  }

  applyAppearance(a: AvatarAppearance): void {
    if (a.color !== this.currentColor) {
      const bodyColor = new THREE.Color(a.color);
      this.body.color.copy(bodyColor);
      const skinColor = bodyColor.clone().lerp(new THREE.Color(0xf2d6b3), 0.55);
      this.skin.color.copy(skinColor);
      this.currentColor = a.color;
    }
    if (a.initial !== this.currentInitial) {
      const tex = buildHeadTexture(a.color, a.initial);
      if (this.headMaterial.map) this.headMaterial.map.dispose();
      this.headMaterial.map = tex;
      this.headMaterial.color.set(0xffffff);
      this.headMaterial.needsUpdate = true;
      this.currentInitial = a.initial;
    }
    this.label.setText(a.name);
  }

  dispose(): void {
    this.body.dispose();
    this.skin.dispose();
    if (this.headMaterial.map) this.headMaterial.map.dispose();
    this.headMaterial.dispose();
    this.label.dispose();
  }
}

function buildHeadTexture(bodyColor: string, initial: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(0, 0, size, size);

  // Myk vignette for å gjøre hodet mindre flatt
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.75);
  grad.addColorStop(0, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(size * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial.slice(0, 1).toUpperCase(), size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
