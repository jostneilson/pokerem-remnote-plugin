/**
 * Route Finds — exploration-style item discoveries while studying.
 * Biome comes from the current battle scene index; loot is weighted by tier + soft need bias.
 * Designed for future hooks: party passives, streak bonuses, event tables (context bag on roll calls).
 */
import type { ItemId } from '../data/items';
import { ITEM_BY_ID } from '../data/items';
import type { PokeRemGameState, RouteFindNoticePayload } from '../state/model';
import { BATTLE_SCENE_COUNT, normalizeBattleSceneIndex } from './battleAmbience';

export type RouteBiome =
  | 'forest'
  | 'grassland'
  | 'mountain'
  | 'cave'
  | 'cave_fire'
  | 'cave_mystic'
  | 'ice'
  | 'sand'
  | 'water'
  | 'electric'
  | 'mist'
  | 'urban'
  | 'psychic'
  | 'spooky';

type LootTier = 'common' | 'uncommon' | 'rare' | 'jackpot';

type WeightRow = [ItemId, number];

function sceneOrderIndex(sceneIndex: number): number {
  return normalizeBattleSceneIndex(sceneIndex) % BATTLE_SCENE_COUNT;
}

/** Maps Team Aqua scene order (see battleAmbience SCENES[]) to route biome. */
export function sceneIndexToRouteBiome(sceneIndex: number): RouteBiome {
  const i = sceneOrderIndex(sceneIndex);
  const table: RouteBiome[] = [
    'forest',
    'grassland',
    'grassland',
    'grassland',
    'mountain',
    'cave',
    'cave_fire',
    'cave_mystic',
    'ice',
    'sand',
    'water',
    'water',
    'electric',
    'mist',
    'urban',
    'urban',
    'psychic',
    'spooky',
    'spooky',
  ];
  return table[i] ?? 'grassland';
}

const BASE_COMMON: WeightRow[] = [
  ['poke-ball', 34],
  ['potion', 30],
  ['oran-berry', 24],
  ['great-ball', 12],
];

const BASE_UNCOMMON: WeightRow[] = [
  ['great-ball', 28],
  ['super-potion', 26],
  ['potion', 18],
  ['oran-berry', 14],
  ['revive', 10],
  ['ultra-ball', 4],
];

const BASE_RARE: WeightRow[] = [
  ['ultra-ball', 22],
  ['super-potion', 20],
  ['max-potion', 18],
  ['revive', 18],
  ['rare-candy', 12],
  ['moon-stone', 10],
];

const BASE_JACKPOT: WeightRow[] = [
  ['rare-candy', 28],
  ['ultra-ball', 24],
  ['max-potion', 20],
  ['moon-stone', 14],
  ['fire-stone', 6],
  ['water-stone', 6],
  ['thunder-stone', 6],
  ['leaf-stone', 6],
];

/** Extra weight by biome — merged onto base tier tables. */
const BIOME_COMMON: Record<RouteBiome, WeightRow[]> = {
  forest: [
    ['oran-berry', 14],
    ['leaf-stone', 6],
    ['great-ball', 8],
  ],
  grassland: [
    ['oran-berry', 12],
    ['poke-ball', 10],
    ['great-ball', 6],
  ],
  mountain: [
    ['super-potion', 10],
    ['revive', 6],
    ['great-ball', 8],
  ],
  cave: [
    ['super-potion', 8],
    ['revive', 10],
    ['great-ball', 6],
  ],
  cave_fire: [
    ['super-potion', 12],
    ['fire-stone', 5],
    ['great-ball', 6],
  ],
  cave_mystic: [
    ['moon-stone', 8],
    ['great-ball', 8],
    ['oran-berry', 6],
  ],
  ice: [
    ['super-potion', 10],
    ['max-potion', 4],
    ['oran-berry', 6],
  ],
  sand: [
    ['great-ball', 10],
    ['super-potion', 6],
    ['thunder-stone', 4],
  ],
  water: [
    ['great-ball', 12],
    ['water-stone', 6],
    ['super-potion', 8],
  ],
  electric: [
    ['great-ball', 10],
    ['thunder-stone', 6],
    ['super-potion', 8],
  ],
  mist: [
    ['great-ball', 8],
    ['moon-stone', 6],
    ['oran-berry', 6],
  ],
  urban: [
    ['poke-ball', 12],
    ['great-ball', 10],
    ['potion', 10],
    ['super-potion', 6],
  ],
  psychic: [
    ['moon-stone', 10],
    ['great-ball', 8],
    ['oran-berry', 6],
  ],
  spooky: [
    ['moon-stone', 8],
    ['ultra-ball', 6],
    ['revive', 6],
    ['oran-berry', 6],
  ],
};

