import { describe, expect, it } from 'vitest';
import { WILD_FLEE_AFTER_CARDS } from '../constants';
import type { PokeRemGameState } from './model';
import { chooseStarter, configureStudyDifficulty, createInitialStateV4, onQueueCardComplete, startTrainerBattle } from './store';

/** Studying with the sidebar closed must never stall the game. */
describe('idle study', () => {
  const started = () => configureStudyDifficulty(chooseStarter(createInitialStateV4(), 1), 'medium');

  it('reviewing on after a full-party catch sends it to storage, and encounters continue', () => {
    const s0 = started();
    const waiting = { ...s0, pendingCaughtMon: { ...s0.party[0]!, id: 'waiting', name: 'Paras', dexNum: 46 } };
    let s: PokeRemGameState = onQueueCardComplete(waiting);
    expect(s.pendingCaughtMon).toBeNull();
    expect(s.storagePokemon.map((p) => p.id)).toContain('waiting');
    expect(s.party.map((p) => p.id)).toEqual(waiting.party.map((p) => p.id));
    for (let i = 0; i < 40 && !s.currentEncounter; i++) s = onQueueCardComplete(s);
    expect(s.currentEncounter).toBeTruthy();
  });

  it('an unanswered trainer challenge moves on and encounters resume', () => {
    let s: PokeRemGameState = startTrainerBattle(started(), 'standard', [1], () => 0.3);
    expect(s.currentTrainerBattle?.phase).toBe('team_select');
    for (let i = 0; i < WILD_FLEE_AFTER_CARDS - 1; i++) s = onQueueCardComplete(s);
    expect(s.currentTrainerBattle).toBeTruthy();
    s = onQueueCardComplete(s);
    expect(s.currentTrainerBattle).toBeNull();
    expect(s.lastBattleLog).toMatch(/moved on/);
    for (let i = 0; i < 40 && !s.currentEncounter; i++) s = onQueueCardComplete(s);
    expect(s.currentEncounter).toBeTruthy();
  });

  it('a fainted lead hands over to a teammate who can still battle', () => {
    const s0 = started();
    const bench = { ...s0.party[0]!, id: 'bench', name: 'Lapras', dexNum: 131 };
    const s1: PokeRemGameState = { ...s0, party: [{ ...s0.party[0]!, currentHp: 0 }, bench] };
    const s = onQueueCardComplete(s1);
    expect(s.activePokemonId).toBe('bench');
    expect(s.lastBattleLog).toMatch(/takes the lead/);
  });

  it('a fully fainted team rests while you study, then wilds return', () => {
    const s0 = started();
    let s: PokeRemGameState = { ...s0, party: s0.party.map((p) => ({ ...p, currentHp: 0 })) };
    for (let i = 0; i < WILD_FLEE_AFTER_CARDS - 1; i++) s = onQueueCardComplete(s);
    expect(s.party.every((p) => p.currentHp === 0)).toBe(true);
    s = onQueueCardComplete(s);
    expect(s.party.every((p) => p.currentHp >= Math.ceil(p.maxHp / 2))).toBe(true);
    for (let i = 0; i < 40 && !s.currentEncounter && !s.currentTrainerBattle; i++) s = onQueueCardComplete(s);
    expect(s.currentEncounter || s.currentTrainerBattle).toBeTruthy();
  });
});
