import { ITEM_BY_ID, type ItemId } from '../../game/data/items';
import { researchView } from '../../game/engine/research';
import type { PokeRemGameState } from '../../game/state/model';
import { formatCoins } from '../format/coins';

/** "Special Research": the active line's steps with progress, its reward, and Claim when done (SPEC U15). */
export function ResearchPanel({ state, onClaim }: { state: PokeRemGameState; onClaim: () => void }) {
  const v = researchView(state);
  const items = Object.entries(v.line.items ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id, n]) => `${n}× ${ITEM_BY_ID.get(id as ItemId)?.name ?? id}`);
  const reward = [formatCoins(v.line.coins), ...items, ...(v.line.teamBird ? ['your team’s bird appears'] : [])].join(' · ');
  return (
    <section className="pkr-quests pkr-research" aria-labelledby="pkr-research-title">
      <div className="pkr-quests-head">
        <h3 id="pkr-research-title" className="pkr-quests-title">Special Research</h3>
      </div>
      <div className="pkr-quests-period">{v.line.title}</div>
      <ol className="pkr-quest-list">
        {v.line.steps.map((st, i) => {
          const done = i < v.step;
          const active = i === v.step && !v.done;
          const current = done ? st.target : active ? v.current : 0;
          return (
            <li key={st.label} className={`pkr-quest${done ? ' pkr-quest--claimed' : ''}${active ? '' : ' pkr-research-step--later'}`}>
              <div className="pkr-quest-main">
                <div className="pkr-quest-label">
                  {i + 1}. {st.label}
                </div>
                {active ? (
                  <div className="pkr-quest-meter" role="progressbar" aria-valuemin={0} aria-valuemax={st.target} aria-valuenow={current} aria-label={st.label}>
                    <span style={{ width: `${Math.round((current / st.target) * 100)}%` }} />
                  </div>
                ) : null}
              </div>
              <span className="pkr-quest-status">{done ? '✓' : `${current}/${st.target}`}</span>
            </li>
          );
        })}
      </ol>
      <div className="pkr-research-reward">
        <span className="pkr-quest-reward">Reward: {reward}</span>
        {v.done ? (
          <button type="button" className="pkr-game-btn pkr-quest-claim" onClick={onClaim}>
            Claim
          </button>
        ) : null}
      </div>
    </section>
  );
}