const BIOME_UNCOMMON: Record<RouteBiome, WeightRow[]> = {
  forest: [['leaf-stone', 10], ['super-potion', 8], ['revive', 6]],
  grassland: [['super-potion', 10], ['great-ball', 12], ['revive', 6]],
  mountain: [['max-potion', 8], ['revive', 10], ['ultra-ball', 6]],
  cave: [['revive', 14], ['ultra-ball', 8], ['super-potion', 8]],
  cave_fire: [['fire-stone', 12], ['max-potion', 8], ['ultra-ball', 6]],
  cave_mystic: [['moon-stone', 12], ['ultra-ball', 10], ['rare-candy', 6]],
  ice: [['max-potion', 14], ['super-potion', 10], ['revive', 6]],
  sand: [['ultra-ball', 8], ['thunder-stone', 10], ['super-potion', 8]],
  water: [['water-stone', 12], ['ultra-ball', 10], ['max-potion', 6]],
  electric: [['thunder-stone', 12], ['ultra-ball', 10], ['max-potion', 6]],
  mist: [['ultra-ball', 10], ['moon-stone', 10], ['rare-candy', 6]],
  urban: [['ultra-ball', 8], ['super-potion', 12], ['revive', 10]],
  psychic: [['rare-candy', 10], ['moon-stone', 12], ['ultra-ball', 8]],
  spooky: [['rare-candy', 10], ['ultra-ball', 12], ['moon-stone', 10]],
};

const BIOME_RARE: Record<RouteBiome, WeightRow[]> = {
  forest: [['leaf-stone', 12], ['max-potion', 10], ['rare-candy', 8]],
  grassland: [['rare-candy', 10], ['ultra-ball', 12], ['max-potion', 8]],
  mountain: [['max-potion', 14], ['rare-candy', 10], ['ultra-ball', 10]],
  cave: [['max-potion', 12], ['moon-stone', 12], ['rare-candy', 10]],
  cave_fire: [['fire-stone', 14], ['max-potion', 12], ['rare-candy', 10]],
  cave_mystic: [['rare-candy', 14], ['moon-stone', 12], ['ultra-ball', 10]],
  ice: [['max-potion', 16], ['rare-candy', 12], ['ultra-ball', 8]],
  sand: [['ultra-ball', 14], ['thunder-stone', 12], ['rare-candy', 8]],
  water: [['water-stone', 14], ['max-potion', 12], ['ultra-ball', 10]],
  electric: [['thunder-stone', 14], ['ultra-ball', 14], ['max-potion', 10]],
  mist: [['ultra-ball', 14], ['rare-candy', 14], ['moon-stone', 10]],
  urban: [['ultra-ball', 12], ['max-potion', 12], ['rare-candy', 10]],
  psychic: [['rare-candy', 16], ['moon-stone', 12], ['ultra-ball', 10]],
  spooky: [['rare-candy', 16], ['ultra-ball', 12], ['moon-stone', 12]],
};

