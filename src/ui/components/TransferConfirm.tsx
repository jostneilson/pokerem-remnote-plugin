import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TransferPreview, TransferWarning } from '../../game/engine/transfer';
import { formatCoinsExact } from '../format/coins';

const WARNING_LABEL: Record<Exclude<TransferWarning, 'favorite'>, string> = {
  shiny: '✦ Shiny',
  hundo: 'HUNDO',
  legendary: 'Legendary',
  starter: '♥ Your starter — buddy bonus will be lost'
};

/** "Transfer N Pokémon?" (SPEC U3): totals, warning chips, and a red Transfer button. */
export function TransferConfirm({
  preview,
  onConfirm,
  onCancel
}: {
  preview: TransferPreview;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const n = preview.mons.length;
  const shown = preview.mons.slice(0, 6);
  const favorite = preview.blocked === 'favorite';
  const lastParty = preview.blocked === 'last-party';
  const inBattle = preview.blocked === 'in-battle';
  const warnings = preview.warnings.filter((w): w is Exclude<TransferWarning, 'favorite'> => w !== 'favorite');

  return createPortal(
    <div className="pkr-pixel-surface pkr-retro-chrome">
      <div className="pkr-sheet-backdrop pkr-sheet-backdrop--center" role="presentation" onClick={onCancel}>
        <section
          className="pkr-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pkr-transfer-title"
          onClick={(e) => e.stopPropagation()}
          style={{ borderColor: 'var(--pkr-btn-transfer)' }}
        >
          <div className="pkr-sheet__head">
            <strong id="pkr-transfer-title">Transfer {n === 1 ? (shown[0]!.nickname || shown[0]!.name) : `${n} Pokémon`}?</strong>
          </div>
          {n > 1 ? (
            <div className="pkr-transfer-list">
              {shown.map((m) => (
                <span key={m.id}>
                  {m.nickname || m.name} Lv{m.level}
                </span>
              ))}
              {n > shown.length ? <span>and {n - shown.length} more</span> : null}
            </div>
          ) : null}
          <p>
            You get <strong style={{ color: 'var(--pkr-coin)' }}>{formatCoinsExact(preview.coins)}</strong>
            {preview.xp > 0 ? (
              <>
                {' '}
                and <strong style={{ color: 'var(--pkr-ink-success)' }}>{preview.xp.toLocaleString('en-US')} XP</strong> for matching types
              </>
            ) : null}
            .
          </p>
          {warnings.length > 0 ? (
            <div className="pkr-warn-chips">
              {warnings.map((w) => (
                <span key={w} className="pkr-warn-chip">
                  {WARNING_LABEL[w]}
                </span>
              ))}
            </div>
          ) : null}
          {favorite ? <p className="pkr-sheet__note" role="alert">Unfavourite ★ first.</p> : null}
          {lastParty ? <p className="pkr-sheet__note" role="alert">Keep at least one Pokémon in your party.</p> : null}
          {inBattle ? <p className="pkr-sheet__note" role="alert">Finish the trainer battle first.</p> : null}
          <p className="pkr-sheet__note">This can’t be undone. Your Pokédex keeps the entry.</p>
          <div className="pkr-sheet__actions">
            <button ref={cancelRef} type="button" className="pkr-btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="pkr-act-btn pkr-act-btn--transfer" disabled={!!preview.blocked} onClick={onConfirm}>
              Transfer
            </button>
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}
