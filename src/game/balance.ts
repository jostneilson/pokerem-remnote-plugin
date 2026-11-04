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
    /** Study XP per card for every party member (XP Share). Tunable 0.6–3. */
    studyPerCard: 1.6,
    /** The lead's extra study XP (fixed). */
    studyLeadMult: 1.2,
    /** Multiplier on `knockoutXp`. Tunable 0.3–1.2. */
    knockoutMult: 0.7,
    /** Multiplier on combat (per-hit) XP. Tunable 0.3–1.2. */
    fightMult: 0.7,
    /** Multiplier on type-share XP. Tunable 0.3–1.2. */
    typeShareMult: 0.8,
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
