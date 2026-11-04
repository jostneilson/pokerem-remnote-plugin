# 1.6.0 hand-off — start here

## LIVE STATE (2026-11-04 continuation; read this first)

- **17:50 local (Claude resumed):** 1.6.1 T6.7 (A17 layout) is committed in `update-1.6.1` as `2af3240` (358 tests pass; boxes measured inside the field at 280/320/400/520 for wild-shiny, bounty, Rocket grunt and Leader). The 1.6.1 Phase 6 board is complete apart from the post-1.6.0 merge and the held-back items in RELEASE_1.6.1.md. Claude is now running the T5.7 money search in `.cache/balance/grid3*`.

- Latest continuation: bounded automatic grid search implemented in `sim/tuning.ts` / `balance-tune.ts --grid=FILE`; fixed keys/ranges rejected, candidate/source-keyed checkpoints, captured coin aliases patched only inside worker memory and restored in finally. Missing metrics forbid recommendations. Added first-shiny/Leader/combat/keep-team capacity measurements. Latest gates: tsc, 54 files / 344 tests, production build pass. No candidate has been applied; the real search and full matrix remain pending.

**1.6.0 ready for owner review; nothing pushed. This is a held candidate, NOT full release acceptance.**

- Worktree `update-next`, branch `update/next`. Local checkpoints: `b63b5b2` T5.7 WIP, `e1d0ff2` T7.1 evidence, `129a6dd` listing images, `dfafc15` T7.2 listing docs, `4e5a153` T7.3 version/release gate. T5.7 and T7.1 remain unresolved; no scope was waived.
- All four version sources are **1.6.0**. `npm run release` exit 0: version alignment, types, 53 files / 337 tests, local listing validation, production build and ZIP. ZIP `PluginZip.zip`: 13,021,686 bytes, SHA256 `42cd5c3e035a72e7e6e0f2fee4c1006a588ff5c0ac8181f41ac597edc2b6c6f6`. Manifest, README and three new screenshots read back against source. Two Webpack size warnings remain.
- The new image URLs point to local screenshot commit `129a6dd3f0daff5174281288375e2e20b38fca74`. The bytes match that Git object. Public loading is unverified and cannot be claimed until the owner publishes the exact commit; no remote writes were made.
- Original tuner PID 55610 finished normally (1099 s). A later owned run was cancelled under Jost's explicit permission; no balance job is active at this checkpoint. Preserve ignored `.cache/balance/` samples. Current runner has source-keyed atomic checkpoints, focused runs, two workers by default, and tested clean cancellation. Default full verification is six policies × three pacings × twenty seeds × sixty days. It verifies chosen values; --grid now performs bounded automatic search (see TUNING.md).
- Harness repairs: revive through the real existing action after protected-encounter wipes; count all daily milestone payouts; exclude Leader prizes from wild-legendary counts. `evidence/balance-focused-repaired.md` records the subsequent sample and its failures. BALANCE_REPORT is explicitly marked as the older inherited full after-run, not current acceptance. Run the full current matrix before accepting T5.7.
- Read DECISIONS → Needs owner: inherited XP damp / KO floor / lucky-odds choices exceed Appendix T; storage timing conflicts with locked L13; income and abuse measurement interpretations need acceptance. Owner was asked about XP/lucky choices; no reply recorded. No locked decision was changed by this continuation.
- `VERIFICATION.md` records missing 100k-card reducer sims, actual 1.3.1 fixture, exhaustive new-field junk checks, Leader metrics, and fresh usage/visual evidence. Managed browser policy denied localhost; no alternate-browser workaround was attempted. Old-deck native RemNote acceptance remains with the owner.
- 1.6.1 `update/1.6.1`: additional inherited A17 edits appeared during takeover, beyond the initial handoff. Claude's latest transcript ended with a session-limit message at 20:33:42Z, so it is stopped. Preserve its changed BattleField/BattleHudPlate/BattleReviewSurface/TrainerBattleSurface/style.css and hudLayout.ts. This continuation has not edited that worktree yet. Reread actual files; do not implement the earlier bullet list from scratch.
- Next exact step at local HEAD `bcda76a`: run the implemented four-candidate economy search from TUNING.md, inspect the recommendation without waiving owner holds, then run the selected permitted constants through the current full 360-sample matrix. No process is active as of the 14:58 local readback. Preserve owner holds and browser restrictions. Only after 1.6.0 acceptance, resume the preserved T6.7 edits and fresh visual acceptance in 1.6.1. No merge, reset, stash, push, tag or publication. Root untracked AGENTS.md remains untouched.

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
