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

/** Legendaries, Mythicals and Ultra Beasts appear as rare events once you're established. */
export const EVENT_MIN_PARTY_LEVEL = 25;
export const EVENT_MIN_REVIEWS = 500;
export const EVENT_CHANCE = 0.012;

/** Shiny odds with a gentle pity: unchanged until a long dry spell, then rising to certain. */
export function shinyOddsWithPity(base: number, encountersSinceShiny: number): number {
  const over = encountersSinceShiny - SHINY_PITY_START;
  if (over <= 0) return base;
  const t = Math.min(1, over / SHINY_PITY_SPAN);
  return Math.min(1, base + (1 - base) * t * t);
}
