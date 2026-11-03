# PokéRem 1.4.1 — Agent Handover

**Date:** October 31, 2026
**Version:** 1.4.1 (schema 5, save key `pokerem_game_v1`, backup `pokerem_game_v1_pre_v5`)
**Status:** Released. Uploaded to RemNote by the owner, who confirmed it works there. 160 tests pass. Merged to `main` and tagged `v1.4.1`.

Read this first, then `HANDOVER_1.4.0.md` for the feature architecture. Where they disagree, this file wins.

## What broke in 1.4.0

`withSyncedGameWrite` used `navigator.locks.request`. RemNote's plugin iframes use `sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"`. Without `allow-same-origin` the origin is opaque, and Web Locks always rejects with SecurityError. Every game write failed.

1.4.0 passed its tests because they never ran under that sandbox. Its "Complete, Tested" status did not cover the RemNote host.

## Rules for future work

1. Never use origin-bound browser APIs for game state: Web Locks, localStorage, IndexedDB, cookies, or service workers. `release141.test.ts` keeps Web Locks out of the source.
2. After changing saves, widgets, or storage, run the host simulator before calling the work done.
3. Native RemNote testing uses only an old testing deck. Current classes and cards stay untouched.
4. Commit or push only when the owner asks.

## Host simulator

Start `pokerem-hostsim` from the hub `.claude/launch.json` (port 8082). From the browser console:

- `hostsim.seed('fresh' | 'legacy' | 'custom', save)` loads a save
- `hostsim.review(n)` completes flashcards
- `hostsim.click(text)`, `text()`, `buttons()`, `overflow()`, `images()` drive and read the widget
- `hostsim.state()`, `backup()`, `errors()`, `width(px)` inspect it

Limits:

- It stands in for the SDK, so it proves sandbox behavior, not RemNote's own API behavior.
- Local assets (types, scenes) do not load there.
- Iframe contents do not appear in screenshots. Use `pokerem-preview` (port 8081, `?capture=1&screen=&scenario=&width=`) for visuals.
- In a hidden browser pane, images can look frozen mid-fade. That is a capture artifact: bring the tab to the front and capture again.

## Balance constants

| Item | Value | Where |
| --- | --- | --- |
| HP | `max(10, floor((floor(2*base*L/100)+2*L+14)*ivMult))` | `engine/pokemonStats.ts` |
| Foe damage scale | wild 0.45, trainer 0.7 | `engine/moveMechanics.ts` |
| Defeat coins | 250 + 10 × level | `state/store.ts`, `engine/shop.ts` |
| Catch coins | 100 | `engine/shop.ts` |
| Review coins | 25 | `engine/shop.ts` |
| Study bonus | Lucky 350–850 (4%), Rare 2,000–5,000 (0.5%), Jackpot 10,000–25,000 (0.05%) | `rollStudyCashBonus` |
| Shiny | 1/250 base, scaled by review pacing (1/125 at half frequency) | `engine/encounters.ts` |
| Pokémon Center | 1 coin per missing HP + 100 per fainted | `pokemonCenterCost` |

Same-level simulations against all of Gen 1 gave roughly a 70–80% win rate in 3–7 turns.

## Quick Care

`ui/components/QuickCarePanel.tsx`, mounted above Play in `widgets/pokerem_sidebar.tsx`. Reducers are at the end of `state/store.ts`: `nextHealthyPartyMember`, `quickReviveLead`, `bestPotionForLead`, `quickHealLead`, `pokemonCenterHeal`, `quickBuyBalls`.

## Fonts

The owner wants the original pixel look, only clearer. Keep Press Start 2P for titles and Pixelify Sans for body text. A modern sans was tried and rejected. Tokens: `--pkr-font-body`, `--pkr-font-display` in `src/style.css`.

## Verified in this release

- Sandbox simulator: fresh start, 1.3.1 save migration with backup, reviews saving, encounters, buy-and-revive, full-party catch swap, and a trainer battle through to the win screen.
- No horizontal overflow on Play, Party, Bag, Dex, or Menu at 280, 320, 400, and 520px.
- `npm run release`: version check, types, 160 tests, and build. The zip has no `navigator.locks` and embeds both fonts.

## Known and open

