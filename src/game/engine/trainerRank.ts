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
