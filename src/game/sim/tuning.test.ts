import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { CURRENCY_REWARDS } from '../engine/shop';
import {
  chooseStarter,
  configureStudyDifficulty,
  createInitialStateV4,
  onQueueCardComplete
} from '../state/store';
import {
  expandBalanceGrid,
  validateCandidate,
  withBalanceCandidate,
  scoreBalanceBands,
  missingSearchBands
} from './tuning';

describe('bounded balance search', () => {
  it('rejects fixed rules, unknown fields, nonfinite values and out-of-range candidates', () => {
    for (const candidate of [
      { 'xp.studyLeadMult': 2 },
      { 'xp.levelDampSpan': 20 },
      { 'storage.base': 90 },
      { 'coins.review': 26 },
      { 'coins.review': NaN }
    ])
      expect(() => validateCandidate(candidate)).toThrow();
    expect(() => validateCandidate({ 'coins.catchBase': 200 })).toThrow(/Catch/);
    expect(() =>
      validateCandidate({ 'rocket.leaderCoinMin': 25000, 'rocket.leaderCoinMax': 5000 })
    ).toThrow(/minimum/);
  });

  it('expands a deterministic grid, includes baseline and dedupes unchanged settings', () => {
    const current = BALANCE.coins.review;
    const grid = expandBalanceGrid({
      'coins.review': [current, current, 10],
      'quests.scale': [0.6, 0.8]
    });
    expect(grid).toHaveLength(4);
    expect(grid[0]).toEqual({});
    expect(() =>
      expandBalanceGrid({ 'coins.review': [5, 6, 7], 'xp.studyPerCard': [1, 2, 3] }, 4)
    ).toThrow(/exceeds/);
    expect(() => expandBalanceGrid({ 'bounty.chance': [1] })).toThrow(/Appendix/);
  });

  it('changes real review rewards in the simulation and restores the captured alias afterwards', () => {
    const before = BALANCE.coins.review;
    const alias = CURRENCY_REWARDS.review;
    withBalanceCandidate({ 'coins.review': 10 }, () => {
      const initial = configureStudyDifficulty(chooseStarter(createInitialStateV4(), 4), 'medium');
      const next = onQueueCardComplete(initial, [1], 1000);
      // lastStudyReward reports any lucky roll separately; use the captured shop constant to prove the card path.
      expect(next.currency - initial.currency - (next.lastStudyReward?.bonus ?? 0)).toBe(10);
      expect(CURRENCY_REWARDS.review).toBe(10);
    });
    expect(BALANCE.coins.review).toBe(before);
    expect(CURRENCY_REWARDS.review).toBe(alias);
  });

  it('scores controllable bands without optimizing fixed rarity rolls, and reports missing coverage', () => {
    const good = [{ id: 'income-early', target: '', measured: '₽8500', pass: true }];
    const bad = [{ id: 'income-early', target: '', measured: '₽13000', pass: false }];
    expect(scoreBalanceBands(good)).toBeLessThan(scoreBalanceBands(bad));
    expect(
      scoreBalanceBands([...good, { id: 'bird', target: '', measured: '1/999', pass: false }])
    ).toBe(scoreBalanceBands(good));
    expect(missingSearchBands(good)).toContain('abuse');
    expect(missingSearchBands(good)).not.toContain('income-early');
  });

  it('restores all constants even when a candidate run throws', () => {
    const before = BALANCE.xp.studyPerCard;
    expect(() =>
      withBalanceCandidate({ 'xp.studyPerCard': 1 }, () => {
        throw new Error('test failure');
      })
    ).toThrow('test failure');
    expect(BALANCE.xp.studyPerCard).toBe(before);
  });
});
