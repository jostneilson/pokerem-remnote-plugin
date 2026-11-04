# 1.6.0 progress

Status keys: `[ ]` todo · `[~]` in progress (only one) · `[x]` done (SHA + what was verified) · `[!]` blocked (reason).
Update this file before starting and after finishing every task. Commit it with the task.

## Current state

- Last finished: T5.6 (79ed7fe)
- T5.7: implementation checkpoint; acceptance blocked by the current full-matrix gap and Needs owner decisions. No task is represented as complete merely because tests pass.
- Release split (owner, 2026-11-04): ship 1.6.0 at the end of Phase 5 (Phase 7 runs next). Refined by the owner: finish every area already started, leave only unstarted features for 1.6.1. So T6.1 (colour tokens, already started) ships in 1.6.0; T6.2–T6.7 are 1.6.1.
- Next exact step: T7.3 local 1.6.0 version alignment and release build, still under T5.7/T7.1 review holds. Previous step: T7.1 verification recorded with holds; prepare T7.2 images/docs next while owner decisions remain pending. Earlier continuation step: T5.7: correct and verify the harness stalls/accounting, add resumable focused runs, then rerun the matrix; owner conflicts are recorded under DECISIONS → Needs owner. Earlier handoff step: T5.7: finish the full `balance:tune` (20 seeds), write BALANCE_REPORT, confirm `balance.test.ts` + full suite green, commit `1.6.0 T5.7`. Then Phase 7 (T7.1 → T7.4) for the 1.6.0 release. Listing screenshots for 1.6.0 are already captured into `public/assets/screenshots/` (listing-party, listing-view-all, listing-rocket-prize; uncommitted until T7.2); `scratchpad`-style README insertion is described in T7.2 notes.
- Latest checks: 2026-11-04 continuation: tsc clean, 53 files / 337 tests pass, production build/ZIP pass after shortening the manifest blurb. Runner cancellation exits 130 without orphan workers; cache smoke reuses 1/1; six unchanged full-day samples previously reused 6/6. No current full-matrix or fresh browser acceptance.

## Known issues

- Owner check in native RemNote (old testing deck): open the browser console, tap a few sidebar actions; there must be no "[PokéRem] The plugin host did not answer" warning. If there is, the fallback still saves correctly but the cross-iframe race protection is off on that host.

## Done log

