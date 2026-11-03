import { describe, expect, it } from 'vitest';
import { chooseStarter, configureStudyDifficulty, createInitialStateV4, parseGameState } from './store';

/** A returning player's progress must survive any load, whatever the save's flags or schema say. */
describe('save safety for returning players', () => {
  const played = () => {
    const s = configureStudyDifficulty(chooseStarter(createInitialStateV4(), 4), 'medium');
    return { ...s, cardsReviewed: 412, currency: 9100, party: s.party.map((p) => ({ ...p, nickname: 'Blaze', level: 23 })) };
  };

  it('picking a starter never replaces an existing team', () => {
    const s = played();
    expect(chooseStarter(s, 1)).toBe(s);
    expect(chooseStarter({ ...s, starterChosen: false }, 7).party[0]!.nickname).toBe('Blaze');
  });

  it('a save with Pokémon skips setup even if its flags were lost', () => {
    const raw = JSON.parse(JSON.stringify({ ...played(), starterChosen: undefined, studyDifficultyConfigured: undefined }));
    const s = parseGameState(raw);
    expect(s.starterChosen).toBe(true);
    expect(s.studyDifficultyConfigured).toBe(true);
    expect(s.party[0]!.nickname).toBe('Blaze');
  });

  it('keeps data from a save written by a newer or unknown schema instead of starting over', () => {
    const raw = JSON.parse(JSON.stringify({ ...played(), schemaVersion: 6 }));
    const s = parseGameState(raw);
    expect(s.cardsReviewed).toBe(412);
    expect(s.currency).toBe(9100);
    expect(s.party[0]!.level).toBe(23);
  });

  it('an empty read is a fresh game that has not started (so nothing writes over a real save)', () => {
    for (const raw of [undefined, null, '', 42]) expect(parseGameState(raw).starterChosen).toBe(false);
  });

  it('a new player who picked a starter but has not reviewed yet still gets the difficulty screen', () => {
    const s = parseGameState(JSON.parse(JSON.stringify(chooseStarter(createInitialStateV4(), 1))));
    expect(s.starterChosen).toBe(true);
    expect(s.studyDifficultyConfigured).toBe(false);
  });
});

describe('first catch', () => {
  it('is not unlocked just by picking a starter', () => {
    const s = parseGameState(JSON.parse(JSON.stringify(chooseStarter(createInitialStateV4(), 1))));
    expect(s.achievements.catch1).toBe(false);
  });
});
