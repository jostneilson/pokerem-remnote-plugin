# 1.6.0 verification — continuation, 2026-11-04

This is an acceptance record, not a claim that all gates passed. Source checkpoint: `b63b5b2` (update/next). No push, tag, publication or live RemNote changes.

## Executed gates

- `../../node_modules/.bin/tsc -p .`: exit 0.
- `../../node_modules/.bin/vitest run`: exit 0; 53 files / 337 tests; 67.41 seconds on the final pre-checkpoint run. Logs `/private/tmp/pokerem-160-checkpoint-tests.log`.
- `PATH="$PWD/../../node_modules/.bin:$PATH" npm run build`: exit 0 after fixing the over-200-character manifest description (now 154). Log `/private/tmp/pokerem-160-build.log`. Webpack emits size warnings, not errors.
- ZIP readback: id `pokerem`; README exactly matches local; all four widget entry bundles present; fonts embedded; no `navigator.locks` in JS; only CSS entry is the declared `snippet.css`. This ZIP is still marked 1.5.0 until T7.3 and is not the final release candidate.
- Runner: clean SIGINT returned 130, no orphan simulation workers on process readback. Exact-match cache smoke reused 1/1; a six-sample repeat reused 6/6 with 0.0 s simulation time (startup excluded). Invalidated caches are retained, never relabeled as current.

## Coverage and limits

| Required area | Current evidence | Acceptance |
|---|---|---|
| 1.4.1 / 1.5.0 saves | `release141Upgrade.test.ts`, `release160Upgrade.test.ts`; item/coin/owned Pokémon/IV/nickname/shiny/XP/Dex and repeated parse assertions | Automated tests pass; not a live user-save exercise |
| 1.3.1 legacy save | synthetic schema-3 regression in `saveCompatibility.test.ts` | Actual named 1.3.1 fixture is absent; historical-release coverage is incomplete |
| Scene / starter / over-cap | sceneMigration, starterBuddy, capacity tests | Automated checks pass |
| Invalid new fields | individual normalizers in persistence; some exercised by tests | Exhaustive junk input for every new field has not been demonstrated |
| Doubler concurrency / 175 cards | `singleWriter.test.ts`, fake storage/broadcast host | Tests pass; real hostsim concurrency not rerun |
| Rare rolls / team weights / Leader shiny / curve | rarity and Rocket tests | Unit sampling passes; not the required 100k-card reducer run at every pacing |
| Full 20-seed / 60-day matrix | inherited after-report is stale for repaired harness; new focused sample in evidence | Not complete; failures retained |
| Automatic grid search | runner evaluates selected constants and checkpoints samples | Not implemented; cannot claim computed search acceptance |
| Battle / Leader bands | `battleBalance.test.ts` covers wild/trainer balance | No separate measured Leader win-rate band / cadence / median first-shiny report yet |
| Source currency call sites | formatCoins unit coverage and inherited T0.4 audit | No fresh exhaustive raw-currency callsite audit yet |
| Hostsim new save to 300 / migrated save / doubler / full storage / Leader | earlier task board claims, not rerun on this continuation | Fresh usage verification open |
| Preview widths / reduced motion / console / all screens | managed browser policy denied localhost | Open; no alternate browser workaround attempted |
| Listing screenshots | visually read existing party, View all, Rocket prize PNGs | Images usable; no proof of latest full UI or public loading |
| Installed RemNote | none during continuation | Owner old-deck acceptance remains required; no live cards touched |

## Holds

T5.7 and T7.1 are not complete. See DECISIONS → Needs owner for inherited out-of-Appendix-T values and the capacity target conflict. The user has been asked about the inherited XP/lucky choices; no answer has arrived. Local release packaging may be prepared for review with these holds stated, but must not be presented as verified marketplace readiness.

The preserved parked patch has blank diff-context lines that `git diff --check` reports as trailing spaces. Do not strip those context markers or silently rewrite the owner's preserved patch; this is distinct from new source-code whitespace.