| Task | Commit | Verified |
|---|---|---|
| T5.6 | 79ed7fe | 321 tests (powerUp test uses powerUpCost); build OK |
| T5.5 | 854d662 | rewards.test.ts (achievement ₽500 transfer1; levels to 10 pay Σ250×lv once + 1 voucher, idempotent); 321 tests; build OK |
| T5.4 | acb24ce | research.test.ts (baseline, step advance, claim ₽15k → next line, round-trip, team bird spawns); 319 tests; preview 320 panel |
| T5.3 | c97948a | rewards.test.ts (first defeat ×3/₽500 then normal; first catch ₽500; day-7 streak ₽5k + Rare Doubler + notice); 316 tests; preview 280: Today ticks + streak, no h-scroll |
| T5.2 | e1cc0d9 | rewards.test.ts (rate 1/40, range, paid on defeat+catch, round-trip); preview 320: BOUNTY ₽2.4k chip on plate; lucky chip code-reviewed (fires on new lastStudyReward.seq, needs live card) |
| T5.1 | f4c9b5f | 311 tests; defeat/catch formulas asserted in userRequestsV5; build OK |
| T4.7 | 6ea89b6 | capacity.test.ts 7 tests (blocked catch keeps ball, shiny/Mewtwo pass, bag-full → ₽ at 50%); preview: 'Storage full · Transfer' opens Party; 311 tests green, build OK; sims gate catches on storage |
| T4.6 | f800933 | capacity.test.ts (5); preview: Storage 520/70 red meter (grandfathered), Bag 22/220, upgrade rows ₽8.0k/₽6.0k, no h-scroll |
| T4.5 | 37be92f | preview: select mode, keep-best picks 421, bulk Transfer opens one confirm with totals |
| T4.4 | 37be92f | preview 280/320/400: 520 tiles, ~21-30 rendered, sort/filter, tap opens detail, no h-scroll; collectionGrid.test.ts |
| T4.3 | 6bcfc3a | preview: Transfer confirm shows payout + copy; Esc closes; warnings unit-tested |
| T4.2 | 6bcfc3a | preview 320px: three buttons, + heal, Upgrade sheet opens (Power Up / Tutor) |
| T4.1 | c557d21 | transfer.test (5): payout, Common<100, XP split, guards, warnings, buddy end; 301 tests |
| T3.6 | ee5f71d | preview: grunt intro (reduced motion clears at 1s), leader win -> See the Leader's prize, prize PRIZE badge + 2-tap give up; 296 tests, build OK |
| T3.2 | ee5f71d | Radar chip on Play + Trainer; preview checked |
| T3.5 | 97001c9 | buildEnemyForDex 1/250 shiny; trainerEnemyAsEncounter keeps shiny |
| T3.4 | 97001c9 | rocket.test: prize pendingPrize, never flees/KO, reload, shiny 20%±2 |
| T3.3 | 97001c9 | rocket.test: leader after 5 wins, elite, avg+4, loss keeps leaderReady |
| T3.1 | 97001c9 | rocket.test (8): teams, aces, rotation, ace-only catch |
| T2.5 | 3141bec | type-share doubled test; chip checked in preview at 280px (wraps, no overflow); build OK |
| T2.4 | 91ed5da | combatV5 buddy accuracy test; xpShare buddy mult; 287 tests. Battle HUD ♥ comes with T6.7 |
| T2.3 | eae52a9 | starterBuddy.test: choose, evolve, backfill, re-pick, none |
| T2.2 | eae52a9 | catchUpMult unit test; tag on party card |
| T2.1 | eae52a9 | xpShare.test, collectionV5/userRequestsV5 updated; 286 tests |
| T1.6 | 68c4ffc | shiny.test: shiny wild stays after lead faint, regular flees |
| T1.5 | 68c4ffc | L6 curve unit points; preview + trainer path; 279 tests, tsc, build green |
| T1.4 | commit '1.6.0 T1.1–T1.4' | levels: whole-party mean, never above avg, ~70% within 3 below (rarity.test.ts); old tests updated to the new rules |
| T1.3 | commit '1.6.0 T1.1–T1.4' | rarity.test.ts: per-encounter odds fixed at any pacing, birds 1.2%/enc after 100 cards, team 50/25/25 ±2%, bird shiny 25% ±2%, wild legendaries ≈0.12%; 44 files/275 tests |
| T1.2 | commit '1.6.0 T1.1–T1.4' | rarity.test.ts: per-encounter odds fixed at any pacing, birds 1.2%/enc after 100 cards, team 50/25/25 ±2%, bird shiny 25% ±2%, wild legendaries ≈0.12%; 44 files/275 tests |
| T1.1 | commit '1.6.0 T1.1–T1.4' | rarity.test.ts: per-encounter odds fixed at any pacing, birds 1.2%/enc after 100 cards, team 50/25/25 ±2%, bird shiny 25% ±2%, wild legendaries ≈0.12%; 44 files/275 tests |
| T0.7 | commit '1.6.0 T0.7' | species tier derived from classification (27 fixed); save-1.5.0.json fixture (1,500 cards, 282 in storage, shiny, doublers) round-trips intact; tsc, 44 files/270 tests, build green |
| T0.6 | commit '1.6.0 T0.6' | harness runs 6 policies × 3 pacings with a sim clock; quick report generated; baseline saved as BALANCE_BASELINE_1.5.0.md |
| T0.5 | commit '1.6.0 T0.5' | balance.ts + rarity.ts hold today's values; reducers read them; 43 files/266 tests unchanged and green |
| T0.4 | commit '1.6.0 T0.4' | coins.test.ts (999/1.0k/1.5k/15k/152k/1.2M, negatives, exact); grep finds no raw ₽ renders left |
| T0.3 | commit '1.6.0 T0.3' | sceneMigration.test.ts: 50x parse stable for all 19 scenes, legacy remap once, 300 cards no arena change without spawn, areas 5–8, ticket biome |
| T0.2 | 4d3bb26 | singleWriter.test.ts (7) green; hostsim: starter pick via host in 52ms, doubler kept across 12 overlapping reviews; 41 files/258 tests |

## Task board

**Phase 0 — Foundation**

