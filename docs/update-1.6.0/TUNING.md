# Balance tuning and verification

Worktree: `update-next`. All commands below run there using the parent checkout's installed tools.

## Search, without editing game constants

```sh
../../node_modules/.bin/vite-node scripts/balance-tune.ts --grid=docs/update-1.6.0/economy-grid.json --seeds=1 --jobs=2 --output=.cache/balance/economy-search.md
```

This evaluates a four-candidate cartesian grid over review coins (6 / 10) and quest scale (0.6 / 0.8). It defaults to sixty days, Medium, keep-team/fighter/farmer. A single seed is an initial search, not final acceptance; validate the selected values on other seeds before applying them. The grid includes the unchanged baseline and uses identical seeds for every candidate. No source files, player saves, rates, capacity, XP curve or locked parameters are edited by a search.

`src/game/sim/tuning.ts` whitelists numeric Appendix T axes with their ranges. It also validates catch < defeat at every level, validates Leader min/max order, bounds the grid to 64 candidates including baseline, and restores in-process constants and shop reward aliases in `finally`. Every job gets a separate process. A fixed or unlisted parameter is rejected. Inherited out-of-spec choices remain owner holds; running a search does not approve them.

The score sums failures plus normalized out-of-range distance for progression, income mix, income, variance and abuse. It does not optimize immutable rarity or capacity targets by selecting favorable random rolls. All measured failures remain in the report. If required scoring metrics were not sampled, the report gives no recommendation.

## Full verification

```sh
../../node_modules/.bin/vite-node scripts/balance-tune.ts --jobs=2
```

Full default: six policies × three pacings × twenty seeds × sixty days × one hundred cards/day. The default full report is `BALANCE_REPORT.md`; partial runs go to ignored `.cache/balance/FOCUSED_REPORT.md`, and searches to `.cache/balance/SEARCH_REPORT.md`. New metric coverage includes first ordinary shiny median, Leader attempt cadence and win rate, ordinary-fighter turns/faints, all-trainer win rate, keep-team and collector storage pressure, actual money spent by action source, and base card-trickle share.

Seed samples live in `.cache/balance/<source fingerprint>/`, keyed by candidate, pacing, policy, seed and days. Complete samples are written atomically. Repeating identical inputs reuses them; changing source, runner, lockfile or Node version invalidates reuse. Preserve old directories as historical data. SIGINT/SIGTERM stops owned child processes and preserves complete checkpoints. Never terminate another session's job without owner authorization.

Useful flags: `--quick`, `--policies=...`, `--pacings=...`, `--seeds=...`, `--days=...`, `--jobs=1..4`, `--output=...`, `--cache-dir=...`, `--fresh`, `--help`. Unknown/incomplete flags fail early. `--quick` is not full acceptance.

## Acceptance boundaries

A completed report is not necessarily a passing report. Do not relax locked decisions or hide failing/unsampled bands. Compare current source, full results and SPEC; then commit selected permitted constants and update DECISIONS/PROGRESS with real results. Types, all tests and build must pass before a task commit. Fresh browser/hostsim/native acceptance is a separate gate; it remains unavailable under the current managed browser policy.