const BIOME_JACKPOT: Record<RouteBiome, WeightRow[]> = {
  forest: [['rare-candy', 16], ['leaf-stone', 12], ['max-potion', 10]],
  grassland: [['rare-candy', 18], ['ultra-ball', 14]],
  mountain: [['rare-candy', 14], ['max-potion', 16], ['fire-stone', 8]],
  cave: [['rare-candy', 16], ['moon-stone', 14], ['max-potion', 12]],
  cave_fire: [['fire-stone', 18], ['rare-candy', 14], ['max-potion', 12]],
  cave_mystic: [['rare-candy', 20], ['moon-stone', 16]],
  ice: [['max-potion', 18], ['rare-candy', 16]],
  sand: [['thunder-stone', 16], ['rare-candy', 14], ['ultra-ball', 12]],
  water: [['water-stone', 18], ['rare-candy', 14], ['max-potion', 12]],
  electric: [['thunder-stone', 18], ['rare-candy', 16]],
  mist: [['rare-candy', 22], ['moon-stone', 14], ['ultra-ball', 12]],
  urban: [['rare-candy', 16], ['ultra-ball', 16], ['max-potion', 12]],
  psychic: [['rare-candy', 24], ['moon-stone', 14]],
  spooky: [['rare-candy', 22], ['moon-stone', 16], ['ultra-ball', 12]],
};

/** Small post-battle scrap table (wild left something / you spotted glint). */
const SCRAP_ROWS: Record<RouteBiome, WeightRow[]> = {
  forest: [
    ['oran-berry', 22],
    ['poke-ball', 18],
    ['potion', 20],
    ['great-ball', 8],
  ],
  grassland: [
    ['poke-ball', 20],
    ['oran-berry', 22],
    ['potion', 18],
    ['great-ball', 10],
  ],
  mountain: [
    ['potion', 18],
    ['super-potion', 14],
    ['great-ball', 12],
  ],
  cave: [
    ['potion', 20],
    ['great-ball', 14],
    ['revive', 8],
  ],
  cave_fire: [
    ['super-potion', 16],
    ['potion', 18],
    ['great-ball', 10],
  ],
  cave_mystic: [
    ['great-ball', 14],
    ['oran-berry', 16],
    ['moon-stone', 4],
  ],
  ice: [
    ['potion', 20],
    ['super-potion', 14],
    ['oran-berry', 12],
  ],
  sand: [
    ['poke-ball', 18],
    ['great-ball', 14],
    ['potion', 16],
  ],
  water: [
    ['great-ball', 16],
    ['potion', 18],
    ['oran-berry', 14],
  ],
  electric: [
    ['great-ball', 16],
    ['potion', 18],
    ['super-potion', 10],
  ],
  mist: [
    ['great-ball', 12],
    ['oran-berry', 16],
    ['potion', 16],
  ],
  urban: [
    ['poke-ball', 20],
    ['potion', 18],
    ['great-ball', 12],
  ],
  psychic: [
    ['great-ball', 12],
    ['oran-berry', 14],
    ['moon-stone', 4],
  ],
  spooky: [
    ['great-ball', 12],
    ['revive', 8],
    ['oran-berry', 14],
    ['moon-stone', 4],
  ],
};

function mergeWeights(...groups: WeightRow[][]): [ItemId, number][] {
  const m = new Map<ItemId, number>();
  for (const g of groups) {
    for (const [id, w] of g) {
      if (w <= 0) continue;
      m.set(id, (m.get(id) ?? 0) + w);
    }
  }
  return [...m.entries()];
}

function pickTier(rng: () => number): LootTier {
  const r = rng();
  if (r < 0.014) return 'jackpot';
  if (r < 0.12) return 'rare';
  if (r < 0.44) return 'uncommon';
  return 'common';
}

export interface NeedBiasContext {
  ballsLow: boolean;
  healsLow: boolean;
  partyHurt: boolean;
  needRevive: boolean;
}

export function computeNeedBiasContext(state: PokeRemGameState): NeedBiasContext {
  const bag = state.bag;
  const balls =
    (bag['poke-ball'] ?? 0) + (bag['great-ball'] ?? 0) + (bag['ultra-ball'] ?? 0);
  const heals =
    (bag['potion'] ?? 0) +
    (bag['super-potion'] ?? 0) +
    (bag['max-potion'] ?? 0) +
    (bag['oran-berry'] ?? 0);
  const partyHurt = state.party.some(
    (p) => p.maxHp > 0 && p.currentHp < p.maxHp * 0.52,
  );
  const anyFainted = state.party.some((p) => p.currentHp <= 0);
  return {
    ballsLow: balls < 5,
    healsLow: heals < 5,
    partyHurt,
    needRevive: anyFainted && (bag['revive'] ?? 0) < 2,
  };
}

