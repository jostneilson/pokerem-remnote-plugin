# 1.6.0 hand-off — start here

You are continuing the PokéRem **1.6.0** update. Implement it **exactly** as specified. No re-planning, redesign, renaming or scope cuts.

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
