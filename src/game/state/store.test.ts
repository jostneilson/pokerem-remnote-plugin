import { describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENT_TIER_TRAINER_XP } from '../engine/achievements';
import { damageForMove } from '../engine/combatExchange';
import { tryCatch } from '../engine/encounters';
import { isMoveTypeLegalForSpecies } from '../data/learnsetRules';
import { MOVES } from '../data/moves';
import { dedupeMoveIds, getUnlockedLearnsetMoveIds, movesetForBattle, pickDefaultBattleMove } from '../engine/moveLearn';
import { TRAINER_XP_SOURCES } from '../engine/trainerLevel';
import type { EncounterPokemon, OwnedPokemon } from './model';
import {
  applyCombatTurn,
  forgetMoveAction,
  learnMoveAction,
  claimAchievement,
  chooseStarter,
  dismissMainNotice,
  createInitialStateV2,
  createInitialStateV3,
  defeatEncounter,
  onQueueCardComplete,
  parseGameState,
  useHealingItem,
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
  it('increments dailyStats.reviews on each completed card after starter', () => {
    const today = new Date().toISOString().slice(0, 10);
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = { ...s, lastStudyDate: today, currentStreak: 1, longestStreak: 1 };
    const next = onQueueCardComplete(s, [1], 99, { encounterPacingModulo: 100 });
    expect(next.dailyStats?.reviews).toBe(1);
    const next2 = onQueueCardComplete(next, [1], 99, { encounterPacingModulo: 100 });
    expect(next2.dailyStats?.reviews).toBe(2);
  });

  it('respects autoClearLog off', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = { ...s, lastBattleLog: 'test', lastOutcomeKind: 'spawn' as const };
    const next = onQueueCardComplete(s, [1], 99, { autoClearLog: false });
    expect(next.lastBattleLog).toBe('test');
  });

  it('applies reviewWeight to currency and XP but not wild encounter units', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = { ...s, encounterProgress: 0, wildReviewAccum: 0, currency: 0 };
    const a = onQueueCardComplete(s, [1], 99, { reviewWeight: 0.5 });
    expect(a.cardsReviewed).toBe(1);
    expect(a.wildReviewAccum).toBe(0);
    expect(a.encounterProgress).toBe(1);
    const b = onQueueCardComplete(a, [1], 99, { reviewWeight: 0.5 });
    expect(b.wildReviewAccum).toBe(0);
    expect(b.encounterProgress).toBe(2);
  });

  it('applies encounterReviewMultiplier only to wild and route-find accum', () => {
    const today = new Date().toISOString().slice(0, 10);
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    s = {
      ...s,
      encounterProgress: 0,
      wildReviewAccum: 0,
      routeFindProgress: 0,
      routeFindReviewAccum: 0,
      currency: 0,
      lastStudyDate: today,
      currentStreak: 1,
    };
    const xp0 = s.trainerXp ?? 0;
    const cur0 = s.currency ?? 0;
    const next = onQueueCardComplete(s, [1], 99, { reviewWeight: 1, encounterReviewMultiplier: 4 });
    expect(next.encounterProgress).toBe(4);
    expect((next.trainerXp ?? 0) - xp0).toBe(TRAINER_XP_SOURCES.cardReview);
    expect((next.currency ?? 0) - cur0).toBe(10);
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
    const pick = pickDefaultBattleMove(movesetForBattle(lead))!;
    const pDmg = damageForMove(lead.level, pick, lead.types, enc.types);
    const next = applyCombatTurn(s, pick);
    vi.restoreAllMocks();
    expect(next.currentEncounter).not.toBe(null);
    expect(next.currentEncounter!.currentHp).toBe(30 - pDmg);
    expect(next.lastCombatStrike?.playerMoveId).toBe(pick);
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
    const pick = pickDefaultBattleMove(movesetForBattle(lead))!;
    const pDmg = damageForMove(lead.level, pick, lead.types, enc.types);
    const next = applyCombatTurn(s, pick);
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

describe('mainNoticeQueue', () => {
  it('dismissMainNotice removes one entry by id', () => {
    let s = createInitialStateV3();
    s = {
      ...s,
      starterChosen: true,
      mainNoticeQueue: [
        { kind: 'achievement_unlock', id: 'a', title: 'A', subtitle: 'x' },
        { kind: 'achievement_unlock', id: 'b', title: 'B', subtitle: 'y' },
      ],
    };
    const next = dismissMainNotice(s, 'a');
    expect(next.mainNoticeQueue?.map((n) => n.id)).toEqual(['b']);
  });

  it('claimAchievement drops matching main notice', () => {
    let s = createInitialStateV3();
    s = chooseStarter(s, 1);
    s = {
      ...s,
      achievements: { ...s.achievements, review25: true },
      claimedAchievementIds: [],
      mainNoticeQueue: [{ kind: 'achievement_unlock', id: 'review25', title: 'T', subtitle: 'S' }],
    };
    const next = claimAchievement(s, 'review25');
    expect(next.mainNoticeQueue?.some((n) => n.id === 'review25')).toBe(false);
  });
});

describe('useHealingItem', () => {
  const faintedLead = (maxHp: number): OwnedPokemon => ({
    id: 'a',
    dexNum: 1,
    name: 'Bulbasaur',
    level: 10,
    totalXp: 100,
    currentHp: 0,
    maxHp,
    types: ['Grass'],
    moves: ['tackle'],
  });

  it('revive restores fainted lead to half max HP and consumes one', () => {
    let s = createInitialStateV3();
    s = {
      ...s,
      starterChosen: true,
      activePokemonId: 'a',
      party: [faintedLead(30)],
      bag: { ...s.bag, revive: 2 },
    };
    const next = useHealingItem(s, 'revive');
    expect(next.bag.revive).toBe(1);
    expect(next.party[0]!.currentHp).toBe(15);
  });

  it('revive uses floor for odd max HP', () => {
    let s = createInitialStateV3();
    s = {
      ...s,
      starterChosen: true,
      activePokemonId: 'a',
      party: [faintedLead(31)],
      bag: { ...s.bag, revive: 1 },
    };
    const next = useHealingItem(s, 'revive');
    expect(next.party[0]!.currentHp).toBe(15);
  });

  it('revive no-ops when lead is not fainted', () => {
    let s = createInitialStateV3();
    const mon = { ...faintedLead(30), currentHp: 12 };
    s = {
      ...s,
      starterChosen: true,
      activePokemonId: 'a',
      party: [mon],
      bag: { ...s.bag, revive: 2 },
    };
    const next = useHealingItem(s, 'revive');
    expect(next.bag.revive).toBe(2);
    expect(next.party[0]!.currentHp).toBe(12);
  });

  it('potion does not heal fainted lead or consume item', () => {
    let s = createInitialStateV3();
    s = {
      ...s,
      starterChosen: true,
      activePokemonId: 'a',
      party: [faintedLead(40)],
      bag: { ...s.bag, potion: 4 },
    };
    const next = useHealingItem(s, 'potion');
    expect(next.bag.potion).toBe(4);
    expect(next.party[0]!.currentHp).toBe(0);
    expect(next.lastBattleLog).toContain('Revive');
  });
});

describe('learnMoveAction', () => {
  it('rejects moves that are not type-legal for the species', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 1);
    const id = s.party[0]!.id;
    const before = [...(s.party[0]!.moves ?? [])];
    const next = learnMoveAction(s, id, 'ember');
    expect(next.party[0]!.moves).toEqual(before);
  });

  it('rejects moves that are not unlocked on the learnset at current level', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 4);
    const mon = s.party[0]!;
    const unlocked = new Set(getUnlockedLearnsetMoveIds(mon.dexNum, mon.level));
    const notYet = (Object.keys(MOVES) as string[]).find(
      (id) => !unlocked.has(id) && isMoveTypeLegalForSpecies(mon.types, MOVES[id]!),
    );
    expect(notYet).toBeTruthy();
    const before = [...(s.party[0]!.moves ?? [])];
    const next = learnMoveAction(s, mon.id, notYet!);
    expect(next.party[0]!.moves).toEqual(before);
  });

  it('appends an unlocked learnset move when there is room', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 4);
    let mon = s.party[0]!;
    let unlocked = getUnlockedLearnsetMoveIds(mon.dexNum, mon.level);
    let cand = unlocked.find((m) => !(mon.moves ?? []).includes(m));
    if (!cand && (mon.moves ?? []).length > 0) {
      s = forgetMoveAction(s, mon.id, dedupeMoveIds(mon.moves ?? [])[0]!);
      mon = s.party[0]!;
      unlocked = getUnlockedLearnsetMoveIds(mon.dexNum, mon.level);
      cand = unlocked.find((m) => !(mon.moves ?? []).includes(m));
    }
    expect(cand).toBeTruthy();
    const next = learnMoveAction(s, mon.id, cand!);
    expect(next.party[0]!.moves?.includes(cand!)).toBe(true);
  });

  it('replaces a slot when moveset is full', () => {
    let s = createInitialStateV2();
    s = chooseStarter(s, 4);
    const lv = 42;
    s = { ...s, party: [{ ...s.party[0]!, level: lv, totalXp: 9_999_999 }] };
    const pid = s.party[0]!.id;
    const unlocked = getUnlockedLearnsetMoveIds(s.party[0]!.dexNum, lv);
    let state = s;
    let cur = dedupeMoveIds(state.party[0]!.moves ?? []);
    for (let guard = 0; guard < 12 && cur.length < 4; guard++) {
      const add = unlocked.find((m) => !cur.includes(m));
      if (!add) break;
      state = learnMoveAction(state, pid, add);
      cur = dedupeMoveIds(state.party[0]!.moves ?? []);
    }
    expect(cur.length).toBe(4);
    const swapIn = unlocked.find((m) => !cur.includes(m));
    expect(swapIn).toBeTruthy();
    const next = learnMoveAction(state, pid, swapIn!, 2);
    expect(next.party[0]!.moves![2]).toBe(swapIn);
    expect(dedupeMoveIds(next.party[0]!.moves ?? []).length).toBe(4);
  });
});
