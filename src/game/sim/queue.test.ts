import { describe, expect, it } from 'vitest';
import { WILD_FLEE_AFTER_CARDS } from '../constants';
import { applyQueueAction } from '../queueActions';
import { chooseStarter, createInitialStateV2, onQueueCardComplete, parseGameState } from '../state/store';
import type { EncounterPokemon, PokeRemGameState } from '../state/model';

const wild = (patch: Partial<EncounterPokemon> = {}): EncounterPokemon => ({
  dexNum: 16, name: 'Pidgey', level: 5, maxHp: 30, currentHp: 30, types: ['Normal', 'Flying'], tier: 'Common', ...patch,
});
const withWild = (patch?: Partial<EncounterPokemon>): PokeRemGameState => ({
  ...chooseStarter(createInitialStateV2(), 4),
  currentEncounter: wild(patch),
});

describe('queue actions (sidebar closed)', () => {
  it('runs, fights and catches without the sidebar', () => {
    expect(applyQueueAction(withWild(), 'run').currentEncounter).toBeNull();
    const fought = applyQueueAction(withWild(), 'fight');
    expect(fought.currentEncounter === null || fought.currentEncounter.currentHp < 30).toBe(true);
    const thrown = applyQueueAction(withWild(), 'catch');
    expect(thrown.bag['poke-ball']).toBe(withWild().bag['poke-ball'] - 1);
  });

  it('Auto weakens the wild but leaves it standing to catch', () => {
    const s = applyQueueAction(withWild({ maxHp: 60, currentHp: 60 }), 'auto');
    expect(s.currentEncounter).not.toBeNull();
    expect(s.currentEncounter!.currentHp).toBeGreaterThan(0);
    expect(s.currentEncounter!.currentHp).toBeLessThan(60);
  });

  it('does nothing when there is no wild', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    expect(applyQueueAction(s, 'catch')).toBe(s);
  });
});

describe('ignored wild Pokémon', () => {
  const review = (s: PokeRemGameState, n: number) => {
    for (let i = 0; i < n; i++) s = onQueueCardComplete(s, [1], 3);
    return s;
  };

  it('wander off after a run of cards with no action, so progress keeps moving', () => {
    const s = review(withWild(), WILD_FLEE_AFTER_CARDS - 1);
    expect(s.currentEncounter).not.toBeNull();
    const gone = review(s, 1);
    expect(gone.currentEncounter).toBeNull();
    expect(gone.lastBattleLog).toMatch(/wandered off/);
  });

  it('restart the timer after any battle action', () => {
    let s = review(withWild({ maxHp: 500, currentHp: 500 }), WILD_FLEE_AFTER_CARDS - 1);
    s = applyQueueAction(s, 'fight');
    expect(s.wildIdleCards ?? 0).toBe(0);
    expect(review(s, WILD_FLEE_AFTER_CARDS - 1).currentEncounter).not.toBeNull();
  });

  it('never lets a shiny or a legendary event slip away', () => {
    expect(review(withWild({ shiny: true }), WILD_FLEE_AFTER_CARDS * 3).currentEncounter?.shiny).toBe(true);
    const mewtwo = review(withWild({ dexNum: 150, name: 'Mewtwo', tier: 'Legendary', types: ['Psychic'] }), WILD_FLEE_AFTER_CARDS * 3);
    expect(mewtwo.currentEncounter?.dexNum).toBe(150);
  });

  it('keeps the idle count through a save round-trip', () => {
    const s = review(withWild(), 4);
    expect(parseGameState(JSON.parse(JSON.stringify(s))).wildIdleCards).toBe(4);
  });
});
