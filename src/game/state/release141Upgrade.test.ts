import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { onQueueCardComplete, parseGameState } from './store';

/** A real save written by the released 1.4.1 build (played in the host simulator) loads with nothing lost. */
describe('upgrading a 1.4.1 save', () => {
  const raw = JSON.parse(readFileSync('src/game/state/__fixtures__/save-1.4.1.json', 'utf8')) as Record<string, any>;
  const s = parseGameState(raw);

  it('keeps every Pokémon with its nickname, level, XP, IVs, shiny and moves', () => {
    const pick = (m: any) => ({ id: m.id, dexNum: m.dexNum, nickname: m.nickname, level: m.level, totalXp: m.totalXp, ivs: m.ivs, shiny: !!m.shiny });
    expect(s.party.map(pick)).toEqual(raw.party.map(pick));
    expect(s.storagePokemon.map(pick)).toEqual(raw.storagePokemon.map(pick));
    for (const m of s.party) expect((m.moves ?? []).length).toBeGreaterThan(0);
  });

  it('keeps money, items, cards, trainer progress, the Pokédex, achievements and the live encounter', () => {
    expect(s.currency).toBe(raw.currency);
    expect(s.cardsReviewed).toBe(raw.cardsReviewed);
    expect(s.trainerXp).toBe(raw.trainerXp);
    expect(s.trainerLevel).toBe(raw.trainerLevel);
    for (const [k, v] of Object.entries(raw.bag)) expect(s.bag[k as keyof typeof s.bag]).toBe(v);
    for (const [k, v] of Object.entries(raw.collectionDex ?? {})) expect(s.collectionDex[Number(k)]).toBeGreaterThanOrEqual(v as number);
    expect(s.claimedAchievementIds).toEqual(raw.claimedAchievementIds);
    expect(s.currentEncounter?.dexNum).toBe(raw.currentEncounter?.dexNum);
    expect(s.activePokemonId).toBe(raw.activePokemonId);
    expect(s.starterChosen).toBe(true);
    expect(s.studyDifficultyConfigured).toBe(raw.studyDifficultyConfigured);
    expect(s.studyDifficultyPreset).toBe(raw.studyDifficultyPreset);
  });

  it('keeps playing from there: the next card adds to the old total', () => {
    expect(onQueueCardComplete(s).cardsReviewed).toBe(raw.cardsReviewed + 1);
    expect(parseGameState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});
