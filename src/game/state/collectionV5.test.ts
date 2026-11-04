import { afterEach, describe, expect, it, vi } from 'vitest';
import { battleStats, powerUpCost } from '../engine/pokemonStats';
import { xpThresholdForLevel } from '../engine/progression';
import type { OwnedPokemon, PokeRemGameState, TrainerBattleState, TrainerEnemyMon } from './model';
import {
  cancelPendingCaught,
  catchEncounter,
  claimTrainerCatch,
  createInitialStateV4,
  onQueueCardComplete,
  parseGameState,
  powerUpPokemon,
  resolvePendingCaughtReplace,
  rollStudyCashBonus,
} from './store';

const owned = (id: string, dexNum = 4, level = 10): OwnedPokemon => {
  const ivs = { hp: 2, attack: 2, defense: 2 } as const;
  const stats = battleStats({ id, dexNum, level, ivs });
  return {
    id, dexNum, name: dexNum === 4 ? 'Charmander' : `Mon ${dexNum}`, level,
    totalXp: xpThresholdForLevel(level), currentHp: stats.hp, maxHp: stats.hp,
    types: dexNum === 4 ? ['Fire'] : ['Normal'], moves: dexNum === 4 ? ['scratch'] : ['tackle'], ivs,
  };
};

afterEach(() => vi.restoreAllMocks());

describe('v5 migration and investment', () => {
  it('assigns stable IVs, repairs canonical types/moves, preserves legacy metadata, and keeps fainted HP', () => {
    const raw = {
      ...createInitialStateV4(),
      schemaVersion: 4,
      currency: 777,
      bag: { ...createInitialStateV4().bag, revive: 5 },
      party: [{
        id: 'legacy-charizard', dexNum: 6, name: 'Charizard', level: 36,
        totalXp: xpThresholdForLevel(36), currentHp: 0, maxHp: 99,
        types: ['Ultra'], moves: ['ember', 'not-a-real-move'], shiny: true,
      }],
      activePokemonId: 'legacy-charizard',
    };
    const first = parseGameState(raw);
    const second = parseGameState(raw);
    expect(first.schemaVersion).toBe(5);
    expect(first.party[0]!.ivs).toEqual(second.party[0]!.ivs);
    expect(first.party[0]!.types).toEqual(['Fire', 'Flying']);
    expect(first.party[0]!.legacyMoves).toEqual(expect.arrayContaining(['ember', 'not-a-real-move']));
    expect(first.party[0]!.currentHp).toBe(0);
    expect(first.party[0]!.maxHp).toBe(battleStats(first.party[0]!).hp);
    expect(first.party[0]!.shiny).toBe(true);
    expect(first.currency).toBe(777);
    expect(first.bag.revive).toBe(5);
  });

  it('charges the exact level price once, rejects stale actions, and preserves IVs', () => {
    const mon = { ...owned('invest'), ivs: { hp: 3, attack: 1, defense: 2 } as const };
    const state = { ...createInitialStateV4(), starterChosen: true, activePokemonId: mon.id, party: [mon], currency: 5000 };
    const once = powerUpPokemon(state, mon.id, 10);
    expect(once.party[0]!.level).toBe(11);
    expect(once.currency).toBe(5000 - powerUpCost(10));
    expect(once.party[0]!.ivs).toEqual(mon.ivs);
    const stale = powerUpPokemon(once, mon.id, 10);
    expect(stale).toBe(once);
  });
});

