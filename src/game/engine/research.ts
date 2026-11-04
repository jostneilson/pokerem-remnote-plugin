import { BALANCE } from '../balance';
import type { ItemId } from '../data/items';
import type { PokemonType } from '../data/species';
import type { PokeRemGameState } from '../state/model';
import { questCounters } from './quests';

/*
 * Special Research (SPEC B4): multi-step lines with big payouts, one active at a time. Each step counts a
 * lifetime counter from where it stood when the step began, so nothing done before the step counts twice.
 */

export type ResearchMetric =
  | 'reviews'
  | 'catches'
  | 'defeats'
  | 'trainerWins'
  | 'evolutions'
  | 'newSpecies'
  | 'gruntWins'
  | 'leaderWins'
  | `catch:${PokemonType}`;

export type ResearchStep = { metric: ResearchMetric; target: number; label: string };
export type ResearchLine = {
  id: string;
  title: string;
  steps: ResearchStep[];
  coins: number;
  items?: Partial<Record<ItemId, number>>;
  /** Ends in a guaranteed sighting of your team's Galarian bird. */
  teamBird?: boolean;
  /** Only offered once you've joined a team. */
  needsTeam?: boolean;
};

export const RESEARCH_LINES: ResearchLine[] = [
  {
    id: 'field-studies',
    title: 'Field Studies',
    steps: [
      { metric: 'reviews', target: 300, label: 'Review 300 cards' },
      { metric: 'newSpecies', target: 10, label: 'Register 10 new species' },
      { metric: 'evolutions', target: 3, label: 'Evolve 3 Pokémon' }
    ],
    coins: 15000,
    items: { 'rare-candy': 2 }
  },
  {
    id: 'rocket-investigation',
    title: 'Rocket Investigation',
    steps: [
      { metric: 'gruntWins', target: 3, label: 'Beat 3 Rocket Grunts' },
      { metric: 'catch:Poison', target: 10, label: 'Catch 10 Poison-type Pokémon' },
      { metric: 'leaderWins', target: 1, label: 'Beat the Rocket Leader' }
    ],
    coins: 25000,
    items: { 'ultra-ball': 5 }
  },
  {
    id: 'team-bird',
    title: 'A Legend Takes Wing',
    steps: [
      { metric: 'catches', target: 15, label: 'Catch 15 Pokémon' },
      { metric: 'defeats', target: 30, label: 'Defeat 30 wild Pokémon' },
      { metric: 'trainerWins', target: 3, label: 'Beat 3 trainers' }
    ],
    coins: 20000,
    teamBird: true,
    needsTeam: true
  }
];

export type ResearchState = NonNullable<PokeRemGameState['research']>;

export function researchCounter(s: PokeRemGameState, metric: ResearchMetric): number {
  if (metric.startsWith('catch:')) return s.typeCatches?.[metric.slice(6) as PokemonType] ?? 0;
  if (metric === 'gruntWins') return s.rocket?.totalGruntWins ?? 0;
  if (metric === 'leaderWins') return s.rocket?.leaderWins ?? 0;
  return questCounters(s)[metric as keyof ReturnType<typeof questCounters>] ?? 0;
}

function available(s: Pick<PokeRemGameState, 'team'>): ResearchLine[] {
  return RESEARCH_LINES.filter((l) => !l.needsTeam || !!s.team);
}

/** The line after `lineId` (wrapping, so lines repeat once all are done). */
function nextLine(s: PokeRemGameState, lineId: string | null): ResearchLine {
  const lines = available(s);
  const i = lineId ? lines.findIndex((l) => l.id === lineId) : -1;
  return lines[(i + 1) % lines.length]!;
}

function startLine(s: PokeRemGameState, line: ResearchLine, completed: string[]): ResearchState {
  return { lineId: line.id, step: 0, progress: researchCounter(s, line.steps[0]!.metric), completed };
}

/** The active research, starting the first line when there is none. */
export function researchState(s: PokeRemGameState): ResearchState {
  const r = s.research;
  const line = r && RESEARCH_LINES.find((l) => l.id === r.lineId);
  if (!r || !line) return startLine(s, available(s)[0]!, r?.completed ?? []);
  return r;
}

export type ResearchView = {
  line: ResearchLine;
  step: number;
  /** Progress on the current step, 0..target. */
  current: number;
  /** All steps finished: waiting for Claim. */
  done: boolean;
};

export function researchView(s: PokeRemGameState): ResearchView {
  const r = researchState(s);
  const def = RESEARCH_LINES.find((l) => l.id === r.lineId)!;
  // Listed coins × the tunable scale (Appendix T: research ₽15–30k ±40%).
  const line = { ...def, coins: Math.round((def.coins * BALANCE.researchCoinScale) / 100) * 100 };
  if (r.step >= line.steps.length) return { line, step: line.steps.length, current: 0, done: true };
  const st = line.steps[r.step]!;
  const current = Math.max(0, Math.min(st.target, researchCounter(s, st.metric) - r.progress));
  return { line, step: r.step, current, done: false };
}

/** Move through every step whose target is met (called on each save). Returns the same state when unchanged. */
export function advanceResearch(s: PokeRemGameState): PokeRemGameState {
  if (!s.starterChosen) return s;
  let r = researchState(s);
  const line = RESEARCH_LINES.find((l) => l.id === r.lineId)!;
  let changed = r !== s.research;
  while (r.step < line.steps.length) {
    const st = line.steps[r.step]!;
    if (researchCounter(s, st.metric) - r.progress < st.target) break;
    const step = r.step + 1;
    const nextMetric = line.steps[step]?.metric;
    r = { ...r, step, progress: nextMetric ? researchCounter(s, nextMetric) : 0 };
    changed = true;
  }
  return changed ? { ...s, research: r } : s;
}

/** After Claim: the next line begins. */
export function researchAfterClaim(s: PokeRemGameState): ResearchState {
  const r = researchState(s);
  return startLine(s, nextLine(s, r.lineId), [...r.completed, r.lineId].slice(-50));
}

export function normalizeResearch(raw: unknown): ResearchState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Partial<ResearchState>;
  const line = RESEARCH_LINES.find((l) => l.id === o.lineId);
  if (!line) return undefined;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);
  return {
    lineId: line.id,
    step: Math.min(line.steps.length, n(o.step)),
    progress: n(o.progress),
    completed: Array.isArray(o.completed) ? o.completed.filter((x): x is string => typeof x === 'string').slice(-50) : [],
    ...(o.birdPending === true ? { birdPending: true } : {})
  };
}
