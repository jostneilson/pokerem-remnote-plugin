import { describe, expect, it, vi } from 'vitest';
import { catchEncounter, chooseStarter, createInitialStateV2, applyCombatTurn, dismissBattleResult, onQueueCardComplete, parseGameState } from '../state/store';
import type { EncounterPokemon, PokeRemGameState } from '../state/model';
import { xpThresholdForLevel } from '../engine/progression';

const base = () => chooseStarter(createInitialStateV2(), 4);
const wild = (patch: Partial<EncounterPokemon> = {}): EncounterPokemon => ({
  dexNum: 16, name: 'Pidgey', level: 30, maxHp: 1, currentHp: 1, types: ['Normal', 'Flying'], tier: 'Common', ...patch,
});

describe('battle result card', () => {
  it('records XP, the level-up and newly unlocked moves after a knockout', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const b = base();
      const lead = { ...b.party[0]!, totalXp: xpThresholdForLevel(6) - 1 };
      const s = applyCombatTurn({ ...b, party: [lead], currentEncounter: wild() });
      const r = s.lastBattleResult!;
      expect(r.kind).toBe('defeat');
      expect(r.xp).toBeGreaterThan(0);
      expect(r.toLevel).toBeGreaterThan(r.fromLevel);
      expect(r.monName).toBe('Charmander');
      expect(s.lastBattleLog).toContain(`grew to Lv ${r.toLevel}`);
    } finally {
      random.mockRestore();
    }
  });

  it('logs every shiny catch with date and card, and marks the result shiny', () => {
    const s0: PokeRemGameState = { ...base(), cardsReviewed: 321, currentEncounter: wild({ dexNum: 10170, name: 'Galarian Zapdos', maxHp: 100, currentHp: 100, shiny: true, types: ['Fighting', 'Flying'], tier: 'Legendary', ivs: { hp: 3, attack: 3, defense: 3 } }) };
    const s = catchEncounter(s0, 'poke-ball');
    expect(s.lastBattleResult).toMatchObject({ kind: 'catch', shiny: true, perfectIvs: true, name: 'Galarian Zapdos' });
    expect(s.shinyLog).toHaveLength(1);
    expect(s.shinyLog![0]).toMatchObject({ dexNum: 10170, card: 321, perfectIvs: true });
    expect(Number.isNaN(Date.parse(s.shinyLog![0]!.caughtAt))).toBe(false);
    const loaded = parseGameState(JSON.parse(JSON.stringify(s)));
    expect(loaded.shinyLog).toEqual(s.shinyLog);
    expect(loaded.lastBattleResult).toEqual(s.lastBattleResult);
  });

  it('clears on OK or when the next wild appears', () => {
    const s = catchEncounter({ ...base(), currentEncounter: wild({ shiny: true, dexNum: 150, name: 'Mewtwo', types: ['Psychic'] }) }, 'poke-ball');
    expect(dismissBattleResult(s).lastBattleResult).toBeNull();
    let next = s;
    for (let i = 0; i < 30 && !next.currentEncounter; i++) next = onQueueCardComplete(next, [1], 1);
    expect(next.currentEncounter).not.toBeNull();
    expect(next.lastBattleResult).toBeNull();
  });
});