describe('v5 catches, rewards, and study XP', () => {
  it('keeps a full-party wild catch on Play until it is deliberately resolved to party or storage', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const party = Array.from({ length: 6 }, (_, i) => owned(`party-${i}`));
    const state: PokeRemGameState = {
      ...createInitialStateV4(), starterChosen: true, activePokemonId: party[0]!.id, party,
      selectedTab: 'party', bag: { ...createInitialStateV4().bag, 'ultra-ball': 2 },
      currentEncounter: {
        dexNum: 7, name: 'Squirtle', level: 8, currentHp: 1, maxHp: 30,
        types: ['Water'], ivs: { hp: 3, attack: 2, defense: 1 },
      },
    };
    const caught = catchEncounter(state, 'ultra-ball');
    expect(caught.selectedTab).toBe('status');
    expect(caught.pendingCaughtMon?.ivs).toEqual({ hp: 3, attack: 2, defense: 1 });
    expect(caught.party).toHaveLength(6);
    const replaced = resolvePendingCaughtReplace(caught, party[2]!.id);
    expect(replaced.pendingCaughtMon).toBeNull();
    expect(replaced.storagePokemon).toContainEqual(expect.objectContaining({ id: party[2]!.id }));

    const caughtAgain = catchEncounter({ ...state, bag: { ...state.bag, 'ultra-ball': 2 } }, 'ultra-ball');
    const stored = cancelPendingCaught(caughtAgain);
    expect(stored.pendingCaughtMon).toBeNull();
    expect(stored.storagePokemon).toContainEqual(expect.objectContaining({ dexNum: 7 }));
    expect(stored.selectedTab).toBe('status');
  });

  it('preserves trainer-catch IVs through the same full-party storage flow', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const party = Array.from({ length: 6 }, (_, i) => owned(`trainer-party-${i}`));
    const enemy: TrainerEnemyMon = {
      dexNum: 25, name: 'Pikachu', level: 12, maxHp: 35, currentHp: 1,
      types: ['Electric'], moves: ['thundershock'], defeated: true,
      ivs: { hp: 1, attack: 3, defense: 2 } as const,
    };
    const battle: TrainerBattleState = {
      id: 'trainer-catch', phase: 'post_win', tier: 'standard',
      trainer: { archetypeId: 'test', className: 'Tester', themeTypes: ['Normal'], taunt: '', defeatLine: '', victoryLine: '' },
      enemies: [enemy, enemy, enemy], activeEnemyIndex: 0, selectedPartyIds: party.slice(0, 3).map(p => p.id),
      faintedSelectedIds: [], catchOfferActive: true, catchOfferClaimed: false, feedbackSeq: 0,
    };
    const state: PokeRemGameState = {
      ...createInitialStateV4(), starterChosen: true, activePokemonId: party[0]!.id, party,
      bag: { ...createInitialStateV4().bag, 'ultra-ball': 1 }, currentTrainerBattle: battle,
      selectedTab: 'party',
    };
    const caught = claimTrainerCatch(state, 0, 'ultra-ball');
    expect(caught.selectedTab).toBe('status');
    expect(caught.pendingCaughtMon?.ivs).toEqual(enemy.ivs);
    const stored = cancelPendingCaught(caught);
    expect(stored.storagePokemon.at(-1)?.ivs).toEqual(enemy.ivs);
  });

  it('honors mutually-exclusive cash bonus boundaries and inclusive ranges', () => {
    const rng = (...values: number[]) => { let i = 0; return () => values[i++] ?? 0; };
    expect(rollStudyCashBonus(rng(0.000499, 0))).toEqual({ amount: 10000, tier: 'Jackpot' });
    expect(rollStudyCashBonus(rng(0.0005, 0))).toEqual({ amount: 2000, tier: 'Rare find' });
    expect(rollStudyCashBonus(rng(0.0055, 0))).toEqual({ amount: 350, tier: 'Lucky find' });
    expect(rollStudyCashBonus(rng(0.0455, 0))).toEqual({ amount: 0 });
    expect(rollStudyCashBonus(rng(0, 0.999999))).toEqual({ amount: 25000, tier: 'Jackpot' });
  });

  it('XP Share: every member earns study XP (lead x1.2) and the recap is recorded once per review', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const party = [owned('lead'), owned('bench-1'), owned('bench-2')];
    const beforeXp = party.map(p => p.totalXp);
    const state: PokeRemGameState = {
      ...createInitialStateV4(), starterChosen: true, activePokemonId: 'lead', party,
      currentEncounter: { dexNum: 7, name: 'Squirtle', level: 5, currentHp: 20, maxHp: 20, types: ['Water'] },
    };
    const next = onQueueCardComplete(state);
    // 1.6 x 1.2 = 1.92 for the lead and 1.6 for the bench, both rounded up by the 0.1 roll.
    expect(next.party[0]!.totalXp - beforeXp[0]!).toBe(2);
    expect(next.party[1]!.totalXp - beforeXp[1]!).toBe(2);
    expect(next.party[2]!.totalXp - beforeXp[2]!).toBe(2);
    expect(next.lastStudyReward).toMatchObject({ seq: 1, leadXp: 2, benchXp: 4, bonus: 0 });
  });
});