- The owner confirmed 1.4.1 works in RemNote after uploading it. That check was theirs and has no itemized list of flows.
- The queue strip and encounter popup widgets are built but were not exercised in the simulator.
- A dev-only React warning about mixing `background` and `backgroundPosition` remains. It has no effect in the production build.
- Legacy moves that are not legal for a species are replaced on migration and kept in `legacyMoves`.

## Next update workflow — November 3, 2026

The owner wants to keep studying on the current version while supplying features incrementally. Implement and test each requested feature, record its results and remaining limits, then leave the update ready for the next request. Publication waits for the owner's explicit decision. Commit and push still require an explicit request.

- Development workspace: `/Users/jostneilson/Remnote Ankimon/remnote-plugin/.worktrees/update-next`, branch `update/next`.
- Verified starting point: clean worktree at `8d9e59a` (1.4.1 release merge); main is a separate worktree. No feature changes yet; no new tests or live-host checks were run during setup.
- Preserve existing saves and progress. Use isolated fixtures/previews first; native testing is limited to the old testing deck. Do not change the installed plugin or current study cards as part of routine development.
- Keep a cumulative record here of implemented features, relevant checks, and unresolved acceptance gates. Choose the release version and prepare the final release only when the feature set is settled.
- Next action: receive the first feature request.

### Implemented — unified original font and unobstructed battle sprites

Owner requested the screenshot's original Pixelify Sans throughout, with only a clearer `5`, then reported Pheromosa hidden behind its name/HP panel. Both are implemented in `update/next`, uncommitted and unpublished.

- `PokeRem Pixel` is a renamed, bundled OFL derivative of the existing variable Pixelify Sans. Only `five`'s outline/weight interpolation changes. Generator: `scripts/generate-clear-five.py` (fonttools 4.63.0); committed TTF means normal builds need no Python. Original fonts/licenses are retained. The new request supersedes the earlier two-font preference for future builds.
- Body and display tokens now share that face. Removed explicit monospace/SVG text overrides, including Tailwind's code/keyboard defaults; adjusted former display-heading sizes for legibility. Font specimen: `docs/qa/2026-11-03-font-comparison.png` (FreeType rendering, not a host screenshot).
- Battle plates (superseded November 3, see below): the first fix moved them to a row above the field. The owner rejected it because it left a large empty band above the battle, so it was reverted.
- Preview supports direct `screen=settings`, plus `scenario=wild-ultra` and `wild-shiny` recreating Mewtwo vs Pheromosa. Example: `http://127.0.0.1:8081/?capture=1&screen=status&scenario=wild-ultra&width=400&reducedMotion=1`.

Checks executed November 3:

- Types pass; all 160 tests / 23 files pass after both features; production build/manifest validation passes (existing webpack asset-size warnings).
- Compared all 576 glyphs, character mappings, and advance widths against the original. Only `five` changes; other outlines and all advances also match after instantiation at weights 400, 500, 600, 700. Generator guards non-five glyph/metric preservation.
- Verified custom font bytes embedded in all six gameplay production/sandbox bundles.
- (Codex) Native Safari running isolated preview: settings at 400px and Party at 280px; shiny Ultra Beast at 280px; Pheromosa at 400px with expanded type panel; active trainer battle at 280px. Inspected screenshots: sprites fully visible, controls reachable. These are local preview checks, not installed RemNote acceptance or an exhaustive width/animation audit.
- RemNote sandbox simulator: mounted legacy fixture, completed a review (120 -> 121, coins 777 -> 802), spawned Eevee, and rendered the new status row at 280px. No live RemNote saves or cards touched. Simulator SDK remains a substitute for the real host API.

No release version bump, commit, push, or upload. Local build archive still says 1.4.1 and is validation output only; do not publish it as the next version. Remaining release gates include final scope/version, actual RemNote acceptance on the old test deck, and any broader visual/animation checks needed by later features. Next action: receive the next requested feature.

### Redone — battle plates in the main-series layout (November 3)

Codex's status row was reverted. Plates stay inside the field, placed as in the main games so each sits where no Pokémon stands:

