import { useEffect } from 'react';
import type { RouteFindNoticePayload } from '../../game/state/model';
import { itemIconUrl } from '../../game/sprites';
import { ITEM_BY_ID } from '../../game/data/items';

const DISPLAY_MS = 7200;

/**
 * Compact “you noticed something on the route” banner — matches battle HUD language, auto-hides.
 * Visibility is driven by synced `noticeSeq` vs `noticeAckSeq` so reopening the tab does not replay.
 */
export function RouteFindBanner({
  rootURL,
  notice,
  noticeSeq,
  noticeAckSeq,
  onAcknowledge,
  accent,
  accentMuted,
  reducedMotion,
}: {
  rootURL: string | undefined;
  notice: RouteFindNoticePayload | null | undefined;
  noticeSeq: number;
  /** Last sequence the user dismissed or auto-cleared (from synced game state). */
  noticeAckSeq: number;
  /** Persist “seen” — required for auto-dismiss and button. */
  onAcknowledge?: () => void;
  accent: string;
  accentMuted: string;
  reducedMotion?: boolean;
}) {
  const show = !!(notice && noticeSeq > 0 && noticeSeq > noticeAckSeq);

  useEffect(() => {
    if (!show || !onAcknowledge) return;
    const ms = reducedMotion ? Math.max(DISPLAY_MS, 10000) : DISPLAY_MS;
    const id = window.setTimeout(() => onAcknowledge(), ms);
    return () => window.clearTimeout(id);
  }, [show, noticeSeq, noticeAckSeq, reducedMotion, onAcknowledge]);

  if (!show || !notice) return null;

  const meta = ITEM_BY_ID.get(notice.itemId);
  const kind = notice.source === 'scrap' ? 'Battle scrap' : 'Route find';

  return (
    <div
      className="pkr-battle-route-feed z-[40] flex w-full min-w-0 justify-center px-1"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex max-w-full min-w-0 items-start gap-2 rounded-lg border-2 px-2.5 py-2 shadow-[2px_2px_0_rgba(0,0,0,0.45)]"
        style={{
          borderColor: accent,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(15,23,42,0.92) 100%)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 2px 2px 0 rgba(0,0,0,0.45)`,
        }}
      >
        <img
          src={itemIconUrl(rootURL, meta?.iconFile ?? 'potion.png')}
          alt=""
          width={28}
          height={28}
          className="shrink-0"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="min-w-0 flex-1 text-left">
          <div
            className="pkr-pixel-title mb-0.5 text-[5px] font-black uppercase leading-tight tracking-wide sm:text-[6px]"
            style={{ color: accentMuted }}
          >
            {kind}
          </div>
          <p className="text-[8px] font-bold leading-snug sm:text-[9px]" style={{ color: '#f1f5f9' }}>
            {notice.headline}
          </p>
          <p className="mt-0.5 text-[7px] font-semibold leading-snug sm:text-[8px]" style={{ color: accentMuted }}>
            {notice.subline}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAcknowledge?.()}
          className="shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold leading-none hover:brightness-110"
          style={{
            borderColor: accent,
            color: '#f8fafc',
            background: 'rgba(15,23,42,0.55)',
          }}
          aria-label="Dismiss route find notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
