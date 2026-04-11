/**
 * Game theme — uses CSS classes from style.css (not Tailwind arbitrary values)
 * to guarantee the always-dark game aesthetic renders correctly.
 *
 * Tailwind utilities are only used for layout, spacing, and flex —
 * all color/background/border styling uses the pkr- CSS classes or inline styles.
 *
 * Semantic tokens & brand: `designTokens.ts` + DESIGN_CONTRACT.md. Product name: **PokéRem**.
 */

export { BRAND, brandCommand, brandCommandCaps, meter as meterCls, typographyRole } from './designTokens';

export const cls = {
  sidebar: '', // handled by .pokerem-sidebar CSS class
  panel: 'pkr-panel',
  panelTitle: 'pkr-panel-header',
  card: 'pkr-card',
  cardActive: 'pkr-card-active',
  cardInactive: 'pkr-card',
  track: 'pkr-bar-track',
  /** HP / XP / progress — unified with battle HUD (see DESIGN_CONTRACT.md) */
  meterTrack: 'pkr-meter-track',
  meterFill: 'pkr-meter-fill',
  input: 'pkr-input',

  textPrimary: '', // handled by .pokerem-sidebar color
  textSecondary: '', // use inline style
  textMuted: '', // use inline style

  divider: '',

  tabBar: 'pkr-tab-bar',
  tabActive: 'pkr-tab-active',
  tabInactive: 'pkr-tab-inactive',

  btnPrimary: 'pkr-btn-primary',
  btnSecondary: 'pkr-btn-secondary',

  btnBuy:
    'rounded-lg border-2 border-amber-600 bg-gradient-to-b px-3 py-1.5 text-[11px] font-bold shadow-sm transition-colors active:translate-y-px disabled:opacity-40',

  btnBuyText: '',
  btnBuyDisabled: 'pkr-btn-secondary opacity-40',

  currencyBar: 'pkr-currency-bar',

  badge: 'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
  badgeGreen: '',
  badgeGrey: '',
  badgeRed: 'rounded-full px-2 py-0.5 text-[7px] font-black uppercase',

  statRowEven: '',
  statRowOdd: '',

  kbd: 'pkr-kbd',

  pillFilter: (active: boolean) =>
    `pkr-pill ${active ? 'pkr-pill-active' : 'pkr-pill-inactive'}`,

  achievementUnlocked: 'pkr-achievement-unlocked',
  achievementLocked: 'pkr-achievement-locked',
} as const;

/** Inline style objects for colors that Tailwind can't reliably generate */
export const themeStyles = {
  textPrimary: { color: '#e2e8f0' },
  textSecondary: { color: '#94a3b8' },
  textMuted: { color: '#64748b' },
  textAmber: { color: '#fbbf24' },
  textAmberBright: { color: '#fde68a' },
  textEmerald: { color: '#6ee7b7' },
  textRed: { color: '#fca5a5' },
  bgBadgeGreen: { background: 'rgba(6,78,59,0.4)', color: '#6ee7b7' },
  bgBadgeGrey: { background: 'rgba(255,255,255,0.05)', color: '#64748b' },
  bgBadgeRed: { background: '#dc2626', color: 'white' },
  statRowEven: { background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  statRowOdd: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  divider: { borderColor: 'rgba(255,255,255,0.06)' },
  btnBuy: { background: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', borderColor: '#d97706', color: '#78350f' },
  btnBuyDisabled: { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: '#64748b' },
} as const;
