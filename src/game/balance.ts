/*
 * Every reward weight in one place: coins, XP and the variable cash rolls. The balance harness
 * (`src/game/sim/balance.ts`, `npm run balance:tune`) tunes the values marked tunable in
 * docs/update-1.6.0/SPEC.md Appendix T; everything else here is fixed by the spec.
 */

export const BALANCE = {
  coins: {
    /** Per reviewed card, × the study card weight. */
    review: 25,
    defeatBase: 250,
    defeatPerLevel: 10,
    catchBase: 100,
    catchPerLevel: 0,
    run: 25
  },
  xp: {
    /** Lead study XP per card: 40% / 40% / 20% of these. */
    studyLeadRoll: [3, 4, 5] as readonly number[],
    /** Bench study XP per card, same odds. */
    studyBenchRoll: [1, 2, 3] as readonly number[],
    /** Multiplier on `knockoutXp`. */
    knockoutMult: 1,
    /** Multiplier on combat (per-hit) XP. */
    fightMult: 1,
    /** Type-share boost on a catch or defeat: party base + per foe level, storage base + per level. */
    typeSharePartyBase: 15,
    typeSharePartyPerLevel: 2,
    typeShareStorageBase: 5,
    typeShareStoragePerLevel: 0.5
  },
  /** Hidden study cash rolls per card: cumulative chance, then the ₽ range. */
  studyCash: [
    { upTo: 0.0005, min: 10_000, max: 25_000, tier: 'Jackpot' },
    { upTo: 0.0055, min: 2000, max: 5000, tier: 'Rare find' },
    { upTo: 0.0455, min: 350, max: 850, tier: 'Lucky find' }
  ] as readonly { upTo: number; min: number; max: number; tier: string }[]
};

/** Coins for knocking out a wild Pokémon. */
export function defeatCoins(level: number): number {
  return BALANCE.coins.defeatBase + Math.floor(level * BALANCE.coins.defeatPerLevel);
}

/** Coins for catching a wild Pokémon. */
export function catchCoins(level: number): number {
  return BALANCE.coins.catchBase + Math.floor(level * BALANCE.coins.catchPerLevel);
}

/** One of three values at 40% / 40% / 20%. */
export function rollStudyXp(roll: readonly number[], rng: () => number): number {
  const r = rng();
  return r < 0.4 ? roll[0]! : r < 0.8 ? roll[1]! : roll[2]!;
}
