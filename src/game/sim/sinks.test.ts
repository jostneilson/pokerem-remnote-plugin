import { describe, expect, it } from 'vitest';
import { ROUTE_BIOME_BY_ID, ROUTE_TICKET_PRICE, ROUTE_TICKET_WILDS, TUTOR_LEVEL_WINDOW, tutorOptions } from '../engine/sinks';
import { getUnlockedLearnsetMoveIds } from '../engine/moveLearn';
import { buyCardStyle, buyRouteTicket, chooseStarter, createInitialStateV2, equipCardStyle, onQueueCardComplete, parseGameState, teachTutorMove } from '../state/store';
import type { PokeRemGameState } from '../state/model';

const rich = (): PokeRemGameState => ({ ...chooseStarter(createInitialStateV2(), 4), currency: 1_000_000 });
const roundTrip = (s: PokeRemGameState) => parseGameState(JSON.parse(JSON.stringify(s)));

describe('move tutor', () => {
  it('offers only moves a few levels ahead that the Pokémon does not know yet', () => {
    const lead = rich().party[0]!;
    const opts = tutorOptions(lead);
    expect(opts.length).toBeGreaterThan(0);
    const unlocked = new Set(getUnlockedLearnsetMoveIds(lead.dexNum, lead.level));
    for (const o of opts) {
      expect(unlocked.has(o.moveId)).toBe(false);
      expect(o.learnLevel).toBeGreaterThan(lead.level);
      expect(o.learnLevel).toBeLessThanOrEqual(lead.level + TUTOR_LEVEL_WINDOW);
      expect(o.price).toBeGreaterThan(0);
    }
  });

  it('charges, keeps the move through a save and lets auto moves use it', () => {
    const s = rich();
    const lead = s.party[0]!;
    const opt = tutorOptions(lead).find((o) => o.moveId === 'ember' || o.moveId === 'dragon-breath') ?? tutorOptions(lead)[0]!;
    const taught = teachTutorMove(s, lead.id, opt.moveId);
    expect(taught.currency).toBe(s.currency - opt.price);
    const loaded = roundTrip(taught).party[0]!;
    expect(loaded.tutorMoves).toContain(opt.moveId);
    expect(tutorOptions(loaded).some((o) => o.moveId === opt.moveId)).toBe(false);
    expect(teachTutorMove({ ...s, currency: 0 }, lead.id, opt.moveId)).toEqual({ ...s, currency: 0 });
  });
});

describe('route tickets', () => {
  it('sends the next wilds to the chosen biome, then runs out', () => {
    let s = buyRouteTicket(rich(), 'waterside');
    expect(s.currency).toBe(1_000_000 - ROUTE_TICKET_PRICE);
    expect(buyRouteTicket(s, 'haunted')).toBe(s);
    s = buyRouteTicket(s, 'waterside');
    expect(s.routeTicket).toEqual({ biome: 'waterside', remaining: ROUTE_TICKET_WILDS * 2 });
    s = { ...s, routeTicket: { biome: 'waterside', remaining: 2 } };
    const scenes: number[] = [];
    for (let i = 0; i < 400 && scenes.length < 3; i++) {
      const next = onQueueCardComplete(s, [1], 1);
      if (next.currentEncounter && !s.currentEncounter) scenes.push(next.battleSceneIndex ?? -1);
      s = next.currentEncounter ? { ...next, currentEncounter: null } : next;
    }
    expect(scenes.slice(0, 2).every((i) => ROUTE_BIOME_BY_ID.get('waterside')!.scenes.includes(i))).toBe(true);
    expect(s.routeTicket ?? null).toBeNull();
  });
});

describe('trainer card styles', () => {
  it('buys once, equips, and survives a save', () => {
    let s = buyCardStyle(rich(), 'aurora');
    expect(s.trainerCardStyle).toBe('aurora');
    expect(buyCardStyle(s, 'aurora')).toBe(s);
    s = equipCardStyle(s, 'classic');
    expect(s.trainerCardStyle).toBeUndefined();
    s = equipCardStyle(s, 'aurora');
    expect(roundTrip(s)).toMatchObject({ trainerCardStyle: 'aurora', ownedCardStyles: ['aurora'] });
    expect(equipCardStyle(s, 'champion')).toBe(s);
  });
});
