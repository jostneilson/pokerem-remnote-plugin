# 1.6.0 progress

Status keys: `[ ]` todo · `[~]` in progress (only one) · `[x]` done (SHA + what was verified) · `[!]` blocked (reason).
Update this file before starting and after finishing every task. Commit it with the task.

## Current state

- Last finished: T0.6 (commit '1.6.0 T0.6')
- In progress: T0.7
- Next exact step: fix tier:'Common' on headline legendaries/mythicals in src/game/data/pokedex.ts (use classification); add __fixtures__/save-1.5.0.json from a late-game sim save + round-trip test
- Latest checks: 2026-11-04 baseline tsc clean, vitest 40 files / 251 tests green.

## Known issues

- Owner check in native RemNote (old testing deck): open the browser console, tap a few sidebar actions; there must be no "[PokéRem] The plugin host did not answer" warning. If there is, the fallback still saves correctly but the cross-iframe race protection is off on that host.

## Done log

| Task | Commit | Verified |
|---|---|---|
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
| [~] T0.7 | Legendary tier data fix; 1.5.0 save fixture plus tests. | Fixture round-trips. |

**Phase 1 — Rarity and encounters**

| Task | What |
|---|---|
| [ ] T1.1 | Per-encounter calibrated odds; pacing multiplier removed. |
| [ ] T1.2 | Galarian birds at 1/250 cards, with team weighting. |
| [ ] T1.3 | Wild legendary rate cut to ~1/2,500 cards; fix the uncaught-bias completeness check. |
| [ ] T1.4 | Wild level distribution (70/30). |
| [ ] T1.5 | Legendary catch curve, plus the trainer catch status multiplier. |
| [ ] T1.6 | Shinies protected after a faint. |

Each task's check: rarity sims within the C2 tolerances, plus unit tests.

**Phase 2 — Levelling**

| Task | What |
|---|---|
| [ ] T2.1 | XP Share and KO split. |
| [ ] T2.2 | Catch-up boost and tag. |
| [ ] T2.3 | `starterId` with backfill. |
| [ ] T2.4 | Buddy perks and badge. |
| [ ] T2.5 | Doublers apply to all XP sources, plus the doubler chip. |

Each task's check: unit tests; the level bands are checked in T5.

**Phase 3 — Team Rocket**

| Task | What |
|---|---|
| [ ] T3.1 | `rocket.ts`: 18 grunts, ace pools, share and type rotation. |
| [ ] T3.2 | Radar state and chip. |
| [ ] T3.3 | Leader battle. |
| [ ] T3.4 | Leader prize encounter: never flees, 1/5 shiny. |
| [ ] T3.5 | Shiny trainer Pokémon. |
| [ ] T3.6 | Rocket intro and prize reveal presentation. |

Each task's check: `rocket.test.ts`, plus a hostsim dev scenario.

**Phase 4 — Collection**

| Task | What |
|---|---|
| [ ] T4.1 | `transferPokemon` reducer, payout and XP. |
| [ ] T4.2 | Three-button card, Upgrade sheet, heal `+` on the HP bar. |
| [ ] T4.3 | Transfer confirm with warning chips. |
| [ ] T4.4 | View all grid: sort and filter. |
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

