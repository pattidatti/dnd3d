import type { BiomeId } from '../world/Terrain';
import type { Tag } from './AssetTags';

/**
 * Map-blueprint: høy-nivå struktur som beskriver hva som skal genereres.
 * Generator-funksjoner produserer en Blueprint, og MapGenerator "fyller" den
 * med konkrete props/terrain-mutasjoner.
 *
 * Ingen Three.js eller Rapier her — ren data.
 */

export interface Point2 {
  x: number;
  z: number;
}

export interface FocalPoint {
  x: number;
  z: number;
  /** Hovedasset på focal point (f.eks. 'fountain-base'). */
  tag: Tag;
  /** Valgfrie støtte-assets rundt focal point (f.eks. 'fountain-corner'). */
  surround?: Array<{ tag: Tag; offsetX: number; offsetZ: number; rotY: number; scale?: number }>;
}

export interface PathSegment {
  /** Punkter i rekkefølge — generator skriver Path-biome langs linjene. */
  points: Point2[];
  /** Hvor bred stien er, i celler (typisk 1-2). */
  widthCells: number;
}

export interface Cluster {
  cx: number;
  cz: number;
  radius: number;
  /** Hovedtag — flertallet av assets henter herfra. */
  primaryTag: Tag;
  /** Sekundære tags som strøs inn (sopp, småstein, etc.). */
  secondaryTags?: Tag[];
  /** Antall props per klynge. */
  count: { min: number; max: number };
  /** Min avstand mellom assets (i world-units). */
  spacing: number;
  /** Scale-intervall — overkjør pickWithVariation-default. */
  scaleRange?: [number, number];
}

/** En hardkodet, deterministisk plassering — for hus, focal points, etc. */
export interface PlacedAsset {
  x: number;
  z: number;
  rotY: number;
  scale: number;
  tag: Tag;
}

/** Story-prop: en detalj som antyder narrativ. Henter fra suggestedTag. */
export interface StoryPropSlot {
  x: number;
  z: number;
  suggestedTag: Tag;
  /** Beskrivelse for debugging — påvirker ikke rendering. */
  description: string;
  rotY?: number;
  scale?: number;
}

export interface HeightBump {
  cx: number;
  cz: number;
  /** Radius i celler. */
  radius: number;
  /** Høyde i units (positiv = bump, negativ = søkk). */
  height: number;
}

export interface BiomePatch {
  /** Senter i celle-koordinater. */
  cx: number;
  cz: number;
  /** Radius i celler. */
  radius: number;
  biome: BiomeId;
}

export interface Blueprint {
  /** Beskrivende navn for toast-meldinger. */
  label: string;
  focalPoint: FocalPoint;
  paths: PathSegment[];
  clusters: Cluster[];
  /** Strukturer (hus, vegger, møller) som er deterministisk plassert. */
  structures: PlacedAsset[];
  /** Story-props plasseres til slutt. */
  storyProps: StoryPropSlot[];
  /** Terrain-justering. */
  terrain: {
    /** Base biome som settes på alle celler før patches. */
    baseBiome: BiomeId;
    heightBumps: HeightBump[];
    biomePatches: BiomePatch[];
  };
}
