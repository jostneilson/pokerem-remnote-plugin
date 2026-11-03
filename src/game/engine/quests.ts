/**
 * Daily and weekly quests: a few rotating goals measured as progress since the period began
 * (a snapshot of lifetime counters), each with a generous coin and item reward.
 */
import type { ItemId } from '../data/items';
import type { PokeRemGameState } from '../state/model';

export type QuestMetric = 'reviews' | 'catches' | 'defeats' | 'trainerWins' | 'evolutions' | 'newSpecies';

export type QuestCounters = Record<QuestMetric, number>;

export interface QuestDef {
  id: string;
  period: 'daily' | 'weekly';
  metric: QuestMetric;
  target: number;
  label: string;
  coins: number;
  items?: Partial<Record<ItemId, number>>;
}

export interface QuestState {
  day: string;
  week: string;
  dayBase: QuestCounters;
  weekBase: QuestCounters;
  /** Quest ids claimed in the current day / week. */
  claimed: string[];
}

const DAILY_POOL: QuestDef[] = [
  { id: 'd-review-30', period: 'daily', metric: 'reviews', target: 30, label: 'Review 30 cards', coins: 600, items: { 'poke-ball': 3 } },
  { id: 'd-review-75', period: 'daily', metric: 'reviews', target: 75, label: 'Review 75 cards', coins: 1500, items: { 'great-ball': 2 } },
  { id: 'd-catch-3', period: 'daily', metric: 'catches', target: 3, label: 'Catch 3 Pokémon', coins: 800, items: { 'great-ball': 1 } },
  { id: 'd-catch-6', period: 'daily', metric: 'catches', target: 6, label: 'Catch 6 Pokémon', coins: 1400, items: { 'ultra-ball': 1 } },
  { id: 'd-defeat-5', period: 'daily', metric: 'defeats', target: 5, label: 'Defeat 5 wild Pokémon', coins: 900, items: { potion: 2 } },
  { id: 'd-trainer-1', period: 'daily', metric: 'trainerWins', target: 1, label: 'Beat a trainer', coins: 1200, items: { revive: 1 } },
  { id: 'd-new-2', period: 'daily', metric: 'newSpecies', target: 2, label: 'Register 2 new species', coins: 1000, items: { 'great-ball': 2 } },
];

const WEEKLY_POOL: QuestDef[] = [
  { id: 'w-review-400', period: 'weekly', metric: 'reviews', target: 400, label: 'Review 400 cards', coins: 6000, items: { 'ultra-ball': 3 } },
  { id: 'w-catch-25', period: 'weekly', metric: 'catches', target: 25, label: 'Catch 25 Pokémon', coins: 5000, items: { 'rare-candy': 1 } },
  { id: 'w-trainer-5', period: 'weekly', metric: 'trainerWins', target: 5, label: 'Beat 5 trainers', coins: 5000, items: { 'ultra-ball': 2, revive: 2 } },
  { id: 'w-evolve-2', period: 'weekly', metric: 'evolutions', target: 2, label: 'Evolve 2 Pokémon', coins: 4000, items: { 'rare-candy': 1 } },
  { id: 'w-new-15', period: 'weekly', metric: 'newSpecies', target: 15, label: 'Register 15 new species', coins: 6000, items: { 'ultra-ball': 3 } },
];

export const ALL_QUESTS: QuestDef[] = [...DAILY_POOL, ...WEEKLY_POOL];

export function questCounters(s: PokeRemGameState): QuestCounters {
  const t = s.trainerBattleStats;
  return {
    reviews: s.cardsReviewed ?? 0,
    catches: s.totalCaught ?? 0,
    defeats: s.totalDefeated ?? 0,
    trainerWins: (t?.standardWon ?? 0) + (t?.eliteWon ?? 0),
    evolutions: s.totalEvolutions ?? 0,
    newSpecies: Object.values(s.collectionDex ?? {}).filter((n) => typeof n === 'number' && n > 0).length,
  };
}

export function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Monday of the local week, as a day string. */
export function localWeek(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDay(d);
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic pick of `n` quests for a period key, each measuring something different. */
function pickQuests(pool: QuestDef[], key: string, n: number): QuestDef[] {
  const ordered = pool.map((q) => ({ q, k: hash(`${key}:${q.id}`) })).sort((a, b) => a.k - b.k);
  const out: QuestDef[] = [];
  for (const { q } of ordered) {
    if (out.length >= n) break;
    if (!out.some((o) => o.metric === q.metric)) out.push(q);
  }
  return out;
}

export function activeQuests(qs: QuestState): QuestDef[] {
  return [...pickQuests(DAILY_POOL, qs.day, 3), ...pickQuests(WEEKLY_POOL, qs.week, 2)];
}

/** Start a new day / week when the date moves on (progress counts from that moment). */
export function rollQuests(s: PokeRemGameState, now: Date = new Date()): QuestState {
  const day = localDay(now);
  const week = localWeek(now);
  const prev = s.quests;
  const counters = questCounters(s);
  if (!prev) return { day, week, dayBase: counters, weekBase: counters, claimed: [] };
  if (prev.day === day && prev.week === week) return prev;
  const newDay = prev.day !== day;
  const newWeek = prev.week !== week;
  const claimed = prev.claimed.filter((id) => {
    const def = ALL_QUESTS.find((q) => q.id === id);
    if (!def) return false;
    return def.period === 'daily' ? !newDay : !newWeek;
  });
  return {
    day,
    week,
    dayBase: newDay ? counters : prev.dayBase,
    weekBase: newWeek ? counters : prev.weekBase,
    claimed,
  };
}

export interface QuestView extends QuestDef {
  current: number;
  done: boolean;
  claimed: boolean;
}

export function questViews(s: PokeRemGameState): QuestView[] {
  const qs = s.quests ?? rollQuests(s);
  const now = questCounters(s);
  return activeQuests(qs).map((q) => {
    const base = q.period === 'daily' ? qs.dayBase : qs.weekBase;
    const current = Math.max(0, Math.min(q.target, now[q.metric] - (base[q.metric] ?? 0)));
    return { ...q, current, done: current >= q.target, claimed: qs.claimed.includes(q.id) };
  });
}

export function normalizeQuestState(raw: unknown): QuestState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<QuestState>;
  if (typeof o.day !== 'string' || typeof o.week !== 'string') return undefined;
  const counters = (c: unknown): QuestCounters => {
    const x = (c && typeof c === 'object' ? c : {}) as Partial<QuestCounters>;
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return {
      reviews: n(x.reviews),
      catches: n(x.catches),
      defeats: n(x.defeats),
      trainerWins: n(x.trainerWins),
      evolutions: n(x.evolutions),
      newSpecies: n(x.newSpecies),
    };
  };
  return {
    day: o.day,
    week: o.week,
    dayBase: counters(o.dayBase),
    weekBase: counters(o.weekBase),
    claimed: Array.isArray(o.claimed) ? o.claimed.filter((x): x is string => typeof x === 'string').slice(0, 20) : [],
  };
}
