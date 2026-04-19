/**
 * Finkornet tagging av assets ut over de grove kategoriene i AssetRegistry.
 * Manuelt definert tabell — forutsigbart, ikke smart deteksjon.
 *
 * Brukes av AssetPicker for å velge passende asset i en gitt kontekst
 * (f.eks. "et tre i en furuskog-klynge" eller "en vegg for et lite hus").
 */

export type Tag =
  // Vegetasjon
  | 'tree-coniferous'
  | 'tree-deciduous'
  | 'tree-palm'
  | 'tree-stylized'
  | 'cactus'
  | 'stump'
  | 'bush'
  // Stein og terreng
  | 'stone-tall'
  | 'stone-cluster'
  | 'rock-large'
  | 'rock-small'
  | 'cliff'
  // Hus-komponenter (modul-bygg)
  | 'wall-stone-corner'
  | 'wall-stone-side'
  | 'wall-stone-door'
  | 'wall-stone-window'
  | 'wall-wood-corner'
  | 'wall-wood-side'
  | 'wall-wood-door'
  | 'wall-wood-window'
  | 'roof-low'
  | 'roof-high'
  | 'roof-gable'
  | 'roof-point'
  | 'chimney'
  // Sentrum / focal points
  | 'fountain-base'
  | 'fountain-center'
  | 'fountain-corner'
  | 'campfire'
  | 'firepit'
  | 'altar-stone'
  // Marked
  | 'market-stall'
  | 'cart'
  | 'bench'
  | 'stool'
  // Avgrensning
  | 'fence'
  | 'fence-broken'
  | 'fence-gate'
  | 'hedge'
  | 'hedge-large'
  | 'hedge-gate'
  // Dekor / story props
  | 'lantern'
  | 'banner'
  | 'pillar-stone'
  | 'pillar-wood'
  | 'flag'
  | 'broken-fence'
  // Telt og leirer
  | 'tent'
  | 'bed'
  // Slott
  | 'castle-wall-side'
  | 'castle-wall-corner'
  | 'castle-wall-door'
  | 'castle-tower-square'
  | 'castle-tower-hex'
  | 'castle-gate'
  | 'castle-flag'
  | 'castle-stairs'
  // Møller
  | 'windmill'
  | 'watermill'
  // Broer
  | 'bridge';

/**
 * Tag → kandidat-asset-keys (matcher AssetRegistry).
 * Vekter (valgfritt) gis i ASSET_WEIGHTS for å gjøre vanlige assets vanligere.
 */
