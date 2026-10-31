import { describe, it, expect, vi } from 'vitest';
import {
  chooseStarter,
  createInitialStateV4,
  defeatEncounter,
  catchEncounter,
  rollStudyCashBonus,
  parseGameState,
} from './store';
import { spawnEncounter, averagePartyLevel } from '../engine/encounters';
import { generateTrainerRewards } from '../engine/trainerBattles';
import { CURRENCY_REWARDS } from '../engine/shop';
import type { OwnedPokemon, PokeRemGameState } from './model';

function makeMon(id: string, dexNum: number, types: any[], level = 10, totalXp = 500): OwnedPokemon {
  return {
    id,
    dexNum,
    name: `Mon-${dexNum}`,
    level,
    totalXp,
    currentHp: 100,
    maxHp: 100,
    types,
    moves: ['tackle'],
    ivs: { hp: 2, attack: 2, defense: 2 },
  };
}

describe('User specific requirements in 1.4.0', () => {
  describe('Defeat vs Catch: defeat gives more money and experience', () => {
    it('grants more currency and more XP on defeat than on capture', () => {
      const baseState: PokeRemGameState = {
        ...chooseStarter(createInitialStateV4(), 4),
        currency: 100,
        bag: { ...createInitialStateV4().bag, 'poke-ball': 5 },
        currentEncounter: {
          dexNum: 25,
          name: 'Pikachu',
          level: 10,
          maxHp: 80,
          currentHp: 80,
          types: ['Electric'],
        },
      };

      const defeatState = defeatEncounter(baseState);
      const currencyFromDefeat = (defeatState.currency ?? 0) - baseState.currency;
      const xpFromDefeat = (defeatState.party[0]?.totalXp ?? 0) - (baseState.party[0]?.totalXp ?? 0);

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      const catchState = catchEncounter(baseState, 'poke-ball');
      randomSpy.mockRestore();

      const currencyFromCatch = (catchState.currency ?? 0) - baseState.currency;
      const xpFromCatch = (catchState.party[0]?.totalXp ?? 0) - (baseState.party[0]?.totalXp ?? 0);

      expect(currencyFromDefeat).toBeGreaterThan(currencyFromCatch);
      expect(xpFromDefeat).toBeGreaterThan(xpFromCatch);
      expect(currencyFromDefeat).toBeGreaterThanOrEqual(250);
      expect(currencyFromCatch).toBe(CURRENCY_REWARDS.catch);
    });
  });

  describe('Rewards and bonuses give way more money', () => {
    it('provides high value cash rewards across review, bonuses, and trainer wins', () => {
      expect(CURRENCY_REWARDS.defeat).toBeGreaterThanOrEqual(250);
      expect(CURRENCY_REWARDS.review).toBeGreaterThanOrEqual(25);

      const rng = (...values: number[]) => {
        let i = 0;
        return () => values[i++] ?? 0;
      };

      const jackpot = rollStudyCashBonus(rng(0.0001, 0));
      expect(jackpot.tier).toBe('Jackpot');
      expect(jackpot.amount).toBeGreaterThanOrEqual(10000);

      const rareFind = rollStudyCashBonus(rng(0.002, 0));
      expect(rareFind.tier).toBe('Rare find');
      expect(rareFind.amount).toBeGreaterThanOrEqual(2000);

      const luckyFind = rollStudyCashBonus(rng(0.02, 0));
      expect(luckyFind.tier).toBe('Lucky find');
      expect(luckyFind.amount).toBeGreaterThanOrEqual(350);

      const eliteReward = generateTrainerRewards('elite', 20);
      expect(eliteReward.coins).toBeGreaterThanOrEqual(1500);

      const standardReward = generateTrainerRewards('standard', 20);
      expect(standardReward.coins).toBeGreaterThanOrEqual(600);
    });
  });

  describe('Type-sharing collection XP boost on defeat and catch', () => {
    it('boosts party and storage Pokemon sharing the target type, with larger boost for party', () => {
      const lead = makeMon('lead', 6, ['Fire', 'Flying'], 20, 2000);
      const partyFire = makeMon('party-fire', 58, ['Fire'], 15, 1000);
      const partyWater = makeMon('party-water', 9, ['Water'], 15, 1000);
      const storageFire = makeMon('storage-fire', 37, ['Fire'], 10, 500);
      const storageGrass = makeMon('storage-grass', 1, ['Grass', 'Poison'], 10, 500);

      const state: PokeRemGameState = {
        ...createInitialStateV4(),
        starterChosen: true,
        activePokemonId: 'lead',
        party: [lead, partyFire, partyWater],
        storagePokemon: [storageFire, storageGrass],
        currentEncounter: {
          dexNum: 77,
          name: 'Ponyta',
          level: 12,
          maxHp: 90,
          currentHp: 90,
          types: ['Fire'],
        },
      };

      const afterDefeat = defeatEncounter(state);

      const partyFireXpGain = (afterDefeat.party.find((p) => p.id === 'party-fire')?.totalXp ?? 0) - partyFire.totalXp;
      const partyWaterXpGain = (afterDefeat.party.find((p) => p.id === 'party-water')?.totalXp ?? 0) - partyWater.totalXp;
      const storageFireXpGain =
        (afterDefeat.storagePokemon.find((p) => p.id === 'storage-fire')?.totalXp ?? 0) - storageFire.totalXp;
      const storageGrassXpGain =
        (afterDefeat.storagePokemon.find((p) => p.id === 'storage-grass')?.totalXp ?? 0) - storageGrass.totalXp;

      expect(partyFireXpGain).toBeGreaterThan(0);
      expect(storageFireXpGain).toBeGreaterThan(0);
      expect(partyFireXpGain).toBeGreaterThan(storageFireXpGain);
      expect(partyWaterXpGain).toBe(0);
      expect(storageGrassXpGain).toBe(0);
    });

    it('boosts collection sharing type when catching a wild Pokemon', () => {
      const lead = makeMon('lead', 6, ['Fire'], 20, 2000);
      const partyWater = makeMon('party-water', 9, ['Water'], 15, 1000);
      const storageWater = makeMon('storage-water', 129, ['Water'], 10, 500);

      const state: PokeRemGameState = {
        ...createInitialStateV4(),
        starterChosen: true,
        activePokemonId: 'lead',
        bag: { ...createInitialStateV4().bag, 'poke-ball': 5 },
        party: [lead, partyWater],
        storagePokemon: [storageWater],
        currentEncounter: {
          dexNum: 54,
          name: 'Psyduck',
          level: 10,
          maxHp: 80,
          currentHp: 80,
          types: ['Water'],
        },
      };

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      const afterCatch = catchEncounter(state, 'poke-ball');
      randomSpy.mockRestore();

      const partyWaterXpGain = (afterCatch.party.find((p) => p.id === 'party-water')?.totalXp ?? 0) - partyWater.totalXp;
      const storageWaterXpGain =
        (afterCatch.storagePokemon.find((p) => p.id === 'storage-water')?.totalXp ?? 0) - storageWater.totalXp;

      expect(partyWaterXpGain).toBeGreaterThan(0);
      expect(storageWaterXpGain).toBeGreaterThan(0);
      expect(partyWaterXpGain).toBeGreaterThan(storageWaterXpGain);
    });
  });

  describe('Encounter level scaling based on average party level', () => {
    it('calculates average party level accurately', () => {
      const p1 = makeMon('p1', 1, ['Grass'], 10);
      const p2 = makeMon('p2', 4, ['Fire'], 20);
      const p3 = makeMon('p3', 7, ['Water'], 30);
      expect(averagePartyLevel([p1, p2, p3])).toBe(20);
      expect(averagePartyLevel([p1])).toBe(10);
      expect(averagePartyLevel([])).toBe(1);
    });

    it('spawns wild Pokemon at levels matching average party level', () => {
      const partyHigh = [makeMon('p1', 1, ['Grass'], 40), makeMon('p2', 4, ['Fire'], 50)];
      const encHigh = spawnEncounter(partyHigh, 0, [1], 0);
      expect(encHigh.level).toBeGreaterThanOrEqual(43);
      expect(encHigh.level).toBeLessThanOrEqual(47);

      const partyLow = [makeMon('p1', 1, ['Grass'], 5), makeMon('p2', 4, ['Fire'], 7)];
      const encLow = spawnEncounter(partyLow, 0, [1], 0);
      expect(encLow.level).toBeGreaterThanOrEqual(5);
      expect(encLow.level).toBeLessThanOrEqual(8);
    });
  });

  describe('Legacy progress preservation', () => {
    it('migrates legacy save without losing nicknames, inventory, or shinies', () => {
      const legacyRaw = {
        schemaVersion: 3,
        starterChosen: true,
        currency: 4500,
        totalCurrencyEarned: 9000,
        activePokemonId: 'legacy-1',
        party: [
          {
            id: 'legacy-1',
            dexNum: 25,
            name: 'Pikachu',
            nickname: 'Sparky',
            level: 35,
            totalXp: 18000,
            currentHp: 80,
            maxHp: 100,
            shiny: true,
            types: ['Electric'],
            moves: ['thunderbolt', 'quick-attack'],
          },
        ],
        storagePokemon: [],
        bag: { 'poke-ball': 15, revive: 3, potion: 5 },
        dailyStats: { date: '2026-05-01', reviews: 100, encounters: 20, catches: 15 },
        trainerLevel: 12,
        trainerXp: 5000,
      };

      const parsed = parseGameState(legacyRaw);
      expect(parsed.schemaVersion).toBe(5);
      expect(parsed.currency).toBe(4500);
      expect(parsed.party[0]?.nickname).toBe('Sparky');
      expect(parsed.party[0]?.shiny).toBe(true);
      expect(parsed.party[0]?.level).toBe(35);
      expect(parsed.party[0]?.ivs).toBeDefined();
      expect(parsed.party[0]?.ivs?.hp).toBeGreaterThanOrEqual(1);
      expect(parsed.party[0]?.ivs?.hp).toBeLessThanOrEqual(3);
      expect(parsed.bag['poke-ball']).toBe(15);
      expect(parsed.bag.revive).toBe(3);
      expect(parsed.dailyStats?.reviews).toBe(100);
      expect(parsed.trainerLevel).toBe(12);

      // Re-running parseGameState must preserve the exact same deterministic IVs
      const reParsed = parseGameState(JSON.parse(JSON.stringify(parsed)));
      expect(reParsed.party[0]?.ivs).toEqual(parsed.party[0]?.ivs);
    });
  });
});
