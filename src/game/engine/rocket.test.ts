import { describe, expect, it } from 'vitest';
import { SPECIES_BY_DEX } from '../data/species';
import { seededRng, withSeededRandom } from '../sim/simulate';
import type { PokeRemGameState } from '../state/model';
import {
  applyCombatTurn,
  chooseStarter,
  claimTrainerCatch,
  closeTrainerBattle,
  configureStudyDifficulty,
  createInitialStateV4,
  onQueueCardComplete,
  parseGameState,
  resolveTrainerBattle,
  runFromEncounter,
  startRocketBattle
} from '../state/store';
import {
  LEADER_AFTER_GRUNT_WINS,
  LEADER_PRIZE_SHINY_ODDS,
  generateRocketGrunt,
  gruntTypesAvailable,
  leaderPrizePool,
  nextGruntType,
  rocketAcePool,
  rollLeaderPrize
} from './rocket';

const ALL_GENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const roundTrip = (s: unknown) => parseGameState(JSON.parse(JSON.stringify(s)));

function trainer(level = 30): PokeRemGameState {
  const s = configureStudyDifficulty(chooseStarter(createInitialStateV4(), 4), 'medium');
  return { ...s, party: s.party.map((p) => ({ ...p, level })), bag: { ...s.bag, 'ultra-ball': 200 } };
}

describe('Rocket grunts (SPEC A9, Appendix R)', () => {
  it('field two Pokémon of their type and a rare ace of that type', () => {
    const rng = seededRng(7);
    for (const type of gruntTypesAvailable(ALL_GENS)) {
      const team = generateRocketGrunt(type, 30, ALL_GENS, {}, rng);
      expect(team.enemies).toHaveLength(3);
      const [a, b, ace] = team.enemies;
      expect(a!.types).toContain(type);
      expect(b!.types).toContain(type);
      expect(a!.level).toBeGreaterThanOrEqual(28);
      expect(a!.level).toBeLessThanOrEqual(30);
      expect(ace!.level).toBeGreaterThanOrEqual(30);
      expect(ace!.level).toBeLessThanOrEqual(32);
      expect(rocketAcePool(type, ace!.level, ALL_GENS)).toContain(ace!.dexNum);
      expect(team.identity.themeTypes).toEqual([type]);
    }
  });

  it('aces are hard catches or starter lines, never legendary', () => {
    const pool = rocketAcePool('Dragon', 60, ALL_GENS);
    expect(pool.length).toBeGreaterThan(3);
    expect(pool.every((d) => SPECIES_BY_DEX.get(d)!.classification === 'ordinary')).toBe(true);
  });

  it('pick a type not beaten this cycle', () => {
    const rng = seededRng(3);
    const available = gruntTypesAvailable(ALL_GENS);
    const beaten = available.slice(0, available.length - 1);
    for (let i = 0; i < 20; i++) {
      expect(nextGruntType({ gruntWins: 0, typesBeaten: beaten, leaderReady: false, leaderWins: 0 }, ALL_GENS, rng)).toBe(
        available[available.length - 1]
      );
    }
    // Gen 1 alone has no Dark Pokémon, so no Dark grunt.
    expect(gruntTypesAvailable([1])).not.toContain('Dark');
  });

  it('only offer their ace to catch', () => {
    withSeededRandom(11, () => {
      const won = resolveTrainerBattle(startRocketBattle(trainer(), ALL_GENS), 'win');
      const b = won.currentTrainerBattle!;
      expect(b.rocket?.kind).toBe('grunt');
      expect(claimTrainerCatch(won, 0, 'ultra-ball')).toBe(won);
      let s = won;
      for (let i = 0; i < 100 && !s.currentTrainerBattle?.catchOfferClaimed; i++) s = claimTrainerCatch(s, 2, 'ultra-ball');
      expect(s.currentTrainerBattle?.catchOfferClaimed).toBe(true);
      expect(s.storagePokemon.concat(s.party).some((p) => p.dexNum === b.enemies[2]!.dexNum)).toBe(true);
    });
  });
});

