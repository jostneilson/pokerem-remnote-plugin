import { useEffect, useState } from 'react';
import { THEME_SHOP, themePrice } from '../../game/balance';
import { coinsSpoken, formatCoins, formatCoinsExact } from '../format/coins';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { setThemePreview } from '../theme/ThemeProvider';
import { THEMES, themeById, themeClassName, type ThemeDef } from '../theme/themes';

const PREVIEW_SECONDS = 15;

/** Mini preview of a theme: its bg and pattern, a panel and an accent bar (SPEC U11). */
function Swatch({ theme }: { theme?: ThemeDef }) {
  return (
    <span className={`pkr-theme-swatch${theme ? ` ${themeClassName(theme.id)}` : ''}`} style={theme ? { backgroundColor: theme.bg } : undefined} aria-hidden="true">
      <i style={theme ? { background: theme.panel, borderColor: theme.border } : undefined} />
      <b style={theme ? { background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})` } : undefined} />
    </span>
  );
}

/** Shop → Themes (SPEC A12, U11): 18 type themes plus the free default; 15 s try-on, buy, equip. */
export function ThemeShop({
  currency,
  themesOwned,
  themeActive,
  themeVouchers,
  onBuyTheme,
  onEquipTheme
}: {
  currency: number;
  themesOwned?: string[];
  themeActive?: string;
  themeVouchers?: number;
  onBuyTheme: (id: string, useVoucher: boolean) => void;
  onEquipTheme: (id: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; left: number } | null>(null);
  const owned = new Set(themesOwned ?? []);
  const equipped = themeActive ?? 'default';
  const vouchers = themeVouchers ?? 0;

  // Count the try-on down once a second; the shop closing or the countdown ending puts the equipped theme back.
  useEffect(() => {
    if (!preview) return;
    setThemePreview(preview.id);
    if (preview.left <= 0) {
      setPreview(null);
      return;
    }
    const t = window.setTimeout(() => setPreview((p) => (p ? { ...p, left: p.left - 1 } : p)), 1000);
    return () => window.clearTimeout(t);
  }, [preview]);
  useEffect(() => () => setThemePreview(undefined), []);
  useEffect(() => {
    if (!preview) setThemePreview(undefined);
  }, [preview]);

  const detail = picked ? themeById(picked) : undefined;
  const pickedId = picked ?? '';
  const buy = (useVoucher: boolean) => {
    setPreview(null);
    onBuyTheme(pickedId, useVoucher);
  };

  return (
    <Panel title="Themes" icon={<GameIcon name="starFilled" size={13} style={{ color: 'var(--pkr-accent)' }} />} accent="var(--pkr-accent)">
      <p className="pkr-shop-extras-note">
        Dress the whole game in a type&apos;s colours. Each theme is {formatCoinsExact(THEME_SHOP.price)}; try one for {PREVIEW_SECONDS} seconds first.
        {vouchers > 0 ? (
          <strong className="pkr-ticket-active">
            {' '}
            You have {vouchers} theme voucher{vouchers === 1 ? '' : 's'} ({Math.round(THEME_SHOP.voucherOff * 100)}% off one theme each).
          </strong>
        ) : null}
      </p>
      {preview ? (
        <div className="pkr-theme-preview-chip" role="status">
          <span>
            Preview {preview.left}s
          </span>
          {!owned.has(preview.id) ? (
            <button type="button" className="pkr-game-btn" disabled={currency < themePrice(false)} onClick={() => buy(false)}>
              Buy
            </button>
          ) : null}
          <button type="button" className="pkr-game-btn" onClick={() => setPreview(null)}>
            Stop
          </button>
        </div>
      ) : null}
      <ul className="pkr-theme-grid">
        <li className={`pkr-card-style${equipped === 'default' ? ' pkr-card-style--on' : ''}`}>
          <Swatch />
          <strong>Default arcade</strong>
          {equipped === 'default' ? (
            <span className="pkr-card-style__state">Equipped</span>
          ) : (
            <button type="button" className="pkr-game-btn pkr-card-style__btn" onClick={() => onEquipTheme('default')}>
              Equip
            </button>
          )}
        </li>
        {THEMES.map((t) => {
          const on = equipped === t.id;
          const has = owned.has(t.id);
          return (
            <li key={t.id} className={`pkr-card-style${on ? ' pkr-card-style--on' : ''}${picked === t.id ? ' pkr-card-style--picked' : ''}`}>
              <button type="button" className="pkr-theme-grid__pick" aria-label={`${t.id} theme details`} aria-pressed={picked === t.id} onClick={() => setPicked(picked === t.id ? null : t.id)}>
                <Swatch theme={t} />
                <strong>{t.id}</strong>
              </button>
              <span className="pkr-card-style__state">{on ? 'Equipped' : has ? 'Owned' : formatCoins(THEME_SHOP.price)}</span>
            </li>
          );
        })}
      </ul>
      {detail ? (
        <div className="pkr-theme-detail" aria-live="polite">
          <Swatch theme={detail} />
          <div className="pkr-theme-detail__body">
            <strong>{detail.id} theme</strong>
            <span>
              Pattern: {detail.pattern}
              {detail.ambient ? ` · ${detail.ambient}` : ''}
            </span>
            <span className="pkr-theme-detail__actions">
              <button type="button" className="pkr-game-btn" onClick={() => setPreview({ id: detail.id, left: PREVIEW_SECONDS })}>
                Preview {PREVIEW_SECONDS}s
              </button>
              {owned.has(detail.id) ? (
                equipped === detail.id ? (
                  <button type="button" className="pkr-game-btn" onClick={() => onEquipTheme('default')}>
                    Unequip
                  </button>
                ) : (
                  <button type="button" className="pkr-game-btn" onClick={() => onEquipTheme(detail.id)}>
                    Equip
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    className="pkr-game-btn"
                    disabled={currency < themePrice(false)}
                    aria-label={`Buy the ${detail.id} theme for ${coinsSpoken(themePrice(false))}`}
                    onClick={() => buy(false)}
                  >
                    Buy {formatCoins(themePrice(false))}
                  </button>
                  {vouchers > 0 ? (
                    <button
                      type="button"
                      className="pkr-game-btn"
                      disabled={currency < themePrice(true)}
                      aria-label={`Buy the ${detail.id} theme with a voucher for ${coinsSpoken(themePrice(true))}`}
                      onClick={() => buy(true)}
                    >
                      Voucher {formatCoins(themePrice(true))}
                    </button>
                  ) : null}
                </>
              )}
            </span>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
