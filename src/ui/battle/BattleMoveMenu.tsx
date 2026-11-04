import type { EncounterPokemon, OwnedPokemon } from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { getEffectiveness } from '../../game/data/typeChart';
import { TypedLine } from './TypedLine';
import { typePillStyle } from './battleTheme';
import { TypeSymbolImage } from './TypeBattleIcon';
import { formatMovePowerLine, moveCategoryMeta, type BusyAction } from './battleSurfaceUtils';

/** "What will X use?" with up to four move tiles (type, power, effectiveness against the foe) and Back. */
export function BattleMoveMenu({
  rootURL,
  active,
  foe,
  legalMoves,
  battleBusy,
  busyAction,
  accent,
  uiMuted,
  hoverLift,
  reducedMotion,
  onMove,
  onBack,
}: {
  rootURL: string | undefined;
  active: OwnedPokemon;
  foe: EncounterPokemon | null;
  legalMoves: string[];
  battleBusy: boolean;
  busyAction: BusyAction;
  accent: string;
  uiMuted: string;
  hoverLift: string;
  reducedMotion?: boolean;
  onMove: (moveId: string) => void;
  onBack: () => void;
}) {
  const fighting = battleBusy && busyAction === 'fight';
  return (
    <div className="pkr-battle-move-deck space-y-2">
      <div className="flex items-end justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="min-w-0">
          <div className="pkr-battle-prompt">
            <TypedLine
              text={`What will ${active.nickname || active.name} use?`}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
        <span className="shrink-0 pkr-pixel-title pkr-fine leading-none" style={{ color: uiMuted }}>
          {legalMoves.length} moves
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {legalMoves.slice(0, 4).map((moveId, mi) => {
          const m = MOVES[moveId];
          const pill = m ? typePillStyle(m.type) : undefined;
          const cat = m ? moveCategoryMeta(m.category) : { short: '', title: '' };
          const eff = m && m.power > 0 && foe ? getEffectiveness(m.type, foe.types) : 1;
          const effTag =
            eff === 0
              ? 'No effect'
              : eff > 1
                ? 'Super effective'
                : eff < 1
                  ? 'Not very effective'
                  : null;
          return (
            <button
              key={`${moveId}-${mi}`}
              type="button"
              disabled={battleBusy || legalMoves.length === 0 || active.currentHp <= 0}
              onClick={() => onMove(moveId)}
              className={`pkr-game-btn pkr-battle-move-tile group flex min-h-[58px] flex-col justify-between rounded-lg border-2 px-2 py-1.5 text-left transition-[transform,filter,box-shadow] duration-150 ease-out hover:brightness-[1.06] active:translate-y-px active:scale-[0.98] disabled:opacity-35 ${hoverLift}`}
              style={{
                borderColor: (pill?.borderColor as string) ?? 'rgba(148,163,184,0.5)',
                background: (pill?.backgroundColor as string) ?? 'rgba(30,41,59,0.9)',
                color: (pill?.color as string) ?? 'var(--pkr-ink-bright)',
                boxShadow: fighting
                  ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${accent}55`
                  : `inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 0 rgba(0,0,0,0.35)`,
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="line-clamp-2 min-w-0 flex-1 pkr-fine font-black uppercase leading-tight">
                  {fighting ? '…' : (m?.name ?? moveId)}
                </div>
                {m ? <span className="pkr-battle-move-cat shrink-0">{cat.short}</span> : null}
              </div>
              {m ? (
                <div className="mt-1 flex items-center justify-between gap-1 border-t border-black/25 pt-1">
                  <div className="flex min-w-0 items-center gap-1">
                    <TypeSymbolImage
                      rootURL={rootURL}
                      type={m.type}
                      size={14}
                      reducedMotion={reducedMotion}
                      showTooltip={false}
                    />
                    <span className="truncate pkr-fine font-bold opacity-95">{m.type}</span>
                  </div>
                  <span className="shrink-0 pkr-pixel-title pkr-fine leading-none opacity-90">
                    {formatMovePowerLine(m.power)}
                  </span>
                </div>
              ) : null}
              {effTag ? (
                <span
                  className={`pkr-move-eff pkr-move-eff--${eff === 0 ? 'none' : eff > 1 ? 'super' : 'weak'}`}
                >
                  {effTag}
                </span>
              ) : null}
              <span className="pkr-key-hint" aria-hidden="true">
                {mi + 1}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={battleBusy}
        onClick={onBack}
        className={`pkr-game-btn pkr-battle-cmd-back w-full rounded-lg border-2 px-2 py-1.5 pkr-fine font-bold transition-[transform,filter] duration-150 ease-out hover:brightness-[1.04] active:translate-y-px ${hoverLift}`}
        style={{
          borderColor: `${accent}77`,
          background: 'linear-gradient(180deg, #334155 0%, #1e293b 100%)',
          color: 'var(--pkr-ink-text)',
        }}
      >
        ← Back to commands
      </button>
    </div>
  );
}
