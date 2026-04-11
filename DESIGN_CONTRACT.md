# PokéRem design contract (Phase 0)

This document locks the **visual and typography rules** for the RemNote plugin so later phases (battle polish, Party/Bag, etc.) do not drift.  
**Code truth:** `src/style.css` (`:root`, `.pkr-*`) + `src/ui/theme/designTokens.ts`.

---

## 1. Brand

- **Wordmark:** **PokéRem** (é = U+00E9) — canonical in normal / sentence case (`BRAND.wordmark`).
- **All-caps / uppercase CSS:** use **`POKEREM`** (`BRAND.wordmarkCaps`) — no accent on a capital E; the é belongs on “Poké” with lowercase **e** only.
- **Command palette names:** `brandCommandCaps` (e.g. `POKEREM: Catch`) so hosts that render commands in all caps stay legible.
- **Styling:** Pixel/title treatment may be stylized; in mixed case it must still **read as PokéRem**, not plain `PokeRem`.
- **Code identifiers** may stay ASCII (e.g. `PokeRemGameState`, `usePokeRemBattleActions`) for developer ergonomics.
- **Internal IDs** (`pokerem_sidebar`, `pokerem_cmd`, storage keys) stay unchanged — RemNote/plugin API, not branding.

---

## 2. Typography map

| Role | Font | Where | CSS / class |
|------|------|--------|----------------|
| Pixel title / wordmark | Press Start 2P | Battle header wordmark, queue strip title, short HUD labels | `.pkr-pixel-title` |
| Pixel dialogue | Press Start 2P | Battle outcome log, short system lines | `.pkr-pixel-dialog` |
| Sidebar UI (bulk) | Press Start 2P | `.pokerem-sidebar.pkr-pixel-ui` subtree | Global override in `style.css` |
| Tooltip / explainer body | Exo 2 | `StatHoverTip` portal, `.pkr-stat-tooltip` | `style.css` |
| Sans body (explicit) | Exo 2 | Any surface that must stay readable outside sidebar pixel mode | `.pkr-text-sans-body` |
| Muted meta | Exo 2 | Secondary lines next to sans body | `.pkr-text-sans-muted` |

**Rule:** Pixel font is for **short** strings (roughly &lt; 40 characters in a single line). Paragraphs and settings explanations use **sans**.

---

## 3. Design tokens (`:root`)

Defined in `src/style.css`:

| Token | Purpose |
|-------|---------|
| `--pkr-radius-sm` | Small controls, meter tracks |
| `--pkr-radius-md` | HUD plates, compact panels |
| `--pkr-radius-panel` | `.pkr-panel`, main cards |
| `--pkr-shadow-panel` | Default panel drop shadow |
| `--pkr-shadow-panel-inset` | Inner highlight + depth on panels |
| `--pkr-bevel-light` / `--pkr-bevel-dark` | Shared inset bevel (existing) |

Scene-specific accents continue to use **`battleAmbienceCssVars`** (`--pkr-accent`, `--pkr-panel-border`, etc.).

---

## 4. Meters (single visual language)

**Canonical pair:** `.pkr-meter-track` + `.pkr-meter-fill`

- Used for: **party HP**, **status HP**, **trainer XP** (header), **achievement progress**, **`MeterBar`** helper, and **battle wild/player HP** (via aliases below).
- **Do not** introduce new ad-hoc `rounded-full` + `rgba(0,0,0,0.4)` bars for game UI; extend this pair or add a documented variant class.

**Aliases (same computed style as meters):** `.pkr-battle-hp-track`, `.pkr-battle-hp-fill` — kept for battle-specific markup and backwards compatibility; they share rules with `.pkr-meter-*`.

---

## 5. Component inventory (where things live)

| Area | Main files |
|------|------------|
| Battle (queue) | `src/ui/battle/BattleReviewSurface.tsx`, `outcomeStyles.ts`, `StatHoverTip.tsx`, `RouteFindBanner.tsx` |
| Sidebar shell | `src/widgets/pokerem_sidebar.tsx` |
| Queue strip | `src/widgets/pokerem_queue_strip.tsx` |
| Encounter popup | `src/widgets/pokerem_encounter_popup.tsx` |
| Global chrome CSS | `src/style.css` |
| Theme class names | `src/ui/theme/gameTheme.ts` |
| TS tokens | `src/ui/theme/designTokens.ts` |
| Panels | `src/ui/components/Panel.tsx` |
| Meters helper | `src/ui/components/Bars.tsx` |
| Screens | `src/ui/screens/*.tsx` |
| Scene / ambience | `src/game/engine/battleAmbience.ts` |

---

## 5b. Sidebar tab bar icons (`nav*`)

- **Source of truth:** `GameIcon.tsx` — keys `navStatus`, `navParty`, `navBag`, `navShop`, `navDex`, `navTypes`, `navProgress`, `navRewards`, `navSettings`.
- **Format:** 16×16 viewBox, **integer `rect` pixel grid** (`pixelSvg`), `currentColor` fill, `shape-rendering: crispEdges` via `.pkr-pixel-icon-svg` in tab mode.
- **Safe area:** Primary silhouette lives in **x: 1–14, y: 3–13** so every tab glyph **optically matches** when scaled to 18px in a fixed slot.
- **Read:** Each icon must be **distinct at a glance** (party = three Pokeballs; dex = clamshell dex; types = matchup nodes + arrow; progress = trophy cup; rewards = chest; bag = backpack straps; shop = storefront/awning).

---

## 6. Phase boundaries

- **Phase 0 (this doc):** tokens, typography rules, brand lock, meter unification, written contract.
- **Phase 1+:** Do not change this contract without updating this file and `designTokens.ts`. Next: battle HUD composition and command deck (see product roadmap).

---

## 7. Success check (Phase 0)

- [ ] No conflicting wordmark in battle header vs queue strip.
- [ ] One meter track/fill style across battle header XP, party HP/XP, progress rows, and `MeterBar`.
- [ ] New contributor can answer “which font for tooltips?” and “which classes for HP bars?” from this file alone.
