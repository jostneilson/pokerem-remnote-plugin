/*
 * Every rare-encounter rate in one place: shinies, pity, Galarian birds and legendary events.
 * See docs/update-1.6.0/SPEC.md (A7, Appendix L) for the rules these follow.
 */

/** Shiny odds before the player has caught every wild-eligible species in enabled generations. */
export const SHINY_ODDS_PRE_DEX_COMPLETE = 1 / 250;

/** Shiny odds after full species completion for enabled generations (duplicate hunting). */
export const SHINY_ODDS_POST_DEX_COMPLETE = 1 / 250;

/** After this many encounters without a shiny, the odds start climbing... */
export const SHINY_PITY_START = 500;
/** ...until one is guaranteed this many encounters later. */
export const SHINY_PITY_SPAN = 250;

/** Galarian Articuno, Zapdos and Moltres: a quarter of their encounters are shiny. */
export const GALARIAN_BIRDS: ReadonlySet<number> = new Set([10169, 10170, 10171]);
export const GALARIAN_BIRD_SHINY_ODDS = 0.25;

/**
 * Rare rates are written as "1 in N cards at Medium pacing" and applied per encounter (SPEC L1): Medium is
 * 3 cards per wild, so the per-encounter chance is 3 / N. Slower pacing has fewer encounters per card and so
 * fewer rarities per card; faster pacing has more.
 */
export const MEDIUM_CARDS_PER_ENCOUNTER = 3;
export function perEncounterOdds(oneInCardsAtMedium: number): number {
  return MEDIUM_CARDS_PER_ENCOUNTER / oneInCardsAtMedium;
}

/** Galarian Articuno, Zapdos or Moltres: 1 in 250 cards at Medium, after the first 100 cards. */
export const BIRD_ONE_IN_CARDS = 250;
export const BIRD_CHANCE = perEncounterOdds(BIRD_ONE_IN_CARDS);
export const BIRD_MIN_REVIEWS = 100;

/** Wild legendaries, mythicals and Ultra Beasts (not the birds): 1 in 2,500 cards at Medium, once established. */
export const EVENT_MIN_PARTY_LEVEL = 25;
export const EVENT_MIN_REVIEWS = 500;
export const EVENT_ONE_IN_CARDS = 2500;
export const EVENT_CHANCE = perEncounterOdds(EVENT_ONE_IN_CARDS);

/** Everyday species that are hard catches (pseudo-legendaries, fossils…) are this much rarer in the wild. */
export const WILD_RARE_CATCH_RATE = 45;
export const WILD_RARE_WEIGHT = 0.5;

export type TeamId = 'ember' | 'tide' | 'volt';
/** Each team's bird (SPEC L11). */
export const TEAM_BIRD: Record<TeamId, number> = { ember: 10171, tide: 10169, volt: 10170 };
/** Share of bird sightings that are your team's bird; the other two split the rest. */
export const TEAM_BIRD_SHARE = 0.5;

/** Which bird appears: your team's half the time, otherwise one of the other two; no team = even odds. */
export function pickGalarianBird(team: TeamId | undefined, rng: () => number): number {
  const birds = [...GALARIAN_BIRDS];
  if (!team) return birds[Math.floor(rng() * birds.length) % birds.length]!;
  const own = TEAM_BIRD[team];
  if (rng() < TEAM_BIRD_SHARE) return own;
  const others = birds.filter((d) => d !== own);
  return others[Math.floor(rng() * others.length) % others.length]!;
}

/** Shiny odds with a gentle pity: unchanged until a long dry spell, then rising to certain. */
export function shinyOddsWithPity(base: number, encountersSinceShiny: number): number {
  const over = encountersSinceShiny - SHINY_PITY_START;
  if (over <= 0) return base;
  const t = Math.min(1, over / SHINY_PITY_SPAN);
  return Math.min(1, base + (1 - base) * t * t);
}
