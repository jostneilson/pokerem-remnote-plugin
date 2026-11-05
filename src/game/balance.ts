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
    review: 6,
    /** Defeat: base + per level, × species tier. Tunable 30–150 / 3–15. */
    defeatBase: 30,
    defeatPerLevel: 4,
    /** Catch: always below defeat at every level. */
    catchBase: 2,
    catchPerLevel: 0.5,
    run: 25,
    /** Ultra Beast ×3, Legendary ×5, Mythical ×6 on both defeat and catch coins. */
    tierMult: { Ultra: 3, Legendary: 5, Mythical: 6 } as Partial<Record<string, number>>
  },
  /** ~1 in 40 wilds carries a bounty of ₽1.5–4k, paid on defeat or catch (SPEC B2; chance tunable 1/60–1/25). */
  bounty: {
    chance: 1 / 60,
    min: 1500,
    max: 4000
  },
  /** Achievement coins by tier (SPEC B5; tunable ±50%). */
  achievementCoins: { common: 250, uncommon: 750, rare: 2500, epic: 7500 } as Record<'common' | 'uncommon' | 'rare' | 'epic', number>,
  /**
   * Power Up cost = base + perLevel·L + perLevelSq·L², the main steady sink (SPEC C2): about half a day's
   * income at L20 (₽3.4k), a full day's at L40 (₽11.4k).
   */
  powerUp: { base: 200, perLevel: 40, perLevelSq: 6 },
  /** Every trainer level pays this × the level reached (tunable 100–500). */
  trainerLevelCoinPerLevel: 100,
  /** Daily quests pay ₽800–1,800, weekly ₽5–8k (SPEC C2); `scale` is the tunable (±40%). */
  quests: {
    scale: 0.8,
    dailyMin: 800,
    dailyMax: 1800,
    weeklyMin: 5000,
    weeklyMax: 8000,
    /**
     * Quest pay grows with trainer level (owner decision 2026-11-04): `growStart` of full pay at Lv1, full pay
     * from `growFullLevel`. Keeps week-one income in band without lowering later income.
     */
    growStart: 0.4,
    growFullLevel: 20
  },
  xp: {
    /** Study XP per card for every party member (XP Share). Tunable 0.6–3. */
    studyPerCard: 3,
    /** The lead's extra study XP (fixed). */
    studyLeadMult: 1.2,
    /** Multiplier on `knockoutXp`. Tunable 0.3–1.2. */
    knockoutMult: 0.3,
    /** Level damp on every XP gain above this level (see `levelXpDamp`). */
    levelDampFrom: 16,
    levelDampSpan: 15,
    /** Least base KO XP (before the split), so early knockouts still matter on the flat-ish XP curve. */
    knockoutFloor: 22,
    /** Multiplier on combat (per-hit) XP. Tunable 0.3–1.2. */
    fightMult: 0.3,
    /** Multiplier on type-share XP. Tunable 0.3–1.2. */
    typeShareMult: 1.2,
    /** Type-share boost on a catch or defeat: party base + per foe level, storage base + per level. */
    typeSharePartyBase: 15,
    typeSharePartyPerLevel: 2,
    typeShareStorageBase: 5,
    typeShareStoragePerLevel: 0.5
  },
  /** Transfer payouts (SPEC A5; tunable ±50% per Appendix T, a Common always < ₽100). */
  transfer: {
    base: { Common: 15, Uncommon: 30, Rare: 75, Baby: 40, Ultra: 300, Legendary: 750, Mythical: 1250 } as Record<TransferTier, number>,
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
  /** Scale on research line coins (listed ₽15–30k; tunable 0.6–1.4). */
  researchCoinScale: 0.6,
  /** Scale on standard/elite trainer coins (SPEC C2: "formulas kept, then scaled by the harness"). */
  trainerCoinScale: 0.15,
  /** Team Rocket rewards (SPEC Appendix R; tunable per Appendix T). */
  rocket: {
    gruntCoinBase: 600,
    gruntCoinPerAvg: 10,
    /** 30%: 1–3 Great/Ultra Balls or a potion. */
    gruntItemChance: 0.3,
    /** 10%: a ₽3–6k cache. */
    gruntCacheChance: 0.1,
    gruntCacheMin: 3000,
    gruntCacheMax: 6000,
    leaderCoinMin: 5000,
    leaderCoinMax: 10000
  },
  /** Hidden study cash rolls per card: cumulative chance, then the ₽ range (1.6.0: 0.6% / 0.06% / 0.006%). */
  studyCash: [
    { upTo: 0.00006, min: 10_000, max: 25_000, tier: 'Jackpot' },
    { upTo: 0.00066, min: 2000, max: 5000, tier: 'Rare find' },
    { upTo: 0.00666, min: 300, max: 800, tier: 'Lucky find' }
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

/** Share of full quest pay at a trainer level: `growStart` at Lv1, rising evenly to 1 at `growFullLevel`. */
export function questLevelFactor(trainerLevel: number): number {
  const q = BALANCE.quests;
  const t = Math.max(0, Math.min(1, (trainerLevel - 1) / Math.max(1, q.growFullLevel - 1)));
  return q.growStart + (1 - q.growStart) * t;
}

/** A quest's coins: kept inside its period's band, scaled, and grown with trainer level (rounded to ₽10). */
export function questCoins(period: 'daily' | 'weekly', listed: number, trainerLevel = Infinity): number {
  const q = BALANCE.quests;
  const [min, max] = period === 'daily' ? [q.dailyMin, q.dailyMax] : [q.weeklyMin, q.weeklyMax];
  return Math.round((Math.max(min, Math.min(max, listed)) * q.scale * questLevelFactor(trainerLevel)) / 10) * 10;
}

/** Roll a bounty for a new wild (rounded to ₽100), or undefined. */
export function rollBounty(rng: () => number = Math.random): number | undefined {
  const b = BALANCE.bounty;
  if (rng() >= b.chance) return undefined;
  return Math.round((b.min + rng() * (b.max - b.min)) / 100) * 100;
}

/** Type theme shop (SPEC A12/U11, 1.6.1). `price` is tunable ₽35–60k; a voucher takes `voucherOff` off one theme. */
export const THEME_SHOP = { price: 45_000, voucherOff: 0.2, bonus: 1.25 };

/** Theme bonus (SPEC A12): ×1.25 when the equipped theme's type is one of the foe's types, else ×1. */
export function themeMult(themeActive: string | undefined, types: readonly string[]): number {
  return themeActive && types.includes(themeActive) ? THEME_SHOP.bonus : 1;
}

/** Price of one theme, with or without a voucher (rounded to ₽100). */
export function themePrice(useVoucher = false): number {
  return Math.round((THEME_SHOP.price * (useVoucher ? 1 - THEME_SHOP.voucherOff : 1)) / 100) * 100;
}
