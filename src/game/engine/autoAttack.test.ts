import { describe, expect, it, vi } from 'vitest';
import { planAutoAttack } from './autoAttack';
import { damageForMove } from './combatExchange';
import { applyCombatTurn, chooseStarter, createInitialStateV4 } from '../state/store';
function fixture() {
  const s = chooseStarter(createInitialStateV4(), 4);
  s.party[0] = { ...s.party[0], level: 10, moves: ['scratch'], currentHp: 500, maxHp: 500 };
  s.currentEncounter = { dexNum: 1, name: 'Bulbasaur', level: 5, types: ['Grass', 'Poison'], maxHp: 200, currentHp: 200 };
  return s;
}
describe('auto attack safety', () => {
  it('stops at the critical-hit ceiling, including exact equality', () => {
    const s = fixture(), lead = s.party[0];
    const ceiling = damageForMove(lead.level, 'scratch', lead.types, s.currentEncounter!.types, true);
    s.currentEncounter!.currentHp = ceiling;
    expect(planAutoAttack(s).moveId).toBeUndefined();
    s.currentEncounter!.currentHp++;
    expect(planAutoAttack(s).moveId).toBe('scratch');
  });
  it('never consumes randomness or mutates a save while planning', () => {
    const s = fixture(), before = JSON.stringify(s), random = vi.spyOn(Math, 'random');
    planAutoAttack(s);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(s)).toBe(before);
    random.mockRestore();
  });
  it('rechecks level gains before choosing another turn', () => {
    const s = fixture();
    s.currentEncounter!.currentHp = 50;
    expect(planAutoAttack(s).moveId).toBe('scratch');
    s.party[0].level = 100;
    expect(planAutoAttack(s).moveId).toBeUndefined();
  });
  it('stops for a fainted lead, ended encounter, or trainer battle', () => {
    const s = fixture(); s.party[0].currentHp = 0;
    expect(planAutoAttack(s).moveId).toBeUndefined();
    s.party[0].currentHp = 100; s.currentEncounter = null;
    expect(planAutoAttack(s).moveId).toBeUndefined();
    const trainer = fixture(); trainer.currentTrainerBattle = {} as any;
    expect(planAutoAttack(trainer).moveId).toBeUndefined();
  });
  it('stops instead of looping on immune targets or status-only moves', () => {
    const s = fixture(); s.currentEncounter!.types = ['Ghost'];
    expect(planAutoAttack(s).moveId).toBeUndefined();
    s.currentEncounter!.types = ['Grass']; s.party[0].moves = ['growl'];
    expect(planAutoAttack(s).moveId).toBeUndefined();
  });
  it('repeated real combat turns leave the wild alive even with every hit critical', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      let s = fixture(), turns = 0;
      while (planAutoAttack(s).moveId && turns < 100) {
        s = applyCombatTurn(s, planAutoAttack(s).moveId); turns++;
      }
      expect(turns).toBeGreaterThan(1); expect(turns).toBeLessThan(100);
      expect(s.currentEncounter!.currentHp).toBeGreaterThan(0);
      expect(planAutoAttack(s).message).toContain('Catch');
    } finally { random.mockRestore(); }
  });
});
