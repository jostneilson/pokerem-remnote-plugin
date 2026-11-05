import { BALANCE } from '../balance';
import type { OwnedPokemon, PokeRemGameState } from '../state/model';
import { applyXpDoublerMultiplier } from './xpDoublers';

/*
 * How Pokémon XP is shared and scaled (SPEC L16, L17, L21). Every XP source goes through `scaledXp`, so the
 * doubler, the catch-up boost and the buddy bonus apply the same way everywhere.
 */

/** The lead's share of knockout XP; the rest is split evenly across the bench. */
export const KO_LEAD_SHARE = 0.6;
/** Catch-up boost per level below the average of the other party members. */
export const CATCH_UP_PER_LEVEL = 0.12;
export const CATCH_UP_MAX_MULT = 2;
/** Your starter (buddy) earns this much more XP from every source. */
export const BUDDY_XP_MULT = 1.15;

/** Levels this party member trails the average of the others by (0 when level or ahead, or not in the party). */
export function catchUpGap(mon: OwnedPokemon, party: readonly OwnedPokemon[]): number {
  if (!party.some((p) => p.id === mon.id)) return 0;
  const others = party.filter((p) => p.id !== mon.id);
  if (others.length === 0) return 0;
  const avg = others.reduce((sum, p) => sum + p.level, 0) / others.length;
  return Math.max(0, avg - mon.level);
}

export function catchUpMult(mon: OwnedPokemon, party: readonly OwnedPokemon[]): number {
  const gap = catchUpGap(mon, party);
  return gap > 0 ? Math.min(CATCH_UP_MAX_MULT, 1 + CATCH_UP_PER_LEVEL * gap) : 1;
}

export function isBuddy(state: Pick<PokeRemGameState, 'starterId'>, mon: Pick<OwnedPokemon, 'id'>): boolean {
  return !!state.starterId && state.starterId === mon.id;
}

/** Catch-up × buddy for one Pokémon (not the doubler). */
export function memberXpMult(state: PokeRemGameState, mon: OwnedPokemon): number {
  return catchUpMult(mon, state.party) * (isBuddy(state, mon) ? BUDDY_XP_MULT : 1);
}

/**
 * Gain scale by the earner's level: 1 up to `levelDampFrom`, then 1 / (1 + (L − from) / span). The XP curve
 * itself is fixed (no level ever moves), so this is how later levels take longer per card (SPEC A2 bands).
 */
export function levelXpDamp(level: number): number {
  const { levelDampFrom, levelDampSpan } = BALANCE.xp;
  return 1 / (1 + Math.max(0, level - levelDampFrom) / Math.max(1, levelDampSpan));
}

/**
 * Final XP for `mon` from a base amount: × catch-up × buddy × level damp × doubler. Fractions are rounded at random in
 * proportion (1.6 XP pays 2 XP 60% of the time), so small per-card amounts stay fair on average.
 */
export function scaledXp(state: PokeRemGameState, mon: OwnedPokemon, base: number, rng: () => number = Math.random): number {
  if (base <= 0) return 0;
  const raw = applyXpDoublerMultiplier(state, base * memberXpMult(state, mon) * levelXpDamp(mon.level));
  const whole = Math.floor(raw);
  return whole + (rng() < raw - whole ? 1 : 0);
}

/** Base study XP for one party member on one card. */
export function studyXpBase(isLead: boolean): number {
  return BALANCE.xp.studyPerCard * (isLead ? BALANCE.xp.studyLeadMult : 1);
}

/**
 * Split a knockout's base XP: the lead keeps 60%, the rest is shared evenly by bench members who can still
 * battle. With no such bench member, the lead keeps it all. Returns base XP per Pokémon id.
 */
export function splitKnockoutXp(total: number, party: readonly OwnedPokemon[], leadId: string): Map<string, number> {
  const out = new Map<string, number>();
  const bench = party.filter((p) => p.id !== leadId && p.currentHp > 0);
  if (bench.length === 0) {
    out.set(leadId, total);
    return out;
  }
  out.set(leadId, total * KO_LEAD_SHARE);
  const each = (total * (1 - KO_LEAD_SHARE)) / bench.length;
  for (const p of bench) out.set(p.id, each);
  return out;
}
