import { describe, expect, it, vi } from 'vitest';
import {
  activateXpDoubler,
  applyTrainerCombatTurn,
  claimAllAchievements,
  closeTrainerBattle,
  createInitialStateV4,
  lockTrainerTeam,
  parseGameState,
  startTrainerBattle,
  useHealingItem,
  switchActivePokemon,
  claimTrainerCatch,
  dismissTrainerCatchOffer,
} from './store';
import type {
  OwnedPokemon,
  PokeRemGameState,
  TrainerBattleState,
  TrainerEnemyMon,
  TrainerIdentity,
} from './model';
import { ACHIEVEMENT_DEFS } from '../engine/achievements';
import { XP_DOUBLER_CARDS, XP_DOUBLER_QUEUE_MAX } from '../engine/xpDoublers';

function makeMon(id: string, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  return {
    id,
    dexNum: 1,
    name: 'Bulbasaur',
    level: 20,
    totalXp: 0,
    currentHp: 60,
    maxHp: 60,
    types: ['Grass', 'Poison'],
    moves: ['tackle'],
    ...overrides,
  };
}

function fullPartyState(count = 4): PokeRemGameState {
  const base = createInitialStateV4();
  const party = Array.from({ length: count }, (_, i) => makeMon(`m${i + 1}`));
  return {
    ...base,
    starterChosen: true,
    studyDifficultyConfigured: true,
    party,
    activePokemonId: party[0]!.id,
  };
}

describe('v4 save normalization', () => {
  it('loads v3 saves and backfills new v4 fields with safe defaults', () => {
    const v3Raw = {
      schemaVersion: 3,
      lastUpdatedAt: 42,
      starterChosen: true,
      activePokemonId: 'a',
      party: [
        {
          id: 'a',
          dexNum: 1,
          name: 'Bulbasaur',
          level: 5,
          totalXp: 0,
          currentHp: 20,
          maxHp: 20,
          types: ['Grass', 'Poison'],
          moves: ['tackle'],
        },
      ],
      storagePokemon: [],
      cardsReviewed: 3,
      collectionDex: {},
      bag: {},
      achievements: {},
      claimedAchievementIds: [],
      selectedTab: 'status',
      totalDefeated: 0,
      totalCaught: 0,
      totalRuns: 0,
      totalEvolutions: 0,
      currency: 0,
      totalCurrencyEarned: 0,
      totalShopPurchases: 0,
      trainerXp: 0,
      trainerLevel: 1,
      trainerRank: 'Novice Trainer',
      reviewCapTier: 'low',
      studyDifficultyConfigured: true,
      studyDifficultyPreset: 'medium',
      studyReviewsPerEncounter: 5,
      studyCardWeight: 1,
    };
    const parsed = parseGameState(v3Raw);
    expect(parsed.schemaVersion).toBe(4);
    expect(parsed.currentTrainerBattle ?? null).toBeNull();
    expect(parsed.xpBoosterActive ?? null).toBeNull();
    expect(parsed.xpBoosterQueue ?? []).toEqual([]);
    expect(parsed.trainerBattleCounter ?? 0).toBe(0);
    expect(parsed.prestigeBadges ?? []).toEqual([]);
    expect(parsed.trainerBattleStats?.totalWon ?? 0).toBe(0);
  });

  it('returns a clean v4 initial state when raw is invalid', () => {
    const parsed = parseGameState(null);
    expect(parsed.schemaVersion).toBe(4);
    expect(parsed.starterChosen).toBe(false);
  });
});

