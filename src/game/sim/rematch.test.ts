import { describe, expect, it } from 'vitest';
import {
  chooseStarter,
  createInitialStateV2,
  lockTrainerTeam,
  rematchTrainer,
  resolveTrainerBattle,
  startTrainerBattle,
  trainerRematchCost,
} from '../state/store';
import { seededRng } from './simulate';

describe('trainer rematch', () => {
  const lost = () => {
    let s = chooseStarter(createInitialStateV2(), 4);
    s = { ...s, currency: 5000 };
    s = startTrainerBattle(s, 'standard', [1], seededRng(3));
    s = lockTrainerTeam(s, [s.party[0]!.id]);
    s = { ...s, party: s.party.map((p) => ({ ...p, currentHp: 0 })) };
    return resolveTrainerBattle(s, 'loss');
  };

  it('heals the party for the Center price and faces the same trainer again', () => {
    const s = lost();
    const cost = trainerRematchCost(s);
    expect(cost).toBeGreaterThan(0);
    const again = rematchTrainer(s);
    expect(again.currentTrainerBattle?.phase).toBe('team_select');
    expect(again.currentTrainerBattle?.trainer).toEqual(s.currentTrainerBattle?.trainer);
    expect(again.currentTrainerBattle?.enemies.every((e) => e.currentHp === e.maxHp)).toBe(true);
    expect(again.party.every((p) => p.currentHp === p.maxHp)).toBe(true);
    expect(again.currency).toBe(s.currency - cost);
  });

  it('is refused when you cannot afford the heal, and only after a loss', () => {
    const s = lost();
    const broke = { ...s, currency: 0 };
    expect(rematchTrainer(broke)).toBe(broke);
    const fresh = startTrainerBattle(chooseStarter(createInitialStateV2(), 4), 'standard', [1], seededRng(1));
    expect(rematchTrainer(fresh)).toBe(fresh);
  });
});
