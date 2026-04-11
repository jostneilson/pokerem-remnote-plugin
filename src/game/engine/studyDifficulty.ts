import { REVIEWS_PER_ENCOUNTER } from '../constants';

export type StudyDifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';

/** Presets tune how many reviews you need per wild encounter vs how much trainer XP each review grants. */
export const STUDY_PRESET_DEFAULTS: Record<Exclude<StudyDifficultyPreset, 'custom'>, { reviews: number; weight: number }> = {
  /** More wild encounters per study session; slightly higher XP per review. */
  easy: { reviews: 3, weight: 1.12 },
  /** Balanced — matches classic pacing. */
  medium: { reviews: REVIEWS_PER_ENCOUNTER, weight: 1 },
  /** Fewer wilds per study block; lower XP per review — you need more flashcards overall to progress. */
  hard: { reviews: 10, weight: 0.78 },
};

export function clampStudyReviews(n: number): number {
  return Math.max(2, Math.min(15, Math.round(n)));
}

export function clampStudyWeight(w: number): number {
  return Math.max(0.5, Math.min(1.5, Math.round(w * 1000) / 1000));
}

export const STUDY_PRESET_LABEL: Record<Exclude<StudyDifficultyPreset, 'custom'>, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