function applyNeedBias(weights: [ItemId, number][], ctx: NeedBiasContext): [ItemId, number][] {
  const ballIds = new Set<ItemId>(['poke-ball', 'great-ball', 'ultra-ball']);
  const healIds = new Set<ItemId>([
    'potion',
    'super-potion',
    'max-potion',
    'oran-berry',
    'revive',
  ]);
  return weights.map(([id, w]) => {
    let m = w;
    if (ctx.ballsLow && ballIds.has(id)) m *= 1.16;
    if (ctx.healsLow && healIds.has(id)) m *= 1.12;
    if (ctx.partyHurt && healIds.has(id)) m *= 1.08;
    if (ctx.needRevive && id === 'revive') m *= 1.22;
    return [id, m] as [ItemId, number];
  });
}

function tierRows(biome: RouteBiome, tier: LootTier): WeightRow[] {
  switch (tier) {
    case 'common':
      return mergeWeights(BASE_COMMON, BIOME_COMMON[biome] ?? []);
    case 'uncommon':
      return mergeWeights(BASE_UNCOMMON, BIOME_UNCOMMON[biome] ?? []);
    case 'rare':
      return mergeWeights(BASE_RARE, BIOME_RARE[biome] ?? []);
    case 'jackpot':
      return mergeWeights(BASE_JACKPOT, BIOME_JACKPOT[biome] ?? []);
    default:
      return [...BASE_COMMON];
  }
}

function pickWeighted(rows: [ItemId, number][], rng: () => number): ItemId {
  let total = 0;
  for (const [, w] of rows) total += w;
  if (total <= 0) return 'potion';
  let t = rng() * total;
  for (const [id, w] of rows) {
    t -= w;
    if (t <= 0) return id;
  }
  return rows[rows.length - 1]![0];
}

const TRAVEL_HEADLINE: Record<RouteBiome, string[]> = {
  forest: [
    'Something glittered between the roots…',
    'You brushed long grass and felt a bump.',
    'A patch of moss hid a small treasure.',
  ],
  grassland: [
    'You found something while crossing the field.',
    'Tall grass parted — there it was.',
    'A sparkle near your feet caught your eye.',
  ],
  mountain: [
    'Loose stones shifted — something tumbled free.',
    'Wind uncovered a tucked-away prize.',
    'You spotted a supply wedged in the cliffside.',
  ],
  cave: [
    'Your light caught a glint on the wall.',
    'Something clinked under your boot.',
    'A trainer cache sat half-buried in dust.',
  ],
  cave_fire: [
    'Heat shimmered — and something survived the glow.',
    'You fanned smoke away and saw a find.',
    'Warm rock hid a scorched satchel corner.',
  ],
  cave_mystic: [
    'Runes flickered — an item waited in the haze.',
    'The cavern hummed; a gift lay at your feet.',
    'Strange light pooled around something useful.',
  ],
  ice: [
    'Ice cracked — something useful was frozen inside.',
    'You brushed snow aside and felt supplies.',
    'A chill wind revealed a tucked bundle.',
  ],
  sand: [
    'Sand shifted and uncovered a prize.',
    'You kicked up a sparkle in the dunes.',
    'Tracks led to a half-buried pouch.',
  ],
  water: [
    'Shallows washed something against your shoe.',
    'Foam hid a bobbing find.',
    'You fished a useful prize from the edge.',
  ],
  electric: [
    'Static tickled — an item clung to the rail.',
    'Sparks died down; something remained.',
    'Buzzing wires hid a trainer’s spare.',
  ],
  mist: [
    'The fog thinned — and there it was.',
    'A soft glow marked something left behind.',
    'You almost walked past a hidden prize.',
  ],
  urban: [
    'A dropped satchel sat by the path.',
    'Someone left supplies on a bench.',
    'You noticed a useful pack near the gate.',
  ],
  psychic: [
    'Your intuition tugged you toward a find.',
    'The air shimmered — supplies appeared.',
    'A faint pulse led you to something rare.',
  ],
  spooky: [
    'Something winked in the gloom.',
    'You weren’t alone — but the gift was.',
    'A chill passed; an item remained.',
  ],
};

