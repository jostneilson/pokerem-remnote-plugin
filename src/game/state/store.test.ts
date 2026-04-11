import { describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENT_TIER_TRAINER_XP } from '../engine/achievements';
import { damageForMove } from '../engine/combatExchange';
import { tryCatch } from '../engine/encounters';
import { TRAINER_XP_SOURCES } from '../engine/trainerLevel';
import type { EncounterPokemon } from './model';
import {
  applyCombatTurn,
  claimAchievement,
  chooseStarter,
  createInitialStateV2,
  defeatEncounter,
  onQueueCardComplete,
  parseGameState,
} from './store';

describe('parseGameState', () => {
  it('merges v2 dailyStats, pendingCaughtMon, wildReviewAccum', () => {
    const raw = {
      schemaVersion: 2,
      lastUpdatedAt: 1,
      starterChosen: true,
      activePokemonId: 'a',
      party: [
        {
          id: 'a',
          dexNum: 1,
          name: 'Bulbasaur',
          level: 1,
          totalXp: 0,
          currentHp: 20,
          maxHp: 20,
          types: ['Grass', 'Poison'] as const,
          moves: ['tackle'],
        },
      ],
      storagePokemon: [],
      cardsReviewed: 10,
      encounterProgress: 0,
      currentEncounter: null,
      lastBattleLog: 'hi',
      lastOutcomeKind: 'none',
      battleFeedbackSeq: 0,
      collectionDex: {},
      bag: {},
      achievements: {},
      selectedTab: 'status',
      totalDefeated: 0,
      totalCaught: 0,
      totalRuns: 0,
      totalEvolutions: 0,
      currency: 0,
      totalCurrencyEarned: 0,
      totalShopPurchases: 0,
      lastStudyDate: '',
      currentStreak: 0,
      longestStreak: 0,
      trainerRank: 'x',
      trainerXp: 0,
      trainerLevel: 1,
      claimedRewardLevels: [],
      battleSceneIndex: 0,
      dailyStats: { date: '2026-04-08', reviews: 3, encounters: 1, catches: 0 },
      wildReviewAccum: 0.25,
      pendingCaughtMon: null,
    };
    const s = parseGameState(raw);
    expect(s.schemaVersion).toBe(3);
    expect(s.dailyStats?.reviews).toBe(3);
    expect(s.wildReviewAccum).toBe(0.25);
    expect(s.pendingCaughtMon).toBe(null);
  });

  it('does not throw when collectionDex is null (deriveAchievements uses Object.values)', () => {
    const raw = {
      schemaVersion: 2,
      starterChosen: true,
      activePokemonId: 'a',
      party: [
        {
          id: 'a',
          dexNum: 1,
          name: 'Bulbasaur',
          level: 1,
          totalXp: 0,
          currentHp: 20,
          maxHp: 20,
          types: ['Grass', 'Poison'] as const,
        },
      ],
      collectionDex: null,
    };
    expect(() => parseGameState(raw)).not.toThrow();
    const s = parseGameState(raw);
    expect(s.collectionDex).toEqual({});
  });
});

describe('onQueueCardComplete', () => {
  it('respects autoClearLog off', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = { ...s, lastBattleLog: 'test', lastOutcomeKind: 'spawn' as const };
    const next = onQueueCardComplete(s, [1], 99, { autoClearLog: false });
    expect(next.lastBattleLog).toBe('test');
  });

  it('applies reviewWeight to currency and wild accum', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = { ...s, encounterProgress: 0, wildReviewAccum: 0, currency: 0 };
    const a = onQueueCardComplete(s, [1], 99, { reviewWeight: 0.5 });
    expect(a.cardsReviewed).toBe(1);
    expect(a.wildReviewAccum).toBe(0.5);
    expect(a.encounterProgress).toBe(0);
    const b = onQueueCardComplete(a, [1], 99, { reviewWeight: 0.5 });
    expect(b.wildReviewAccum).toBe(0);
    expect(b.encounterProgress).toBe(1);
  });

  it('grants a Route Find after enough paced reviews when no wild spawns', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = {
      ...s,
      encounterProgress: 0,
      routeFindProgress: 10,
      routeFindReviewAccum: 0,
      routeFindNoticeSeq: 0,
      routeFindNotice: null,
    };
    const next = onQueueCardComplete(s, [1], 99, { routeFindReviewsNeeded: 11 });
    expect(next.routeFindProgress).toBe(0);
    expect(next.routeFindNoticeSeq).toBe(1);
    expect(next.routeFindNotice).not.toBe(null);
    expect(next.routeFindNotice?.quantity).toBeGreaterThanOrEqual(1);
  });

  it('flags achievements on card milestones; trainer XP is granted on claim', () => {
    const today = new Date().toISOString().slice(0, 10);
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = {
      ...s,
      cardsReviewed: 24,
      lastStudyDate: today,
      currentStreak: 1,
      longestStreak: 1,
    };
    const xp0 = s.trainerXp ?? 0;
    const next = onQueueCardComplete(s, [1], 99, { encounterPacingModulo: 100 });
    expect(next.achievements.review25).toBe(true);
    expect((next.trainerXp ?? 0) - xp0).toBe(TRAINER_XP_SOURCES.cardReview);
    const claimed = claimAchievement(next, 'review25');
    expect((claimed.trainerXp ?? 0) - (next.trainerXp ?? 0)).toBe(ACHIEVEMENT_TIER_TRAINER_XP.common);
  });

  it('does not advance Route Finds on the same review that spawns a wild', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = {
      ...s,
      encounterProgress: 2,
      routeFindProgress: 10,
      routeFindReviewAccum: 0,
      routeFindNoticeSeq: 0,
      routeFindNotice: null,
    };
    const next = onQueueCardComplete(s, [1], 3, { routeFindReviewsNeeded: 11 });
    expect(next.currentEncounter).not.toBe(null);
    expect(next.routeFindProgress).toBe(10);
    expect(next.routeFindNoticeSeq).toBe(0);
  });
});

