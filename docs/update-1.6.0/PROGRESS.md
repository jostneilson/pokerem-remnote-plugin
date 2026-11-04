# 1.6.0 progress

Status keys: `[ ]` todo · `[~]` in progress (only one) · `[x]` done (SHA + what was verified) · `[!]` blocked (reason).
Update this file before starting and after finishing every task. Commit it with the task.

## Current state

- Last finished: T4.3 (6bcfc3a)
- In progress: T4.4
- Next exact step: T4.4: src/ui/screens/CollectionGridScreen.tsx per U4 (windowed grid, sort/filter/search), opened from a 'View all' button in the Party header; then T4.5 select mode + bulk bar (U5)
- Latest checks: 2026-11-04 after Phase 3: tsc clean, vitest 296 tests, build OK.

## Known issues

- Owner check in native RemNote (old testing deck): open the browser console, tap a few sidebar actions; there must be no "[PokéRem] The plugin host did not answer" warning. If there is, the fallback still saves correctly but the cross-iframe race protection is off on that host.

## Done log

| Task | Commit | Verified |
|---|---|---|
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
| [~] T4.4 | View all grid: sort and filter. |
| [ ] T4.5 | Multi-select and bulk bar. |
| [ ] T4.6 | Capacity caps, meters, upgrades, grandfathering. |
| [ ] T4.7 | Full-storage catch flow and bag-full ₽ conversion. |

Each task's check: `transfer.test.ts`, `capacity.test.ts`, preview captures.

**Phase 5 — Economy and rewards**

| Task | What |
|---|---|
| [ ] T5.1 | All rewards routed through `balance.ts` with the C2 formulas. |
| [ ] T5.2 | Lucky flourish and bounties. |
| [ ] T5.3 | Daily firsts and streak. |
| [ ] T5.4 | Research lines. |
| [ ] T5.5 | Achievement and trainer-level payouts; new achievements. |
| [ ] T5.6 | Price retune. |
| [ ] T5.7 | Run `balance:tune`, commit the constants, `balance.test.ts` green, BALANCE_REPORT all pass. |

**Phase 6 — Teams and themes**

| Task | What |
|---|---|
| [ ] T6.1 | Colour tokenisation pass, done screen by screen with sub-checklists. |
| [ ] T6.2 | ThemeProvider (root, portals, strip, popup). |
| [ ] T6.3 | 18 themes per the SPEC table, contrast-checked. |
| [ ] T6.4 | Theme shop tab and live preview. |
| [ ] T6.5 | Theme ×1.25 bonus hook. |
| [ ] T6.6 | Team pick onboarding and the one-time prompt for existing saves. |
| [ ] T6.7 | Battle arena layout redo (A17): wild and trainer surfaces, all breakpoints, checked against every theme. Check: the A17 preview captures. |

**Phase 7 — Release prep**

| Task | What |
|---|---|
| [ ] T7.1 | Full Verification pass (below), with results logged. |
| [ ] T7.2 | CHANGELOG, README and manifest, new screenshots. |
| [ ] T7.3 | Version 1.6.0 in all 4 places; `npm run release`. |
| [ ] T7.4 | Final hand-off update: "Ready for owner review; nothing pushed". |

