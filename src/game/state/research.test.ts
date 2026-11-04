import { describe, expect, it } from 'vitest';
import { TEAM_BIRD } from '../engine/rarity';
import { researchView } from '../engine/research';
import type { PokeRemGameState } from './model';
import { chooseStarter, claimResearch, createInitialStateV4, onQueueCardComplete, parseGameState } from './store';
import { withTouch } from './reducers/core';

const started = (): PokeRemGameState => withTouch(chooseStarter(createInitialStateV4(), 4));

describe('Special Research (SPEC B4)', () => {
  it('starts Field Studies from where your counters stand, so old progress does not count', () => {
    const s = withTouch({ ...started(), cardsReviewed: 5000, research: undefined });
    const v = researchView(s);
    expect(v.line.id).toBe('field-studies');
    expect(v.current).toBe(0);
  });

  it('advances step by step, then Claim pays and starts the next line', () => {
    let s = started();
    const base = s.cardsReviewed;
    s = withTouch({ ...s, cardsReviewed: base + 300 });
    expect(researchView(s).step).toBe(1);
    const species = Object.keys(s.collectionDex).length;
    const dex = { ...s.collectionDex };
    for (let i = 0; i < 10; i++) dex[300 + i] = 1;
    s = withTouch({ ...s, collectionDex: dex });
    expect(Object.keys(s.collectionDex).length).toBeGreaterThanOrEqual(species + 10);
    expect(researchView(s).step).toBe(2);
    s = withTouch({ ...s, totalEvolutions: (s.totalEvolutions ?? 0) + 3 });
    expect(researchView(s).done).toBe(true);
    const before = s.currency;
    const claimed = claimResearch(s);
    expect(claimed.currency - before).toBe(15000);
    expect(researchView(claimed).line.id).toBe('rocket-investigation');
    expect(claimResearch(claimed)).toBe(claimed);
    expect(parseGameState(JSON.parse(JSON.stringify(claimed))).research?.lineId).toBe('rocket-investigation');
  });

  it('the team line ends in a sighting of your team bird on the next wild', () => {
    const s0 = { ...started(), team: 'tide' as const };
    const done = withTouch({ ...s0, research: { lineId: 'team-bird', step: 3, progress: 0, completed: [] } });
    const claimed = claimResearch(done);
    expect(claimed.research?.birdPending).toBe(true);
    let s = { ...claimed, encounterProgress: 0 };
    for (let i = 0; i < 20 && !s.currentEncounter; i++) s = onQueueCardComplete({ ...s, trainerBattleCounter: -1000 }, [1], 1, {});
    expect(s.currentEncounter?.dexNum).toBe(TEAM_BIRD.tide);
    expect(s.research?.birdPending).toBeUndefined();
  });
});