- Wild battles: the foe's plate is top-left and the player's bottom-right. While waiting for a wild (no foe on the field), the player's plate stays top-left above the trek tracker. `BattleReviewSurface.tsx`, keyed on `showFieldWild`.
- Trainer battles: same, with the enemy plate top-left and the player bottom-right. `TrainerBattleSurface.tsx`.
- Plate width is half the field (`hudPanelMaxPx`, 120–190px), which keeps each plate clear of the opposite sprite. Plate text is 13px with an 11px role label (`.pkr-battle-hud--compact` rules at the end of `style.css`).
- Rarity is a `.pkr-hud-badge` chip beside WILD. Shiny is a gold `✦` (`.pkr-hud-shiny`) beside the name, for both sides.
- The shiny reveal (`.pkr-shiny-celebration--field`) overlays the field and fades after 3.2s, with an opacity-only fade under reduced motion. It no longer adds height above the field.
- Grounded shiny sprites glow (drop-shadow) instead of drawing the square `.pkr-shiny-sprite-ring` box.
- The expanded type matchup panel (hover or tap a plate) can briefly overlap the nearest sprite at narrow widths. This only happens on request; it is never the default state.
- `.pkr-filter-select` wraps, so the Dex generation picker no longer clips at 280px.

Checks: types, 160 tests, and the production build pass. Preview on port 8083 (`pokerem-next-preview` in the hub launch config) was checked at 280, 320, 400, and 520px for idle, fainted lead, shiny Ultra Beast (wild), expanded type panel, and an active trainer battle. Measured plate and sprite boxes at 280px do not overlap. No horizontal overflow on Play, Party, Bag, Dex, Settings, or Trainer at 280 and 520px. The new `5` was checked in the browser at 11–24px, weights 400–600. Not yet checked in installed RemNote.


### Top-10 plan, phases 1–3 (November 3)

The approved plan is `~/.claude/plans/noble-puzzling-lampson.md` (top 10 components plus the shiny/IV additions). Done so far:

**Phase 1 — foundation**
- `src/game/engine/speciesPool.ts` is the one place for who appears and at what level:
  - `minWildLevel(dex)` chains through `EVOLUTION_TABLE`; item and friendship evolutions are set at the earlier stage +18, minimum 20.
  - `encounterBaseLevel(party)` is the mean of the top 3 levels; an empty party gives 5.
  - `isEventSpecies`, `speciesWeight` (catch rate / 255, clamped 0.12–1; starters ×0.25), `SCENE_BIOME_TYPES` (19 scenes, ×3 weight), and `pickEverydaySpecies`.
- `store.ts`:
  - `registerOwnedSpecies` runs in `withTouch` and in `parseGameState`, backfilling the Dex.
  - `grantCatch` and `ownedFromEncounter` replace four copies of the catch code.
  - `knockoutXp` is shared by wild and trainer battles.
  - `buyItem(state, id, qty)` prices from `shopPrice()` in `shop.ts`.
  - Power Up evolutions award trainer XP.
  - The `applyCombatTurn` recursion keeps `protectWild`.
- `catchTypeBonus` in `encounters.ts` is the single type-advantage bonus (0.15).
- `src/game/sim/simulate.ts` is a seeded headless player (mulberry32 replaces `Math.random`). Used by `foundation.test.ts`, `encounterGenerator.test.ts` and `battleBalance.test.ts`.

**Phase 2 — encounter generator** (`spawnEncounter`)
- The shiny roll is the first rng call, so it doesn't depend on species or level.
- Events need `EVENT_MIN_PARTY_LEVEL` 25 and `EVENT_MIN_REVIEWS` 500, then roll at `EVENT_CHANCE` 1.2% (plus up to 1.2% from slow pacing).
- Everyday encounters: level is base −1 to +1, `UNCAUGHT_BIAS` is 0.7, and the scene favours its types.
- The scene is picked at random (never the same one twice in a row) before the species, and passed as `sceneIndex`.
- `wildEncounterSpeciesDexSet` now includes starters.

