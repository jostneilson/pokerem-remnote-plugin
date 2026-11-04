import { LEADER_AFTER_GRUNT_WINS } from '../../game/engine/rocket';
import type { RocketState } from '../../game/state/model';

/** "Rocket Radar ●●●○○": grunt wins this cycle; full = the Rocket Leader is next (SPEC U9). */
export function RocketRadarChip({ rocket, className = '' }: { rocket: RocketState | undefined; className?: string }) {
  if (!rocket) return null;
  const wins = Math.min(LEADER_AFTER_GRUNT_WINS, rocket.gruntWins);
  if (rocket.leaderReady) {
    return (
      <div className={`pkr-rocket-radar pkr-rocket-radar--leader ${className}`} role="status" title="Your next Team Rocket battle is the Rocket Leader">
        Rocket Leader nearby!
      </div>
    );
  }
  const dots = Array.from({ length: LEADER_AFTER_GRUNT_WINS }, (_, i) => (i < wins ? '●' : '○')).join('');
  return (
    <div
      className={`pkr-rocket-radar ${className}`}
      title={`Rocket Radar: ${wins} of ${LEADER_AFTER_GRUNT_WINS} grunts beaten. Beat ${LEADER_AFTER_GRUNT_WINS} to draw out the Rocket Leader.`}
      aria-label={`Rocket Radar: ${wins} of ${LEADER_AFTER_GRUNT_WINS} grunts beaten`}
    >
      <span>Rocket Radar</span> <span className="pkr-rocket-radar__dots" aria-hidden="true">{dots}</span>
    </div>
  );
}
