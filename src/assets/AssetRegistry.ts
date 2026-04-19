/**
 * Katalog over alle GLTF-assets. Paths er relative til /public, så Vite serverer
 * dem direkte. Kategorier brukes av PropPlacer-toolbar.
 */

export type AssetCategory = 'vegetation' | 'terrain' | 'structure' | 'castle' | 'town' | 'character';

export interface AssetDef {
  key: string;        // unik nøkkel, brukt i PropState og InstancedPropRenderer
  url: string;        // relativ URL (servert av Vite)
  category: AssetCategory;
  label?: string;     // norsk visnings-navn for toolbar; faller tilbake til key hvis utelatt
}

const BASE = '/kenney';

// Vegetasjon: trær, kaktus, blomster, sopp, planter, gress, stubber, avlinger.
const VEGETATION: AssetDef[] = [
  // Trær (utvalg — mange varianter finnes, vi holder en nyttig delmengde for toolbaren).
  { key: 'tree_oak', url: `${BASE}/props/tree_oak.glb`, category: 'vegetation', label: 'Eiketre' },
  { key: 'tree_pineDefaultA', url: `${BASE}/props/tree_pineDefaultA.glb`, category: 'vegetation', label: 'Furu A' },
  { key: 'tree_pineDefaultB', url: `${BASE}/props/tree_pineDefaultB.glb`, category: 'vegetation', label: 'Furu B' },
  { key: 'tree_pineTallA', url: `${BASE}/props/tree_pineTallA.glb`, category: 'vegetation', label: 'Høy furu A' },
  { key: 'tree_pineTallB', url: `${BASE}/props/tree_pineTallB.glb`, category: 'vegetation', label: 'Høy furu B' },
  { key: 'tree_pineRoundA', url: `${BASE}/props/tree_pineRoundA.glb`, category: 'vegetation', label: 'Rund furu' },
  { key: 'tree_palm', url: `${BASE}/props/tree_palm.glb`, category: 'vegetation', label: 'Palme' },
  { key: 'tree_palmTall', url: `${BASE}/props/tree_palmTall.glb`, category: 'vegetation', label: 'Høy palme' },
  { key: 'tree_cone', url: `${BASE}/props/tree_cone.glb`, category: 'vegetation', label: 'Kjegletre' },
  { key: 'tree_default', url: `${BASE}/props/tree_default.glb`, category: 'vegetation', label: 'Løvtre' },
  { key: 'tree_detailed', url: `${BASE}/props/tree_detailed.glb`, category: 'vegetation', label: 'Detaljert tre' },
  { key: 'tree_fat', url: `${BASE}/props/tree_fat.glb`, category: 'vegetation', label: 'Busktre' },
  { key: 'tree_tall', url: `${BASE}/props/tree_tall.glb`, category: 'vegetation', label: 'Høyt tre' },
  { key: 'tree_small', url: `${BASE}/props/tree_small.glb`, category: 'vegetation', label: 'Lite tre' },
  { key: 'tree_blocks', url: `${BASE}/props/tree_blocks.glb`, category: 'vegetation', label: 'Blokktre' },
  { key: 'tree_plateau', url: `${BASE}/props/tree_plateau.glb`, category: 'vegetation', label: 'Platåtre' },
  // Kaktus
  { key: 'cactus_short', url: `${BASE}/props/cactus_short.glb`, category: 'vegetation', label: 'Kort kaktus' },
  { key: 'cactus_tall', url: `${BASE}/props/cactus_tall.glb`, category: 'vegetation', label: 'Høy kaktus' },
  // Stubber
  { key: 'stump_old', url: `${BASE}/props/stump_old.glb`, category: 'vegetation', label: 'Gammel stubbe' },
  { key: 'stump_round', url: `${BASE}/props/stump_round.glb`, category: 'vegetation', label: 'Rund stubbe' },
  { key: 'stump_square', url: `${BASE}/props/stump_square.glb`, category: 'vegetation', label: 'Firkantet stubbe' },
];