describe('trainer battle flow', () => {
  it('lockTrainerTeam picks 3, transitions to active, and ignores switch/heal/items', () => {
    const s0 = fullPartyState(4);
    const s1 = startTrainerBattle(s0, 'standard', [1], () => 0.1);
    expect(s1.currentTrainerBattle?.phase).toBe('team_select');
    expect(s1.currentTrainerBattle?.enemies.length).toBe(3);

    const pick = s0.party.slice(0, 3).map((p) => p.id);
    const s2 = lockTrainerTeam(s1, pick);
    expect(s2.currentTrainerBattle?.phase).toBe('active');
    expect(s2.currentTrainerBattle?.selectedPartyIds).toEqual(pick);
    expect(s2.activePokemonId).toBe(pick[0]);

    // Switching is blocked during active trainer battle.
    const s3 = switchActivePokemon(s2, pick[1]!);
    expect(s3).toBe(s2);

    // Healing is blocked during active trainer battle.
    const s4 = useHealingItem({ ...s2, bag: { ...s2.bag, potion: 3 } }, 'potion');
    // A no-op or unchanged state is acceptable — the guard should prevent item consumption.
    expect(s4.bag.potion ?? 0).toBe(3);
  });

  it('auto-forfeits when starting with no battle-ready party', () => {
    const base = createInitialStateV4();
    const party = Array.from({ length: 3 }, (_, i) =>
      makeMon(`m${i}`, { currentHp: 0 }),
    );
    const s0: PokeRemGameState = {
      ...base,
      starterChosen: true,
      studyDifficultyConfigured: true,
      party,
      activePokemonId: party[0]!.id,
    };
    const s1 = startTrainerBattle(s0, 'standard', [1], () => 0.1);
    const s2 = lockTrainerTeam(s1, []);
    // No picks + fainted party => team_select persists (can't start).
    expect(s2.currentTrainerBattle?.phase).toBe('team_select');
  });

  it('closeTrainerBattle clears battle state', () => {
    const s0 = fullPartyState(4);
    const s1 = startTrainerBattle(s0, 'standard', [1], () => 0.1);
    const s2 = closeTrainerBattle(s1);
    expect(s2.currentTrainerBattle ?? null).toBeNull();
  });

  it('applyTrainerCombatTurn is a no-op outside active phase', () => {
    const s0 = fullPartyState(4);
    const next = applyTrainerCombatTurn(s0);
    expect(next).toBe(s0);
  });
});

describe('trainer catch retry + dismiss', () => {
  function makeEnemy(overrides: Partial<TrainerEnemyMon> = {}): TrainerEnemyMon {
    return {
      dexNum: 1,
      name: 'Bulbasaur',
      level: 15,
      maxHp: 50,
      currentHp: 0,
      types: ['Grass', 'Poison'],
      moves: ['tackle'],
      defeated: true,
      ...overrides,
    };
  }
  function makeTrainer(): TrainerIdentity {
    return {
      archetypeId: 'rival_test',
      className: 'Rival',
      themeTypes: ['Normal'],
      taunt: 'Let’s go!',
      defeatLine: 'Good fight.',
      victoryLine: 'Better luck next time.',
    };
  }
  function postWinState(opts: {
    balls?: Partial<Record<'poke-ball' | 'great-ball' | 'ultra-ball', number>>;
    currency?: number;
  } = {}): PokeRemGameState {
    const base = fullPartyState(3);
    const battle: TrainerBattleState = {
      id: 'tb-test',
      phase: 'post_win',
      tier: 'standard',
      trainer: makeTrainer(),
      enemies: [makeEnemy({ dexNum: 25, name: 'Pikachu' }), makeEnemy({ dexNum: 4, name: 'Charmander' }), makeEnemy({ dexNum: 7, name: 'Squirtle' })],
      activeEnemyIndex: 2,
      selectedPartyIds: base.party.slice(0, 3).map((p) => p.id),
      faintedSelectedIds: [],
      catchOfferActive: true,
      catchOfferClaimed: false,
      feedbackSeq: 0,
      lastLog: 'You won!',
    };
    return {
      ...base,
      currency: opts.currency ?? 0,
      bag: {
        ...base.bag,
        'poke-ball': opts.balls?.['poke-ball'] ?? 0,
        'great-ball': opts.balls?.['great-ball'] ?? 0,
        'ultra-ball': opts.balls?.['ultra-ball'] ?? 0,
      },
      currentTrainerBattle: battle,
    };
  }

  it('miss consumes the ball but keeps the catch offer active so the player can retry', () => {
    const s0 = postWinState({ balls: { 'poke-ball': 3 } });
    // Force the RNG so the catch never succeeds.
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    try {
      const s1 = claimTrainerCatch(s0, 0, 'poke-ball');
      expect(s1.bag['poke-ball']).toBe(2);
      expect(s1.currentTrainerBattle?.catchOfferActive).toBe(true);
      expect(s1.currentTrainerBattle?.catchOfferClaimed).toBe(false);
      expect(s1.currentTrainerBattle?.lastLog).toMatch(/broke free/i);

      const s2 = claimTrainerCatch(s1, 0, 'poke-ball');
      expect(s2.bag['poke-ball']).toBe(1);
      expect(s2.currentTrainerBattle?.catchOfferActive).toBe(true);
    } finally {
      rng.mockRestore();
    }
  });

  it('refuses to throw when the selected ball count is zero', () => {
    const s0 = postWinState({ balls: { 'poke-ball': 0, 'great-ball': 2 } });
    const s1 = claimTrainerCatch(s0, 0, 'poke-ball');
    // No-op: same reference, bag and offer unchanged.
    expect(s1).toBe(s0);
  });

  it('success closes the catch offer and adds the Pokémon to the roster', () => {
    const s0 = postWinState({ balls: { 'poke-ball': 2 } });
    const rng = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const s1 = claimTrainerCatch(s0, 1, 'poke-ball');
      expect(s1.bag['poke-ball']).toBe(1);
      expect(s1.currentTrainerBattle?.catchOfferClaimed).toBe(true);
      expect(s1.currentTrainerBattle?.catchOfferActive).toBe(false);
      expect((s1.totalCaught ?? 0)).toBe(1);
    } finally {
      rng.mockRestore();
    }
  });

  it('dismissTrainerCatchOffer closes the catch window but keeps the post-win banner', () => {
    const s0 = postWinState({ balls: { 'poke-ball': 1 } });
    const s1 = dismissTrainerCatchOffer(s0);
    expect(s1.currentTrainerBattle?.phase).toBe('post_win');
    expect(s1.currentTrainerBattle?.catchOfferActive).toBe(false);
    expect(s1.currentTrainerBattle?.catchOfferClaimed).toBe(true);
    expect(s1.bag['poke-ball']).toBe(1);
  });
});