describe('Rocket Radar and Leader', () => {
  it('five grunt wins bring out the Leader; beating him resets the Radar and reveals the prize', () => {
    withSeededRandom(21, () => {
      let s = trainer(40);
      for (let i = 0; i < LEADER_AFTER_GRUNT_WINS; i++) {
        s = startRocketBattle(s, ALL_GENS);
        expect(s.currentTrainerBattle?.rocket?.kind).toBe('grunt');
        s = closeTrainerBattle(resolveTrainerBattle(s, 'win'));
      }
      expect(s.rocket?.gruntWins).toBe(5);
      expect(s.rocket?.leaderReady).toBe(true);
      expect(s.rocket?.typesBeaten).toHaveLength(5);

      s = startRocketBattle(s, ALL_GENS);
      const battle = s.currentTrainerBattle!;
      expect(battle.rocket?.kind).toBe('leader');
      expect(battle.tier).toBe('elite');
      expect(battle.trainer.className + ' ' + battle.trainer.displayName).toBe('Rocket Leader Corvin');
      expect(battle.enemies.every((e) => e.level >= 44)).toBe(true);
      expect(battle.prize?.pendingPrize).toBe(true);

      // A loss keeps the Leader waiting for a rematch.
      const lost = resolveTrainerBattle(s, 'loss');
      expect(lost.rocket?.leaderReady).toBe(true);

      const won = resolveTrainerBattle(roundTrip(s), 'win');
      expect(won.currentTrainerBattle?.catchOfferActive).toBe(false);
      expect(won.rocket).toMatchObject({ gruntWins: 0, leaderReady: false, leaderWins: 1 });
      const prize = closeTrainerBattle(won);
      expect(prize.currentTrainerBattle).toBeNull();
      expect(prize.currentEncounter?.pendingPrize).toBe(true);
      expect(['legendary', 'mythical']).toContain(SPECIES_BY_DEX.get(prize.currentEncounter!.dexNum)!.classification);
    });
  });

  it('the prize never flees, can’t be knocked out, and survives a reload', () => {
    withSeededRandom(5, () => {
      const prize = rollLeaderPrize(20, ALL_GENS, {}, seededRng(1));
      let s: PokeRemGameState = { ...trainer(90), currentEncounter: { ...prize, shiny: false } };
      for (let i = 0; i < 60; i++) s = roundTrip(onQueueCardComplete(s, [1], 3, {}));
      expect(s.currentEncounter?.pendingPrize).toBe(true);
      for (let i = 0; i < 30; i++) s = applyCombatTurn(s);
      expect(s.currentEncounter?.currentHp).toBeGreaterThan(0);
      // Run only gives it up once confirmed.
      expect(runFromEncounter(s).currentEncounter?.pendingPrize).toBe(true);
      expect(runFromEncounter(s, true).currentEncounter).toBeNull();
    });
  });

  it('is shiny 1 in 5, prefers uncaught legendaries, and never a Galarian bird or Ultra Beast', () => {
    const rng = seededRng(99);
    const pool = leaderPrizePool(ALL_GENS);
    expect(pool.some((d) => SPECIES_BY_DEX.get(d)!.classification === 'ultra-beast')).toBe(false);
    expect(pool.some((d) => d >= 10000)).toBe(false);
    const caught = Object.fromEntries(pool.slice(1).map((d) => [d, 1]));
    let shiny = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const p = rollLeaderPrize(50, ALL_GENS, caught, rng);
      expect(p.dexNum).toBe(pool[0]);
      if (p.shiny) shiny++;
    }
    expect(Math.abs(shiny / n - LEADER_PRIZE_SHINY_ODDS)).toBeLessThan(0.02);
  });

  it('save round-trip keeps the Radar', () => {
    const s = roundTrip({ ...trainer(), rocket: { gruntWins: 3, typesBeaten: ['Fire', 'Nope', 'Fire'], leaderReady: false, leaderWins: 2 } });
    expect(s.rocket).toEqual({ gruntWins: 3, typesBeaten: ['Fire'], leaderReady: false, leaderWins: 2 });
  });
});