// Terreng: klipper, steiner, bakketiles, stier.
const TERRAIN: AssetDef[] = [
  { key: 'cliff_blockCave_rock', url: `${BASE}/props/cliff_blockCave_rock.glb`, category: 'terrain', label: 'Huleklippe' },
  { key: 'cliff_blockCave_stone', url: `${BASE}/props/cliff_blockCave_stone.glb`, category: 'terrain', label: 'Hulestein' },
  { key: 'cliff_blockDiagonal_rock', url: `${BASE}/props/cliff_blockDiagonal_rock.glb`, category: 'terrain', label: 'Skrå klippe' },
  { key: 'cliff_blockDiagonal_stone', url: `${BASE}/props/cliff_blockDiagonal_stone.glb`, category: 'terrain', label: 'Skrå steinklippe' },
  { key: 'stone_tallA', url: `${BASE}/props/stone_tallA.glb`, category: 'terrain', label: 'Høy stein A' },
  { key: 'stone_tallB', url: `${BASE}/props/stone_tallB.glb`, category: 'terrain', label: 'Høy stein B' },
  { key: 'stone_tallC', url: `${BASE}/props/stone_tallC.glb`, category: 'terrain', label: 'Høy stein C' },
];

// Bygg/struktur/props.
const STRUCTURE: AssetDef[] = [
  { key: 'bridge_stone', url: `${BASE}/props/bridge_stone.glb`, category: 'structure', label: 'Steinbro' },
  { key: 'bridge_wood', url: `${BASE}/props/bridge_wood.glb`, category: 'structure', label: 'Trebro' },
  { key: 'bridge_stoneRound', url: `${BASE}/props/bridge_stoneRound.glb`, category: 'structure', label: 'Buet steinbro' },
  { key: 'bridge_woodRound', url: `${BASE}/props/bridge_woodRound.glb`, category: 'structure', label: 'Buet trebro' },
  { key: 'tent_smallClosed', url: `${BASE}/props/tent_smallClosed.glb`, category: 'structure', label: 'Lite telt (lukket)' },
  { key: 'tent_smallOpen', url: `${BASE}/props/tent_smallOpen.glb`, category: 'structure', label: 'Lite telt (åpent)' },
  { key: 'tent_detailedClosed', url: `${BASE}/props/tent_detailedClosed.glb`, category: 'structure', label: 'Telt (detaljert)' },
  { key: 'campfire_logs', url: `${BASE}/props/campfire_logs.glb`, category: 'structure', label: 'Bål (trestokker)' },
  { key: 'campfire_stones', url: `${BASE}/props/campfire_stones.glb`, category: 'structure', label: 'Bål (steiner)' },
  { key: 'canoe', url: `${BASE}/props/canoe.glb`, category: 'structure', label: 'Kano' },
  { key: 'bed', url: `${BASE}/props/bed.glb`, category: 'structure', label: 'Seng' },
];

export interface CharacterClass {
  key: string;
  url: string;
  label: string;
}

export const CHARACTER_CLASSES: CharacterClass[] = [
  { key: 'Knight', url: `${BASE}/characters/Knight.glb`, label: 'Ridder' },
  { key: 'Barbarian', url: `${BASE}/characters/Barbarian.glb`, label: 'Barbar' },
  { key: 'Mage', url: `${BASE}/characters/Mage.glb`, label: 'Magiker' },
  { key: 'Ranger', url: `${BASE}/characters/Ranger.glb`, label: 'Jeger' },
  { key: 'Rogue', url: `${BASE}/characters/Rogue.glb`, label: 'Snikeskurk' },
  { key: 'Rogue_Hooded', url: `${BASE}/characters/Rogue_Hooded.glb`, label: 'Hettekledd skurk' },
];

export const ANIMATION_GLBS = {
  general: `${BASE}/animations/Rig_Medium_General.glb`,
  movement: `${BASE}/animations/Rig_Medium_MovementBasic.glb`,
};

const CASTLE_BASE = '/kenney/castle';

