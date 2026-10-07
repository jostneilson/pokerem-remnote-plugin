import type { PokeRemGameState } from '../state/model';
import { ACHIEVEMENT_DEFS } from './achievements';

interface RankDef {
  name: string;
  check: (state: PokeRemGameState) => boolean;
}

function uniqueCaught(s: PokeRemGameState): number {
  return Object.values(s.collectionDex).filter((n) => n > 0).length;
}

function highestLevel(s: PokeRemGameState): number {
  return Math.max(0, ...s.party.map((p) => p.level));
}

const RANKS: RankDef[] = [
  {
    name: 'Pokemon Master',
    check: (s) => ACHIEVEMENT_DEFS.every((d) => s.achievements[d.id]),
  },
  {
    name: 'Champion',
    check: (s) => uniqueCaught(s) >= 151 && s.cardsReviewed >= 5000 && highestLevel(s) >= 50,
  },
  {
    name: 'Elite Trainer',
    check: (s) => uniqueCaught(s) >= 100 && s.cardsReviewed >= 2500,
  },
  {
    name: 'Gym Leader',
    check: (s) => uniqueCaught(s) >= 50 && s.cardsReviewed >= 1000 && highestLevel(s) >= 25,
  },
  {
    name: 'Pokemon Ranger',
    check: (s) => uniqueCaught(s) >= 25 && s.cardsReviewed >= 500,
  },
  {
    name: 'Ace Trainer',
    check: (s) => s.cardsReviewed >= 50 && (s.totalEvolutions ?? 0) >= 5,
  },
  {
    name: 'Pokemon Trainer',
    check: (s) => uniqueCaught(s) >= 10,
  },
  {
    name: 'Novice Trainer',
    check: () => true,
  },
];

export function computeTrainerRank(state: PokeRemGameState): string {
  for (const rank of RANKS) {
    if (rank.check(state)) return rank.name;
  }
  return 'Novice Trainer';
}

/** Battle-identity ladder rewarded by trainer-battle wins (cosmetic, shown beside rank). */
interface BattleIdentityDef {
  id: string;
  name: string;
  minTotalWon: number;
  minEliteWon?: number;
  minStreak?: number;
}

const BATTLE_IDENTITIES: BattleIdentityDef[] = [
  { id: 'champion_scholar',  name: 'Champion Scholar',  minTotalWon: 100, minEliteWon: 15, minStreak: 8 },
  { id: 'elite_challenger',  name: 'Elite Challenger',  minTotalWon: 50,  minEliteWon: 5 },
  { id: 'study_ace',         name: 'Study Ace',         minTotalWon: 25 },
  { id: 'scholar_trainer',   name: 'Scholar Trainer',   minTotalWon: 10 },
  { id: 'rookie_challenger', name: 'Rookie Challenger', minTotalWon: 1 },
  { id: 'unranked',          name: 'Untested',          minTotalWon: 0 },
];

export interface TrainerBattleIdentity {
  id: string;
  name: string;
}

export function computeTrainerBattleIdentity(state: PokeRemGameState): TrainerBattleIdentity {
  const stats = state.trainerBattleStats;
  const totalWon = stats?.totalWon ?? 0;
  const eliteWon = stats?.eliteWon ?? 0;
  const longestStreak = stats?.longestWinStreak ?? 0;
  for (const t of BATTLE_IDENTITIES) {
    if (totalWon < t.minTotalWon) continue;
    if (t.minEliteWon && eliteWon < t.minEliteWon) continue;
    if (t.minStreak && longestStreak < t.minStreak) continue;
    return { id: t.id, name: t.name };
  }
  return { id: 'unranked', name: 'Untested' };
}