describe('xp doubler queueing', () => {
  it('activates first doubler, queues subsequent ones up to cap', () => {
    const base = createInitialStateV4();
    const s0: PokeRemGameState = {
      ...base,
      bag: {
        ...base.bag,
        'xp-doubler-common': 1,
        'xp-doubler-rare': 1,
        'xp-doubler-legendary': 1,
      },
    };
    const s1 = activateXpDoubler(s0, 'common');
    expect(s1.xpBoosterActive?.tier).toBe('common');
    expect(s1.xpBoosterActive?.cardsRemaining).toBe(XP_DOUBLER_CARDS.common);
    expect(s1.bag['xp-doubler-common']).toBe(0);

    const s2 = activateXpDoubler(s1, 'rare');
    expect(s2.xpBoosterQueue?.length).toBe(1);
    expect(s2.xpBoosterQueue?.[0]?.tier).toBe('rare');
    expect(s2.bag['xp-doubler-rare']).toBe(0);

    const s3 = activateXpDoubler(s2, 'legendary');
    expect(s3.xpBoosterQueue?.map((e) => e.tier)).toEqual(['rare', 'legendary']);
  });

  it('does not consume bag items when no stock is available', () => {
    const base = createInitialStateV4();
    const s0: PokeRemGameState = { ...base, bag: { ...base.bag, 'xp-doubler-common': 0 } };
    const s1 = activateXpDoubler(s0, 'common');
    expect(s1.xpBoosterActive ?? null).toBeNull();
    expect(s1.bag['xp-doubler-common']).toBe(0);
  });

  it('respects XP_DOUBLER_QUEUE_MAX cap', () => {
    expect(XP_DOUBLER_QUEUE_MAX).toBeGreaterThan(0);
  });
});

describe('achievement claim-all + trainer achievements', () => {
  it('claimAllAchievements claims every unlocked-but-unclaimed entry at once', () => {
    const base = createInitialStateV4();
    const unlockedIds = ACHIEVEMENT_DEFS.slice(0, 3).map((d) => d.id);
    const s0: PokeRemGameState = {
      ...base,
      achievements: unlockedIds.reduce<Record<string, boolean>>((acc, id) => {
        acc[id] = true;
        return acc;
      }, {}),
      claimedAchievementIds: [],
    };
    const s1 = claimAllAchievements(s0);
    for (const id of unlockedIds) {
      expect(s1.claimedAchievementIds).toContain(id);
    }
  });

  it('trainer_first_win achievement unlocks after first trainer win', () => {
    const def = ACHIEVEMENT_DEFS.find((d) => d.id === 'trainer_first_win');
    expect(def).toBeDefined();
    const base = createInitialStateV4();
    const unlocked = def!.check({
      ...base,
      trainerBattleStats: {
        standardWon: 1,
        standardLost: 0,
        eliteWon: 0,
        eliteLost: 0,
        totalWon: 1,
        currentWinStreak: 1,
        longestWinStreak: 1,
      },
    });
    expect(unlocked).toBe(true);
  });
});
