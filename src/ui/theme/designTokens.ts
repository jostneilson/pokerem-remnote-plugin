/**
 * PokéRem design contract — TypeScript mirror of semantic tokens.
 * Source of truth for values lives in `style.css` (`:root` + `.pkr-*` classes).
 * Use this file for programmatic styling, tests, and imports in TSX when needed.
 *
 * @see ../../../DESIGN_CONTRACT.md
 */

/**
 * User-facing product name (wordmark). Use `wordmark` in normal / sentence case.
 * Use `wordmarkCaps` where the host or CSS applies `text-transform: uppercase` — avoids a
 * accented capital E (POKÉ…) which reads poorly; accent belongs on “Poké” with lowercase e only.
 */
export const BRAND = {
  wordmark: 'PokéRem',
  fullName: 'PokéRem',
  wordmarkCaps: 'POKEREM',
} as const;

/** Prose / tooltips / settings — mixed-case wordmark, e.g. `PokéRem: Catch`. */
export function brandCommand(action: string): string {
  return `${BRAND.wordmark}: ${action}`;
}

/** Command palette & queue menu **names** — ASCII caps prefix so all-caps UI stays clean. */
export function brandCommandCaps(action: string): string {
  return `${BRAND.wordmarkCaps}: ${action}`;
}

/** Layout radii (px) — align with `--pkr-radius-*` in CSS */
export const radius = {
  sm: 4,
  md: 6,
  panel: 8,
  chip: 6,
} as const;

/** Z-index scale for stacked HUD (battle, tooltips). Keep low; RemNote hosts the shell. */
export const zIndex = {
  battleField: 0,
  battleHud: 25,
  battleOverlay: 30,
  routeBanner: 40,
  tooltip: 50,
} as const;

/**
 * Typography roles (which font / smoothing):
 * - **pixel**: Press Start 2P — short labels, menu titles, wordmark, dialogue box text.
 * - **sans**: Exo 2 — tooltips (`.pkr-stat-tooltip`), long descriptions, settings prose.
 * Sidebar `.pkr-pixel-ui` forces pixel on most chrome; prefer explicit `.pkr-text-sans-*` on portaled sans-only surfaces when needed.
 */
export const typographyRole = {
  pixelTitle: 'pkr-pixel-title',
  pixelDialog: 'pkr-pixel-dialog',
  sansTooltip: 'pkr-stat-tooltip',
  sansBody: 'pkr-text-sans-body',
  sansMuted: 'pkr-text-sans-muted',
} as const;

/** HP / PP / achievement progress — use `.pkr-meter-track` + `.pkr-meter-fill` (unified with battle HP chrome). */
export const meter = {
  track: 'pkr-meter-track',
  fill: 'pkr-meter-fill',
} as const;
