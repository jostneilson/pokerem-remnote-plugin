import type { PokeRemGameState } from '../../game/state/model';
import { questViews, type QuestView } from '../../game/engine/quests';
import { ITEM_BY_ID, type ItemId } from '../../game/data/items';

function rewardLine(q: QuestView): string {
  const items = Object.entries(q.items ?? {})
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id, n]) => `${n}× ${ITEM_BY_ID.get(id as ItemId)?.name ?? id}`);
  return [`₽${q.coins.toLocaleString()}`, ...items].join(' · ');
}

function QuestRow({ q, onClaim }: { q: QuestView; onClaim: (id: string) => void }) {
  const pct = Math.round((q.current / q.target) * 100);
  return (
    <li className={`pkr-quest${q.claimed ? ' pkr-quest--claimed' : q.done ? ' pkr-quest--done' : ''}`}>
      <div className="pkr-quest-main">
        <div className="pkr-quest-label">{q.label}</div>
        <div className="pkr-quest-reward">{rewardLine(q)}</div>
        {!q.done ? (
          <div className="pkr-quest-meter" role="progressbar" aria-valuemin={0} aria-valuemax={q.target} aria-valuenow={q.current} aria-label={q.label}>
            <span style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      {q.claimed ? (
        <span className="pkr-quest-status">Claimed</span>
      ) : q.done ? (
        <button type="button" className="pkr-game-btn pkr-quest-claim" onClick={() => onClaim(q.id)}>
          Claim
        </button>
      ) : (
        <span className="pkr-quest-status">
          {q.current}/{q.target}
        </span>
      )}
    </li>
  );
}

/** Today's three quests and this week's two, with one-tap claiming. */
export function QuestsPanel({
  state,
  onClaim,
  onClaimAll,
}: {
  state: PokeRemGameState;
  onClaim: (id: string) => void;
  onClaimAll: () => void;
}) {
  const quests = questViews(state);
  const ready = quests.filter((q) => q.done && !q.claimed).length;
  const daily = quests.filter((q) => q.period === 'daily');
  const weekly = quests.filter((q) => q.period === 'weekly');
  return (
    <section className="pkr-quests" aria-labelledby="pkr-quests-title">
      <div className="pkr-quests-head">
        <h3 id="pkr-quests-title" className="pkr-quests-title">Quests</h3>
        {ready > 1 ? (
          <button type="button" className="pkr-game-btn pkr-quest-claim" onClick={onClaimAll}>
            Claim all ({ready})
          </button>
        ) : null}
      </div>
      <div className="pkr-quests-period">Today</div>
      <ul className="pkr-quest-list">{daily.map((q) => <QuestRow key={q.id} q={q} onClaim={onClaim} />)}</ul>
      <div className="pkr-quests-period">This week</div>
      <ul className="pkr-quest-list">{weekly.map((q) => <QuestRow key={q.id} q={q} onClaim={onClaim} />)}</ul>
    </section>
  );
}
