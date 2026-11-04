/*
 * Every reward weight in one place: coins, XP and the variable cash rolls. The balance harness
 * (`src/game/sim/balance.ts`, `npm run balance:tune`) tunes the values marked tunable in
 * docs/update-1.6.0/SPEC.md Appendix T; everything else here is fixed by the spec.
 */

/** Transfer payout tier: the species tier, with everyday Pokémon split by how hard they are to catch. */
export type TransferTier = 'Common' | 'Uncommon' | 'Rare' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';

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
  /** Transfer payouts (SPEC A5; tunable ±50% per Appendix T, a Common always < ₽100). */
  transfer: {
    base: { Common: 30, Uncommon: 60, Rare: 150, Baby: 80, Ultra: 600, Legendary: 1500, Mythical: 2500 } as Record<TransferTier, number>,
    /** Payout × (1 + level / perLevelDiv). */
    perLevelDiv: 25,
    shinyMult: 3,
    hundoMult: 2,
    /** A plain Common is always worth less than a Poké Ball. */
    commonMax: 99,
    /** XP to every owned Pokémon sharing a type: xpBase + xpPerLevel × level (storage gets half). */
    xpBase: 8,
    xpPerLevel: 2,
    storageXpShare: 0.5
  },
  /** Team Rocket rewards (SPEC Appendix R; tunable per Appendix T). */
  rocket: {
    gruntCoinBase: 1200,
    gruntCoinPerAvg: 20,
    /** 30%: 1–3 Great/Ultra Balls or a potion. */
    gruntItemChance: 0.3,
    /** 10%: a ₽3–6k cache. */
    gruntCacheChance: 0.1,
    gruntCacheMin: 3000,
    gruntCacheMax: 6000,
    leaderCoinMin: 8000,
    leaderCoinMax: 15000
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
