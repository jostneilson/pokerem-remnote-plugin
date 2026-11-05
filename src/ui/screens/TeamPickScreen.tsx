import { useState } from 'react';
import type { TeamId } from '../../game/engine/rarity';
import { TEAMS, TEAM_BY_ID } from '../../game/engine/teams';

/**
 * Original team crests (SPEC U10), drawn as 16×16 pixel sprites to match the game's 90s handheld look: a pixel
 * ring in the team colour around a small bird in flight. Ember has a flame crest and flame tail, Tide a curling
 * wave crest and tail, Volt a jagged lightning wing. Use sizes that are multiples of 16 so every pixel stays square.
 */
const CREST_RING = [
  '.....kkkkkk.....',
  '...kkddddddkk...',
  '..kddddddddddk..',
  '.kddddddddddddk.',
  '.kddddddddddddk.',
  'kddddddddddddddk',
  'kddddddddddddddk',
  'kddddddddddddddk',
  'kddddddddddddddk',
  'kddddddddddddddk',
  'kddddddddddddddk',
  '.kddddddddddddk.',
  '.kddddddddddddk.',
  '..kddddddddddk..',
  '...kkddddddkk...',
  '.....kkkkkk.....'
];

/** 12×10 birds in flight, facing right, drawn at (2, 3): c = team colour, s = shade, h = highlight, e = eye. */
const CREST_BIRD: Record<TeamId, string[]> = {
  ember: [
    '........h...',
    '.cc....hch..',
    '..ccc..ccc..',
    '...cccccech.',
    'h...cccccc..',
    'hh.ccssss...',
    '.hhhcsss....',
    '..h.hcc.....',
    '.h...h......',
    '............'
  ],
  tide: [
    '......hh....',
    '.cc..hcch...',
    '..cc..ccc...',
    '...ccccccech',
    '....cccccc..',
    'hh.ccssss...',
    'h.hcsss.....',
    '.hh.........',
    '............',
    '............'
  ],
  volt: [
    '.c..........',
    '..cc........',
    '.ccc....cc..',
    '...ccc.ccech',
    '..ccccccccc.',
    'h..ccsssc...',
    'hc.csss.....',
    '.hcc.c......',
    '..h..c......',
    '.....h......'
  ]
};

const CREST_HIGHLIGHT: Record<TeamId, string> = { ember: '#ffc145', tide: '#8fe3ff', volt: '#fff27a' };
const CREST_SHADE: Record<TeamId, string> = { ember: '#8a1f12', tide: '#163f73', volt: '#8a6512' };

export function TeamCrest({ team, size = 64 }: { team: TeamId; size?: number }) {
  const color = TEAM_BY_ID.get(team)!.color;
  const fill: Record<string, string> = { k: color, d: '#101326', c: color, s: CREST_SHADE[team], h: CREST_HIGHLIGHT[team], e: '#f8edcf' };
  const pixels: { x: number; y: number; c: string }[] = [];
  CREST_RING.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && pixels.push({ x, y, c: fill[ch]! })));
  CREST_BIRD[team].forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && pixels.push({ x: x + 2, y: y + 3, c: fill[ch]! })));
  return (
    <svg className="pkr-team-crest" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {pixels.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.c} />
      ))}
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
