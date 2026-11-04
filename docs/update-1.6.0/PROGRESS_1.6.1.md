# 1.6.1 progress (Phase 6, after the 1.6.0 release split)

Worktree `.worktrees/update-1.6.1`, branch `update/1.6.1`, cut from `update/next` at 3ac8d2e (1.6.0 T6.1).
SPEC, DECISIONS and `RELEASE_1.6.1.md` stay binding. This file is separate from `PROGRESS.md` so the two
branches don't conflict while 1.6.0 finishes. Commits here are `1.6.1 Tn.m: …` (DECISIONS allows either prefix).

**Before releasing 1.6.1:** merge the final 1.6.0 (`update/next` after T7.4) into this branch. Expect conflicts in
`style.css` and the screen TSX only where 1.6.0 changed the same lines. Then do the "Held back from 1.6.0"
list in `RELEASE_1.6.1.md` (theme achievements, the "Theme voucher" notice line, the theme-affordability band).

Preview server for this branch: `pokerem-161-preview` on port 8085 (`?theme=<Type>` applies a theme).

| Task | Status | Commit | Verified |
|---|---|---|---|
| T6.1 | [x] in 1.6.0 | 3ac8d2e | token pass, no visual change |
| T6.2 | [x] | 34df0f4 | ThemeProvider (`useAppliedTheme`) on `<html>` in sidebar, queue strip, popup (covers portals); `themeActive` save field + normaliser; slate rgba → `--pkr-rgb-*` triplets; near-token shades → `var(--pkr-themed-*, #orig)` (default unchanged) |
| T6.3 | [x] | 34df0f4 | 18 themes (Appendix H) with derived tokens; original patterns + CSS ambient per type; reduced motion stops ambient; AA test for body inks on panel/panel-2/bg in all 18 |
| T6.4 | [x] | 8de6444 | Shop → Items/Themes tabs; ThemeShop: Default arcade first, 18 swatch cards (2 cols <360, 3 ≥360), detail with Preview 15s (sticky 'Preview Ns · Buy · Stop' chip), Buy ₽45k, Voucher ₽36k, Equip/Unequip; `buyTheme`/`equipTheme` commands; 26 theme tests; preview `scenario=themes`; no element past 280/520 px |
| T6.5 | [x] | (this commit) | `themeMult(themeActive, types)`: ×1.25 catch/defeat coins (bounty and daily-first ₽ unscaled), trainer XP, and type-share XP to every owned Pokémon of the type; result card tag "<Type> theme ×1.25"; rewards.test.ts (match, other type, catch) |
| T6.6 | [ ] | | Team pick + one-time prompt |
| T6.7 | [ ] | | A17 battle layout |

## Decisions (1.6.1)

- 2026-11-04 · T6.2 · The theme is applied to `document.documentElement` (class `pkr-themed pkr-theme-<type>` plus the token values inline). Each widget is its own iframe, so one call per widget covers the sidebar root, portaled modals on `body`, the queue strip and the popup. Inline token values beat the `:root` defaults without touching the CSS cascade.
- 2026-11-04 · T6.2 · Translucent slate surfaces (`rgba(15, 23, 42, a)` and the other Tailwind slate steps, 92 uses) read RGB-triplet tokens `--pkr-rgb-{shade,deep,panel,panel-2,border-dim,border}`, whose defaults are the exact slate values. Near-token solid shades (within RGB distance 22 of a token, bluish greys only, 66 uses) read `var(--pkr-themed-<token>, #original)`: unset by default, so the arcade look is unchanged; a theme sets every `--pkr-themed-*` to its token. Purple/teal/gold accents stay semantic.
- 2026-11-04 · T6.3 · Ink scale per theme = theme ink mixed toward its panel (text 6%, soft 14%, muted 22%, faint 40%, dim 50%); `panel-2` = panel + 6% white, `panel-deep` = panel 60% toward bg, `border-dim` = border 35% toward panel, `glow` = accent at 30%. Every theme's ink, ink-text, ink-soft and ink-muted meet 4.5:1 on panel, panel-2 and bg (themes.test.ts). Patterns are the sidebar's `::before` (opacity ≤ 0.12 in the colours); the ambient layer is its `::after` (10–20 s CSS loops), off under reduced motion (setting or OS).
- 2026-11-04 · T6.4 · `THEME_SHOP = { price: 45_000, voucherOff: 0.2 }` and `themePrice()` are appended to `balance.ts` (tunable price ₽35–60k per Appendix T). A voucher takes 20% off one theme (₽36k) and is spent on that buy; vouchers stack one per theme. Buying equips the theme. The try-on is a module-level preview in `ThemeProvider` (`setThemePreview`), so the sidebar root shows the preview instead of the equipped theme without the two fighting over the same CSS properties; leaving the shop or the 15 s ending restores the equipped theme. Swatches show their own theme (the Default card keeps the fixed arcade colours whatever is equipped).
- 2026-11-04 · T6.5 · The bonus multiplies the catch/defeat coin formula only; bounty and daily-first ₽ are flat extras and stay. Trainer XP ×1.25 on the catch/defeat source (level-up/evolution trainer XP unchanged). Type-share XP ×1.25 through a new `mult` argument on `applyTypeShareXpBoost`, passed from the wild catch and defeat paths only (trainer battles and transfers don't get it: SPEC names catching or defeating wilds of the type).
