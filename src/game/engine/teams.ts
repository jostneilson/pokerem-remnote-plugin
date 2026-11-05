import type { TeamId } from './rarity';

/** Teams (SPEC A13, U10). Original names and crests; the Galarian bird weighting is never shown. */
export interface TeamDef {
  id: TeamId;
  name: string;
  flavour: string;
  color: string;
}

export const TEAMS: readonly TeamDef[] = [
  { id: 'ember', name: 'Team Valor', flavour: 'Fierce hearts that never back down.', color: '#e0533a' },
  { id: 'tide', name: 'Team Mystic', flavour: 'Calm minds that see further.', color: '#3a8fe0' },
  { id: 'volt', name: 'Team Instinct', flavour: 'Quick instincts that strike first.', color: '#f2c53a' }
];

export const TEAM_BY_ID = new Map<TeamId, TeamDef>(TEAMS.map((t) => [t.id, t]));
