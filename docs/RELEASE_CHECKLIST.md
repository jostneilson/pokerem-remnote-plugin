# Release checklist (PokéRem)

Use this before **first** marketplace submission and before **each** update zip. Combine with `npm run check-types`, `npm test`, and `npm run build`.

## Automated gate (every PR / pre-tag)

- [ ] `npm run check-types` — TypeScript clean
- [ ] `npm test` — Vitest green
- [ ] `npm run build` — `remnote-plugin validate`, webpack production, **`PluginZip.zip`** produced at repo root
- [ ] Confirm `dist/` contains `manifest.json`, widget bundles (`*.js`), copied `README.md`, and the full **`assets/`** tree (see [`docs/ASSETS.md`](ASSETS.md))
- [ ] Confirm `dist/` does **not** accidentally ship secrets (no `.env`, no personal paths in copied files)

## Version and metadata

- [ ] Bump [`public/manifest.json`](../public/manifest.json) `version` (semver)
- [ ] Match [`package.json`](../package.json) `version` to manifest ([`docs/VERSIONING.md`](VERSIONING.md))
- [ ] Match [`src/releaseMeta.ts`](../src/releaseMeta.ts) `POKEREM_VERSION` to the same string (Settings → About)
- [ ] Update [`CHANGELOG.md`](../CHANGELOG.md) (move items from `[Unreleased]` into a dated section, or add under Unreleased)
- [ ] [`public/manifest.json`](../public/manifest.json) `repoUrl` points at the **real** public GitHub repo (replace placeholder if you forked)
- [ ] `author` and `description` still accurate (fan disclaimer, attribution pointer); `description` **≤ 200 characters** (`npx remnote-plugin validate`)

## Legal / credits

- [ ] [`ATTRIBUTION.md`](../ATTRIBUTION.md) updated for any new bundled art, fonts, or CDN dependencies
- [ ] Bundled battle/item/type PNGs comply with their source licenses ([`docs/ASSETS.md`](ASSETS.md))
- [ ] Listing / README still state **unofficial fan project** (not Nintendo / TPC / Game Freak)

---

## Manual QA — **existing** knowledge base (upgrade / regression)

Assume a KB that already had PokéRem installed or a save blob present.

- [ ] Install the new build over the old one (or load dev build) — sidebar opens without a blank white screen
- [ ] **Party / bag / coins** match expectations after load (no obvious reset unless user reset)
- [ ] Complete **one review** without a wild — currency / trainer XP / encounter counter advance
- [ ] If a wild was mid-flight in an old save: UI is not stuck (finish or run, or reset if truly broken — file an issue)
- [ ] **Export JSON** — file downloads; open in a text editor and confirm `storageKey` / `game` look sane
- [ ] **Legacy migration:** KB that only had the old synced key — game still loads (see [`src/game/constants.ts`](../src/game/constants.ts) migration path)

## Manual QA — **fresh** knowledge base

- [ ] Install built plugin; open sidebar — **starter picker** appears
- [ ] Choose starter → **study difficulty** screen → pick preset — main game UI loads
- [ ] Complete reviews until a wild spawns — **Catch / Fight / Run** buttons work
- [ ] **RemNote commands** Catch / Fight / Run fire during an encounter **without** clicking into the iframe first
- [ ] **Queue menu** entries (if visible in your RemNote build) perform the same three actions during an encounter
- [ ] **Study difficulty** from Settings / engine: reviews-per-wild matches the chosen preset (spot-check counts)

## Manual QA — **full reset** flow

- [ ] Settings → **Export** first (sanity)
- [ ] Settings → **Restart all progress** — checkbox gate works; cancel closes safely
- [ ] Confirm reset — toast or UI feedback; **starter** and **study difficulty** prompts return
- [ ] Complete one review cycle again — no ghost encounter from prior save
- [ ] Repeat reset **twice** in one session if paranoid — no stuck modal, no duplicate starters

## Manual QA — **queue** and **multi-surface** sync

- [ ] **Queue strip** (if enabled): shows when `pokerem.feature.queueStrip` is on; hidden when off
- [ ] With strip **and** sidebar visible: complete a review from the main queue — **both** surfaces update (coins / encounter text) without reloading RemNote
- [ ] **Floating encounter popup** (if enabled): appears when a wild spawns; does not crash when disabled mid-session

## Manual QA — **battle** and **progress**

- [ ] **Catch** with balls in bag — encounter clears, dex / party update appropriately
- [ ] **Fight** — opens move list; first-move / palette “fight first” path works
- [ ] **Run** — encounter ends
- [ ] **Bag** healing items — HP updates; cannot soft-lock with 0 HP lead on wild (use bag / party messaging)
- [ ] **Party** — switch active Pokémon; storage move works if implemented in UI
- [ ] **Shop** — purchase decrements currency and increments bag
- [ ] **Dex / collection** — seen/caught counts move after encounters
- [ ] **Achievements** (Progress tab): new unlock visible; **claim** grants rewards; tab “attention” clears when nothing left
- [ ] **Rewards** tab: trainer level rewards claimable path works

## Manual QA — **Settings** and **help**

- [ ] In-plugin **Settings** loads all mirrored toggles without errors
- [ ] Expand **Troubleshooting** — copy reads well; no references to removed features
- [ ] **About** version matches manifest / `releaseMeta.ts`

## Manual QA — **offline / network**

- [ ] With network disabled: note PokeAPI party sprites may not load ([`ATTRIBUTION.md`](../ATTRIBUTION.md)); bundled `assets/` still render items / types / backgrounds

## Manual QA — **navigation / stress**

- [ ] Switch to another RemNote document or tab and back — sidebar reloads coherent state (may briefly flash loading)
- [ ] Resize sidebar narrow → wide — battle UI does not overlap unreadably

---

## Marketplace submission (when ready)

- [ ] Short **store listing** description (you may shorten manifest `description` further for the store character limit)
- [ ] **Screenshots:** sidebar (main), battle encounter, Settings / Progress (current UI, not mockups)
- [ ] **Support:** issue tracker or contact URL in listing if RemNote allows — point at `repoUrl` issues
- [ ] Confirm **RemNote minimum app version** if the portal asks (SDK pinned in `package.json`; note in listing if needed)

## “Would this embarrass us if it went public tomorrow?”

- [ ] No hardcoded secrets or personal paths in repo
- [ ] `dist/` and `*.zip` not committed (see [`.gitignore`](../.gitignore))
- [ ] No unlicensed commercial assets in `public/assets/`
