# Changelog

All notable changes to PokéRem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **published** marketplace releases. During heavy development, patch bumps may be frequent.

## [Unreleased]

_No user-facing changes logged yet._

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
