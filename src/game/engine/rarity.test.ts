import { describe, expect, it } from 'vitest';
import { chooseStarter, createInitialStateV4 } from '../state/store';
import { seededRng } from '../sim/simulate';
import type { BattleCondition, EncounterPokemon } from '../state/model';
import { legendaryCatchChance, spawnEncounter, wildCatchChancePreview, type CatchBall } from './encounters';
import {
  BIRD_CHANCE,
  EVENT_CHANCE,
  GALARIAN_BIRDS,
  TEAM_BIRD,
  perEncounterOdds,
  pickGalarianBird
} from './rarity';
import { encounterBaseLevel, isEventSpecies, minWildLevel } from './speciesPool';
import type { OwnedPokemon } from '../state/model';

const partyAt = (level: number, size = 6): OwnedPokemon[] => {
  const lead = chooseStarter(createInitialStateV4(), 4).party[0]!;
  return Array.from({ length: size }, (_, i) => ({ ...lead, id: `p${i}`, level }));
};

describe('per-encounter rarity calibrated at Medium (SPEC L1)', () => {
  it('converts "1 in N cards at Medium" to per-encounter odds', () => {
    expect(perEncounterOdds(250)).toBeCloseTo(0.012, 10);
    expect(BIRD_CHANCE).toBeCloseTo(3 / 250, 10);
    expect(EVENT_CHANCE).toBeCloseTo(3 / 2500, 10);
  });

  it('shiny odds per encounter are 1/250 whatever the pacing', () => {
    const party = partyAt(10);
    // First rng value is the shiny roll: just under 1/250 is shiny, just over isn't, at any pacing.
    const rngFrom = (first: number) => {
      const rng = seededRng(1);
      let used = false;
      return () => (used ? rng() : ((used = true), first));
    };
    for (const reviewsPerEncounter of [2, 3, 10, 15]) {
      const pacing = { reviewsPerEncounter, modulo: 2 };
      expect(spawnEncounter(party, 0, [1], 0, { rng: rngFrom(1 / 250 - 1e-6), pacing }).shiny).toBe(true);
      expect(spawnEncounter(party, 0, [1], 0, { rng: rngFrom(1 / 250 + 1e-6), pacing }).shiny).toBe(false);
    }
  });

  it('birds ≈ 1.2% of encounters after 100 cards, none before; wild legendaries ≈ 0.12%', () => {
    const rng = seededRng(42);
    const party = partyAt(40);
    let birds = 0,
      events = 0,
      early = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const e = spawnEncounter(party, 1000, [1, 2, 3, 4, 5, 6, 7, 8], 0, { rng });
      if (GALARIAN_BIRDS.has(e.dexNum)) birds++;
      else if (isEventSpecies(e.dexNum)) events++;
    }
    for (let i = 0; i < 20_000; i++) if (GALARIAN_BIRDS.has(spawnEncounter(party, 99, [1], 0, { rng }).dexNum)) early++;
    expect(birds / n).toBeGreaterThan(BIRD_CHANCE * 0.9);
    expect(birds / n).toBeLessThan(BIRD_CHANCE * 1.1);
    expect(events / n).toBeGreaterThan(0.0012 * 0.75);
    expect(events / n).toBeLessThan(0.0012 * 1.25);
    expect(early).toBe(0);
  });

  it('birds appear even with only Gen 1 enabled', () => {
    const rng = seededRng(7);
    let birds = 0;
    for (let i = 0; i < 20_000; i++) if (GALARIAN_BIRDS.has(spawnEncounter(partyAt(20), 500, [1], 0, { rng }).dexNum)) birds++;
    expect(birds).toBeGreaterThan(150);
  });
});

