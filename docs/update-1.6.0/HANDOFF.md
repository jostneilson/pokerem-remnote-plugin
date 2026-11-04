# 1.6.0 hand-off — start here

## LIVE STATE (2026-11-04 continuation; read this first)

- The original tuner PID 55610 completed normally (1099 s). A later owned run was cancelled under Jost's explicit permission; no job is active at this checkpoint. Preserve `.cache/balance/` (ignored checkpoints).
- Current 1.6.0 continuation repairs simulator recovery after protected-encounter wipes, daily milestone bookkeeping and prize/legendary counting. The runner now has focused flags, atomic source-keyed checkpoints, two bounded workers by default, clean cancellation and a truthful focused/full label. Full default now covers 20 seeds for every pacing, not only Medium.
- Latest checks: tsc pass; 53 test files / 337 tests pass; production build + ZIP pass after the inherited manifest description was shortened below 200 characters. These do NOT certify C2. `evidence/balance-focused-repaired.md` records failed late-income and rarity bands. BALANCE_REPORT is labeled as the older inherited full after-run until a new full matrix replaces it.
- T5.7 remains unresolved. Read DECISIONS → Needs owner: inherited XP damp / KO floor / lucky-odds choices exceed Appendix T; capacity timing conflicts with locked L13. Owner was asked about XP/lucky changes; no answer recorded here. No locked decision was changed by the continuation.
- Browser policy denied localhost access: fresh T7.1 / T6.7 visual checks and owner A17 review are unverified. Never bypass this via another browser surface.
- Next: keep failed acceptance visible while preparing the remaining local Phase 7 work; do not publish or assert release-ready. 1.6.1 files remain untouched by this continuation.

### Earlier mid-session LIVE STATE (historical; the continuation above supersedes run/status claims)

There are TWO worktrees now. Never mix them.