const TAG_ASSETS: Record<Tag, string[]> = {
  'tree-coniferous': [
    'tree_pineDefaultA', 'tree_pineDefaultB',
    'tree_pineTallA', 'tree_pineTallB',
    'tree_pineRoundA', 'tree_cone',
  ],
  'tree-deciduous': [
    'tree_oak', 'tree_default', 'tree_detailed',
    'tree_fat', 'tree_tall', 'tree_small',
    'tree_blocks', 'tree_plateau',
  ],
  'tree-palm': ['tree_palm', 'tree_palmTall'],
  'tree-stylized': ['town_tree', 'town_tree_high', 'town_tree_crooked', 'town_tree_high_round'],
  cactus: ['cactus_short', 'cactus_tall'],
  stump: ['stump_old', 'stump_round', 'stump_square'],
  bush: ['town_hedge', 'town_hedge_curved'], // ingen ekte busk-asset; bruk små hekker
  'stone-tall': ['stone_tallA', 'stone_tallB', 'stone_tallC'],
  'stone-cluster': ['castle_rocks_small', 'castle_rocks_large', 'town_rock_small', 'town_rock_wide'],
  'rock-large': ['castle_rocks_large', 'town_rock_large'],
  'rock-small': ['castle_rocks_small', 'town_rock_small'],
  cliff: [
    'cliff_blockCave_rock', 'cliff_blockCave_stone',
    'cliff_blockDiagonal_rock', 'cliff_blockDiagonal_stone',
  ],
  'wall-stone-corner': ['town_wall_corner'],
  'wall-stone-side': ['town_wall'],
  'wall-stone-door': ['town_wall_door'],
  'wall-stone-window': ['town_wall_window_glass', 'town_wall_window_shutters'],
  'wall-wood-corner': ['town_wall_wood_corner'],
  'wall-wood-side': ['town_wall_wood'],
  'wall-wood-door': ['town_wall_wood_door'],
  'wall-wood-window': ['town_wall_wood_window_glass'],
  'roof-low': ['town_roof'],
  'roof-high': ['town_roof_high'],
  'roof-gable': ['town_roof_gable'],
  'roof-point': ['town_roof_point'],
  chimney: ['town_chimney'],
  'fountain-base': ['town_fountain_round', 'town_fountain_square'],
  'fountain-center': ['town_fountain_center'],
  'fountain-corner': ['town_fountain_corner'],
  campfire: ['campfire_logs', 'campfire_stones'],
  firepit: ['campfire_stones'],
  'altar-stone': ['stone_tallB'],
  'market-stall': ['town_stall', 'town_stall_green', 'town_stall_red'],
  cart: ['town_cart', 'town_cart_high'],
  bench: ['town_stall_bench'],
  stool: ['town_stall_stool'],
  fence: ['town_fence', 'town_fence_curved'],
  'fence-broken': ['town_fence_broken'],
  'fence-gate': ['town_fence_gate'],
  hedge: ['town_hedge', 'town_hedge_curved'],
  'hedge-large': ['town_hedge_large'],
  'hedge-gate': ['town_hedge_gate'],
  lantern: ['town_lantern'],
  banner: ['town_banner_green', 'town_banner_red'],
  'pillar-stone': ['town_pillar_stone'],
  'pillar-wood': ['town_pillar_wood'],
  flag: ['castle_flag', 'castle_flag_pennant'],
  'broken-fence': ['town_fence_broken'],
  tent: ['tent_smallClosed', 'tent_smallOpen', 'tent_detailedClosed'],
  bed: ['bed'],
  'castle-wall-side': ['castle_wall', 'castle_wall_half'],
  'castle-wall-corner': ['castle_wall_corner'],
  'castle-wall-door': ['castle_wall_doorway'],
  'castle-tower-square': ['castle_tower_square'],
  'castle-tower-hex': ['castle_tower_hex_base'],
  'castle-gate': ['castle_gate', 'castle_metal_gate'],
  'castle-flag': ['castle_flag', 'castle_flag_banner_long', 'castle_flag_banner_short', 'castle_flag_pennant'],
  'castle-stairs': ['castle_stairs_stone', 'castle_stairs_stone_sq'],
  windmill: ['town_windmill'],
  watermill: ['town_watermill'],
  bridge: ['bridge_stone', 'bridge_wood', 'bridge_stoneRound', 'bridge_woodRound'],
};

/**
 * Per-asset vekter for weightedChoice. Mangler man en oppføring brukes 1.0.
 * Brukes for å gjøre "rare" assets sjeldnere, og "vanlige" hyppigere.
 */
const ASSET_WEIGHTS: Record<string, number> = {
  // Furuskog: lange furuer er litt vanligere enn runde
  tree_pineTallA: 1.5,
  tree_pineTallB: 1.5,
  tree_pineDefaultA: 1.2,
  tree_pineDefaultB: 1.2,
  tree_pineRoundA: 0.8,
  tree_cone: 0.6,
  // Løvskog: eik og default vanligst
  tree_oak: 1.5,
  tree_default: 1.3,
  tree_tall: 1.2,
  tree_blocks: 0.5,
  tree_plateau: 0.5,
  // Markedsboder: nøytral er vanligst
  town_stall: 1.5,
  town_stall_red: 0.8,
  town_stall_green: 0.8,
  // Vegger: hele vegger vanligere enn halve
  town_wall: 1.5,
  town_wall_half: 0.6,
  // Telt: små vanligst
  tent_smallClosed: 1.3,
  tent_smallOpen: 1.3,
  tent_detailedClosed: 0.8,
};

export function assetsForTag(tag: Tag): string[] {
  return TAG_ASSETS[tag];
}

export function weightFor(assetKey: string): number {
  return ASSET_WEIGHTS[assetKey] ?? 1.0;
}
