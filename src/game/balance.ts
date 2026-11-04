import { SPECIES_BY_DEX } from './data/species';

/*
 * Every reward weight in one place: coins, XP and the variable cash rolls. The balance harness
 * (`src/game/sim/balance.ts`, `npm run balance:tune`) tunes the values marked tunable in
 * docs/update-1.6.0/SPEC.md Appendix T; everything else here is fixed by the spec.
 */

/** Transfer payout tier: the species tier, with everyday Pokémon split by how hard they are to catch. */
export type TransferTier = 'Common' | 'Uncommon' | 'Rare' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';

export const BALANCE = {
  coins: {
    /** Per reviewed card, × the study card weight. Tunable 5–25. */
    review: 10,
    /** Defeat: base + per level, × species tier. Tunable 30–150 / 3–15. */
    defeatBase: 60,
    defeatPerLevel: 8,
    /** Catch: always below defeat at every level. */
    catchBase: 40,
    catchPerLevel: 5,
    run: 25,
    /** Ultra Beast ×3, Legendary ×5, Mythical ×6 on both defeat and catch coins. */
    tierMult: { Ultra: 3, Legendary: 5, Mythical: 6 } as Partial<Record<string, number>>
  },
  /** ~1 in 40 wilds carries a bounty of ₽1.5–4k, paid on defeat or catch (SPEC B2; chance tunable 1/60–1/25). */
  bounty: {
    chance: 1 / 40,
    min: 1500,
    max: 4000
  },
  /** Achievement coins by tier (SPEC B5; tunable ±50%). */
  achievementCoins: { common: 500, uncommon: 1500, rare: 5000, epic: 15000 } as Record<'common' | 'uncommon' | 'rare' | 'epic', number>,
  /** Every trainer level pays this × the level reached (tunable 100–500). */
  trainerLevelCoinPerLevel: 250,
  /** Daily quests pay ₽800–1,800, weekly ₽5–8k (SPEC C2); `scale` is the tunable (±40%). */
  quests: {
    scale: 1,
    dailyMin: 800,
    dailyMax: 1800,
    weeklyMin: 5000,
    weeklyMax: 8000
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
    { upTo: 0.0455, min: 300, max: 800, tier: 'Lucky find' }
  ] as readonly { upTo: number; min: number; max: number; tier: string }[]
};

const tierMult = (dexNum?: number) => {
  if (dexNum == null) return 1;
  return BALANCE.coins.tierMult[SPECIES_BY_DEX.get(dexNum)?.tier ?? ''] ?? 1;
};

/** Coins for knocking out a wild Pokémon (`dexNum` applies the species tier multiplier). */
export function defeatCoins(level: number, dexNum?: number): number {
  return Math.round((BALANCE.coins.defeatBase + Math.floor(level * BALANCE.coins.defeatPerLevel)) * tierMult(dexNum));
}

/** Coins for catching a wild Pokémon; always below `defeatCoins` for the same Pokémon. */
export function catchCoins(level: number, dexNum?: number): number {
  return Math.round((BALANCE.coins.catchBase + Math.floor(level * BALANCE.coins.catchPerLevel)) * tierMult(dexNum));
}

/** A quest's coins, scaled and kept inside its period's band. */
export function questCoins(period: 'daily' | 'weekly', listed: number): number {
  const q = BALANCE.quests;
  const [min, max] = period === 'daily' ? [q.dailyMin, q.dailyMax] : [q.weeklyMin, q.weeklyMax];
  return Math.round(Math.max(min, Math.min(max, listed)) * q.scale);
}

/** Roll a bounty for a new wild (rounded to ₽100), or undefined. */
export function rollBounty(rng: () => number = Math.random): number | undefined {
  const b = BALANCE.bounty;
  if (rng() >= b.chance) return undefined;
  return Math.round((b.min + rng() * (b.max - b.min)) / 100) * 100;
}
