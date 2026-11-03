import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOVES } from '../data/moves';
import { SPECIES_LIST } from '../data/species';
import { getInitialMoves, movesetForBattle } from '../engine/moveLearn';
import { isMoveSupported, resolveExchange } from '../engine/moveMechanics';
import { battleStats } from '../engine/pokemonStats';
import { xpThresholdForLevel } from '../engine/progression';
import { REVIVE_SHOP_PRICE } from '../engine/shop';
import type { OwnedPokemon, PokeRemGameState } from './model';
import {
  applyCombatTurn,
  applyTrainerCombatTurn,
  chooseStarter,
  createInitialStateV4,
  parseGameState,
  pokemonCenterCost,
  pokemonCenterHeal,
  quickBuyBalls,
  quickHealLead,
  quickReviveLead,
} from './store';
import { withSyncedGameWrite } from './syncedGameWriteLock';

const started = (dex = 1): PokeRemGameState => chooseStarter(createInitialStateV4(), dex);
const withLead = (s: PokeRemGameState, patch: Partial<OwnedPokemon>): PokeRemGameState => ({
  ...s,
  party: s.party.map((p, i) => (i === 0 ? { ...p, ...patch } : p)),
});

describe('saving inside RemNote’s sandboxed iframe', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saves when the Locks API rejects, as it always does at an opaque origin', async () => {
    const denied = vi.fn(() => Promise.reject(new DOMException('denied', 'SecurityError')));
    vi.stubGlobal('navigator', { locks: { request: denied } });
    await expect(withSyncedGameWrite(async () => 'saved')).resolves.toBe('saved');
    expect(denied).not.toHaveBeenCalled();
  });

  it('runs queued writes one at a time and survives a failed write', async () => {
    const order: string[] = [];
    const first = withSyncedGameWrite(async () => { order.push('a:start'); await Promise.resolve(); order.push('a:end'); });
    const failed = withSyncedGameWrite(async () => { throw new Error('boom'); });
    const last = withSyncedGameWrite(async () => { order.push('c'); });
    await first;
    await expect(failed).rejects.toThrow('boom');
    await last;
    expect(order).toEqual(['a:start', 'a:end', 'c']);
  });

  it('keeps Web Locks out of the source', () => {
    const code = readFileSync('src/game/state/syncedGameWriteLock.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/navigator|locks\./);
  });
});

