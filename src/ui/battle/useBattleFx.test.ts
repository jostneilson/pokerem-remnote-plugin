import { describe, expect, it } from 'vitest';
import { FX_TIMELINES, fxReducer, hitTimeline, type BattleFx } from './useBattleFx';

const idle: BattleFx = { shake: false, intro: false, lunge: 'idle', wildHit: false, playerHit: false, sceneShake: false };

describe('battle field effects', () => {
  it('returns the same state for a no-op patch, so React skips the render', () => {
    expect(fxReducer(idle, { shake: false })).toBe(idle);
    expect(fxReducer(idle, { shake: true })).toEqual({ ...idle, shake: true });
  });

  it('every timeline ends where it started', () => {
    for (const steps of Object.values(FX_TIMELINES)) {
      const end = steps.reduce((s, step) => fxReducer(s, step.patch), idle);
      expect(end).toEqual(idle);
    }
  });

  it('hit flashes follow the lunges: the foe is hit first, then you', () => {
    const steps = hitTimeline(12, 7);
    const on = (k: 'wildHit' | 'playerHit') => steps.find((s) => s.patch[k] === true)!.at;
    expect(on('wildHit')).toBeLessThan(FX_TIMELINES.lunge[1]!.at);
    expect(on('playerHit')).toBeLessThan(FX_TIMELINES.lunge[2]!.at);
    expect(on('wildHit')).toBeLessThan(on('playerHit'));
    expect(steps.reduce((s, step) => fxReducer(s, step.patch), idle)).toEqual(idle);
  });

  it('a side that took no damage does not flash', () => {
    expect(hitTimeline(0, 5).some((s) => s.patch.wildHit === true)).toBe(false);
    expect(hitTimeline(5, 0).some((s) => s.patch.playerHit === true)).toBe(false);
  });
});
