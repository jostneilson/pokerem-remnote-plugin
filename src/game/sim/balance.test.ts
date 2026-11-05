import { describe, expect, it } from 'vitest';
import { BALANCE, catchCoins, defeatCoins } from '../balance';
import { evaluateBands, runBalance, type BalanceRun } from './balance';

/*
 * SPEC C2 bands on a small sample (2 seeds, Medium). The full matrix lives in `npm run balance:tune`
 * (docs/update-1.6.0/BALANCE_REPORT.md); this keeps the committed constants from drifting out of band.
 * Rarity bands need far more encounters than a test can afford, so they're only checked by the tuner.
 */
const runs: BalanceRun[] = [];
const sample = () => {
  if (!runs.length) {
    for (const policy of ['keep-team', 'fighter', 'farmer'] as const)
      for (const seed of [1, 2]) runs.push(runBalance(policy, 'medium', seed, { days: 60 }));
  }
  return evaluateBands(runs, 'medium');
};
const band = (id: string) => sample().find((b) => b.id === id);

describe('balance bands (Medium, 2 seeds × 60 days)', () => {
  it.each(['level@500', 'level@1000', 'level@3000', 'keep-gap@1000', 'catch-gap'])(
    '%s is in band',
    (id) => {
      expect(band(id)?.pass, `${id} measured ${band(id)?.measured}`).toBe(true);
    },
    120_000
  );

  it.each(['mix-claims', 'mix-variable', 'variance', 'abuse'])(
    '%s is in band',
    (id) => {
      expect(band(id)?.pass, `${id} measured ${band(id)?.measured}`).toBe(true);
    },
    120_000
  );

  // The early-income ceiling is the actual C2 bound, not the inherited relaxed 12.5k guard.
  it('early recurring income stays within the band', () => {
    const v = Number(band('income-early')!.measured.replace(/[^\d]/g, ''));
    expect(v).toBeGreaterThanOrEqual(7000);
    expect(v).toBeLessThanOrEqual(10_000);
  }, 120_000);

  it('battle base rewards stay within the actual 30–50% band', () => {
    expect(band('mix-battles')?.pass, band('mix-battles')?.measured).toBe(true);
  }, 120_000);

  it('separates battle-variable rewards and records real spending', () => {
    sample();
    for (const run of runs) {
      expect(run.variableBattleCoins).toBeGreaterThanOrEqual(0);
      expect(run.variableBattleCoins).toBeLessThanOrEqual(run.variableCoins);
      expect(run.cardTrickle).toBe(run.final.cardsReviewed * BALANCE.coins.review);
      expect(
        Object.values(run.coinsSpentBySource).reduce((sum, value) => sum + value, 0)
      ).toBeGreaterThan(0);
    }
  }, 120_000);

  it('books all trainer-level and achievement milestones on their actual day', () => {
    sample();
    for (const run of runs) {
      expect(run.days.reduce((sum, day) => sum + day.milestoneCoins, 0)).toBe(
        run.coinsBySource.milestones
      );
    }
  }, 120_000);

  it('simulated players can recover instead of stalling forever at a protected encounter', () => {
    sample();
    for (const run of runs) {
      expect(
        run.final.currentEncounter && run.final.party.every((mon) => mon.currentHp <= 0)
      ).not.toBe(true);
    }
  }, 120_000);

  it('records combat and first-shiny evidence without counting prizes as Leader challenges', () => {
    sample();
    for (const run of runs) {
      expect(run.trainerWins).toBeLessThanOrEqual(run.trainerBattles);
      expect(run.leaderWins).toBeLessThanOrEqual(run.rocketLeaders);
      expect(run.rocketLeaders).toBeLessThanOrEqual(run.trainerBattles);
      expect(run.ordinaryLeadFaints).toBeLessThanOrEqual(run.ordinaryCombatTurns);
      expect(
        run.firstShinyDay === null
          ? run.shinies === 0
          : run.firstShinyDay >= 1 && run.firstShinyDay <= run.days.length
      ).toBe(true);
    }
  }, 120_000);

  it('defeating always pays more than catching', () => {
    for (let lv = 1; lv <= 100; lv++) expect(defeatCoins(lv)).toBeGreaterThan(catchCoins(lv));
  });
});
