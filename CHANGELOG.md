# Changelog

All notable changes to PokéRem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **published** marketplace releases. During heavy development, patch bumps may be frequent.

## [1.3.1] - 2026-10-07

- Added confirmed stone evolution in Party, with one-stone consumption, compatible-target previews, battle/faint/Everstone guards, preserved identity and shiny status, collection progress, and evolution rewards.
- Corrected 29 existing stone mappings against PokéAPI data; added Sun, Shiny, Dusk, and Dawn Stones with bundled icons, daily deals, and rare route drops.
- Revives remain always stocked, now cost 200 coins, and can appear in common route finds and all biome scrap tables. Need bias increases their availability for a fainted party without multiplying item quantities.
- Replaced arbitrary hue cycling with actual species-specific shiny front/back sprites across owned-Pokémon and encounter surfaces. Missing back sprites try the correct front variant before a neutral placeholder.
- Added a finite gold-star reveal/catch celebration that respects reduced motion. Regular shiny odds stay the same, while slower encounter pacing proportionally increases odds per encounter. v4 save format is unchanged.
- Automated evolution, save-preservation, revive-balance, and shiny-rendering tests added. Native animation timing is not independently verified.

## [1.3.0] - 2026-10-07

### Arcade revival

- Locally bundled Pixelify Sans and Press Start 2P fonts, consistent pixel typography, crisp framed chrome, and semantic battle/type colors.
- Full-panel management screens; persistent Play/Party/Bag/Dex navigation and an expandable Menu with all secondary destinations.
- Return to Play for pending encounters without dismissing them.
- Collapsible secondary status stats, achievement categories, inventory categories, and Settings guidance.
- Compact generation/type selectors, larger readable Pokédex labels, and a larger scrollable type matrix.
- Matching detail-sheet styles, simpler Settings hierarchy, reduced decorative shimmer, and integer movement feedback.
- Bag combines My items and Shop, with owned counts alongside purchases and readable unavailable items. Existing saved Shop destinations still open the Shop inside Bag.
- Larger navigation, type, and trainer lineup icons, shorter notices, and menu/disclosure/purchase feedback that respects reduced motion.
- Removed the Study companion / Compact view top strip; Compact view now lives in Settings > Display.
- Opt-in wild auto attack uses the strongest effective move and stops at its critical-hit knockout ceiling, when the lead faints, on a changed encounter, or on Stop/manual actions/navigation. Catch remains manual. Each turn reloads and checks the synced save under the existing write lock.
- Save schema remains v4. Normal attack randomness and existing progression are preserved. Automated safety and save compatibility checks pass. User-supplied native screenshots were inspected for the listing; auto-attack native interaction and animation timing were not independently verified.

## [1.2.1] - 2026-10-07

### Fixed

- Marketplace screenshot links now use immutable GitHub-hosted image URLs. The deployed RemNote asset URLs returned HTTP 403 despite the image files being present in the ZIP.
- Added `listing:check:remote` to verify every public image returns an image response whose bytes match the bundled screenshot.
- Gameplay and save schema remain the same as 1.2.0.

## [1.2.0] - 2026-10-07

A real expansion: trainer battles slot in as rare mini-bosses, XP Doublers stack and queue across sessions, achievements grow into long-term and prestige tiers (with full-generation completion rewards), the battle and reward UIs get a polish pass, and Settings gains a Ko-fi support card. No save migration friction — v3 saves load as v4 with all new fields safely defaulted.

### Polish pass — 2026-10-07

- Readable sans-serif menu and body text, quieter panels, larger controls, visible keyboard focus, and labeled responsive navigation.
- Compact study view retains encounter actions and lead HP while hiding the wild arena. The view preference is session-scoped and does not alter game saves.
- Shorter responsive arena, smaller status sprite, next-achievement milestone and adventure summary.
- Trainer turns animate after the save commits, with controls gated during the exchange; trainer moves now have complete button styling.
- Explicit save-loading and save-failure feedback, synchronous guards against duplicate battle clicks, sprite fallback reset when species changes, adaptive trek dots for long encounter rates, and low-HP meter colors.
- Skip a trainer challenge before locking a team, including an entirely fainted party; active battle restrictions remain intact.
- Plugin and OS reduced-motion preferences suppress motion throughout the sidebar.
- Added an isolated UI QA preview and preservation/rendering regression tests. Production entrypoints and CSS injection stay unchanged.

