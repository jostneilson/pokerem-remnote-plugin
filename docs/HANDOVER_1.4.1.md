# PokéRem 1.4.1 — Agent Handover

**Date:** October 31, 2026
**Version:** 1.4.1 (schema 5, save key `pokerem_game_v1`, backup `pokerem_game_v1_pre_v5`)
**Status:** Built. 160 tests pass. Verified in the sandbox simulator, **not in native RemNote**. Git changes are uncommitted until the owner asks for a commit.

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

- **Not tested in native RemNote.** This is the first thing to do next.
- The queue strip and encounter popup widgets are built but were not exercised in the simulator.
- A dev-only React warning about mixing `background` and `backgroundPosition` remains. It has no effect in the production build.
- Legacy moves that are not legal for a species are replaced on migration and kept in `legacyMoves`.
