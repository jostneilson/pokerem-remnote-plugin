import { useEffect, useMemo, useRef } from 'react';
import type {
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  OwnedPokemon,
  PokeRemGameState,
} from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { effectivenessChipLabel, effectivenessTier } from '../../game/engine/combatExchange';
import { PokemonAppraisal } from '../components/PokemonAppraisal';
import { SpeciesBadge } from '../components/SpeciesBadge';
import { BattleResultCard } from './BattleResultCard';
import { RouteFindBanner } from './RouteFindBanner';
import { CombatExchangeLogBlock } from './CombatExchangeLogBlock';
import { outcomePanelWithStrikeAccent } from './outcomeStyles';
import { battleLogRichText } from './battleSurfaceUtils';
import { battleSceneName } from '../../game/engine/battleAmbience';

/** Above the commands: the result card, a route find, effectiveness chips and the battle log line. */
export function BattleMessageStack({
  state,
  rootURL,
  hasEncounter,
  outcomeKind,
  feedbackSeq,
  strike,
  playerName,
  wildName,
  accent,
  accentMuted,
  reducedMotion,
  onAcknowledgeRouteFind,
  onDismissResult,
}: {
  state: PokeRemGameState;
  rootURL: string | undefined;
  hasEncounter: boolean;
  outcomeKind: BattleOutcomeKind;
  feedbackSeq: number;
  strike: CombatStrikeSnapshot | null;
  playerName: string;
  wildName: string;
  accent: string;
  accentMuted: string;
  reducedMotion?: boolean;
  onAcknowledgeRouteFind?: () => void;
  onDismissResult?: () => void;
}) {
  const logStyle = useMemo(
    () => outcomePanelWithStrikeAccent(outcomeKind, strike),
    [outcomeKind, strike]
  );
  const showResult = !hasEncounter && !!state.lastBattleResult && !!onDismissResult;
  const richExchange = (outcomeKind === 'combat' || outcomeKind === 'faint') && !!strike;
  const showChips =
    !!strike &&
    (outcomeKind === 'combat' ||
      outcomeKind === 'faint' ||
      (outcomeKind === 'defeat' && strike.wildDefeated === true));
  const playerTier = strike ? effectivenessTier(strike.playerEffectiveness ?? 1) : 'neutral';
  const wildTier = strike ? effectivenessTier(strike.wildEffectiveness ?? 1) : 'neutral';
  const playerChip = strike ? effectivenessChipLabel(playerTier) : null;
  const wildChip = strike ? effectivenessChipLabel(wildTier) : null;
  const wildCounts = !!strike && strike.wildDefeated !== true && wildTier !== 'neutral';
  const logClass =
    'pkr-pixel-dialog pkr-battle-outcome-box animate-pkr-flash rounded-md border-2 px-2.5 py-2 pkr-fine font-black leading-relaxed transition-[box-shadow,border-color] duration-300';

  return (
    <div className="pkr-battle-message-stack mb-2">
      {showResult ? (
        <BattleResultCard
          result={state.lastBattleResult!}
          rootURL={rootURL}
          reducedMotion={reducedMotion}
          onDismiss={onDismissResult!}
        />
      ) : null}
      {hasEncounter && state.area?.isNew ? (
        <p key={`area-${state.cardsReviewed}`} className="pkr-area-chip" role="status">
          → {battleSceneName(state.area.sceneIndex)}
        </p>
      ) : null}
      <RouteFindBanner
        rootURL={rootURL}
        notice={state.routeFindNotice}
        noticeSeq={state.routeFindNoticeSeq ?? 0}
        noticeAckSeq={state.routeFindNoticeAckSeq ?? 0}
        onAcknowledge={onAcknowledgeRouteFind}
        accent={accent}
        accentMuted={accentMuted}
        reducedMotion={reducedMotion}
      />
      {showChips && !richExchange && (playerTier !== 'neutral' || wildCounts) ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
          {playerTier !== 'neutral' && playerChip ? (
            <span className={`pkr-eff-chip pkr-eff-chip--${playerTier}`}>You · {playerChip}</span>
          ) : null}
          {wildCounts && wildChip ? (
            <span className={`pkr-eff-chip pkr-eff-chip--${wildTier}`}>Wild · {wildChip}</span>
          ) : null}
        </div>
      ) : null}
      {richExchange && strike ? (
        <div
          key={feedbackSeq}
          className={logClass.replace(
            'pkr-battle-outcome-box',
            'pkr-battle-outcome-box pkr-battle-outcome-box--rich-exchange'
          )}
          style={logStyle}
        >
          <CombatExchangeLogBlock
            strike={strike}
            playerDisplayName={playerName}
            wildDisplayName={wildName}
          />
        </div>
      ) : state.lastBattleLog && !showResult ? (
        <p key={feedbackSeq} className={logClass} style={logStyle}>
          {battleLogRichText(state.lastBattleLog)}
        </p>
      ) : null}
    </div>
  );
}

/** A catch with a full party: choose who moves to storage (nothing is released). */
export function PendingCatchPanel({
  mon,
  party,
  activePartyId,
  onReplace,
  onCancel,
}: {
  mon: OwnedPokemon;
  party: OwnedPokemon[];
  activePartyId: string | null;
  onReplace: (partyPokemonId: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const t = window.setTimeout(
      () => root.querySelector<HTMLElement>('button:not([disabled])')?.focus(),
      0
    );
    return () => clearTimeout(t);
  }, [mon.id]);
  const moveList = (m: OwnedPokemon) =>
    (m.moves ?? []).map((id) => MOVES[id]?.name ?? id).join(', ');
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="pkr-pending-collection"
      role="region"
      aria-label="Choose party member to send to storage"
    >
      <h2 className="pkr-pixel-title">Caught! Choose your lineup</h2>
      <details open className="pkr-catch-choice">
        <summary>
          New catch · {mon.nickname || mon.name} · Lv{mon.level}
        </summary>
        <PokemonAppraisal pokemon={mon} />
        <p>
          HP {mon.currentHp}/{mon.maxHp} · {moveList(mon)}
        </p>
      </details>
      <p>Choose who moves to storage, or just keep reviewing and {mon.nickname || mon.name} goes to storage. Nothing is released.</p>
      {party.map((m) => (
        <details key={m.id} className="pkr-catch-choice">
          <summary>
            {m.nickname || m.name} · Lv{m.level}
            {m.id === activePartyId ? ' · Lead' : ''}
          </summary>
          <SpeciesBadge dexNum={m.dexNum} />
          <PokemonAppraisal pokemon={m} />
          <p>
            HP {m.currentHp}/{m.maxHp} · {moveList(m)}
          </p>
          <button
            type="button"
            className="pkr-game-btn w-full py-2"
            onClick={() => onReplace(m.id)}
          >
            Send {m.nickname || m.name} to storage
          </button>
        </details>
      ))}
      <button type="button" className="pkr-btn-secondary w-full py-2" onClick={onCancel}>
        Send new Pokémon to storage
      </button>
    </div>
  );
}