| Task | What | Acceptance check |
|---|---|---|
| [x] T0.1 (57d9151) | Create the 5 hand-off files from this plan; capture the owner's verbatim text from the transcript. | Files exist; SPEC covers every A/B/C item. |
| [x] T0.2 (4d3bb26) | Single-writer command channel: sidebar, popup and strip actions route to the index host. | `singleWriter.test.ts` passes; manual hostsim check that no action is lost. |
| [x] T0.3 (commit '1.6.0 T0.3') | Scene migration fix (`sceneIndexVersion`), plus `area` state and the area chip. | `sceneMigration.test.ts`; parse 50× is stable. |
| [x] T0.4 (commit '1.6.0 T0.4') | `formatCoins` adopted at every call site. | Unit tests at 999, 1,000, 1,550, 15,200 and 1.2M; grep finds no raw currency renders. |
| [x] T0.5 (commit '1.6.0 T0.5') | `balance.ts` and `rarity.ts` holding today's values; no behaviour change. | Existing tests unchanged and green. |
| [x] T0.6 (commit '1.6.0 T0.6') | Balance harness with 6 policies, plus a `balance:tune` script producing BALANCE_REPORT. | Report generated. |
| [x] T0.7 (commit '1.6.0 T0.7') | Legendary tier data fix; 1.5.0 save fixture plus tests. | Fixture round-trips. |

**Phase 1 — Rarity and encounters**

| Task | What |
|---|---|
| [x] T1.1 (commit '1.6.0 T1.1–T1.4') | Per-encounter calibrated odds; pacing multiplier removed. |
| [x] T1.2 (commit '1.6.0 T1.1–T1.4') | Galarian birds at 1/250 cards, with team weighting. |
| [x] T1.3 (commit '1.6.0 T1.1–T1.4') | Wild legendary rate cut to ~1/2,500 cards; fix the uncaught-bias completeness check. |
| [x] T1.4 (commit '1.6.0 T1.1–T1.4') | Wild level distribution (70/30). |
| [x] T1.5 (68c4ffc) | Legendary catch curve, plus the trainer catch status multiplier. |
| [x] T1.6 (68c4ffc) | Shinies protected after a faint. |

Each task's check: rarity sims within the C2 tolerances, plus unit tests.

**Phase 2 — Levelling**

| Task | What |
|---|---|
| [x] T2.1 (eae52a9) | XP Share and KO split. |
| [x] T2.2 (eae52a9) | Catch-up boost and tag. |
| [x] T2.3 (eae52a9) | `starterId` with backfill. |
| [x] T2.4 (91ed5da) | Buddy perks and badge. |
| [x] T2.5 (3141bec) | Doublers apply to all XP sources, plus the doubler chip. |

Each task's check: unit tests; the level bands are checked in T5.

**Phase 3 — Team Rocket**

| Task | What |
|---|---|
| [x] T3.1 (97001c9) | `rocket.ts`: 18 grunts, ace pools, share and type rotation. |
| [x] T3.2 (ee5f71d) | Radar state and chip. |
| [x] T3.3 (97001c9) | Leader battle. |
| [x] T3.4 (97001c9) | Leader prize encounter: never flees, 1/5 shiny. |
| [x] T3.5 (97001c9) | Shiny trainer Pokémon. |
| [x] T3.6 (ee5f71d) | Rocket intro and prize reveal presentation. |

Each task's check: `rocket.test.ts`, plus a hostsim dev scenario.

**Phase 4 — Collection**

| Task | What |
|---|---|
| [x] T4.1 (c557d21) | `transferPokemon` reducer, payout and XP. |
| [x] T4.2 (6bcfc3a) | Three-button card, Upgrade sheet, heal `+` on the HP bar. |
| [x] T4.3 (6bcfc3a) | Transfer confirm with warning chips. |
| [x] T4.4 (37be92f) | View all grid: sort and filter. |
| [x] T4.5 (37be92f) | Multi-select and bulk bar. |
| [x] T4.6 (f800933) | Capacity caps, meters, upgrades, grandfathering. |
| [x] T4.7 (6ea89b6) | Full-storage catch flow and bag-full ₽ conversion. |

Each task's check: `transfer.test.ts`, `capacity.test.ts`, preview captures.

**Phase 5 — Economy and rewards**