const SCRAP_HEADLINE: Record<RouteBiome, string[]> = {
  forest: ['The wild left something in the brush.', 'You picked over the clearing.'],
  grassland: ['After the scuffle, you spotted a find.', 'Tall grass settled — and there it was.'],
  mountain: ['Dust settled; something useful remained.', 'You checked the ridge.'],
  cave: ['Echoes faded — a scrap waited in the dark.', 'The cave gave up a small prize.'],
  cave_fire: ['Embers cooled around a leftover.', 'Smoke cleared; you saw supplies.'],
  cave_mystic: ['The aura faded, leaving a trinket.', 'Silence returned — and a find.'],
  ice: ['Ice chips melted into something useful.', 'The frost hid a bonus.'],
  sand: ['The sandstorm left a gift.', 'You swept grit away and grinned.'],
  water: ['Ripples calmed; something bobbed nearby.', 'The battle’s splash hid a prize.'],
  electric: ['Sparks settled — a spare rolled free.', 'The field powered down; you found loot.'],
  mist: ['The mist swallowed the foe — not this.', 'A shape faded; an item stayed.'],
  urban: ['The crowd thinned; you scooped a find.', 'Battle done — supplies on the ground.'],
  psychic: ['Mind-games over — something tangible remained.', 'Focus broke; you saw a gift.'],
  spooky: ['The shadows retreated — a find didn’t.', 'You felt braver — and luckier.'],
};

const SUBLINE_VARIANTS = [
  'Added to your Bag.',
  'Stashed in your Bag.',
  'Bagged for the road ahead.',
  'Into the Bag it goes.',
];

function pickLine(lines: string[], rng: () => number): string {
  if (lines.length === 0) return '';
  return lines[Math.floor(rng() * lines.length)]!;
}

export interface RouteFindRollResult {
  itemId: ItemId;
  quantity: number;
  notice: RouteFindNoticePayload;
}

export function rollTravelRouteFind(
  state: PokeRemGameState,
  rng: () => number = Math.random,
): RouteFindRollResult {
  const biome = sceneIndexToRouteBiome(state.battleSceneIndex ?? 0);
  const ctx = computeNeedBiasContext(state);
  const tier = pickTier(rng);
  const rows = applyNeedBias(tierRows(biome, tier), ctx);
  const itemId = pickWeighted(rows, rng);
  const qty = itemId === 'oran-berry' && tier === 'common' && rng() < 0.35 ? 2 : 1;
  const meta = ITEM_BY_ID.get(itemId);
  const name = meta?.name ?? itemId;
  const headline = pickLine(TRAVEL_HEADLINE[biome], rng);
  const sub =
    qty > 1
      ? `${qty}× ${name}. ${pickLine(SUBLINE_VARIANTS, rng)}`
      : `${name}. ${pickLine(SUBLINE_VARIANTS, rng)}`;
  return {
    itemId,
    quantity: qty,
    notice: {
      itemId,
      quantity: qty,
      headline,
      subline: sub,
      source: 'travel',
    },
  };
}

export function rollPostBattleScrap(
  state: PokeRemGameState,
  rng: () => number = Math.random,
): RouteFindRollResult | null {
  if (rng() >= 0.118) return null;
  const biome = sceneIndexToRouteBiome(state.battleSceneIndex ?? 0);
  const ctx = computeNeedBiasContext(state);
  const rows = applyNeedBias(mergeWeights(SCRAP_ROWS[biome] ?? SCRAP_ROWS.grassland), ctx);
  const itemId = pickWeighted(rows, rng);
  const qty = itemId === 'oran-berry' && rng() < 0.4 ? 2 : 1;
  const meta = ITEM_BY_ID.get(itemId);
  const name = meta?.name ?? itemId;
  const headline = pickLine(SCRAP_HEADLINE[biome], rng);
  const sub =
    qty > 1
      ? `${qty}× ${name}. ${pickLine(SUBLINE_VARIANTS, rng)}`
      : `${name}. ${pickLine(SUBLINE_VARIANTS, rng)}`;
  return {
    itemId,
    quantity: qty,
    notice: {
      itemId,
      quantity: qty,
      headline,
      subline: sub,
      source: 'scrap',
    },
  };
}
