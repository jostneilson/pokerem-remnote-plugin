# 1.6.1: what is still owed (nothing from the plan is dropped)

The owner split the release on 2026-11-04 (verbatim words in `OWNER_WORDS.md`):

- **1.6.0** ships Phases 0–5 plus the Phase 7 release prep.
- **1.6.1** ships everything below.

Phase 6 is the same work, built to the same `SPEC.md`. Nothing about it is re-planned or cut. Every item here must be done, and verified, before 1.6.1 is released.

## Order of work after 1.6.0 is released

1. **Start from the released code.**
   - Start from `update/next` after the owner has published 1.6.0. Branch or continue as the owner says.
   - Keep `docs/update-1.6.0/` as the hand-off folder. SPEC, PROGRESS and DECISIONS stay binding.
2. **Restore the parked work.**
   - Restore it with `git apply docs/update-1.6.0/parked/T6.1-token-pass.patch`. It was checked to apply cleanly at the split.
   - If the files have moved on, re-apply it by hand.
   - The same work is also in the local git stash "1.6.1 T6.1 token pass (WIP)". The patch file is the durable copy.
3. **Do T6.1 to T6.7** in PROGRESS order, ticking each with its SHA.
   - Commit messages stay `1.6.0 Tn.m: …` so the task ids match SPEC.
   - Alternatively use `1.6.1 Tn.m: …`; either is fine, but log the choice in DECISIONS.
4. **Run the 1.6.1 release prep** (the Phase 7 equivalent, below).

## Phase 6 tasks (SPEC references)

| Task | What | SPEC |
|---|---|---|
| T6.1 | **Done in 1.6.0** (owner: finish started areas). Already-tokenised: surface and ink colours; see DECISIONS T6.1 for what stays fixed. Original task: **Colour tokenisation.** Finish what the patch starts. Every surface colour goes through `--pkr-*` tokens, screen by screen: Play, battle, Party, View all, Bag, Shop, Trainer/Progress, Settings, modals, queue strip, popup. No new inline hex. | A12 "Theming plumbing", U (tokens) |
| T6.2 | **`ThemeProvider` and `src/ui/theme/themes.ts`.** Sets `pkr-theme-<type>` on the sidebar root, on `document.body` (for portaled modals), the queue strip and the popup. `battleAmbienceCssVars` keeps the arena's own colours. | A12 |
| T6.3 | **The 18 themes.** Each one per the Appendix H table: tokens, original pattern and ambient layer. Reduced motion turns the ambient layer off. Contrast must meet AA for body text (C5). | H, A12, C5 |
| T6.4 | **Theme shop tab with live preview.** 15 s try-on with a countdown chip, Buy at ₽45k (tunable 35–60k), Equip / Unequip. A "Default arcade" card comes first and is always owned. Uses the `themesOwned` / `themeActive` save fields. Make **theme vouchers** spendable (planned value: 20% off one theme; log the final value in DECISIONS). | U11, L12, S, B5 |
| T6.5 | **Theme bonus.** With a theme equipped, a catch or defeat of that type gives ×1.25 ₽ and ×1.25 XP (trainer XP plus type-share to every owned Pokémon of the type). Shown as a "Fire theme ×1.25" tag on the result card. | A12, L12 |
| T6.6 | **Team pick.** `TeamPickScreen` (Ember / Tide / Volt, original crests, flavour lines, team colours, confirm "This can't be changed") comes first in onboarding: team, then starter, then difficulty. Existing saves get a one-time prompt (`teamPrompted`). Add the team colour accent on the trainer card and header, and the team badge. Bird weighting stays secret. | A13, U10, L11, S |
| T6.7 | **Battle layout redo (A17).** Each info box sits with its own Pokémon: the foe box above the foe sprite, your box below your lead, each with a pointer notch, and no cross-overs. Applies to wild and trainer battles at 280, 320, 400 and 520 px, in every theme. Includes the ♥ Buddy mark in your HUD box. Check it with preview captures of wild, shiny wild, trainer 3-on-3 and Rocket Leader. | A17, U16 |

## Held back from 1.6.0, to restore in 1.6.1

- **Achievements `theme1` and `theme18`.**
  - Fresh Look: buy a theme (uncommon). Every Colour: own all 18 (epic).
  - They were removed from `ACHIEVEMENT_DEFS` at the comment in `src/game/engine/achievements.ts`.
  - The definitions are in git history at the T5.5 commit (854d662). Restore them as they were.
- **The "Theme voucher" part of the level-up notice subtitle** in `src/game/state/reducers/core.ts` (`appendMainNoticesIfNeeded`, the trainer-level reward notice). Vouchers already accrue in 1.6.0 at levels 10/20/30/40/50, so existing players keep every voucher they earned.
- **The team-bird research line** ("A Legend Takes Wing"). It needs a team, so it starts appearing once T6.6 lands. No code change is needed; check it in T7.1.
- **C2 band "a theme in ≤ 6 days".** Add a theme-affordability band to the harness once `THEME_PRICE` exists, and check it in BALANCE_REPORT.

## 1.6.1 release prep (same as Phase 7)

**Verification.** Repeat the Phase 6 items in the plan's Verification section:
- Host simulator: a fresh save goes through team, then starter, then difficulty.
- A 1.6.0 save gets the one-time team prompt, then plays on.
- Preview every theme on Play, Party, View all, Shop and the modals, at 280, 320, 400 and 520 px and with reduced motion.
- Check team pick, the A17 captures, no horizontal overflow, and AA contrast.
- Types, tests and build all green.

**Docs.**
- CHANGELOG `[1.6.1]`.
- README and manifest blurb.
- New pinned screenshots (B11): themes and team pick. Also take any 1.6.0 screenshots that were deferred.

**Release.**
- Version 1.6.1 in all 4 places, then `npm run release`.
- Never push, tag or publish; the owner does that.
- Final hand-off line: "1.6.1 ready for owner review; nothing pushed".
