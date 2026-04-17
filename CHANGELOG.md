# Changelog

All notable changes to PokéRem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **published** marketplace releases. During heavy development, patch bumps may be frequent.

## [Unreleased]

(nothing yet)

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