describe('tryCatch', () => {
  it('returns true when random is below chance', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    expect(tryCatch(0, 255, 1)).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('applyCombatTurn', () => {
  it('subtracts player move damage from wild currentHp', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    let s = createInitialStateV2();
    s = chooseStarter(s, 4);
    const lead = s.party[0]!;
    const enc: EncounterPokemon = {
      dexNum: 10,
      name: 'Caterpie',
      level: 2,
      maxHp: 30,
      currentHp: 30,
      types: ['Bug'],
    };
    s = { ...s, currentEncounter: enc };
    const pDmg = damageForMove(lead.level, 'scratch', lead.types, enc.types);
    const next = applyCombatTurn(s, 'scratch');
    vi.restoreAllMocks();
    expect(next.currentEncounter).not.toBe(null);
    expect(next.currentEncounter!.currentHp).toBe(30 - pDmg);
    expect(next.lastCombatStrike?.playerMoveId).toBe('scratch');
    expect(typeof next.lastCombatStrike?.wildMoveId).toBe('string');
    expect(typeof next.lastCombatStrike?.playerDamage).toBe('number');
    expect(typeof next.lastCombatStrike?.wildDamage).toBe('number');
    expect(typeof next.lastCombatStrike?.playerEffectiveness).toBe('number');
    expect(typeof next.lastCombatStrike?.wildEffectiveness).toBe('number');
  });

  it('clamps inflated wild HP before damage so the bar matches arithmetic', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    let s = createInitialStateV2();
    s = chooseStarter(s, 4);
    const lead = s.party[0]!;
    const enc: EncounterPokemon = {
      dexNum: 10,
      name: 'Caterpie',
      level: 2,
      maxHp: 30,
      currentHp: 999,
      types: ['Bug'],
    };
    s = { ...s, currentEncounter: enc };
    const pDmg = damageForMove(lead.level, 'scratch', lead.types, enc.types);
    const next = applyCombatTurn(s, 'scratch');
    vi.restoreAllMocks();
    expect(next.currentEncounter!.currentHp).toBe(30 - pDmg);
  });
});

describe('defeatEncounter', () => {
  it('grants bonus bag items when claiming a rare achievement after defeat', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    const enc: EncounterPokemon = {
      dexNum: 10,
      name: 'Caterpie',
      level: 2,
      maxHp: 20,
      currentHp: 20,
      types: ['Bug'],
    };
    s = {
      ...s,
      totalDefeated: 499,
      currentEncounter: enc,
      bag: { ...s.bag, 'great-ball': 0 },
    };
    const gb0 = s.bag['great-ball'] ?? 0;
    const next = defeatEncounter(s);
    expect(next.achievements.defeat500).toBe(true);
    expect((next.bag['great-ball'] ?? 0) - gb0).toBe(0);
    const claimed = claimAchievement(next, 'defeat500');
    expect((claimed.bag['great-ball'] ?? 0) - gb0).toBe(5);
  });
});

describe('applyCombatTurn', () => {
  it('no-ops without encounter', () => {
    const s = createInitialStateV2();
    expect(applyCombatTurn(s)).toBe(s);
  });
});
