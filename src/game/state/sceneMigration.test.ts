import { describe, expect, it } from 'vitest';
import { AREA_MAX_ENCOUNTERS, AREA_MIN_ENCOUNTERS, BATTLE_SCENE_COUNT } from '../engine/battleAmbience';
import { withSeededRandom } from '../sim/simulate';
import { nextArea } from './reducers/encounter';
import {
  chooseStarter,
  configureStudyDifficulty,
  createInitialStateV4,
  onQueueCardComplete,
  parseGameState,
  runFromEncounter
} from './store';

const roundTrip = (s: unknown) => parseGameState(JSON.parse(JSON.stringify(s)));

describe('battle scene index migration', () => {
  it('parsing the same save 50 times never moves the arena', () => {
    for (let scene = 0; scene < BATTLE_SCENE_COUNT; scene++) {
      let s = roundTrip({ ...createInitialStateV4(), battleSceneIndex: scene, sceneIndexVersion: 2 });
      for (let i = 0; i < 50; i++) s = roundTrip(s);
      expect(s.battleSceneIndex).toBe(scene);
      expect(s.area?.sceneIndex).toBe(scene);
    }
  });

  it('a pre-1.6.0 save is remapped once, then stays put', () => {
    const legacy = { ...createInitialStateV4(), battleSceneIndex: 15 } as Record<string, unknown>;
    delete legacy.sceneIndexVersion;
    const once = roundTrip(legacy);
    expect(once.battleSceneIndex).toBe(14);
    expect(once.sceneIndexVersion).toBe(2);
    let s = once;
    for (let i = 0; i < 50; i++) s = roundTrip(s);
    expect(s.battleSceneIndex).toBe(14);
  });

  it('plain cards never change the arena', () => {
    withSeededRandom(5, () => {
      let s = configureStudyDifficulty(chooseStarter(createInitialStateV4(), 4), 'medium');
      s = { ...s, trainerBattleCounter: -100000 };
      let changesWithoutSpawn = 0;
      for (let i = 0; i < 300; i++) {
        const before = s.battleSceneIndex;
        const hadEncounter = !!s.currentEncounter;
        s = roundTrip(onQueueCardComplete(s, [1], 3, {}));
        const spawned = !hadEncounter && !!s.currentEncounter;
        if (!spawned && s.battleSceneIndex !== before) changesWithoutSpawn++;
        if (s.currentEncounter && i % 4 === 3) s = runFromEncounter(s);
      }
      expect(changesWithoutSpawn).toBe(0);
    });
  });
});

describe('areas', () => {
  it('stay for 5–8 encounters, then move to a different scene', () => {
    withSeededRandom(9, () => {
      let area = nextArea(undefined, 3, null, Math.random);
      const runs: number[] = [];
      let run = 1;
      for (let i = 0; i < 400; i++) {
        const next = nextArea(area, area.sceneIndex, null, Math.random);
        if (next.sceneIndex === area.sceneIndex && !next.isNew) run++;
        else {
          expect(next.sceneIndex).not.toBe(area.sceneIndex);
          runs.push(run);
          run = 1;
        }
        area = next;
      }
      expect(runs.length).toBeGreaterThan(40);
      for (const r of runs) {
        expect(r).toBeGreaterThanOrEqual(AREA_MIN_ENCOUNTERS);
        expect(r).toBeLessThanOrEqual(AREA_MAX_ENCOUNTERS);
      }
    });
  });

  it('a route ticket moves you into its biome at once', () => {
    const area = nextArea({ sceneIndex: 0, encountersLeft: 6 }, 0, 'frozen', () => 0.3);
    expect(area.sceneIndex).toBe(8);
    expect(area.isNew).toBe(true);
  });
});
