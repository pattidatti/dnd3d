import { BlockType } from './BlockTypes';
import type { VoxelWorld } from './VoxelWorld';

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    case bn: h = ((rn - gn) / d + 4) / 6; break;
  }
  return [h * 360, s, l];
}

function classifyPixel(
  r: number, g: number, b: number,
  iz: number, mapDepth: number,
): { type: BlockType; height: number } {
  const [h, s, l] = rgbToHsl(r, g, b);
  // iz=0 = bakgrunn (fjell/slott), iz=mapDepth-1 = forgrunn (gressmark)
  const dist = 1 - iz / (mapDepth - 1);

  // Vann
  if (h > 190 && h < 260 && s > 0.3) {
    return { type: BlockType.Water, height: 1 };
  }

  // Stein/grå — fjell, slott, klipper (lav metning)
  // Høyde: bakgrunnsfjell veldig høye (dist≈1 → +18), forgrunn lave (dist≈0 → +0)
  // Lysstyrke (l) gir ekstra høyde for lyse mursteinsflater
  if (s < 0.20) {
    const height = Math.max(1, Math.round(2 + l * 10 + dist * 18));
    return { type: BlockType.Stone, height };
  }

  // Brun/varm — landsby (trehus) og stier
  if (h > 10 && h < 65 && s > 0.08) {
    // Mettet, mørkt brunt → trehus (f.eks. norske stavbygninger)
    if (s > 0.15 && l > 0.20 && l < 0.55) {
      return { type: BlockType.Wood, height: 5 };
    }
    // Lys beige/tan → grusvei, flat
    return { type: BlockType.Dirt, height: 1 };
  }

  // Grønn — gressmark, alltid flat
  if (h > 55 && h < 165 && s > 0.15) {
    return { type: BlockType.Grass, height: 1 };
  }

  return { type: BlockType.Grass, height: 1 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export class MapGenerator {
  static async fromImage(
    world: VoxelWorld,
    imagePath: string,
    mapWidth = 200,
    mapDepth = 120,
  ): Promise<void> {
    const img = await loadImage(imagePath);

    const canvas = document.createElement('canvas');
    canvas.width = mapWidth;
    canvas.height = mapDepth;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;

    // Hopp over øverste 35 % (himmel), bruk bare landskapsregionen
    const skyFraction = 0.35;
    const srcY = img.naturalHeight * skyFraction;
    const srcH = img.naturalHeight * (1 - skyFraction);
    ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, 0, mapWidth, mapDepth);

    const { data } = ctx.getImageData(0, 0, mapWidth, mapDepth);

    const offsetX = -Math.floor(mapWidth / 2);
    const offsetZ = -Math.floor(mapDepth / 2);

    for (let iz = 0; iz < mapDepth; iz++) {
      for (let ix = 0; ix < mapWidth; ix++) {
        const i = (iz * mapWidth + ix) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const { type, height } = classifyPixel(r, g, b, iz, mapDepth);

        const wx = offsetX + ix;
        const wz = offsetZ + iz;

        for (let y = 0; y < height; y++) {
          // Trehus: solid Wood gjennom hele vegghøyden
          // Terreng: stein som kjerne, korrekt overflate på toppen
          let blockType: BlockType;
          if (type === BlockType.Wood) {
            blockType = BlockType.Wood;
          } else {
            blockType = y < height - 1 ? BlockType.Stone : type;
          }
          world.setBlock(wx, y, wz, blockType);
        }
      }
    }
  }
}
