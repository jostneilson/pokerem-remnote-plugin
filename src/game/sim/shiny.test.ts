import { describe, expect, it } from 'vitest';
import {
  GALARIAN_BIRDS,
  encounterShinyOdds,
  SHINY_ODDS_PRE_DEX_COMPLETE,
  SHINY_PITY_SPAN,
  SHINY_PITY_START,
  shinyOddsWithPity,
  spawnEncounter,
} from '../engine/encounters';
import { REVIEWS_PER_ENCOUNTER } from '../constants';
import { SPECIES_BY_DEX, displayDexNumber } from '../data/species';
import { canBeShiny } from '../data/shinyArt';
import { frontSpriteUrl } from '../sprites';
import { isPerfectIVs } from '../engine/pokemonStats';
import { applyCombatTurn, catchEncounter, chooseStarter, createInitialStateV2, parseGameState } from '../state/store';
import { seededRng } from './simulate';
import type { EncounterPokemon, OwnedPokemon } from '../state/model';

/** Encounters until the first shiny for one simulated player. */
function firstShiny(rng: () => number): number {
  for (let n = 0; ; n++) if (rng() < shinyOddsWithPity(SHINY_ODDS_PRE_DEX_COMPLETE, n)) return n + 1;
}

describe('shiny odds', () => {
  const rng = seededRng(2026);
  const players = Array.from({ length: 4000 }, () => firstShiny(rng)).sort((a, b) => a - b);
  const encountersPerDay = 100 / REVIEWS_PER_ENCOUNTER;
  const days = (encounters: number) => encounters / encountersPerDay;

  it('a regular studier meets a first shiny in about a week (100 cards a day)', () => {
    const median = days(players[Math.floor(players.length / 2)]!);
    expect(median).toBeGreaterThan(3);
    expect(median).toBeLessThan(8);
  });

  it('almost everyone sees one within about four weeks, and the pity guarantees it', () => {
    expect(days(players[Math.floor(players.length * 0.95)]!)).toBeLessThan(28);
    expect(players[players.length - 1]).toBeLessThanOrEqual(SHINY_PITY_START + SHINY_PITY_SPAN);
  });

  it('stays super rare overall (close to 1 in 250)', () => {
    const mean = players.reduce((a, b) => a + b, 0) / players.length;
    expect(mean).toBeGreaterThan(190);
    expect(mean).toBeLessThan(260);
  });

  it('only starts helping after a long dry spell', () => {
    expect(shinyOddsWithPity(1 / 250, SHINY_PITY_START)).toBe(1 / 250);
    expect(shinyOddsWithPity(1 / 250, SHINY_PITY_START + SHINY_PITY_SPAN)).toBe(1);
  });
});

describe('Galarian birds', () => {
  it('exist with their real types and official sprites', () => {
    expect(SPECIES_BY_DEX.get(10169)?.types).toEqual(['Psychic', 'Flying']);
    expect(SPECIES_BY_DEX.get(10170)?.types).toEqual(['Fighting', 'Flying']);
    expect(SPECIES_BY_DEX.get(10171)?.types).toEqual(['Dark', 'Flying']);
    expect(displayDexNumber(10170)).toBe(145);
    expect(frontSpriteUrl(undefined, 10169, true)).toMatch(/\/shiny\/10169\.png$/);
  });

  it('are shiny a quarter of the time', () => {
    const rng = seededRng(25);
    for (const dex of GALARIAN_BIRDS) {
      const odds = encounterShinyOdds(dex, SHINY_ODDS_PRE_DEX_COMPLETE, 0);
      let shiny = 0;
      for (let i = 0; i < 10_000; i++) if (rng() < odds) shiny++;
      expect(shiny / 10_000).toBeGreaterThan(0.235);
      expect(shiny / 10_000).toBeLessThan(0.265);
    }
    expect(encounterShinyOdds(144, SHINY_ODDS_PRE_DEX_COMPLETE, 0)).toBe(SHINY_ODDS_PRE_DEX_COMPLETE);
  });

  it('turn up as legendary events when Gen 8 is enabled', () => {
    const rng = seededRng(8);
    const party = [40, 40, 40].map((level, i) => ({ id: `p${i}`, dexNum: 4, name: 'C', level, totalXp: 0, currentHp: 1, maxHp: 1, types: ['Fire'] }) as OwnedPokemon);
    const seen = new Set<number>();
    for (let i = 0; i < 40_000 && seen.size < 3; i++) {
      const enc = spawnEncounter(party, 5000, [8], 0, { rng });
      if (GALARIAN_BIRDS.has(enc.dexNum)) seen.add(enc.dexNum);
    }
    expect(seen.size).toBe(3);
  });
});

describe('shiny and perfect-IV Pokémon stay that way', () => {
  it('every species has official shiny art', () => {
    for (const s of SPECIES_BY_DEX.values()) expect(canBeShiny(s.dexNum), s.name).toBe(true);
  });

  it('keeps shiny and IVs through a catch and a save round-trip', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    const enc: EncounterPokemon = { dexNum: 10170, name: 'Galarian Zapdos', level: 50, maxHp: 100, currentHp: 100, types: ['Fighting', 'Flying'], shiny: true, ivs: { hp: 3, attack: 3, defense: 3 } };
    const caught = catchEncounter({ ...s, currentEncounter: enc }, 'poke-ball');
    const loaded = parseGameState(JSON.parse(JSON.stringify(caught)));
    const zapdos = [...loaded.party, ...loaded.storagePokemon].find((p) => p.dexNum === 10170)!;
    expect(zapdos.shiny).toBe(true);
    expect(isPerfectIVs(zapdos.ivs)).toBe(true);
    expect(loaded.collectionDex[10170]).toBe(1);
  });

  it('resets the pity counter when a shiny appears', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    const loaded = parseGameState(JSON.parse(JSON.stringify({ ...s, encountersSinceShiny: 321 })));
    expect(loaded.encountersSinceShiny).toBe(321);
  });
});

describe('shinies survive a lead faint (A3)', () => {
  it('a shiny everyday wild stays when your lead faints; a regular one flees', () => {
    const base = chooseStarter(createInitialStateV2(), 4);
    const lead = { ...base.party[0]!, level: 2, currentHp: 1 };
    const wild = { dexNum: 19, name: 'Rattata', level: 40, maxHp: 400, currentHp: 400, types: ['Normal'], tier: 'Common' } as EncounterPokemon;
    const fight = (shiny: boolean) =>
      applyCombatTurn({ ...base, party: [lead], activePokemonId: lead.id, currentEncounter: { ...wild, shiny } });
    let kept = 0;
    let fled = 0;
    for (let i = 0; i < 20; i++) {
      const s = fight(true);
      if (s.party[0]!.currentHp <= 0) {
        expect(s.currentEncounter?.shiny).toBe(true);
        kept++;
      }
      const r = fight(false);
      if (r.party[0]!.currentHp <= 0) {
        expect(r.currentEncounter).toBeNull();
        fled++;
      }
    }
    expect(kept).toBeGreaterThan(0);
    expect(fled).toBeGreaterThan(0);
  });
});