### Added

- **Trainer battles** as a rare mini-boss event that replaces a wild encounter on threshold (Off / Rare 100 / Normal 50 / Frequent 25 cards via new `pokerem.trainerBattleFrequency` setting). Pick 3 party Pokémon at battle start (locked in — no switching, healing, or items mid-battle); fight 3 themed enemies; on victory, choose 1 of the 3 to attempt to catch with a slightly boosted catch chance. **Elite trainers** appear as a rare prestige variant (~12% of trainer battles) with stronger scaling, evolved teams, guaranteed Rare XP Doubler reward, and a purple/gold visual treatment.
- **XP Doubler consumables** in three tiers — Common (25 cards), Rare (50 cards), Legendary (100 cards). Activate from Bag → Boosters; only one active at a time, additional doublers queue automatically. Doubles XP for every Pokémon that gains XP (lead and bench), tracked by card count, never trainer XP. Clear status + queue strip in Bag and a `x2 XP · N` chip in the battle header.
- **Long-term achievements & prestige** — new trainer-battle, party-growth, generation-completion, prestige, and 365-day streak achievements grouped into Daily / Milestone / Prestige buckets in Progress. Generation completion grants coins, a guaranteed Legendary XP Doubler, Ultra Balls, and a permanent prestige badge shown on the Status dashboard.
- **Claim-all** for visible unclaimed achievements, plus inline claim from main-battle notice banners.
- **Trainer-battle identity overlay** that layers progression titles (Rookie Challenger → Study Ace → Scholar Duelist → Elite Scholar → Champion Scholar) on top of the existing trainer-level rank as you accumulate trainer wins.
- **Ko-fi support card** at the top of Settings — gold button linking to https://ko-fi.com/pokerem with the message "Support the student that supports you and your studying." No popups, no nags.
- **What's New card** that appears once per version in the sidebar and dismisses to synced storage. Re-openable from Settings → About.

### Changed

- **Marketplace description** updated to communicate the full study-RPG loop (encounters, catching, party, trainer battles, XP doublers, shop, achievements) in one punchy line.
- **Battle and reward UIs** polished: HP and XP bars use smooth width transitions with subtle pulses, reward banners share a cleaner `RewardBanner` layout primitive with number count-up, the floating encounter popup gets tighter framing, and the Status screen is restructured as a quick study-RPG dashboard (identity / rank / prestige / today / closest goal). All animations respect the existing `pokerem.reducedMotion` setting.
- **Bag** gets a Boosters category at the top, surfacing the active XP Doubler countdown and queued doublers.

### Fixed

- **Queue completion dedupe** no longer treats every **table / list-style** flashcard completion as the same review when RemNote reuses one parent `remId` — keys now prefer `card._id` (and related instance ids) and suffix row/list/column-style fields when only rem-scoped ids exist.

### Notes for distributors

- Save schema bumped to v4 (additive only). v3 saves upgrade automatically — no data loss; new fields default to safe values. Style bundling unchanged (`style-loader` for all widget CSS), `PluginZip.zip` rebuilt fresh on `npm run build`.

## [1.1.3] - 2026-04-17

### Added

- **Party → Teachable moves**: browse moves **unlocked on the level-up learnset at the Pokémon’s current level**, short summaries, learn into an open slot, or replace a slot when full (opaque bottom-sheet UI in installed mode). Forgetting a move works from PC storage Pokémon as well.
- **Revive** always available in the Shop at **500** PokéCoins (no daily rotation); clearer faint vs heal rules and bag feedback when potions cannot heal fainted Pokémon.
- **Wild encounter pool** respects caught species until every encounterable species in enabled generations is caught; then duplicates return and **shiny rate becomes 1/200**.
- **Main battle notifications** for newly unlocked achievements and claimable trainer rewards (dismiss hides banner only; claim in Progress / Rewards).
- **Party-wide study XP** (weighted random per card) and **encounter-paced passive healing** with fractional carry; smoother **Pokémon XP curve** (early levels faster than the old flat 100 XP step).

