import type { PokemonType } from '../../game/data/species';

/**
 * Type themes (SPEC A12, Appendix H). A theme overrides the surface and ink tokens only; arena, type, status
 * and rarity colours are semantic and stay the same in every theme (DECISIONS T6.1).
 */
export interface ThemeDef {
  id: PokemonType;
  bg: string;
  panel: string;
  ink: string;
  border: string;
  accent: string;
  accent2: string;
  /** Original pattern (Appendix H), described for the shop card. */
  pattern: string;
  /** Ambient layer name, or undefined for none. */
  ambient?: string;
}

const T = (id: PokemonType, bg: string, panel: string, ink: string, border: string, accent: string, accent2: string, pattern: string, ambient?: string): ThemeDef => ({ id, bg, panel, ink, border, accent, accent2, pattern, ambient });

export const THEMES: readonly ThemeDef[] = [
  T('Normal', '#1c1a17', '#2a2722', '#f3ead8', '#8a8170', '#c9b98f', '#e8dcc0', 'soft diamond quilt'),
  T('Fire', '#1f0d08', '#33150c', '#ffeedd', '#b4532a', '#ff7a2f', '#ffc145', 'ember dots', 'embers rise'),
  T('Water', '#07182b', '#0d2742', '#e6f4ff', '#3a7cc0', '#3fa9f5', '#8fe3ff', 'concentric ripples', 'ripple drift'),
  T('Grass', '#0c1d10', '#15301a', '#eafbe2', '#4f9a4a', '#6fd25a', '#c8f07a', 'leaf weave', 'leaf sway'),
  T('Electric', '#17150a', '#27230e', '#fffbe0', '#b59a1e', '#ffd83a', '#fff27a', 'circuit traces', 'spark pulse'),
  T('Ice', '#0b1a24', '#13293a', '#effbff', '#6fb8d6', '#9ee7ff', '#e0fbff', 'frost lattice', 'snow drift'),
  T('Fighting', '#1d0b0b', '#2f1312', '#ffe9e4', '#a8423a', '#e2553f', '#f5a46a', 'diagonal dojo stripes'),
  T('Poison', '#170b1d', '#26112f', '#f6e8ff', '#8a4fb0', '#b65cf0', '#d9a0ff', 'bubbles', 'bubbles rise'),
  T('Ground', '#1c140a', '#2e2111', '#fbefd9', '#a07a3c', '#d9a650', '#f0cf86', 'strata lines', 'dust drift'),
  T('Flying', '#0e1530', '#18224a', '#eef2ff', '#6b7fd6', '#8fa8ff', '#c9d6ff', 'feather chevrons', 'wind streaks'),
  T('Psychic', '#1d0a18', '#301027', '#ffe8f6', '#b44c8f', '#ff5fae', '#ffa8d6', 'spiral rings', 'slow pulse'),
  T('Bug', '#121808', '#1f290f', '#f2fadc', '#7f9a2c', '#a8d23a', '#dcf07a', 'honeycomb', 'firefly twinkle'),
  T('Rock', '#171512', '#27231d', '#f2ece0', '#8f8268', '#c2a878', '#e3d2a8', 'cracked stones'),
  T('Ghost', '#0f0b1d', '#1a1430', '#efe8ff', '#6b5aa8', '#9b7cff', '#c9b8ff', 'wisps', 'wisp float'),
  T('Dragon', '#0c0d24', '#15183d', '#ecedff', '#5a5ed0', '#7a6cff', '#ffb35a', 'scales', 'shimmer sweep'),
  T('Dark', '#0d0b0b', '#1a1615', '#f0e8e2', '#6e5a50', '#b0866a', '#e0b890', 'crescent moons', 'star twinkle'),
  T('Steel', '#101419', '#1c232b', '#eef3f8', '#7f90a3', '#a9bccf', '#dfe9f2', 'rivet plates', 'sheen sweep'),
  T('Fairy', '#1e0f1b', '#2f1830', '#fff0fa', '#c07ab8', '#ff9be0', '#ffd1f0', 'sparkles', 'twinkle')
];

const BY_ID = new Map<string, ThemeDef>(THEMES.map((t) => [t.id, t]));

export function isThemeId(id: unknown): id is PokemonType {
  return typeof id === 'string' && BY_ID.has(id);
}

export function themeById(id: string | undefined): ThemeDef | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function themeClassName(id: PokemonType): string {
  return `pkr-theme-${id.toLowerCase()}`;
}

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hex = (c: number[]) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
/** `a` moved toward `b` by `t` (0 = a, 1 = b). */
export const mixHex = (a: string, b: string, t: number): string => {
  const [x, y] = [rgb(a), rgb(b)];
  return hex(x.map((v, i) => v + (y[i]! - v) * t));
};
const alpha = (h: string, a: number) => `rgba(${rgb(h).join(', ')}, ${a})`;
const triplet = (h: string) => rgb(h).join(', ');

/** WCAG relative-luminance contrast ratio of two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = rgb(h).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

/**
 * Every surface/ink token a theme sets. Derived tokens follow Appendix H (`panel-2` = panel lightened ~6%,
 * `glow` = accent at 30%); the ink scale is the theme ink mixed toward the panel, so every step keeps the
 * theme's hue. Gold, danger and success inks are semantic and stay.
 */
export function themeTokens(t: ThemeDef): Record<string, string> {
  const panelDeep = mixHex(t.panel, t.bg, 0.6);
  const borderDim = mixHex(t.border, t.panel, 0.35);
  return {
    '--pkr-rgb-shade': triplet(mixHex(t.bg, '#000000', 0.5)),
    '--pkr-rgb-deep': triplet(panelDeep),
    '--pkr-rgb-panel': triplet(t.panel),
    '--pkr-rgb-panel-2': triplet(mixHex(t.panel, '#ffffff', 0.06)),
    '--pkr-rgb-border-dim': triplet(borderDim),
    '--pkr-rgb-border': triplet(t.border),
    '--pkr-bg': t.bg,
    '--pkr-arcade-ink': t.bg,
    '--pkr-panel': t.panel,
    '--pkr-panel-2': mixHex(t.panel, '#ffffff', 0.06),
    '--pkr-panel-deep': panelDeep,
    '--pkr-shade': mixHex(t.bg, '#000000', 0.5),
    '--pkr-ink': t.ink,
    '--pkr-arcade-paper': t.ink,
    '--pkr-border': t.border,
    '--pkr-arcade-border': t.border,
    '--pkr-border-dim': borderDim,
    '--pkr-accent': t.accent,
    '--pkr-accent-2': t.accent2,
    '--pkr-glow': alpha(t.accent, 0.3),
    '--pkr-ink-text': mixHex(t.ink, t.panel, 0.06),
    '--pkr-ink-bright': t.ink,
    '--pkr-ink-soft': mixHex(t.ink, t.panel, 0.14),
    '--pkr-ink-muted': mixHex(t.ink, t.panel, 0.22),
    '--pkr-ink-faint': mixHex(t.ink, t.panel, 0.4),
    '--pkr-ink-dim': mixHex(t.ink, t.panel, 0.5)
  };
}

/**
 * Near-token shades the screens used before tokens existed read `var(--pkr-themed-<token>, #original)`, so the
 * default arcade look is byte-for-byte unchanged and a theme maps each one onto its token.
 */
export function themedAliases(tokens: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) if (!k.startsWith('--pkr-rgb-')) out[k.replace('--pkr-', '--pkr-themed-')] = v;
  return out;
}
