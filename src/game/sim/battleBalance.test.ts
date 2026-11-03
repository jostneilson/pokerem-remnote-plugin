import { describe, expect, it } from 'vitest';
import { simulate, seededRng } from './simulate';
import { chooseFoeMove } from '../engine/foeAi';
import { generateTrainer } from '../engine/trainerBattles';
import { minWildLevel } from '../engine/speciesPool';
import type { Fighter } from '../engine/moveMechanics';

describe('battle balance (simulated play, 900 cards)', () => {
  const runs = [1, 2, 3].map((seed) => simulate({ cards: 900, seed, catchAt: 2 }));
  const fights = runs.flatMap((r) => r.events.filter((e) => e.kind === 'defeat' || e.kind === 'faint'));

  it('wild fights take 2–4 turns on average', () => {
    const avg = fights.reduce((a, e) => a + e.turns!, 0) / fights.length;
    expect(avg).toBeGreaterThanOrEqual(2);
    expect(avg).toBeLessThanOrEqual(4);
  });

  it('a sensible player rarely loses their lead to a wild Pokémon', () => {
    const faintRate = fights.filter((e) => e.kind === 'faint').length / fights.length;
    expect(faintRate).toBeLessThan(0.12);
  });

  it('trainer battles are winnable but not free for a player who builds a team', () => {
    const teamRuns = [4, 5, 6].map((seed) => simulate({ cards: 900, seed }));
    const t = teamRuns.flatMap((r) => r.events.filter((e) => e.kind === 'trainer_win' || e.kind === 'trainer_loss'));
    const winRate = t.filter((e) => e.kind === 'trainer_win').length / t.length;
    expect(t.length).toBeGreaterThan(10);
    expect(winRate).toBeGreaterThan(0.5);
    expect(winRate).toBeLessThan(0.95);
  });
});

describe('foe AI and trainer teams', () => {
  const squirtle: Fighter = { dexNum: 7, level: 20, types: ['Water'], currentHp: 50, maxHp: 50 };
  const charmander: Fighter = { dexNum: 4, level: 20, types: ['Fire'], currentHp: 50, maxHp: 50 };

  it('trainers almost always use their strongest move', () => {
    const rng = seededRng(3);
    const picks = Array.from({ length: 400 }, () => chooseFoeMove(squirtle, charmander, ['tackle', 'watergun'], rng, 'elite'));
    expect(picks.filter((m) => m === 'watergun').length / picks.length).toBeGreaterThan(0.85);
  });

  it('trainer teams respect evolution levels and have no repeats', () => {
    const rng = seededRng(11);
    for (let i = 0; i < 300; i++) {
      const level = 3 + (i % 40);
      const { enemies } = generateTrainer({ tier: i % 5 === 0 ? 'elite' : 'standard', enabledGens: [1, 2, 3, 4], averageLevel: level, rng });
      expect(new Set(enemies.map((e) => e.dexNum)).size).toBe(3);
      for (const e of enemies) expect(minWildLevel(e.dexNum)).toBeLessThanOrEqual(e.level);
    }
  });
});