### Changed

- **Learnsets** are now generated for every `FULL_POKEDEX` species from the move catalog with deterministic pacing, type-legal moves only (species typings + Normal), validation, and small hand-authored overrides (Magikarp, Ditto, Unown, Eeveelutions).
- **Status → Today’s stats (UTC)** replaces separate “This session” / “Today” panels; counts use the same `dailyStats` source as the rest of the pipeline.
- **Eeveelution learnsets** (Vaporeon, Jolteon, Flareon) corrected to proper Water / Electric / Fire progressions using existing move catalog entries.
- **Marketplace manifest description** — clearer value prop, how to open the panel from Flashcard Queue, and fan-project line (still under RemNote’s short-description length cap).

### Fixed

- **Run / retreat icon** vertical alignment with command labels.
- **Achievement fanfare** no longer only appears after claiming from Progress; unlocks surface in the main battle chrome.
- **Catch Scope** shop/bag icon: `key.png` was never shipped (404 in installed builds); icon now uses existing `master-ball.png`.
- **Combat tests** now pick the lead’s actual default battle move instead of assuming `Scratch` on Charmander.

## [1.1.2] - 2026-04-13

Marketplace **CSS delivery parity** with local development: production webpack now injects widget styles via `style-loader` (same as dev) so Tailwind and `style.css` apply when RemNote loads widget JS without sibling extracted `.css` files. Release metadata bumped to **1.1.2**.

### Fixed

- **Installed / marketplace widgets missing most theme styles** — separate `MiniCssExtractPlugin` `.css` files were not reliably loaded alongside widget bundles in the host iframe; styles are now bundled into each widget JS so they inject at runtime like localhost.

### Notes for distributors

- **`npm run build`** still removes `dist/`, runs production webpack, deletes any previous **`PluginZip.zip`**, then zips `dist/*` only (no stale zip).

## [1.1.1] - 2026-04-12

Marketplace **resubmit / parity** pass: aligned shipped metadata with in-app version label, ensured plugin listing icons ship as raster + SVG, tightened public-folder copy ignores, and added a single `npm run release` gate (types + tests + build).

### Fixed

- **`package.json` / `releaseMeta.ts` / `manifest.json` version drift** — all now use **1.1.1** so Settings → About, tab icon cache-bust query, and RemNote marketplace version match.

### Changed

- **`webpack` CopyPlugin** — ignore `.DS_Store` at `public/` root so production zips do not accidentally include Finder metadata.
- **`npm run release`** — runs `check-types`, `test`, then `build` before you upload a zip.

### Notes for distributors

- Keep **`public/logo.png`** and **`public/logo.svg`** in sync with branding; regenerate PNG via `npm run generate:logo` (Pillow). RemNote’s plugin card UI expects raster **`logo.png`** at bundle root alongside **`logo.svg`**.

## [0.2.0] - 2026-04-10

First **marketplace-oriented** public track: playable loop, documented assets, and explicit fan-project disclaimers.

### Added

- Wild encounters tied to review pacing; Catch / Fight / Run in the battle UI.
- RemNote **command palette** and **queue menu** actions that dispatch battle commands without focusing the plugin iframe.
- Trainer progression, achievements, bag, shop, party, Pokédex-style collection, type chart, and route-find flavor.
- **Export save as JSON** and **full progress reset** (with confirmation) from the in-plugin Settings tab.
- Legacy save migration from pre-rename synced storage key into `pokerem_game_v1`.
- Release documentation: `docs/ASSETS.md`, `docs/VERSIONING.md`, `docs/RELEASE_CHECKLIST.md`, `docs/SCOPE_AND_PRIVACY.md`, `ATTRIBUTION.md`, `public/assets/README.md`.

### Changed

- Battle interaction model centers on **sidebar controls + RemNote commands** (no custom global queue keybind layer).
- Root `README` expanded for developers and shippers; manifest description carries fan-disclaimer + attribution pointer.

### Notes for distributors

- Bundled raster art under `public/assets/` must ship with a clear license trail per `docs/ASSETS.md` / `ATTRIBUTION.md`.
- Party sprites load from **PokeAPI** when online; confirm their terms before publication.