describe('team bird weighting', () => {
  it('your team bird 50%, the others 25% each (±2%)', () => {
    for (const team of ['ember', 'tide', 'volt'] as const) {
      const rng = seededRng(3);
      const counts = new Map<number, number>();
      const n = 40_000;
      for (let i = 0; i < n; i++) {
        const d = pickGalarianBird(team, rng);
        counts.set(d, (counts.get(d) ?? 0) + 1);
      }
      for (const d of GALARIAN_BIRDS) {
        const share = (counts.get(d) ?? 0) / n;
        expect(Math.abs(share - (d === TEAM_BIRD[team] ? 0.5 : 0.25))).toBeLessThan(0.02);
      }
    }
  });

  it('no team: even odds', () => {
    const rng = seededRng(4);
    const counts = new Map<number, number>();
    for (let i = 0; i < 30_000; i++) {
      const d = pickGalarianBird(undefined, rng);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    for (const d of GALARIAN_BIRDS) expect(Math.abs((counts.get(d) ?? 0) / 30_000 - 1 / 3)).toBeLessThan(0.02);
  });

  it('a quarter of bird sightings are shiny', () => {
    const rng = seededRng(11);
    let birds = 0,
      shiny = 0;
    for (let i = 0; i < 200_000 && birds < 8000; i++) {
      const e = spawnEncounter(partyAt(30), 1000, [1], 0, { rng });
      if (GALARIAN_BIRDS.has(e.dexNum)) {
        birds++;
        if (e.shiny) shiny++;
      }
    }
    expect(Math.abs(shiny / birds - 0.25)).toBeLessThan(0.02);
  });
});

describe('wild levels follow the party average (SPEC L18)', () => {
  it('base level is the mean of the whole party', () => {
    const party = [...partyAt(30, 3), ...partyAt(10, 3)];
    expect(encounterBaseLevel(party)).toBe(20);
  });

  it('everyday wilds never exceed the average; ~70% are within 3 below it, the rest natural-level', () => {
    const rng = seededRng(21);
    const party = partyAt(30);
    let near = 0,
      n = 0;
    for (let i = 0; i < 20_000; i++) {
      const e = spawnEncounter(party, 200, [1, 2, 3], 0, { rng });
      if (isEventSpecies(e.dexNum)) continue;
      n++;
      expect(e.level).toBeLessThanOrEqual(30);
      expect(e.level).toBeGreaterThanOrEqual(minWildLevel(e.dexNum) > 26 ? 1 : minWildLevel(e.dexNum));
      if (e.level >= 27) near++;
    }
    expect(near / n).toBeGreaterThan(0.68);
    expect(near / n).toBeLessThan(0.76);
  });
});

describe('legendary-class catch curve (L6)', () => {
  const at = (h: number, ball: CatchBall = 'poke-ball', condition?: BattleCondition) =>
    legendaryCatchChance(Math.round(h * 1000), 1000, ball, condition);

  it('rises from 2% at full HP to ~25% at 1 HP with a Poké Ball', () => {
    expect(at(1)).toBeCloseTo(0.02, 3);
    expect(at(0.5)).toBeCloseTo(0.047, 3);
    expect(at(0.25)).toBeCloseTo(0.102, 3); // SPEC quotes ~9.9%; the locked formula gives 10.2% (DECISIONS)
    expect(at(0.1)).toBeCloseTo(0.173, 3);
    expect(legendaryCatchChance(1, 1000, 'poke-ball')).toBeCloseTo(0.25, 3);
  });

  it('applies ball and status multipliers, capped at 40%', () => {
    expect(at(0.5, 'great-ball')).toBeCloseTo(at(0.5) * 1.25, 6);
    expect(at(0.5, 'ultra-ball')).toBeCloseTo(at(0.5) * 1.5, 6);
    expect(at(0.5, 'poke-ball', { ailment: 'sleep' } as BattleCondition)).toBeCloseTo(at(0.5) * 1.5, 6);
    expect(at(0.5, 'poke-ball', { ailment: 'burn' } as BattleCondition)).toBeCloseTo(at(0.5) * 1.25, 6);
    expect(legendaryCatchChance(1, 1000, 'ultra-ball', { ailment: 'sleep' } as BattleCondition)).toBe(0.4);
  });

  it('is what the Catch preview shows for legendary-class wilds, and shiny ones stay guaranteed', () => {
    const mewtwo = { dexNum: 150, name: 'Mewtwo', level: 50, maxHp: 200, currentHp: 100, types: ['Psychic'], tier: 'Legendary' } as EncounterPokemon;
    expect(wildCatchChancePreview(mewtwo, undefined, 'poke-ball')).toBeCloseTo(legendaryCatchChance(100, 200, 'poke-ball'), 6);
    const bird = { ...mewtwo, dexNum: 10169, name: 'Galarian Articuno' };
    expect(wildCatchChancePreview(bird, undefined, 'poke-ball')).toBeLessThan(0.05);
    expect(wildCatchChancePreview({ ...mewtwo, shiny: true }, undefined, 'poke-ball')).toBe(1);
    // Everyday wilds keep the old formula.
    const rattata = { ...mewtwo, dexNum: 19, name: 'Rattata', types: ['Normal'], tier: 'Common' } as EncounterPokemon;
    expect(wildCatchChancePreview(rattata, undefined, 'poke-ball')).toBeGreaterThan(0.5);
  });
});

describe('level XP damp (DECISIONS T5.7)', () => {
  it('is 1 up to the pivot and falls smoothly after it', async () => {
    const { levelXpDamp } = await import('./xpShare');
    const { BALANCE } = await import('../balance');
    expect(levelXpDamp(1)).toBe(1);
    expect(levelXpDamp(BALANCE.xp.levelDampFrom)).toBe(1);
    expect(levelXpDamp(BALANCE.xp.levelDampFrom + BALANCE.xp.levelDampSpan)).toBeCloseTo(0.5, 10);
    expect(levelXpDamp(60)).toBeLessThan(levelXpDamp(40));
  });
});