**Phase 3 — battles**
- `engine/foeAi.ts` `chooseFoeMove`: wild 60% best move, trainer 80%, elite 95%. Status moves are used 12–20% of the time when the target has no ailment.
- `WILD_HP_SCALE` 0.65 (in `encounters.ts`) and `WILD_FOE_DAMAGE_SCALE` 0.4.
- Simulated results: wild fights average 3–3.6 turns, the lead faints about 5% of the time, and trainer win rate is 50–95%.
- Trainer teams come from `pickEverydaySpecies` (theme types required, no starters, no repeats), and the ace is +1 level.
- KO XP is the wild formula ×1.5. A loss costs `trainerLossFee` (5% of coins, at most 40 × party level). Player teams are no longer padded with clones; enemy teams stay at 3 because the save normalizer requires it.
- Rematch is deferred to Phase 4 (flow), because it needs UI.

Checks: types pass; 180 tests pass. Not yet checked in the preview or RemNote.

### Phases 4–5, structure, save safety and release QA (November 3)

Phases 4 (flow, economy) and 5 (presentation, shinies, type scale) are done; the CHANGELOG `[Unreleased]` section lists every player-facing change. Code structure:

- **Store split.** `src/game/state/store.ts` is a barrel; the public API is unchanged. Reducers live in `src/game/state/reducers/`:
  - `persistence.ts`: initial state, normalizers, parse
  - `core.ts`: shared helpers (`grantCatch`, `withTouch`, dismissals)
  - `encounter.ts`, `battle.ts`, `trainer.ts`, `economy.ts`, `collection.ts`
  - Import order with no cycles: persistence ← core ← {battle, collection, economy} ← trainer ← encounter.
- **Battle surface split.** `BattleReviewSurface.tsx` is wiring only. Field, HUD plate, header, command and move menus, and messages are separate files in `src/ui/battle/`.
  - All field effects run through `useBattleFx.ts`: one reducer, with timelines in `FX_TIMELINES`.
  - A channel cancels only on replay or unmount, so effect classes never get stuck.
- **Type scale.** Use `pkr-fine`, `pkr-copy` and `pkr-lead` (see `DESIGN_CONTRACT.md`). Inline colours use the `--pkr-ink-*` tokens.
- **Save safety** (`saveSafety.test.ts`, `release141Upgrade.test.ts` with a real 1.4.1 save in `__fixtures__/`):
  - An empty read is never written over a save (`pipeline.ts`).
  - `chooseStarter` refuses when you already own Pokémon.
  - A save with Pokémon is treated as set up even if its flags are missing.
  - An unknown or newer schema is parsed rather than reset.
- **Idle study** (`idleStudy.test.ts`, `keepTeamBattleReady` in `reducers/encounter.ts`): nothing left waiting in the sidebar can stall encounters.
  - An unanswered wild wanders off after `WILD_FLEE_AFTER_CARDS` (12) cards.
  - An unanswered trainer challenge (not yet in battle) moves on after 12 cards.
  - A full-party catch goes to storage on the next reviewed card. The swap choice is still offered first.
  - A fainted lead hands over to the healthiest teammate on the next card.
  - A fully fainted team rests and returns at half HP after 12 cards.
  The queue strip shows each waiting state.
- **Pixel font weights:** `scripts/bundle-fonts.mjs` declares the one TTF for weights 400–900, so `font-black` never triggers faux bold (which made a 2 look like an 8).
- **Trainer team select** pre-selects the three strongest healthy Pokémon.
- **Activation** (`src/widgets/index.tsx`, issue #3): widgets register first, and each setup step is wrapped in `safely()`.
  - The first run opens the sidebar.
  - The command "Open PokéRem" always works.
  - The `snippet.css` 403 is RemNote probing; it is harmless.
- **Onboarding:** the tip dismissal is stored in synced storage (`pokerem.onboardingTipsDismissed`). The tip only shows for the first 30 cards.

QA scripts used for this release (Playwright against the hostsim on :8084 and the preview on :8083) did these checks:
- overflow at 280, 320, 400 and 520px
- contrast
- keyboard tab order and shortcuts
- queue widgets at 280, 400, 600 and 900px
- a fresh 200-card playthrough, including trainer battles
- the 1.4.1 save replay
- feature checks for route tickets, card styles, the tutor and the Shiny Case

**Before publishing:**
- Bump the version in `package.json` and `public/manifest.json` so What's New shows the new release.
- Confirm the battle background licence (`ATTRIBUTION.md`).
- Test against the old testing deck in RemNote.
- Use `Fixes #3` in the commit or PR, then comment on issue #3 once the release is live.