1. **1.6.0 release**: `.worktrees/update-next`, branch `update/next`. Phases 0-5 plus T6.1 (owner: finish every started area, leave unstarted features for 1.6.1).
   - Committed: everything up to `3ac8d2e 1.6.0 T6.1: Colour tokenisation pass`.
   - **Uncommitted T5.7 work in this worktree** (keep it, don't revert): the tuned constants in `src/game/balance.ts`, quest pay that grows with trainer level (`questLevelFactor`), the harness fixes, the test updates, `src/game/sim/balance.test.ts`, docs, README/CHANGELOG/manifest edits, WhatsNewCard, and the new screenshots. Final constants chosen: coins.review 6, defeatBase 30, defeatPerLevel 4, catchBase 2, catchPerLevel 0.5, quests scale 0.8 / growStart 0.4 / growFullLevel 20.
   - A full `balance-tune` "after" run may still be running or may have finished. It rewrites `BALANCE_REPORT.md`. The "before" report was saved outside the repo; the before numbers for Medium were: income-early ₽10714 FAIL, mix-battles 54% FAIL, bird 1/347, legendary 1/3821, storage-collector day 3.9 FAIL.
   - Next steps:
     1. Read the new BALANCE_REPORT.md. Add a short before/after table at its top: the after numbers come from the report, the before numbers are above.
     2. Known near-miss: mix-battles ≈ 50%, because every battle lever is at its Appendix T floor and defeatPerLevel 3 breaks the abuse band.
     3. Known conflict: storage-collector can't reach day 8-12 with storage locked at 60 (L4). Log both in DECISIONS T5.7 and tell the owner; don't change a locked decision.
     4. If bird or legendary still fail, investigate the harness (the reducer measured birds at 1/266).
     5. Tighten the `balance.test.ts` income-early guard to 7000-10000 if it passes.
     6. Run `npm run check-types`, `npm test` and `npm run build`, then commit `1.6.0 T5.7: ...`.
     7. Do Phase 7 (T7.1-T7.4) exactly as in PROGRESS.md. For T7.2, commit the screenshots first, then put that commit's full SHA in the README image URLs.
     8. NEVER push, tag or publish.
2. **1.6.1**: `.worktrees/update-1.6.1`, branch `update/1.6.1`, cut from 3ac8d2e. Its board is `docs/update-1.6.0/PROGRESS_1.6.1.md`.
   - T6.2-T6.6 are committed: 34df0f4, 8de6444, 185bc20, 3aa980d.
   - **T6.7 (A17 battle layout) is IN PROGRESS and uncommitted.** Done so far: `src/ui/battle/hudLayout.ts` (the geometry helper) and the A17 CSS at the end of `src/style.css` (`.pkr-hud-at-foe` / `.pkr-hud-at-ally`, notches, `--pkr-hud-foe-top` / `--pkr-hud-ally-top`).
   - Remaining:
     - In `BattleReviewSurface.tsx`, call `battleHudLayout({ layoutW, height: battleHeight, foeFeetShare: 0.58, foeSprite: spriteSize, allySprite: spriteSize * 1.3 })`.
       - Pass the scaled sprite sizes and `allyFeet` to `BattleField`. Its player sprite `top` uses `allyFeet` px while an encounter is on.
       - Set `--pkr-hud-foe-top` / `--pkr-hud-ally-top` (px) on the field root.
       - The wild plate gets className `pkr-hud-at-foe`; the player plate gets `pkr-hud-at-ally` when a wild is present (otherwise keep `left-1 top-1`).
       - Add a `tight` prop to `BattleHudPlate`: it hides the header, hides the foe's HP numbers and adds `pkr-battle-hud--tight`. Also set the `--pkr-hud-notch` inline style to the accent colour.
       - Show ♥ after your lead's name when it is the buddy.
     - Do the same in `TrainerBattleSurface.tsx`: field height 220, foe feet 64%, sprites 84/108. The `EnemyHudPlate` / `PlayerHudPlate` divs swap `left-1.5 top-1.5` / `bottom-1.5 right-1.5` for the anchor classes. The team-ball pips go on the foe box's second line.
     - Verify with preview captures (server `pokerem-161-preview`, port 8085) at 280, 320, 400 and 520 px, for scenarios `bounty`, `wild-shiny`, trainer `rocket` and `leader`. Every box must touch its own sprite, with no overlap and no horizontal scroll.
     - Run tsc, tests and build, then commit `1.6.1 T6.7: ...`.
   - After 1.6.0 is final: merge `update/next` into `update/1.6.1` and do the "Held back from 1.6.0" list in RELEASE_1.6.1.md. Then do the 1.6.1 release prep, including version 1.6.1 in all 4 places.

You are continuing the PokéRem **1.6.0** update. Implement it **exactly** as specified. No re-planning, redesign, renaming or scope cuts.

**Release split (owner, 2026-11-04):** 1.6.0 ships Phases 0–5, then Phase 7 release prep runs. Phase 6 (themes, teams, A17 battle layout) ships as **1.6.1** from the same SPEC; read `RELEASE_1.6.1.md`: it lists every Phase 6 task, everything held back from 1.6.0 and how to restore the parked T6.1 work (`parked/T6.1-token-pass.patch`). Nothing from the plan is dropped; 1.6.1 isn't done until every item there is ticked.

## Read in this order
1. `SPEC.md` — the binding spec (Parts A, B, C + appendices L locked decisions, T tunables, U UI specs, H themes, R Rocket, S save fields, N notes). Read all of it.
2. `OWNER_WORDS.md` — the owner's verbatim request and answers. The owner's words win over any paraphrase.
3. `PROGRESS.md` — what is done, what is in progress, the exact next step.
4. `DECISIONS.md` — choices already made while building. Follow them.

## Where things are
- Worktree: `/Users/jostneilson/Remnote Ankimon/remnote-plugin/.worktrees/update-next`, branch `update/next` (based on main at 1.5.0).
- Main checkout: `/Users/jostneilson/Remnote Ankimon/remnote-plugin` — **leave its untracked `AGENTS.md` alone**.
- Checks (run in the worktree): `npm run check-types`, `npm test`, `npm run build`. Full gate: `npm run release`.
- The worktree's `node_modules` is empty; binaries resolve from the parent checkout. Reliable form: `B=../../node_modules/.bin; $B/tsc -p .` and `$B/vitest run` (baseline 2026-11-04: 40 files, 251 tests green). Ad-hoc scripts: `cd "/Users/jostneilson/Remnote Ankimon/remnote-plugin" && npx vite-node <script.ts>` importing worktree files by absolute path.
- Servers (`.claude/launch.json` in the session folder): `pokerem-next-hostsim` (port 8084, real widgets in a RemNote-like host) and `pokerem-next-preview` (port 8083). Preview params: `?capture=1&width=280&screen=<screen>&scenario=<scenario>&reducedMotion=1`.
- Simulator: `src/game/sim/simulate.ts` (`simulate`, `withSeededRandom`); balance harness `src/game/sim/balance.ts` (from T0.6).

## Standing rules
- Never reset, lower or lose player progress. New save fields are optional + normalised (SPEC Appendix S). Keep `pokerem_game_v1_pre_v5` backup logic.
- One pixel font. Colours from `--pkr-*` tokens. Original art only (no copied game art, no Pokémon GO team names).
- Prettier style, **no trailing commas**, no `satisfies`. Match surrounding code and comment density.
- Commit locally after each finished task: message `1.6.0 Tn.m: <title>` ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Never push, tag or publish** — the owner does that.
- Native RemNote testing only on the owner's old testing deck.
- Version bump (T7.3) goes in 4 places: `public/manifest.json`, `package.json`, `package-lock.json`, `src/releaseMeta.ts`; `npm run version:check`.

## Resume procedure
1. `git status` and `git log --oneline -15` in the worktree.
2. Find the `[~]` task in PROGRESS.md. If the tree has uncommitted work for it, read the task's mid-task notes, finish it, or `git stash` it and redo cleanly.
3. Work tasks strictly in order. Before starting one: mark `[~]`, write "Next exact step". After: checks green + task's acceptance check, commit, mark `[x]` with SHA.
4. If something is unclear: pick the option most consistent with SPEC + OWNER_WORDS, log it in DECISIONS.md, continue. If it would visibly change gameplay versus SPEC, ask the owner.

## Quality bar
Every task meets its acceptance check, with tests where the spec names them, before it is ticked. UI tasks also need preview captures at 280/320/400/520px with no overflow.