// Slottskit: murer, tårn, porter, beleiringsmaskin, broer, flagg, trapper.
const CASTLE: AssetDef[] = [
  // Murer
  { key: 'castle_wall', url: `${CASTLE_BASE}/wall.glb`, category: 'castle', label: 'Mur' },
  { key: 'castle_wall_corner', url: `${CASTLE_BASE}/wall-corner.glb`, category: 'castle', label: 'Mur hjørne' },
  { key: 'castle_wall_half', url: `${CASTLE_BASE}/wall-half.glb`, category: 'castle', label: 'Mur halv' },
  { key: 'castle_wall_doorway', url: `${CASTLE_BASE}/wall-doorway.glb`, category: 'castle', label: 'Mur dørgang' },
  { key: 'castle_wall_narrow', url: `${CASTLE_BASE}/wall-narrow.glb`, category: 'castle', label: 'Smal mur' },
  { key: 'castle_wall_narrow_corner', url: `${CASTLE_BASE}/wall-narrow-corner.glb`, category: 'castle', label: 'Smal mur hjørne' },
  { key: 'castle_wall_narrow_gate', url: `${CASTLE_BASE}/wall-narrow-gate.glb`, category: 'castle', label: 'Smal port' },
  { key: 'castle_wall_corner_half', url: `${CASTLE_BASE}/wall-corner-half.glb`, category: 'castle', label: 'Mur halvhjørne' },
  { key: 'castle_wall_pillar', url: `${CASTLE_BASE}/wall-pillar.glb`, category: 'castle', label: 'Murpillar' },
  { key: 'castle_wall_stud', url: `${CASTLE_BASE}/wall-stud.glb`, category: 'castle', label: 'Murknupp' },
  // Tårn
  { key: 'castle_tower_square', url: `${CASTLE_BASE}/tower-square.glb`, category: 'castle', label: 'Firkanttårn' },
  { key: 'castle_tower_square_base', url: `${CASTLE_BASE}/tower-square-base.glb`, category: 'castle', label: 'Tårn base' },
  { key: 'castle_tower_square_mid', url: `${CASTLE_BASE}/tower-square-mid.glb`, category: 'castle', label: 'Tårn midtstykke' },
  { key: 'castle_tower_square_roof', url: `${CASTLE_BASE}/tower-square-roof.glb`, category: 'castle', label: 'Tårntak' },
  { key: 'castle_tower_square_top', url: `${CASTLE_BASE}/tower-square-top.glb`, category: 'castle', label: 'Tårn topp' },
  { key: 'castle_tower_hex_base', url: `${CASTLE_BASE}/tower-hexagon-base.glb`, category: 'castle', label: 'Sekskant tårn' },
  { key: 'castle_tower_hex_mid', url: `${CASTLE_BASE}/tower-hexagon-mid.glb`, category: 'castle', label: 'Sekskant midtstykke' },
  { key: 'castle_tower_hex_roof', url: `${CASTLE_BASE}/tower-hexagon-roof.glb`, category: 'castle', label: 'Sekskant tak' },
  { key: 'castle_tower_top', url: `${CASTLE_BASE}/tower-top.glb`, category: 'castle', label: 'Tårn toppdel' },
  // Porter og dører
  { key: 'castle_gate', url: `${CASTLE_BASE}/gate.glb`, category: 'castle', label: 'Port' },
  { key: 'castle_metal_gate', url: `${CASTLE_BASE}/metal-gate.glb`, category: 'castle', label: 'Jernport' },
  { key: 'castle_door', url: `${CASTLE_BASE}/door.glb`, category: 'castle', label: 'Dør' },
  // Broer
  { key: 'castle_bridge_draw', url: `${CASTLE_BASE}/bridge-draw.glb`, category: 'castle', label: 'Vindebro' },
  { key: 'castle_bridge_straight', url: `${CASTLE_BASE}/bridge-straight.glb`, category: 'castle', label: 'Rettbro' },
  { key: 'castle_bridge_pillar', url: `${CASTLE_BASE}/bridge-straight-pillar.glb`, category: 'castle', label: 'Bropillar' },
  // Trapper
  { key: 'castle_stairs_stone', url: `${CASTLE_BASE}/stairs-stone.glb`, category: 'castle', label: 'Steintrapp' },
  { key: 'castle_stairs_stone_sq', url: `${CASTLE_BASE}/stairs-stone-square.glb`, category: 'castle', label: 'Firk. steintrapp' },
  // Beleiringsmaskiner
  { key: 'castle_catapult', url: `${CASTLE_BASE}/siege-catapult.glb`, category: 'castle', label: 'Katapult' },
  { key: 'castle_trebuchet', url: `${CASTLE_BASE}/siege-trebuchet.glb`, category: 'castle', label: 'Trebuchet' },
  { key: 'castle_ballista', url: `${CASTLE_BASE}/siege-ballista.glb`, category: 'castle', label: 'Ballista' },
  { key: 'castle_siege_tower', url: `${CASTLE_BASE}/siege-tower.glb`, category: 'castle', label: 'Beleir.tårn' },
  { key: 'castle_siege_ram', url: `${CASTLE_BASE}/siege-ram.glb`, category: 'castle', label: 'Beleir.vær' },
  // Flagg
  { key: 'castle_flag', url: `${CASTLE_BASE}/flag.glb`, category: 'castle', label: 'Flagg' },
  { key: 'castle_flag_banner_long', url: `${CASTLE_BASE}/flag-banner-long.glb`, category: 'castle', label: 'Langt banner' },
  { key: 'castle_flag_banner_short', url: `${CASTLE_BASE}/flag-banner-short.glb`, category: 'castle', label: 'Kort banner' },
  { key: 'castle_flag_pennant', url: `${CASTLE_BASE}/flag-pennant.glb`, category: 'castle', label: 'Vimpel' },
  // Natur
  { key: 'castle_tree_large', url: `${CASTLE_BASE}/tree-large.glb`, category: 'castle', label: 'Stort tre' },
  { key: 'castle_tree_small', url: `${CASTLE_BASE}/tree-small.glb`, category: 'castle', label: 'Lite tre' },
  { key: 'castle_tree_trunk', url: `${CASTLE_BASE}/tree-trunk.glb`, category: 'castle', label: 'Trestamme' },
  { key: 'castle_rocks_large', url: `${CASTLE_BASE}/rocks-large.glb`, category: 'castle', label: 'Store steiner' },
  { key: 'castle_rocks_small', url: `${CASTLE_BASE}/rocks-small.glb`, category: 'castle', label: 'Små steiner' },
];

