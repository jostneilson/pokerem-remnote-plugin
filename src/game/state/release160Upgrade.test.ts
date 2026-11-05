import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SPECIES_BY_DEX } from '../data/species';
import { parseGameState } from './store';

const raw = () => JSON.parse(readFileSync('src/game/state/__fixtures__/save-1.5.0.json', 'utf8')) as Record<string, any>;
const roundTrip = (s: unknown) => parseGameState(JSON.parse(JSON.stringify(s)));
const monKey = (p: any) => `${p.id}|${p.dexNum}|${p.level}|${p.xp}|${p.nickname ?? ''}|${p.shiny === true}|${JSON.stringify(p.ivs)}`;

describe('upgrading a 1.5.0 save to 1.6.0', () => {
  it('keeps every Pokémon, level, IV, nickname, shiny, coin and Dex entry', () => {
    const before = raw();
    const after = parseGameState(raw());
    expect(after.party.map(monKey)).toEqual(before.party.map(monKey));
    expect(after.storagePokemon.map(monKey)).toEqual(before.storagePokemon.map(monKey));
    expect(after.currency).toBe(before.currency);
    expect(after.totalCurrencyEarned).toBe(before.totalCurrencyEarned);
    expect(after.trainerLevel).toBe(before.trainerLevel);
    expect(after.trainerXp).toBe(before.trainerXp);
    expect(after.cardsReviewed).toBe(before.cardsReviewed);
    for (const [dex, n] of Object.entries(before.collectionDex)) expect(after.collectionDex[Number(dex)]).toBeGreaterThanOrEqual(n as number);
    expect(after.shinyLog?.length).toBe(before.shinyLog.length);
    expect(after.party[0]!.nickname).toBe('Sparky');
    expect(after.party[1]!.favorite).toBe(true);
    expect(after.storagePokemon.some((p) => p.shiny && p.nickname === 'Goldie')).toBe(true);
  });

  it('keeps XP Doublers active and queued, and bag counts', () => {
    const after = parseGameState(raw());
    expect(after.xpBoosterActive).toEqual({ tier: 'common', cardsTotal: 25, cardsRemaining: 11 });
    expect(after.xpBoosterQueue).toHaveLength(1);
    expect(after.bag['xp-doubler-rare']).toBe(2);
  });

  it('migrates the arena index once and is stable from then on', () => {
    const first = parseGameState(raw());
    expect(first.battleSceneIndex).toBe(14);
    const second = roundTrip(first);
    const third = roundTrip(second);
    expect(third).toEqual(second);
    expect(third.battleSceneIndex).toBe(14);
  });

  it('every headline legendary now carries its Legendary or Mythical tier', () => {
    for (const dex of [144, 145, 146, 150, 249, 250, 384]) expect(SPECIES_BY_DEX.get(dex)?.tier).toBe('Legendary');
    for (const dex of [151, 251, 493]) expect(SPECIES_BY_DEX.get(dex)?.tier).toBe('Mythical');
  });
});
