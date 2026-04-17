/**
 * Pixel-art styled SVG icon system.
 * Replaces system emojis with consistent, game-accurate inline SVGs.
 *
 * Tab bar `nav*` (see DESIGN_CONTRACT.md section 5b):
 * - **Canvas:** 16×16 viewBox; primary art in **x:1–14, y:3–13** (optical safe area).
 * - **Style:** filled integer `rect` grid (`pixelSvg` + `.pkr-pixel-icon-svg`, crispEdges).
 * - **Reads:** status=bar chart · party=three Pokéballs · bag=straps+pack · shop=awning+façade ·
 *   dex=clamshell dex · types=matchup nodes+arrow · progress=trophy cup · rewards=chest · settings=sliders.
 */

import type { CSSProperties, ReactNode } from 'react';

function pixelSvg(s: number, children: ReactNode) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 16 16"
      fill="currentColor"
      className="pkr-pixel-icon-svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS: Record<string, (size: number) => JSX.Element> = {
  /** Session / stats — bar chart on a shared baseline */
  navStatus: (s) =>
    pixelSvg(s, (
      <>
        <rect x="1" y="13" width="14" height="1" opacity="0.5" />
        <rect x="2" y="8" width="3" height="5" />
        <rect x="7" y="4" width="3" height="9" />
        <rect x="12" y="6" width="3" height="7" />
      </>
    )),

  /** Party — three mini Pokéballs in a row (party lineup read) */
  navParty: (s) =>
    pixelSvg(s, (
      <>
        <rect x="1" y="5" width="4" height="1" />
        <rect x="6" y="4" width="4" height="1" />
        <rect x="11" y="5" width="4" height="1" />
        <rect x="1" y="7" width="4" height="1" opacity="0.45" />
        <rect x="6" y="6" width="4" height="1" opacity="0.45" />
        <rect x="11" y="7" width="4" height="1" opacity="0.45" />
        <rect x="1" y="6" width="4" height="1" opacity="0.18" />
        <rect x="6" y="5" width="4" height="1" opacity="0.18" />
        <rect x="11" y="6" width="4" height="1" opacity="0.18" />
        <rect x="2" y="6" width="1" height="1" />
        <rect x="7" y="5" width="1" height="1" />
        <rect x="12" y="6" width="1" height="1" />
      </>
    )),

  /** Bag — vertical shoulder straps + flap + pack (no arch “handle”) */
  navBag: (s) =>
    pixelSvg(s, (
      <>
        <rect x="4" y="2" width="1" height="6" opacity="0.85" />
        <rect x="11" y="2" width="1" height="6" opacity="0.85" />
        <rect x="4" y="7" width="8" height="6" />
        <rect x="5" y="6" width="6" height="2" opacity="0.92" />
        <rect x="6" y="12" width="4" height="1" opacity="0.5" />
      </>
    )),

  /** Shop — striped awning + storefront (distinct from backpack straps) */
  navShop: (s) =>
    pixelSvg(s, (
      <>
        <rect x="2" y="3" width="4" height="2" />
        <rect x="6" y="3" width="4" height="2" opacity="0.72" />
        <rect x="10" y="3" width="4" height="2" />
        <rect x="3" y="5" width="10" height="8" />
        <rect x="5" y="7" width="6" height="3" opacity="0.28" />
        <rect x="7" y="10" width="2" height="3" opacity="0.42" />
      </>
    )),

  /** Pokédex — clamshell with center hinge and twin screens */
  navDex: (s) =>
    pixelSvg(s, (
      <>
        <rect x="2" y="5" width="5" height="7" />
        <rect x="9" y="5" width="5" height="7" />
        <rect x="7" y="4" width="2" height="8" opacity="0.62" />
        <rect x="3" y="7" width="3" height="2" opacity="0.26" />
        <rect x="10" y="7" width="3" height="2" opacity="0.26" />
        <rect x="2" y="4" width="1" height="1" opacity="0.72" />
        <rect x="13" y="4" width="1" height="1" opacity="0.72" />
      </>
    )),

  /** Types — two matchup nodes with a directional bridge */
  navTypes: (s) =>
    pixelSvg(s, (
      <>
        <rect x="2" y="6" width="3" height="1" />
        <rect x="1" y="7" width="5" height="2" />
        <rect x="2" y="9" width="3" height="1" />
        <rect x="11" y="6" width="3" height="1" />
        <rect x="10" y="7" width="5" height="2" />
        <rect x="11" y="9" width="3" height="1" />
        <rect x="6" y="7" width="3" height="2" />
        <rect x="8" y="6" width="1" height="1" />
        <rect x="8" y="9" width="1" height="1" />
        <rect x="9" y="7" width="1" height="2" />
      </>
    )),

  /** Progress — trophy cup (achievements / milestones) */
  navProgress: (s) =>
    pixelSvg(s, (
      <>
        <rect x="3" y="4" width="10" height="2" />
        <rect x="4" y="6" width="8" height="2" />
        <rect x="2" y="5" width="1" height="2" opacity="0.7" />
        <rect x="13" y="5" width="1" height="2" opacity="0.7" />
        <rect x="6" y="8" width="4" height="2" />
        <rect x="7" y="10" width="2" height="2" />
        <rect x="5" y="12" width="6" height="1" />
      </>
    )),

  /** Rewards — treasure chest: lid, box, hinges */
  navRewards: (s) =>
    pixelSvg(s, (
      <>
        <rect x="3" y="3" width="10" height="2" />
        <rect x="3" y="5" width="10" height="7" />
        <rect x="6" y="7" width="4" height="2" opacity="0.35" />
        <rect x="7" y="8" width="2" height="2" opacity="0.58" />
        <rect x="2" y="6" width="1" height="4" opacity="0.65" />
        <rect x="13" y="6" width="1" height="4" opacity="0.65" />
      </>
    )),

  /** Settings — slider levers (reads “options”, not D-pad) */
  navSettings: (s) =>
    pixelSvg(s, (
      <>
        <rect x="2" y="3" width="11" height="2" opacity="0.35" />
        <rect x="2" y="3" width="5" height="2" />
        <rect x="2" y="7" width="11" height="2" opacity="0.35" />
        <rect x="7" y="7" width="6" height="2" />
        <rect x="2" y="11" width="11" height="2" opacity="0.35" />
        <rect x="2" y="11" width="4" height="2" />
      </>
    )),

  /** Classic Poké Ball (red / white / black) — not theme-tinted; matches shop/sidebar-tab look. RemNote-only listing art is `public/logo.svg` (similar geometry, separate asset). */
  pokeball: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M 1 8 A 7 7 0 0 1 15 8 Z" fill="#dc2626" />
      <path d="M 1 8 A 7 7 0 0 0 15 8 Z" fill="#f8fafc" />
      <path d="M 1 8 L 15 8" stroke="#0f172a" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="8" r="7" fill="none" stroke="#0f172a" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2.35" fill="#f8fafc" stroke="#0f172a" strokeWidth="1" />
      <circle cx="8" cy="8" r="0.9" fill="#0f172a" />
    </svg>
  ),

  shield: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L2.5 4v4c0 3.5 5.5 6.5 5.5 6.5s5.5-3 5.5-6.5V4L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 5v3.5M8 10.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  party: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="4.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 8h6" stroke="currentColor" strokeWidth="1" />
      <circle cx="4.5" cy="8" r="1" fill="currentColor" />
      <circle cx="11.5" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 8h6" stroke="currentColor" strokeWidth="1" />
      <circle cx="11.5" cy="8" r="1" fill="currentColor" />
    </svg>
  ),

  bag: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  coin: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="8"
        y="8"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="7"
        fontWeight="700"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        P
      </text>
    </svg>
  ),

  book: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M2.5 2.5h4.5v11H3a.5.5 0 01-.5-.5V2.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 2.5h6.5V13a.5.5 0 01-.5.5H7v-11z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 5.5h1M9.5 5.5h2M9.5 7.5h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),

  diamond: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14 8l-6 6.5L2 8 8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 6h8M6 10h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),

  trophy: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M4.5 2.5h7v4a3.5 3.5 0 01-7 0v-4z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 4H3a1 1 0 00-1 1v.5a2 2 0 002 2h.5M11.5 4H13a1 1 0 011 1v.5a2 2 0 01-2 2h-.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 10v1.5h3V10M5.5 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  gear: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  trainer: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5.5h6" stroke="currentColor" strokeWidth="1" />
      <path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  star: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l2 4.5 4.5.5-3.3 3 1 4.5L8 11.5 3.8 14l1-4.5L1.5 6.5 6 6l2-4.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),

  starFilled: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <path d="M8 1.5l2 4.5 4.5.5-3.3 3 1 4.5L8 11.5 3.8 14l1-4.5L1.5 6.5 6 6l2-4.5z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  ),

  chart: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="9" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6.5" y="5" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="11" y="2" width="3" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),

  swords: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M3 13L10 2M3 13l2-1M3 13l1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 13L6 2M13 13l-2-1M13 13l-1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  /** Leave encounter — retreat arrow */
  flee: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M9 4L5 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8H5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  flame: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5c0 2-2 3-2 5a3.5 3.5 0 007 0c0-2.5-2-4-3-5.5-.5 1.5-1.5 2-2.5 2.5C8 4 8.5 2.5 8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),

  dna: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M5 2v12M11 2v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 4h6M5 8h6M5 12h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  box: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7h12M6 7v7M10 7v7" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),

  dot: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="4" fill="currentColor" />
    </svg>
  ),

  pills: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="3" y="4" width="4.5" height="8" rx="2.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 8h4.5" stroke="currentColor" strokeWidth="1" />
      <rect x="8.5" y="4" width="4.5" height="8" rx="2.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 8h4.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),

  gem: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M4 3h8l2.5 4L8 14.5 1.5 7 4 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 7h13M8 7v7.5M4 3l4 4 4-4" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),

  key: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 8l5 5M11 10.5l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  calendar: (s) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
};

export type GameIconName = keyof typeof ICONS;

export function GameIcon({
  name,
  size = 14,
  className = '',
  style,
  tabPixel = false,
}: {
  name: GameIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Crisp 16×16 tab-bar rendering for `nav*` icons */
  tabPixel?: boolean;
}) {
  const render = ICONS[name];
  if (!render) return null;
  const tabCls = tabPixel ? 'pkr-game-icon--tab' : '';
  /** Retreat arrow: optical center with adjacent label text */
  const fleeAlign = name === 'flee' ? ' relative top-[-1px]' : '';
  return (
    <span
      className={`pkr-game-icon inline-flex items-center justify-center ${tabCls}${fleeAlign} ${className}`.trim()}
      style={style}
    >
      {render(size)}
    </span>
  );
}