const TOWN_BASE = '/kenney/town';

// Fantasybyen: bygningsvegger, tak, fontener, markedsboder, gjerder, hekker, møller, trapper.
const TOWN: AssetDef[] = [
  // Steinvegger
  { key: 'town_wall', url: `${TOWN_BASE}/wall.glb`, category: 'town', label: 'Steinvegg' },
  { key: 'town_wall_corner', url: `${TOWN_BASE}/wall-corner.glb`, category: 'town', label: 'Vegg hjørne' },
  { key: 'town_wall_half', url: `${TOWN_BASE}/wall-half.glb`, category: 'town', label: 'Vegg halv' },
  { key: 'town_wall_door', url: `${TOWN_BASE}/wall-door.glb`, category: 'town', label: 'Vegg dør' },
  { key: 'town_wall_arch', url: `${TOWN_BASE}/wall-arch.glb`, category: 'town', label: 'Vegg bue' },
  { key: 'town_wall_window_glass', url: `${TOWN_BASE}/wall-window-glass.glb`, category: 'town', label: 'Vindusvegg' },
  { key: 'town_wall_window_shutters', url: `${TOWN_BASE}/wall-window-shutters.glb`, category: 'town', label: 'Lemmesvindu' },
  { key: 'town_wall_doorway_square', url: `${TOWN_BASE}/wall-doorway-square.glb`, category: 'town', label: 'Dørgang' },
  { key: 'town_wall_curved', url: `${TOWN_BASE}/wall-curved.glb`, category: 'town', label: 'Buet vegg' },
  // Trevegger
  { key: 'town_wall_wood', url: `${TOWN_BASE}/wall-wood.glb`, category: 'town', label: 'Trevegg' },
  { key: 'town_wall_wood_corner', url: `${TOWN_BASE}/wall-wood-corner.glb`, category: 'town', label: 'Trevegg hjørne' },
  { key: 'town_wall_wood_door', url: `${TOWN_BASE}/wall-wood-door.glb`, category: 'town', label: 'Trevegg dør' },
  { key: 'town_wall_wood_window_glass', url: `${TOWN_BASE}/wall-wood-window-glass.glb`, category: 'town', label: 'Tre vindusvegg' },
  { key: 'town_wall_wood_curved', url: `${TOWN_BASE}/wall-wood-curved.glb`, category: 'town', label: 'Buet trevegg' },
  // Tak
  { key: 'town_roof', url: `${TOWN_BASE}/roof.glb`, category: 'town', label: 'Tak' },
  { key: 'town_roof_corner', url: `${TOWN_BASE}/roof-corner.glb`, category: 'town', label: 'Takhjørne' },
  { key: 'town_roof_gable', url: `${TOWN_BASE}/roof-gable.glb`, category: 'town', label: 'Gavltak' },
  { key: 'town_roof_gable_end', url: `${TOWN_BASE}/roof-gable-end.glb`, category: 'town', label: 'Gavl ende' },
  { key: 'town_roof_flat', url: `${TOWN_BASE}/roof-flat.glb`, category: 'town', label: 'Flatt tak' },
  { key: 'town_roof_point', url: `${TOWN_BASE}/roof-point.glb`, category: 'town', label: 'Spisstak' },
  { key: 'town_roof_high', url: `${TOWN_BASE}/roof-high.glb`, category: 'town', label: 'Høyt tak' },
  { key: 'town_roof_high_gable', url: `${TOWN_BASE}/roof-high-gable.glb`, category: 'town', label: 'Høyt gavltak' },
  { key: 'town_roof_window', url: `${TOWN_BASE}/roof-window.glb`, category: 'town', label: 'Takvindu' },
  // Fontener
  { key: 'town_fountain_round', url: `${TOWN_BASE}/fountain-round.glb`, category: 'town', label: 'Rund fontene' },
  { key: 'town_fountain_square', url: `${TOWN_BASE}/fountain-square.glb`, category: 'town', label: 'Firk. fontene' },
  { key: 'town_fountain_center', url: `${TOWN_BASE}/fountain-center.glb`, category: 'town', label: 'Fontenemidte' },
  { key: 'town_fountain_corner', url: `${TOWN_BASE}/fountain-corner.glb`, category: 'town', label: 'Fontenehjørne' },
  // Markedsboder og inventar
  { key: 'town_stall', url: `${TOWN_BASE}/stall.glb`, category: 'town', label: 'Markedsbod' },
  { key: 'town_stall_green', url: `${TOWN_BASE}/stall-green.glb`, category: 'town', label: 'Grønn bod' },
  { key: 'town_stall_red', url: `${TOWN_BASE}/stall-red.glb`, category: 'town', label: 'Rød bod' },
  { key: 'town_stall_bench', url: `${TOWN_BASE}/stall-bench.glb`, category: 'town', label: 'Benk' },
  { key: 'town_stall_stool', url: `${TOWN_BASE}/stall-stool.glb`, category: 'town', label: 'Krakk' },
  { key: 'town_cart', url: `${TOWN_BASE}/cart.glb`, category: 'town', label: 'Kjerre' },
  { key: 'town_cart_high', url: `${TOWN_BASE}/cart-high.glb`, category: 'town', label: 'Høy kjerre' },
  // Gjerder og hekker
  { key: 'town_fence', url: `${TOWN_BASE}/fence.glb`, category: 'town', label: 'Gjerde' },
  { key: 'town_fence_gate', url: `${TOWN_BASE}/fence-gate.glb`, category: 'town', label: 'Gjerdeport' },
  { key: 'town_fence_curved', url: `${TOWN_BASE}/fence-curved.glb`, category: 'town', label: 'Buet gjerde' },
  { key: 'town_fence_broken', url: `${TOWN_BASE}/fence-broken.glb`, category: 'town', label: 'Ødelagt gjerde' },
  { key: 'town_hedge', url: `${TOWN_BASE}/hedge.glb`, category: 'town', label: 'Hekk' },
  { key: 'town_hedge_large', url: `${TOWN_BASE}/hedge-large.glb`, category: 'town', label: 'Stor hekk' },
  { key: 'town_hedge_gate', url: `${TOWN_BASE}/hedge-gate.glb`, category: 'town', label: 'Hekkport' },
  { key: 'town_hedge_curved', url: `${TOWN_BASE}/hedge-curved.glb`, category: 'town', label: 'Buet hekk' },
  // Trapper
  { key: 'town_stairs_stone', url: `${TOWN_BASE}/stairs-stone.glb`, category: 'town', label: 'Steintrapp' },
  { key: 'town_stairs_wood', url: `${TOWN_BASE}/stairs-wood.glb`, category: 'town', label: 'Tretrapp' },
  { key: 'town_stairs_wide_stone', url: `${TOWN_BASE}/stairs-wide-stone.glb`, category: 'town', label: 'Bred steintrapp' },
  { key: 'town_stairs_wide_wood', url: `${TOWN_BASE}/stairs-wide-wood.glb`, category: 'town', label: 'Bred tretrapp' },
  // Møller og mekanikk
  { key: 'town_windmill', url: `${TOWN_BASE}/windmill.glb`, category: 'town', label: 'Vindmølle' },
  { key: 'town_watermill', url: `${TOWN_BASE}/watermill.glb`, category: 'town', label: 'Vannmølle' },
  { key: 'town_wheel', url: `${TOWN_BASE}/wheel.glb`, category: 'town', label: 'Hjul' },
  // Dekor
  { key: 'town_lantern', url: `${TOWN_BASE}/lantern.glb`, category: 'town', label: 'Lykt' },
  { key: 'town_banner_green', url: `${TOWN_BASE}/banner-green.glb`, category: 'town', label: 'Grønt banner' },
  { key: 'town_banner_red', url: `${TOWN_BASE}/banner-red.glb`, category: 'town', label: 'Rødt banner' },
  { key: 'town_pillar_stone', url: `${TOWN_BASE}/pillar-stone.glb`, category: 'town', label: 'Steinpillar' },
  { key: 'town_pillar_wood', url: `${TOWN_BASE}/pillar-wood.glb`, category: 'town', label: 'Trepillar' },
  { key: 'town_chimney', url: `${TOWN_BASE}/chimney.glb`, category: 'town', label: 'Pipe' },
  { key: 'town_balcony_wall', url: `${TOWN_BASE}/balcony-wall.glb`, category: 'town', label: 'Balkong' },
  // Natur
  { key: 'town_tree', url: `${TOWN_BASE}/tree.glb`, category: 'town', label: 'Tre' },
  { key: 'town_tree_high', url: `${TOWN_BASE}/tree-high.glb`, category: 'town', label: 'Høyt tre' },
  { key: 'town_tree_crooked', url: `${TOWN_BASE}/tree-crooked.glb`, category: 'town', label: 'Krokete tre' },
  { key: 'town_tree_high_round', url: `${TOWN_BASE}/tree-high-round.glb`, category: 'town', label: 'Rund topp' },
  { key: 'town_rock_large', url: `${TOWN_BASE}/rock-large.glb`, category: 'town', label: 'Stor stein' },
  { key: 'town_rock_small', url: `${TOWN_BASE}/rock-small.glb`, category: 'town', label: 'Liten stein' },
  { key: 'town_rock_wide', url: `${TOWN_BASE}/rock-wide.glb`, category: 'town', label: 'Bred stein' },
];

const ALL_PROPS: AssetDef[] = [...VEGETATION, ...TERRAIN, ...STRUCTURE, ...CASTLE, ...TOWN];
const PROP_BY_KEY = new Map<string, AssetDef>();
for (const a of ALL_PROPS) PROP_BY_KEY.set(a.key, a);

export function getProp(key: string): AssetDef | undefined {
  return PROP_BY_KEY.get(key);
}

export function propsByCategory(category: AssetCategory): AssetDef[] {
  return ALL_PROPS.filter((a) => a.category === category);
}

export function allProps(): AssetDef[] {
  return ALL_PROPS;
}
