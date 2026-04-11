export interface OwnedPokemon {
  /** Stable id within save file */
  id: string;
  /** National dex number (matches bundled sprite files, e.g. 1.png). */
  dexNum: number;
  displayName: string;
  totalXp: number;
}

export interface WildEncounter {
  dexNum: number;
  displayName: string;
  level: number;
  maxHp: number;
  currentHp: number;
}

export interface GameStateV1 {
  schemaVersion: 1;
  /** Unix ms — updated on every state mutation (debug + sync verification) */
  lastUpdatedAt: number;
  starterChosen: boolean;
  starterDexNum: number | null;
  /** Single-party slice: one active Pokémon id */
  activePokemonId: string | null;
  party: OwnedPokemon[];
  cardsReviewed: number;
  /** Counts up toward REVIEWS_PER_ENCOUNTER; resets when an encounter spawns */
  encounterProgress: number;
  currentEncounter: WildEncounter | null;
  /** Caught Pokémon (minimal collection list) */
  collection: OwnedPokemon[];
}
