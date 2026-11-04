import { describe, expect, it } from 'vitest';
import { TEAMS } from '../engine/teams';
import { chooseStarter, chooseTeam, createInitialStateV4, parseGameState } from './store';

describe('team pick (SPEC A13, U10)', () => {
  it('has the three original teams with their colours', () => {
    expect(TEAMS.map((t) => [t.name, t.color])).toEqual([
      ['Team Ember', '#e0533a'],
      ['Team Tide', '#3a8fe0'],
      ['Team Volt', '#f2c53a']
    ]);
  });

  it('joins a team once and marks the prompt answered', () => {
    const s = chooseTeam(createInitialStateV4(), 'volt');
    expect(s.team).toBe('volt');
    expect(s.teamPrompted).toBe(true);
    expect(chooseTeam(s, 'ember')).toBe(s);
  });

  it('ignores unknown teams', () => {
    const s = createInitialStateV4();
    expect(chooseTeam(s, 'valor')).toBe(s);
  });

  it('an existing save keeps all progress when it joins a team, and the team survives a reload', () => {
    const old = { ...chooseStarter(createInitialStateV4(), 4), currency: 12_345, cardsReviewed: 900 };
    const joined = chooseTeam(old, 'tide');
    expect(joined.currency).toBe(12_345);
    expect(joined.cardsReviewed).toBe(900);
    expect(joined.party).toEqual(old.party);
    const back = parseGameState(JSON.parse(JSON.stringify(joined)));
    expect(back.team).toBe('tide');
    expect(back.teamPrompted).toBe(true);
  });
});