describe('every species can battle', () => {
  it('only equips supported moves and always has an attack', () => {
    for (const s of SPECIES_LIST) {
      for (const level of [1, 5, 20, 50, 100]) {
        const initial = getInitialMoves(s.dexNum, level);
        expect(initial.every((id) => isMoveSupported(MOVES[id])), `${s.name} L${level}`).toBe(true);
        const moves = movesetForBattle({ dexNum: s.dexNum, level, moves: initial });
        expect(moves.some((id) => MOVES[id]!.power > 0), `${s.name} L${level}`).toBe(true);
        expect(moves.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('Struggle hurts the user instead of healing it', () => {
    const f = { dexNum: 129, level: 10, types: ['Water'] as const, currentHp: 40, maxHp: 40, name: 'Karp' };
    const foe = { dexNum: 16, level: 10, types: ['Normal', 'Flying'] as const, currentHp: 60, maxHp: 60, name: 'Bird' };
    const r = resolveExchange(f as any, foe as any, 'struggle', 'splash', 'k', () => 0.5);
    expect(r.player.currentHp).toBe(30);
    expect(r.wild.currentHp).toBeLessThan(60);
  });

  it('applies "damage+raise" stat changes to the user', () => {
    const a = { dexNum: 68, level: 50, types: ['Fighting'] as const, currentHp: 200, maxHp: 200, name: 'A' };
    const d = { dexNum: 143, level: 50, types: ['Normal'] as const, currentHp: 400, maxHp: 400, name: 'D' };
    const r = resolveExchange(a as any, d as any, 'closecombat', 'splash', 'k', () => 0.5);
    expect(r.player.condition?.stages?.defense).toBe(-1);
    expect(r.wild.condition?.stages?.defense ?? 0).toBe(0);
  });
});

describe('battle balance', () => {
  it.each([1, 5, 20, 50])('a level %i starter usually wins a same-level wild fight, quickly', (level) => {
    let wins = 0;
    let turns = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      let s = started(1);
      const lead = s.party[0]!;
      const maxHp = battleStats({ ...lead, level }).hp;
      s = withLead(s, { level, totalXp: xpThresholdForLevel(level), maxHp, currentHp: maxHp, moves: getInitialMoves(1, level) });
      const hp = battleStats({ dexNum: 16, level, ivs: { hp: 2, attack: 2, defense: 2 } }).hp;
      s = { ...s, currentEncounter: { dexNum: 16, name: 'Pidgey', level, maxHp: hp, currentHp: hp, types: ['Normal', 'Flying'], ivs: { hp: 2, attack: 2, defense: 2 } } };
      let t = 0;
      while (s.currentEncounter && t < 50) { s = applyCombatTurn(s); t++; }
      turns += t;
      if (s.lastOutcomeKind !== 'faint') wins++;
    }
    expect(wins / N).toBeGreaterThan(0.85);
    expect(turns / N).toBeLessThan(9);
  });
});

describe('trainer faint flow', () => {
  it('brings out the next selected Pokémon and ends the battle when none remain', () => {
    let s = started(1);
    const lead = s.party[0]!;
    const b = { ...lead, id: 'second' };
    s = { ...s, party: [{ ...lead, currentHp: 1 }, b] };
    const enemy = { dexNum: 150, name: 'Mewtwo', level: 80, maxHp: 500, currentHp: 500, types: ['Psychic'] as any, moves: ['psychic'], defeated: false };
    s = { ...s, currentTrainerBattle: { id: 't', phase: 'active', tier: 'standard', trainer: { className: 'Ace', name: 'X' }, enemies: [enemy], activeEnemyIndex: 0, selectedPartyIds: [lead.id, 'second'], faintedSelectedIds: [], lastLog: '', feedbackSeq: 0 } as any };
    const mid = applyTrainerCombatTurn(s);
    expect(mid.activePokemonId).toBe('second');
    expect(mid.currentTrainerBattle?.faintedSelectedIds).toContain(lead.id);
    let end = withLead(mid, {});
    end = { ...end, party: end.party.map((p) => (p.id === 'second' ? { ...p, currentHp: 1 } : p)) };
    const finished = applyTrainerCombatTurn(end);
    expect(finished.currentTrainerBattle?.phase).not.toBe('active');
  });
});

describe('quick care', () => {
  const fainted = () => withLead(started(), { currentHp: 0 });

  it('revives with one from the bag without charging', () => {
    const s = { ...fainted(), currency: 0, bag: { ...fainted().bag, revive: 2 } };
    const next = quickReviveLead(s);
    expect(next.party[0]!.currentHp).toBeGreaterThan(0);
    expect(next.bag.revive).toBe(1);
    expect(next.currency).toBe(0);
  });

  it('buys and uses in one step when the bag is empty', () => {
    const s = { ...fainted(), currency: REVIVE_SHOP_PRICE + 5, bag: { ...fainted().bag, revive: 0 } };
    const next = quickReviveLead(s);
    expect(next.party[0]!.currentHp).toBeGreaterThan(0);
    expect(next.currency).toBe(5);
    expect(next.bag.revive).toBe(0);
  });

  it('changes nothing when it cannot be afforded', () => {
    const s = { ...fainted(), currency: 1, bag: { ...fainted().bag, revive: 0 } };
    expect(quickReviveLead(s)).toBe(s);
  });

  it('uses the smallest potion that covers the damage', () => {
    const base = started();
    const lead = base.party[0]!;
    const s = withLead({ ...base, bag: { ...base.bag, potion: 1, 'super-potion': 1, 'max-potion': 1 } }, { maxHp: 100, currentHp: 90 });
    const next = quickHealLead(s);
    expect(next.party[0]!.currentHp).toBe(100);
    expect(next.bag.potion).toBe(0);
    expect(next.bag['super-potion']).toBe(1);
    expect(lead.id).toBe(next.party[0]!.id);
  });

  it('heals the whole team for the quoted price, but not mid-encounter', () => {
    const base = started();
    const s = { ...base, currency: 1000, party: [{ ...base.party[0]!, maxHp: 50, currentHp: 0 }, { ...base.party[0]!, id: 'b', maxHp: 40, currentHp: 30 }] };
    const cost = pokemonCenterCost(s);
    expect(cost).toBe(50 + 100 + 10);
    const next = pokemonCenterHeal(s);
    expect(next.currency).toBe(1000 - cost);
    expect(next.party.map((p) => p.currentHp)).toEqual([50, 40]);
    const inBattle = { ...s, currentEncounter: { dexNum: 16, name: 'P', level: 1, maxHp: 9, currentHp: 9, types: ['Normal'] } } as PokeRemGameState;
    expect(pokemonCenterHeal(inBattle)).toBe(inBattle);
  });

  it('restocks only as many balls as coins allow', () => {
    const s = { ...started(), currency: 250, bag: { ...started().bag, 'poke-ball': 0 } };
    const next = quickBuyBalls(s);
    expect(next.bag['poke-ball']).toBe(2);
    expect(next.currency).toBe(50);
  });
});

describe('1.3.1 save migration', () => {
  const legacy = () => ({
    schemaVersion: 4, starterChosen: true, activePokemonId: 'a', currency: 777,
    bag: { 'poke-ball': 5 }, collectionDex: { 25: 1 }, achievements: {},
    party: [
      { id: 'a', dexNum: 25, name: 'Pikachu', nickname: 'Sparky', level: 20, totalXp: 8000, maxHp: 80, currentHp: 40, types: ['Electric'], moves: ['thundershock', 'hyperbeam', 'tackle', 'quickattack'], shiny: true },
      { id: 'b', dexNum: 129, name: 'Magikarp', level: 12, totalXp: 1728, maxHp: 45, currentHp: 0, types: ['Water'], moves: ['splash'] },
    ],
    storagePokemon: [],
  });

  it('keeps identity and progress, refills vacated slots, and is stable across reloads', () => {
    const once = parseGameState(legacy());
    const a = once.party[0]!;
    expect([a.id, a.nickname, a.level, a.totalXp, a.shiny]).toEqual(['a', 'Sparky', 20, 8000, true]);
    expect(once.currency).toBe(777);
    expect(a.currentHp / a.maxHp).toBeCloseTo(0.5, 1);
    expect(a.moves).toHaveLength(4);
    expect(a.moves).toContain('thundershock');
    expect(a.legacyMoves).toContain('hyperbeam');
    expect(once.party[1]!.currentHp).toBe(0);
    expect(parseGameState(JSON.parse(JSON.stringify(once))).party).toEqual(once.party);
  });

  it('does not refill a deliberately dropped move', () => {
    const s = parseGameState(legacy());
    // Forgetting a move by hand turns off automatic move picking for that Pokémon.
    const dropped = withLead(s, { moves: s.party[0]!.moves!.slice(0, 2), legacyMoves: undefined, autoMoves: false });
    expect(parseGameState(JSON.parse(JSON.stringify(dropped))).party[0]!.moves).toHaveLength(2);
  });
});
