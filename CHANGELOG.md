# Changelog

All notable changes to PokéRem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **published** marketplace releases. During heavy development, patch bumps may be frequent.

## [Unreleased]

_No user-facing changes logged yet._

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
