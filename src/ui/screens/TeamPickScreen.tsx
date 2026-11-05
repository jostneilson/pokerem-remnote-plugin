import { useState } from 'react';
import type { TeamId } from '../../game/engine/rarity';
import { TEAMS, TEAM_BY_ID } from '../../game/engine/teams';

/** Original team crests (SPEC U10): Ember a flame-wing, Tide a wave-crest wing, Volt a zig-zag wing. */
export function TeamCrest({ team, size = 64 }: { team: TeamId; size?: number }) {
  const c = TEAM_BY_ID.get(team)!.color;
  return (
    <svg className="pkr-team-crest" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#101326" stroke={c} strokeWidth="3" />
      {team === 'ember' ? (
        <>
          <path d="M16 44 C18 30 26 22 34 14 C32 24 38 26 44 20 C46 32 40 44 30 48 C24 50 18 48 16 44Z" fill={c} />
          <path d="M26 44 C27 36 31 32 34 28 C34 34 38 36 40 34 C40 40 36 45 31 46Z" fill="#ffc145" />
        </>
      ) : team === 'tide' ? (
        <>
          <path d="M12 40 C20 40 22 30 30 26 C38 22 46 26 52 20 C50 32 42 40 32 42 C40 44 46 42 52 38 C46 48 34 52 22 48 C18 46 14 44 12 40Z" fill={c} />
          <path d="M22 40 C28 38 30 32 36 30 C40 29 44 30 46 28" fill="none" stroke="#8fe3ff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M14 42 L24 22 L28 32 L38 14 L40 28 L50 22 L42 44 L36 34 L30 46 L26 36Z" fill={c} />
          <path d="M24 22 L28 32 L38 14" fill="none" stroke="#fff27a" strokeWidth="2" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

/**
 * Choose your team (SPEC A13, U10). First in onboarding for new saves (team → starter → difficulty); existing
 * saves see it once with the reassurance subtitle. The choice is permanent.
 */
export function TeamPickScreen({ existingPlayer, onChoose }: { existingPlayer: boolean; onChoose: (team: TeamId) => void }) {
  const [pending, setPending] = useState<TeamId | null>(null);
  const picked = pending ? TEAM_BY_ID.get(pending) : undefined;
  return (
    <div className="pkr-team-pick">
      <h2 className="pkr-team-pick__title">Choose your team</h2>
      {existingPlayer ? <p className="pkr-team-pick__sub">New in 1.6.0: pick a team. Your progress is safe.</p> : null}
      <ul className="pkr-team-pick__list">
        {TEAMS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={`pkr-team-card${pending === t.id ? ' pkr-team-card--on' : ''}`}
              style={{ borderColor: t.color }}
              aria-pressed={pending === t.id}
              onClick={() => setPending(t.id)}
            >
              <TeamCrest team={t.id} />
              <strong style={{ color: t.color }}>{t.name}</strong>
              <span>{t.flavour}</span>
            </button>
          </li>
        ))}
      </ul>
      {picked ? (
        <div className="pkr-team-confirm" role="dialog" aria-label={`Join ${picked.name}?`} style={{ borderColor: picked.color }}>
          <p>
            Join {picked.name}? This can&apos;t be changed.
          </p>
          <div className="pkr-team-confirm__actions">
            <button type="button" className="pkr-game-btn" onClick={() => setPending(null)}>
              Back
            </button>
            <button type="button" className="pkr-game-btn pkr-team-confirm__join" style={{ background: picked.color }} onClick={() => onChoose(picked.id)}>
              Join {picked.name}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
