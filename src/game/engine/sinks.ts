/**
 * Things to spend Poké Dollars on beyond consumables: the move tutor, route tickets and trainer
 * card styles. Prices are set against today's income (roughly ₽15,000 a day at 100 cards), so a
 * tutor move is a day or less, a ticket a few hours and the top card style a few weeks.
 */
import { MOVES } from '../data/moves';
import { LEARNSETS, getUnlockedLearnsetMoveIds } from './moveLearn';
import { isMoveSupported } from './moveMechanics';

/** How far ahead of its level the tutor will teach a level-up move. */
export const TUTOR_LEVEL_WINDOW = 15;

export interface TutorOption {
  moveId: string;
  learnLevel: number;
  price: number;
}

export function tutorPrice(moveId: string, learnLevel: number, level: number): number {
  const power = MOVES[moveId]?.power ?? 0;
  const raw = 1500 + 40 * power + 120 * Math.max(0, learnLevel - level);
  return Math.round(raw / 100) * 100;
}

/** Level-up moves this Pokémon would learn within the next few levels, cheapest first. */
export function tutorOptions(mon: { dexNum: number; level: number; tutorMoves?: string[] }): TutorOption[] {
  const known = new Set([...getUnlockedLearnsetMoveIds(mon.dexNum, mon.level), ...(mon.tutorMoves ?? [])]);
  const best = new Map<string, number>();
  for (const entry of LEARNSETS[mon.dexNum] ?? []) {
    if (entry.level <= mon.level || entry.level > mon.level + TUTOR_LEVEL_WINDOW) continue;
    if (known.has(entry.moveId) || !isMoveSupported(MOVES[entry.moveId])) continue;
    const prev = best.get(entry.moveId);
    if (prev == null || entry.level < prev) best.set(entry.moveId, entry.level);
  }
  return [...best]
    .map(([moveId, learnLevel]) => ({ moveId, learnLevel, price: tutorPrice(moveId, learnLevel, mon.level) }))
    .sort((a, b) => a.learnLevel - b.learnLevel || a.price - b.price);
}

/** Route tickets: the next wild Pokémon come from the chosen biome's battle scenes. */
export const ROUTE_TICKET_PRICE = 6000;
export const ROUTE_TICKET_WILDS = 10;

export interface RouteBiome {
  id: string;
  name: string;
  /** Indices into `SCENES` (battleAmbience.ts) and `SCENE_BIOME_TYPES` (speciesPool.ts). */
  scenes: number[];
  blurb: string;
}

export const ROUTE_BIOMES: RouteBiome[] = [
  { id: 'meadow', name: 'Meadow', scenes: [0, 1, 2, 3], blurb: 'Grass, Bug, Normal and Flying' },
  { id: 'highlands', name: 'Highlands & Caves', scenes: [4, 5, 6, 7], blurb: 'Rock, Ground, Fighting and Fire' },
  { id: 'waterside', name: 'Waterside', scenes: [10, 11], blurb: 'Water, with Grass and Bug at the shore' },
  { id: 'frozen', name: 'Frozen Field', scenes: [8], blurb: 'Ice and Water' },
  { id: 'desert', name: 'Sandy Flats', scenes: [9], blurb: 'Ground and Rock' },
  { id: 'power', name: 'Power Plant', scenes: [12, 15], blurb: 'Electric and Steel' },
  { id: 'mystic', name: 'Mystic Realm', scenes: [13, 16, 17], blurb: 'Psychic, Fairy and Dark' },
  { id: 'haunted', name: 'Spooky Woods', scenes: [18], blurb: 'Ghost, Dark and Poison' },
  { id: 'arena', name: 'Indoor Arena', scenes: [14], blurb: 'Fighting, Normal and Steel' },
];

export const ROUTE_BIOME_BY_ID = new Map(ROUTE_BIOMES.map((b) => [b.id, b]));

/** The ticket's next scene: one of its scenes, a different one from last time when it has several. */
export function ticketScene(biomeId: string, prevScene: number, rng: () => number): number | null {
  const biome = ROUTE_BIOME_BY_ID.get(biomeId);
  if (!biome) return null;
  const choices = biome.scenes.length > 1 ? biome.scenes.filter((s) => s !== prevScene) : biome.scenes;
  return choices[Math.floor(rng() * choices.length) % choices.length] ?? biome.scenes[0]!;
}

/** Cosmetic trainer card styles. Classic is free and always owned. */
export interface TrainerCardStyle {
  id: string;
  name: string;
  price: number;
}

export const TRAINER_CARD_STYLES: TrainerCardStyle[] = [
  { id: 'classic', name: 'Classic', price: 0 },
  { id: 'ember', name: 'Ember', price: 25_000 },
  { id: 'tide', name: 'Tide', price: 25_000 },
  { id: 'verdant', name: 'Verdant', price: 25_000 },
  { id: 'midnight', name: 'Midnight', price: 60_000 },
  { id: 'aurora', name: 'Aurora', price: 120_000 },
  { id: 'champion', name: 'Champion Gold', price: 300_000 },
];

export const TRAINER_CARD_STYLE_BY_ID = new Map(TRAINER_CARD_STYLES.map((s) => [s.id, s]));
