# Versioning policy (PokéRem)

## Canonical version for RemNote

The **RemNote plugin manifest** is the source of truth for what users and the marketplace see:

- File: [`public/manifest.json`](../public/manifest.json) — `version.major` / `version.minor` / `version.patch`

The production build copies `public/` into `dist/`, so the submitted zip must contain an updated manifest.

## In-app version label

[`src/releaseMeta.ts`](../src/releaseMeta.ts) exports `POKEREM_VERSION` for the Settings → About line. Bump it whenever you bump the manifest
and `package.json` so the UI never shows a stale number.

## npm `package.json` version

[`package.json`](../package.json) `version` is kept **in sync** with the manifest (same `MAJOR.MINOR.PATCH`) so:

- Developers see one number in the repo root.
- Release notes and tags can reference a single version string.

If they ever diverge by mistake, treat **manifest** as authoritative for the next marketplace upload and realign `package.json` and `releaseMeta.ts`.

## Changelog

User-facing changes for each release should be recorded in [`CHANGELOG.md`](../CHANGELOG.md) (Keep a Changelog style). Bump the manifest (and package) **before** tagging or uploading a new zip.

## Pre-release builds

During active development, patch bumps can be frequent. That is fine; what matters is **monotonic increases** for published marketplace versions so RemNote can order updates correctly.