| Task | What |
|---|---|
| [x] T5.1 (f4c9b5f) | All rewards routed through `balance.ts` with the C2 formulas. |
| [x] T5.2 (e1cc0d9) | Lucky flourish and bounties. |
| [x] T5.3 (c97948a) | Daily firsts and streak. |
| [x] T5.4 (acb24ce) | Research lines. |
| [x] T5.5 (854d662) | Achievement and trainer-level payouts; new achievements. |
| [x] T5.6 (79ed7fe) | Price retune. |
| [!] T5.7 (b63b5b2 checkpoint; not accepted) | Run `balance:tune`, commit the constants, `balance.test.ts` green, BALANCE_REPORT all pass. |

**Phase 7 — Release prep (1.6.0 = Phases 0–5)**

| Task | What |
|---|---|
| [!] T7.1 | Full Verification pass (below), with results logged. |
| [x] T7.2 (129a6dd screenshots; docs follow-up) | CHANGELOG, README and manifest, new screenshots. |
| [x] T7.3 (4e5a153) | Version 1.6.0 in all 4 places; `npm run release`. |
| [x] T7.4 (handoff complete; release holds remain) | Final hand-off update: "Ready for owner review; nothing pushed". |

**Phase 6 — Teams and themes (moved to 1.6.1, after the 1.6.0 release)**

Full 1.6.1 checklist: `RELEASE_1.6.1.md`. WIP for T6.1 is saved as `parked/T6.1-token-pass.patch` (also in `git stash` as "1.6.1 T6.1 token pass (WIP)" ; style.css, collection.css and ten TSX files: surface hex → `--pkr-*` tokens, inline text inks → `--pkr-ink-*`). Also for 1.6.1: restore the `theme1`/`theme18` achievements (removed from `ACHIEVEMENT_DEFS` for 1.6.0, see the comment there) and the "Theme voucher" line on level-up notices (`core.ts`); vouchers already accrue in 1.6.0. Version 1.6.1 in all 4 places at its release.

| Task | What |
|---|---|
| [x] T6.1 (3ac8d2e) | Colour tokenisation pass, done screen by screen with sub-checklists. **Ships in 1.6.0** (started before the split; scope in DECISIONS T6.1). Committed with T5.7 work separately as `1.6.0 T6.1`. |
| [ ] T6.2 | ThemeProvider (root, portals, strip, popup). |
| [ ] T6.3 | 18 themes per the SPEC table, contrast-checked. |
| [ ] T6.4 | Theme shop tab and live preview. |
| [ ] T6.5 | Theme ×1.25 bonus hook. |
| [ ] T6.6 | Team pick onboarding and the one-time prompt for existing saves. |
| [ ] T6.7 | Battle arena layout redo (A17): wild and trainer surfaces, all breakpoints, checked against every theme. Check: the A17 preview captures. |


## Continuation checkpoint (2026-11-04)

- Preserved every inherited change and both worktrees. Original balance PID 55610 exited normally; its full after-report took 1099 s. A subsequent owned run was stopped under the owner's explicit permission; completed samples remain in ignored `.cache/balance/`. Cancellation now forwards to owned workers and has been tested. No run is active at this checkpoint.
- Runner changes and verified harness repairs are in `scripts/balance-tune.ts`, `src/game/sim/balance.ts` and `balance.test.ts`. Full default = all six policies × all three pacings × 20 seeds × 60 days; focused flags are documented in the script. Cache fingerprints deliberately change after runner/game/lockfile changes.
- Green gates are not all-band acceptance. T5.7 remains [!] until the current full report and out-of-Appendix-T choices are resolved. Full automatic grid-search tuning is still absent and explicitly disclosed by the runner.
- T7.1 responsive/hostsim and T6.7 visual checks cannot be completed through the current browser: managed policy denied localhost access. Existing three listing images were visually read; they do not prove today's responsive or interactive behavior.
- Next: proceed to unblocked Phase 7 preparation, keeping release holds; do not claim native/visual acceptance. No push, tag, publish, reset, stash, or root AGENTS edit.

- T7.3: all four version sources align on 1.6.0; `npm run release` exit 0 (337 tests, types, version check, listing check, validation, production build, ZIP). ZIP manifest/README/three new screenshots read back against source. This is a candidate under the T5.7/T7.1 holds, not publication acceptance.

- T7.4: handoff updated with exact ZIP digest, local commits, stale/full report boundary, owner holds and the stopped Claude session’s newer A17 edits. Phrase “ready for owner review” does not waive T5.7/T7.1.
