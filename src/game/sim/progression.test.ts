import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFS, GYM_BADGES } from '../engine/achievements';
import { activeQuests, questViews, rollQuests } from '../engine/quests';
import { claimQuest, chooseStarter, createInitialStateV2, onQueueCardComplete, parseGameState } from '../state/store';
import { MAX_TRAINER_LEVEL } from '../engine/trainerLevel';
import { SPECIES_LIST } from '../data/species';
import { everydayPool, isEventSpecies } from '../engine/speciesPool';
import type { PokeRemGameState } from '../state/model';

describe('quests', () => {
  const start = chooseStarter(createInitialStateV2(), 4);

  it('offers three daily and two weekly quests that stay fixed for the day', () => {
    const qs = rollQuests(start, new Date(2026, 10, 3, 9));
    const list = activeQuests(qs);
    expect(list.filter((q) => q.period === 'daily')).toHaveLength(3);
    expect(list.filter((q) => q.period === 'weekly')).toHaveLength(2);
    for (let d = 1; d <= 60; d++) {
      const daily = activeQuests(rollQuests(start, new Date(2026, 0, d))).filter((q) => q.period === 'daily');
      expect(new Set(daily.map((q) => q.metric)).size).toBe(3);
    }
    expect(activeQuests(rollQuests({ ...start, quests: qs }, new Date(2026, 10, 3, 22)))).toEqual(list);
  });

  it('counts progress from the start of the period and pays out once', () => {
    let s: PokeRemGameState = { ...start, quests: rollQuests(start) };
    const quest = questViews(s).find((q) => q.period === 'daily')!;
    expect(quest.done).toBe(false);
    // Pretend the period started `target` units ago.
    const qs = s.quests!;
    s = { ...s, quests: { ...qs, dayBase: { ...qs.dayBase, [quest.metric]: qs.dayBase[quest.metric] - quest.target } } };
    const view = questViews(s).find((q) => q.id === quest.id)!;
    expect(view.done).toBe(true);
    const claimed = claimQuest(s, view.id);
    expect(claimed.currency).toBe(s.currency + view.coins);
    expect(claimQuest(claimed, view.id)).toBe(claimed);
  });

  it('resets daily claims on a new day but keeps the week', () => {
    const qs = { ...rollQuests(start, new Date(2026, 10, 3)), claimed: ['d-review-30', 'w-review-400'] };
    const next = rollQuests({ ...start, quests: qs }, new Date(2026, 10, 4));
    expect(next.claimed).toEqual(['w-review-400']);
  });

  it('survives a save round-trip', () => {
    const s = onQueueCardComplete(start, [1, 2], 3, {});
    const loaded = parseGameState(JSON.parse(JSON.stringify(s)));
    expect(loaded.quests).toEqual(s.quests);
    expect(loaded.enabledGenerations).toEqual([1, 2]);
  });
});

describe('every achievement is earnable', () => {
  it('has no goal above the trainer level cap', () => {
    const levelGoals = ACHIEVEMENT_DEFS.filter((d) => /trainer level|trainer Lv/i.test(d.description));
    for (const d of levelGoals) {
      const n = Number(/(\d+)/.exec(d.description)?.[1] ?? 0);
      expect(n).toBeLessThanOrEqual(MAX_TRAINER_LEVEL);
    }
  });

  it('can reach every species of every generation in the wild (everyday or event)', () => {
    const gens = [...new Set(SPECIES_LIST.map((s) => s.generation))];
    const reachable = new Set([...everydayPool(100, gens, true)]);
    for (const s of SPECIES_LIST) if (isEventSpecies(s.dexNum)) reachable.add(s.dexNum);
    const missing = SPECIES_LIST.filter((s) => !reachable.has(s.dexNum)).map((s) => s.name);
    expect(missing).toEqual([]);
  });

  it('awards gym badges for trainer wins', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    const won = parseGameState(JSON.parse(JSON.stringify({ ...s, trainerBattleStats: { standardWon: 3, standardLost: 0, eliteWon: 0, eliteLost: 0, totalWon: 3, currentWinStreak: 3, longestWinStreak: 3 } })));
    expect(won.achievements['badge_1']).toBe(true);
    expect(won.achievements['badge_2']).toBe(true);
    expect(won.achievements['badge_3']).toBe(false);
    expect(GYM_BADGES).toHaveLength(8);
  });

  it('counts levels in storage, not just the party', () => {
    const s = chooseStarter(createInitialStateV2(), 4);
    const lv = parseGameState(JSON.parse(JSON.stringify({ ...s, storagePokemon: [{ ...s.party[0]!, id: 'st', level: 52 }] })));
    expect(lv.achievements['level50']).toBe(true);
  });
});
