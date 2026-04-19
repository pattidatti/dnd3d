import { type Rng } from './Rng';
import { assetsForTag, weightFor, type Tag } from './AssetTags';

/**
 * Velger asset-key for en gitt tag. Vekter brukes slik at vanlige assets dukker opp oftere.
 */
export function pick(tag: Tag, rng: Rng): string {
  const candidates = assetsForTag(tag);
  if (candidates.length === 0) {
    throw new Error(`No assets defined for tag '${tag}'`);
  }
  const weights = candidates.map((c) => weightFor(c));
  return rng.weightedChoice(candidates, weights);
}

export interface PickedAsset {
  key: string;
  scale: number;
  rotY: number;
}

/**
 * Velger asset + tilfeldig scale i et gitt intervall + 45°-rotasjon.
 * scaleRange default [4.5, 5.5] passer for de fleste props (Kenney/KayKit-skala).
 */
export function pickWithVariation(
  tag: Tag,
  rng: Rng,
  scaleRange: [number, number] = [4.5, 5.5],
): PickedAsset {
  return {
    key: pick(tag, rng),
    scale: rng.range(scaleRange[0], scaleRange[1]),
    rotY: rng.rot45(),
  };
}
