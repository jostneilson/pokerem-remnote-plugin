# PokéRem 1.6.0 — binding specification

> This is the single source of truth for the 1.6.0 update. It was approved by the owner on 2026-11-04.
> Hand-off agents implement it **exactly**. Do not redesign, rename, drop or "simplify" anything here.
> The owner's own words are in `OWNER_WORDS.md` (verbatim). Where this spec and the owner's words seem to differ,
> the owner's words win: log the conflict in `DECISIONS.md` and ask the owner if gameplay would visibly change.

## Context

1.5.0 is out. This update covers three things:
- the full list you gave me
- the clarifying answers you picked
- my own additions, from a play-and-code review of 1.5.0

Your direction: **Pokémon GO's loop (catch, transfer, power up, teams, raids/Rocket, research), driven by flashcards instead of walking: quick, one-tap, never distracting.**

What the review found:

**Arena changes every card (bug).**
- `parseGameStateCore` runs `normalizeBattleSceneIndex` (`persistence.ts:756`) on every save read.
- That function is an old "Desert removed" one-off migration that shifts indexes 10–18 down by one, so the arena steps once per card.

**Levelling is far too fast.**
- Party is Lv 26–30 at 500 cards, ~50 at 1,000, and 64–75 at 1,500.
- The lead earns about 2× the bench's study XP plus all fight XP, so new higher-level catches always beat your old team.

**Money is meaningless.**
- About ₽310k earned in 1,500 cards, with ₽150k+ never spent.
- Rewards are flat (catch is always ₽100), and achievements pay no coins.

**Rare odds run backwards.**
- `shinyOddsForPacing` raises per-encounter odds at slow pacing. Hard pacing gets 1/75, the opposite of what you want.
- 27 headline legendaries are tagged `tier:"Common"`, so they lose their label and the ×3/×5 KO XP.
- The uncaught bias never switches off, because Dex completeness counts legendaries.

**XP Doubler "vanishes".**
- The index host (`pipeline.ts:88`) and the sidebar (`pokerem_sidebar.tsx:303`) are separate iframes, and the write lock only works inside one iframe.
- When the two write at the same moment, one overwrites the other. You can lose a doubler activation, or any other sidebar action.
- Doublers also tick on paused cards, and type-share XP is never doubled.

**Other gaps.**
- Party and storage are uncapped.
- Transfer (Release) pays nothing.
- There's no owned-Pokémon grid and no multi-select.
- Rocket is just a Poison/Dark trainer skin.
- Trainer Pokémon can't be shiny.
- A non-legendary shiny is lost if your lead faints.
- There's no theme system: `#101326` and `#65709a` are hard-coded about 28 times, plus inline hex values in TSX.
- The starter isn't recorded anywhere.

**Your decisions so far:**
- Rare odds: calibrated as "1 in 250 cards at Medium", so slower pacing means fewer rarities.
- The 2% → 25% catch curve applies to legendary-class Pokémon only.
- Transfer is permanent, with a confirm step.
- Wild rares become much rarer; Rocket is the reliable source.
- Arena areas last several encounters.
- Full storage blocks catching and offers a quick transfer. Shinies and legendaries always get through.
- Existing players get a one-time team prompt.
- Themes are premium shop goals.

**Hard rules:**
- No progress is ever reset or lowered.
- Saves load forward.
- One pixel font.
- One-tap actions.
- Original art only.
- Defeating pays more than catching.
- Generous but meaningful money.

The version is **1.6.0**. Work happens on `update/next` in `.worktrees/update-next`.

---

## Part A — Your requests

### A1. Arena only changes after encounters, in "areas"
- **Fix the bug.** Add `sceneIndexVersion: 2` to state.
  - `normalizeBattleSceneIndex` remaps only saves without the flag. After that it just clamps to 0–18.
  - `routeFinds.ts:31` drops its third normalisation.
  - Add a regression test that parses the same save 50 times and checks the index never changes.
- **Areas.** New `area: { sceneIndex, encountersLeft }`.
  - The arena changes only when an encounter is *resolved* (caught, defeated, ran or fled) **and** `encountersLeft` hits 0.
  - Each area lasts a random 5–8 encounters. A route ticket pins the area to its biome.
  - The area's favoured types drive spawns, which keeps the forest feeling like a forest.
- **Transition.** One gentle crossfade plus a small "→ Mossy Forest" title chip in the dialogue box. No shake: `useBattleFx` stops firing `FX_TIMELINES.scene` on area changes. Reduced motion uses an instant swap.

### A2. Levelling: the team grows together
**XP Share for everyone.** Study XP per card is the same for the whole party.
- The lead gets ×1.2, the bench ×1.0. Today it's 3.8 vs 1.8.
- KO XP is split: the lead gets 60%, and the rest is shared evenly across the bench.

**Catch-up boost.** A party member below the party average gets XP ×(1 + 0.12 × gap), up to ×2.
- The gap is measured to the average of the other members.
- It's shown as a small "▲ catch-up" tag on the card.

**Slower overall pace.** Rescale XP *sources*, not the curve, so existing levels never move. Targets at Medium, ~100 cards/day:

| Cards | Party avg level |
|---|---|
| 500 | ~15 |
| 1,000 | ~22 |
| 3,000 | ~38 |
| 6,000 | ~50 |
| 15,000 | ~70 |

Lv100 stays a long-term goal. The balance harness (C1) solves the source multipliers to hit these bands.

**Wild levels follow the party average, with the average as the cap.**
- `encounterBaseLevel` changes from "mean of top 3" to the mean of the whole party, with empty slots ignored.
- 70% "near" wilds: uniform in [avg − 3, avg].
- 30% "natural" wilds: uniform between the species' `minWildLevel` and avg − 4. These are the weak ones, at a level that makes sense for the species.
- Event, Rocket and bird encounters keep avg + 3…5.
- Applies only to new spawns; existing Pokémon are untouched.

**Result.** New catches are at or below your average, and your team keeps pace with them. Replacing your team is a choice, not a must.

### A3. Shiny checks and money display
**Shiny audit and tests.**
- Re-verify the roll, pity, save round-trip and every catch path.
- Shiny odds per encounter become a fixed 1/250, calibrated at Medium. The pacing multiplier is removed (see A7).
- New: a non-legendary shiny no longer flees when your lead faints. The encounter waits, the same as shiny legendaries.
- Trainer and Rocket Pokémon can now be shiny (see A9).

**`formatCoins(n)`** goes in a new `src/ui/format/coins.ts`. It is the only formatter, used at all ~18 call sites (header, shop, prices, rewards, toasts, queue strip).

| Amount | Shown as |
|---|---|
| 0–999 | `₽999` |
| 1,000–9,999 | `₽1.5k` (one decimal, *rounded down*, so it never shows more than you have) |
| 10,000–999,999 | `₽15k` / `₽152k` |
| 1M and up | `₽1.2M` |

- The exact amount shows in the tooltip and `aria-label`, and in purchase confirm dialogs.
- Prices you can't afford show in a muted colour.
- `ShopExtras`' ad-hoc "k" formatting is deleted.

### A4. Rare Pokémon mainly from Team Rocket
Covered by A9 and A7: wild legendaries become tiny odds, and Rocket bosses are the reliable source.

### A5. Party: three action buttons, Transfer, and "View all"
**Card action row.** `PartyPokemonCard` replaces "Lead" with three coloured buttons in the arcade palette, each with a bevel:
- **Lead** (blue).
- **Upgrade** (green). Shows the Power Up cost via `formatCoins` and opens a small sheet with Power Up, Evolve (if ready), Bottle Cap and Tutor.
- **Transfer** (red). Shows the payout.

Heal or Revive moves to a small `+` button on the HP bar, shown only when that Pokémon is hurt.

**Transfer** (new reducer `transferPokemon(state, ids[])` in `collection.ts`; replaces Release).
- **Payout:** `₽ = round(TRANSFER_BASE[tier] × (1 + level/25) × shiny 3 × HUNDO 2)`. Starting bases (tuned in C1): Common 30, Uncommon 60, Rare 150, Baby 80, Ultra 600, Legendary 1,500, Mythical 2,500.
- **XP:** every owned Pokémon (party and storage) that shares a type gets `8 + 2 × level` XP, split ×1.0 party / ×0.5 storage. It rides the existing `applyTypeShareXpBoost` path in `core.ts:389`.
- **Confirm** names the total ₽ and XP. It shows a warning chip for shiny, HUNDO, legendary-class, favourite and **starter**.
  - Favourites need "Unfavourite first", as today.
  - You can't transfer your last party member.
  - Dex entries stay.
- **Anti-abuse.** A Common's payout is always below the cost of a Poké Ball (₽100). The C1 harness asserts that catch-and-transfer farming earns less ₽ per card than fighting.

**"View all" grid** (new `src/ui/screens/CollectionGridScreen.tsx`, opened from the Party header).
- **Grid:** a dense 3–4 column grid of every owned Pokémon (party and storage). Each tile has the sprite, level, IV stars or HUNDO, ✦ shiny, ★ favourite, ♥ starter, and a type dot.
- **Sort:** level, IV %, power, species/Dex #, type, caught date, rarity. Ascending and descending.
- **Filters:** type, shiny, HUNDO, legendary, favourites, duplicates, in party / in storage. Plus search.
- **Multi-select:** long-press or the "Select" toggle. Then use "Select duplicates (keep best)", "Select all filtered" or "Clear".
- **Bulk bar:** Transfer (one confirm with totals and warning chips), Favourite / Unfavourite, Move to storage, Move to party (if room).
- **Big lists:** virtualise it, so ~500+ tiles stays smooth. Use a windowed render, no new dependency.

### A6. Pokémon GO-style logic, kept fast
This is the guiding rule for every item here:
- one tap per decision
- no blocking modals during study
- every new system shows up as a chip, banner or tile, never a popup over your card
- every feature stays out of the way unless you engage with it

### A7. Rarity odds, calibrated by encounter frequency
One balance module, `src/game/engine/rarity.ts`, holds every rare rate as **per-encounter odds calibrated at Medium** (3 cards per encounter).

- **Rule:** `p_enc = MEDIUM_CPE / N_cards`, where N is "1 in N cards at Medium".
  - The odds per encounter are fixed, so slower pacing (more cards per encounter) means fewer rarities per card, as you asked.
  - Faster pacing means more encounters and so more rarities, which is its natural reward.
- **Remove** the pacing multiplier in `encounters.ts:232-242`.
- **Rates:**
  - Galarian bird: 1 in 250 cards, so 1/83.3 encounters.
    - Unlocks after 100 cards, so the very first sessions stay simple.
    - The roll happens before the normal event roll.
  - Shiny: 1/250 encounters, with the existing pity at 500/750.
  - Wild legendary, mythical or Ultra Beast (not birds): 1 in ~2,500 cards, so ~1/830 encounters.
    - Today it's ~1/83 encounters after Lv25 and 500 cards.
    - The gate is kept, and the uncaught bias applies.
  - Wild "rare tier" non-legendaries (pseudo-legendaries, fossils, other starters): rarer in the wild, and boosted as Rocket aces (A9).
- **Team weighting:** when a bird spawns, 50% it's your team's bird, 25% each of the other two. With no team chosen, 1/3 each.
- **Galarian shiny:** 25% of bird appearances. A shiny bird is still always caught, as you asked in 1.5.0.
- **Data fix:** the 27 headline legendaries tagged `tier:"Common"` in `pokedex.ts` get Legendary or Mythical. The uncaught-bias completeness check (`encounters.ts:70-81`) ignores event species.

### A8. Legendary-class catch curve
`computeCatchChance` branches for legendary, mythical, Ultra Beast and Galarian bird:
- **Base (Poké Ball):** `p = 0.02 + 0.23 × (e^{k(1−h)} − 1)/(e^k − 1)`, with `k = 4` and `h` = HP fraction.
  - Gives 2.0% at full, 4.7% at half, 9.9% at 25%, 17.3% at 10%, and ~25% at 1 HP.
- **Ball and status:** a multiplier on top. Great ×1.25, Ultra ×1.5, sleep/freeze ×1.5, paralysis/poison/burn ×1.25. Capped at 40%.
- Everyday wilds keep today's formula.
- The trainer catch path gains the missing status multiplier.
- The Catch button and ball picker show the live % (`wildCatchChancePreview`).

### A9. Team Rocket rework
**18 type grunts** (new `src/game/engine/rocket.ts`).
- Each grunt uses one type: "Grunt (Fire)" with a coloured type chip.
- Team: 3 Pokémon of that type at avg ± 2.
- Ace: the last slot is a **rare species of that type**, picked from a rare-pool of rare-tier and low-catch-rate non-legendaries of that type (pseudo-legendaries, fossils, starters).
- After a win, a catch offer on the ace with the standard tier bonus. Your main rare source.

**Frequency.**
- About 1 in 3 trainer battles is Rocket (`ROCKET_SHARE 0.33`, up from ~11%).
- The type is picked from types not yet beaten this cycle.

**Rocket Radar.**
- A counter `rocket: { gruntWins, typesBeaten[], leaderReady, leaderPending }`.
- After **5 grunt wins**, the next Rocket slot is the **Rocket Leader**: a 3-on-3 at avg + 4 with smarter AI, using the elite tier.
- At ~100 cards/day, Medium, normal trainer frequency, that's roughly one leader per week.
- A chip on Play and the Trainer screen shows "Rocket Radar ●●●○○".

**The Leader's prize.**
- After a win, a **guaranteed legendary encounter**: a rare legendary or mythical (no Galarian birds), at the leader level.
- It uses the A8 curve, but **never flees and never times out**. You keep throwing until it's caught, or run to give it up (with a confirm).
- That makes it a reliable source that still needs balls and effort.
- **Shiny 1/5**, fixed and not paced, because the leader is already a rare event.
- The species prefers ones you haven't caught.

**Rewards.**
- Grunt: ₽ + Rocket loot (see C2).
- Leader: big ₽ cache, a Rocket badge, and the legendary.
- Losses use the existing loss fee and rematch.

**Shiny trainer Pokémon.** The Rocket ace and leader Pokémon roll shiny (ace at 1/250), and the shiny survives the catch offer.

### A10. Capacity: bag and storage
- **Storage:** 60 to start, +10 per 5 trainer levels (160 at Lv50).
  - Shop "Storage Upgrade +20": ₽8k, then +₽4k each time, up to +200.
  - Party stays at 6. Storage counts only storage.
- **Bag:** 200 items to start, +20 per 5 trainer levels.
  - Shop "Bag Upgrade +25": ₽6k, then +₽3k each time, up to +250.
  - Key items don't count: XP Doublers, route tickets, Bottle Caps, stones.
- **When storage is full:**
  - The Catch button reads "Storage full · Transfer" and opens the grid, pre-filtered to duplicates.
  - Fight still works.
  - **Shinies, legendary-class Pokémon, birds and Rocket prizes always go through**, allowed to go over the cap.
- **When the bag is full:**
  - Shop buys are blocked, with a clear message.
  - Found items turn into ₽ at half value, shown as "Bag full → ₽120".
- **Grandfathering:** saves already over a cap keep everything. You just can't add more until you're under the cap.
- **Display:** a capacity meter in the Party and Bag headers ("Storage 58/60").

### A11. XP Doublers: verified and fixed
**Single-writer saves (the real fix).**
- Every sidebar, popup and queue-strip action becomes a command (`{type, args, nonce}`), sent over the existing `queueActions.ts` channel to the **index host**, which applies it inside its serial review queue.
- The sidebar shows the result optimistically and then updates from the broadcast.
- This removes the cross-iframe lost-write race for doublers and every other action.

**Clear rule:** a doubler counts down one per reviewed card, including cards during battles, because study XP is still doubled on those.
- The doubler chip shows "×2 · 18 cards left" and the queue count.
- Type-share and transfer XP become doubled too, so it's a true "XP ×2".

**Tests:**
- Activating 3 doublers across 175 cards, with battles in between, uses exactly 25 + 50 + 100 cards.
- A concurrent sidebar action during a review is never lost.

### A12. Type themes in the shop
**18 themes, one per type.**
- Each is a token set: background, panel, ink, border, accent, accent-2, glow.
- Each has an original CSS/SVG pattern: Fire embers, Water ripples, Grass leaf-weave, Electric circuit sparks, Ghost wisps, Dragon scales, Ice frost lattice, and so on.
- A slow ambient layer that turns off under reduced motion.
- Every theme is checked for contrast (C5).
- The default arcade theme stays free.

**Theming plumbing.**
- Replace hard-coded `#101326`, `#65709a` and similar in `style.css` and the TSX inline styles with `--pkr-*` tokens. One pass, screen by screen.
- New `src/ui/theme/themes.ts` and a `ThemeProvider` that sets `pkr-theme-<type>` and the variables on the sidebar root (`pokerem_sidebar.tsx:515`).
- Also applied to **portaled modals** (via a `document.body` class) and to the queue strip and popup.
- `battleAmbienceCssVars` keeps the arena's own colours inside the battle field only.

**Shop.**
- "Themes" tab with a **live preview**: tap to try for 15 s, buy, then equip or switch freely.
- Price ₽45k each, about 5–6 days of study at the new income.
- Persisted with the `cardStyles` buy/equip pattern (`sinks.ts`, `economy.ts:165/184`).

**Bonus.**
- With a theme equipped, catching or defeating a Pokémon of that type gives ×1.25 ₽ and ×1.25 XP to trainer level and to every owned Pokémon of that type (party and storage, via type-share).
- Shown as a small "Fire theme ×1.25" tag in the result card.

### A13. Teams and Galarian birds onboarding
**First launch:** Choose your team, then starter, then study difficulty.
- Team names (owner, 2026-11-04: the Pokémon GO names) with original crest art:
  - **Team Valor**: red, Galarian Moltres
  - **Team Mystic**: blue, Galarian Articuno
  - **Team Instinct**: yellow, Galarian Zapdos
- Big tappable crests with a one-line flavour each, and a confirm.

**Existing players:** a one-time "Choose your team" screen on first open of 1.6.0, then straight back into their save. Stored as `team`; nothing else changes.

**Effects:**
- The bird weighting from A7, kept **secret** and not shown in the UI.
- A team colour accent on the trainer card and header.
- A team badge.

### A14. Balance: every weight computed
See Part C. Every reward and odds constant moves into `src/game/balance.ts`, and a simulation harness tunes them against target bands.

### A15. Save safety: nothing resets
- Every new field is optional and normalised, following the existing `normalizeCardStyles` pattern.
- Schema stays 5, so no destructive migration is needed.
- New fields:
  - `sceneIndexVersion`, `area`
  - `team`, `teamPrompted`
  - `starterId`
  - `themesOwned`, `themeActive`
  - `storageBonus`, `bagBonus`
  - `rocket`
  - `daily`, `research`
  - `balanceVersion`
- **Starter backfill:** the earliest-caught owned Pokémon whose species line includes a starter becomes the starter, by lowest numeric id or earliest `caughtAt`.
- **No level ever goes down:** the XP curve is unchanged (only gains are rescaled), and the trainer curve is unchanged.
- **Tests:**
  - the 1.4.1 fixture
  - a new 1.5.0 fixture (captured from a late-game sim save)
  - a 1.3.1 legacy save
  - the parse-twice idempotence test
  - over-cap grandfathering
  - every new normaliser with junk input
- The pre-v5 backup key stays.

### A16. Starter "Buddy" bonus
`starterId` marks your original starter; evolution keeps the id.

**Buddy perks:**
- **Misses halved:** in `moveMechanics.ts:145-149`, the miss chance is `(100 − acc)/2`. `Fighter` gains `isBuddy`, set by the callers in `battle.ts:171` and `trainer.ts:193`.
- **XP ×1.15** from all sources.
- A ♥ "Buddy" badge on its card and in the grid.

Transfer warns "This is your starter. Its buddy bonus will be lost."

### A17. Battle arena layout: each info box sits with its own Pokémon
**The problem now.** The foe's name, level and HP box is drawn above *your* lead's sprite, so it's easy to read the wrong box for the wrong Pokémon.

**New layout**, the same for wild battles (`BattleField.tsx` and its HUD) and trainer battles (`TrainerBattleSurface.tsx`):

- **Columns.** The field is split into two columns, one per Pokémon:
  - foe: upper-right sprite
  - your lead: lower-left sprite
- **Foe box.** It sits **directly above the foe sprite, in the foe's column**, aligned to that column's edge. It holds:
  - name with ✦ if shiny
  - level
  - gender and status chip
  - HP bar
  - for trainers, the team-ball pips
- **Your box.** It sits **directly below your lead's sprite, in your column**. It holds:
  - name with ♥ if buddy
  - level
  - HP bar with HP numbers
  - XP bar
- **Pointer.** Each box gets a small pointer notch facing its own sprite, so the pairing is obvious at a glance.
- **No cross-overs.** A box is never drawn over or next to the other Pokémon's sprite.
- **Narrow widths (≤ 320px).**
  - Sprites scale down and the boxes shrink to a compact one-line name and level with the HP bar.
  - Each box still stays attached to its own sprite.
  - Nothing overlaps, and there is no horizontal scroll.
- **Everything else carries over:**
  - the shiny gold frame and the existing animations (HP drain, faint, the ball throw landing on the foe)
  - Compact view and reduced motion
  - area chip (A1) placement, which goes into the dialogue box, not the field
- **Themes (A12).** The layout reads correctly in every theme.

The exact positions, sizes per breakpoint and the notch style go into SPEC's UI section.

**Check:** preview captures at 280, 320, 400 and 520px in four scenes:
- wild
- shiny wild
- trainer 3-on-3
- Rocket Leader

In each one, every box is visually attached to its own Pokémon, and both the visual QA and the owner screenshot review confirm it.

---

## Part B — My additions (11)

1. **Single-writer save architecture** (A11). It fixes the doubler and stops any sidebar action being silently lost. This is the biggest hidden reliability bug.
2. **Lucky card and bounty flourishes.**
   - The hidden study cash bonus (`rollStudyCashBonus`) gets a non-blocking gold "Lucky card! +₽620" chip above the dialogue box, plus a coin tick on the ₽ counter.
   - ~1 in 40 wilds carries a **Bounty** tag (₽1.5–4k), paid on defeat or catch.
   - Unpredictable and tied to real reviews, so it can't be farmed.
3. **Daily firsts and streaks (GO-style).**
   - First catch of the day ×3 XP + ₽500. First defeat of the day ×3 XP + ₽500.
   - A 7-day study streak bonus pays ₽5k and a Rare Doubler.
   - Shown as two small daily tick boxes on Play.
4. **Special Research lines.**
   - Multi-step quest chains with big payouts, e.g. "Rocket Investigation": beat 3 grunts, catch 10 Poison, beat the Leader, for ₽25k + Ultra Balls.
   - A "Team bird" line ends in a guaranteed sighting of your team's bird.
   - One active line at a time, shown on the Trainer screen.
5. **Achievements and trainer levels pay out.**
   - Achievements give ₽ by tier: 500 / 1.5k / 5k / 15k.
   - Every trainer level gives ₽ (`250 × level`) and capacity.
   - Milestone levels (10/20/30/40/50) unlock a theme discount voucher.
   - New achievements for Rocket, transfers, themes, birds and buddy.
   - The money achievements are re-targeted to the new income.
6. **"New area" route identity** (A1). Each area has a name and favoured types. A route ticket now buys "10 encounters in the Volcano" with that area's spawns, which makes tickets worth buying.
7. **Collection grid redesign** (A5). Shiny, HUNDO, buddy and duplicate tools make storage management a satisfying 10-second task, not a chore.
8. **Rocket Radar and Leader showdown presentation.**
   - Rocket grunts get a red-and-black intro wipe with the grunt's type crest.
   - The Leader gets a unique banner and a "THE LEADER'S PRIZE" legendary reveal, in the same style as the shiny star wipe.
9. **Correctness fixes found in the audit:**
   - the 27 mis-tiered legendaries
   - the uncaught-bias completeness check
   - shinies protected after a faint
   - the trainer catch status multiplier
   - the scene migration
   - doublers applying to type-share XP
10. **Capacity UX.** Capacity meters, a "Storage full · Transfer" shortcut on Catch, bag-full auto-convert to ₽, and a level-up card that says "Storage +10, Bag +20".
11. **Updated listing.** README, manifest blurb and new pinned screenshots: themes, the Rocket Leader, the View all grid and team pick. Shipped at release.

---

## Part C — Balance model ("computed, not guessed")

### C1. The harness
Upgrade `src/game/sim/simulate.ts` into `src/game/sim/balance.ts`.

**Player policies:**
- **keep-team**: never swaps, transfers duplicates
- **swap-in**: today's policy
- **collector**: catches everything and transfers spares
- **fighter**: always fights
- **farmer**: catch, then transfer at once (the abuse probe)
- **idle**: ignores encounters

**Settings:** pacing Easy, Medium and Hard; 100 cards/day; 60 days; 20 seeds each.

**What it records:**
- ₽ earned and spent by source
- level curves for the lead, bench and average
- level gap (top − bottom party member)
- rarity counts (shiny, bird, legendary, Rocket)
- capacity pressure (days until storage is full)
- days to afford each sink

**Tuning:** `npm run balance:tune` grid-searches the constants in `src/game/balance.ts` (XP source multipliers, ₽ bases, transfer bases, prices) to minimise distance from the bands below. The chosen values are committed, and `balance.test.ts` asserts the bands with tolerances.

### C2. Target bands (Medium, 100 cards/day unless noted)

| Area | Target |
|---|---|
| Party average level | L15 / L22 / L38 / L50 at 500 / 1k / 3k / 6k cards (±15%) |
| Level gap, keep-team policy | Top − bottom party member ≤ 6 levels after 1k cards |
| Newer catch vs kept team | A new catch averages ≥ 2 levels below a kept team's average |
| Income | ₽7–10k per 100 cards early, ₽10–14k per 100 at L40+ |
| Spend opportunities | Some sink worth buying always exists (a theme in ≤ 6 days, upgrades, Power Ups) |
| Income mix | Card trickle ~15%, battles ~40% (defeat > catch, always), quests / research / achievements ~25%, variable (lucky, bounties, Rocket loot) ~20% |
| Variance | Day-to-day ₽ coefficient of variation 0.35–0.6, so days feel different without being swingy |
| Abuse | farmer ₽/card ≤ 0.8 × fighter ₽/card. No reward repeatable without new reviews. Route tickets can't loop bounties. Bag-full conversion < shop price. |
| Rarities | Shiny 1/250 encounters (mean 190–260, median first shiny 3–8 days). Bird ≈ 1/250 cards ±10% at Medium; per card it scales down at Hard. Wild legendary ≈ 1/2,500 cards. Rocket Leader ≈ every 5–9 days. |
| Battles | Existing bands kept: wild 2–4 turns, lead faint < 0.12, trainer win rate 0.5–0.95. Leader win rate 0.4–0.75. |
| Capacity | Storage first fills around day 8–12 for collector, never for keep-team |

**Starting reward formulas** (the harness finalises the constants):
- **Defeat:** `₽ = 60 + 8×L`, ×tier (Ultra 3, Legendary 5, Mythical 6), plus bounty.
- **Catch:** `₽ = 40 + 5×L`, always below defeat.
- **Card trickle:** ₽10 × `studyCardWeight`, plus lucky rolls (4% ₽300–800, 0.5% ₽2–5k, 0.05% ₽10–25k).
- **Rocket:**
  - Grunt: `₽1,200 + 20×avg + loot`. Loot is a 30% item drop and a 10% ₽3–6k cache.
  - Leader: `₽8–15k`, plus the legendary.
- **Trainers:** standard and elite formulas kept, then scaled by the harness.
- **Quests:**
  - Daily: ₽800–1,800.
  - Weekly: ₽5–8k.
  - Research lines: ₽15–30k.
- **Prices:** re-tuned to days-of-income.
  - Balls, potions and Power Up keep their relative order.
  - Power Up becomes the main steady sink.
  - Existing balances are kept as they are (a head start, never taken away).

---


---

# Appendix L — Locked decisions (never change these)

| # | Decision |
|---|---|
| L1 | Rare odds are **per encounter, calibrated at Medium (3 cards per encounter)**: `p_enc = 3 / N`, where N is "1 in N cards at Medium". Slower pacing → fewer rarities per card. The old `shinyOddsForPacing` multiplier is removed. |
| L2 | Galarian bird: N = 250 cards (p_enc = 0.012). Unlocks after `cardsReviewed ≥ 100`. Rolled before the normal event roll. Team bird 50%, other two 25% each; no team → 1/3 each. Team effect is never shown in UI. |
| L3 | Galarian bird shiny = 25% of bird appearances. Shiny legendary-class (incl. birds) is always caught by the first ball (1.5.0 rule kept). |
| L4 | Shiny = 1/250 per encounter, pity from 500, guaranteed by 750 encounters (unchanged curve). |
| L5 | Wild legendary/mythical/Ultra Beast (not birds): N = 2,500 cards (p_enc = 0.0012). Gate kept: party base level ≥ 25 and ≥ 500 cards. |
| L6 | Legendary-class catch curve: `p = 0.02 + 0.23·(e^{4(1−h)} − 1)/(e^4 − 1)`, h = HP fraction (1 HP → treat h as 0). Ball ×: Poké 1, Great 1.25, Ultra 1.5. Status ×: sleep/freeze 1.5, para/poison/burn 1.25. Cap 0.40. Everyday wilds keep today's formula. |
| L7 | Transfer is permanent, needs a confirm, Dex entry stays. Favourites must be unfavourited first. Last party member can't be transferred. |
| L8 | Areas: arena changes only after an encounter is resolved and the area's `encountersLeft` reaches 0; each area lasts 5–8 encounters (uniform int). Route ticket pins the area biome. |
| L9 | Full storage: Catch is blocked with "Storage full · Transfer"; Fight still works. Shiny, legendary-class, Galarian birds and Rocket prizes always go through (may exceed cap). |
| L10 | Existing saves without a team see a one-time team prompt on first open of 1.6.0. New saves: Team → Starter → Difficulty. |
| L11 | Teams: **Team Valor** (red, Galarian Moltres #146 form, saved id `ember`), **Team Mystic** (blue, Galarian Articuno #144 form, id `tide`), **Team Instinct** (yellow, Galarian Zapdos #145 form, id `volt`). Names changed by the owner on 2026-11-04 (was Ember/Tide/Volt). Original crest art only. |
| L12 | Themes: 18, one per type, ₽45,000 each (tunable 35–60k), buy once, switch freely. Default arcade theme free. Equipped theme → ×1.25 ₽ and ×1.25 XP (trainer + every owned Pokémon of that type) when catching/defeating a Pokémon with that type. |
| L13 | Storage cap 60 base + 10 per 5 trainer levels; shop upgrade +20 at ₽8k then +₽4k per purchase, max +200 bought. Bag cap 200 base + 20 per 5 trainer levels; upgrade +25 at ₽6k then +₽3k, max +250. Key items don't count (XP Doublers, route tickets, Bottle Caps, Gold Bottle Caps, evolution stones). Party stays 6. Over-cap saves grandfathered. |
| L14 | Bag full: shop buys blocked; found items convert to ₽ at 50% of shop price ("Bag full → ₽120"). |
| L15 | Rocket: 18 type grunts; `ROCKET_SHARE = 0.33` of trainer battles; Leader after **5 grunt wins**; Leader team 3-on-3 at avg+4, elite tier. Leader prize: guaranteed legendary or mythical (no Galarian birds, no Ultra Beasts), prefers uncaught, uses L6 curve, never flees/times out, shiny **1/5** fixed. Grunt ace shiny 1/250. |
| L16 | Starter = Buddy: miss chance halved (`miss = (100 − acc)/2`), XP ×1.15 from all sources, ♥ badge. Evolution keeps `starterId`. |
| L17 | XP Share: study XP per card equal for every party member (lead ×1.2). KO XP: lead 60%, rest split evenly across the bench. Catch-up ×(1 + 0.12·gap) capped ×2, gap = (avg of other members) − this level, only when > 0. |
| L18 | Wild level: base = mean of whole party (ignore empty). 70% uniform int [avg−3, avg]; 30% uniform int [minWildLevel(species), avg−4] (if that range is empty, use the near rule). Event/Rocket/bird: avg+3…+5. Clamp 1..100. |
| L19 | XP curve (`progression.ts`) and trainer-level curve are **not changed**. Only XP sources are rescaled. No level ever decreases. |
| L20 | Money display: `formatCoins` — 0–999 `₽999`; 1,000–9,999 `₽1.5k` (one decimal, floor); 10k–999,999 `₽15k` (floor, no decimal); ≥1M `₽1.2M` (one decimal, floor). Exact value in `title`/`aria-label` and in confirms. |
| L21 | Doublers tick once per reviewed card, including paused cards. They double every XP source, including type-share and transfer XP. |
| L22 | All sidebar/popup/strip state changes go through one writer: the index host. |
| L23 | Party card actions: **Lead** (blue), **Upgrade** (green, shows Power Up cost), **Transfer** (red, shows payout). Heal/Revive becomes a `+` on the HP bar when hurt. |
| L24 | Battle layout: foe box directly above foe sprite in the foe column; your box directly below your sprite in your column; pointer notch toward own sprite; never overlaps the other sprite. |
| L25 | Version 1.6.0. No push/publish without the owner. |

# Appendix T — Tunables (`balance:tune` may move only these, within range)

| Constant (in `src/game/balance.ts`) | Start | Range |
|---|---|---|
| `XP_STUDY_PER_CARD` (avg per member) | 1.6 | 0.6–3 |
| `XP_STUDY_LEAD_MULT` | 1.2 | fixed |
| `XP_KO_MULT` (× `knockoutXp`) | 0.7 | 0.3–1.2 |
| `XP_FIGHT_MULT` (× combat XP) | 0.7 | 0.3–1.2 |
| `XP_TYPESHARE_MULT` | 0.8 | 0.3–1.2 |
| `DEFEAT_COIN_BASE` / `DEFEAT_COIN_PER_LV` | 60 / 8 | 30–150 / 3–15 |
| `CATCH_COIN_BASE` / `CATCH_COIN_PER_LV` | 40 / 5 | must stay < defeat at every level |
| `CARD_COIN` | 10 | 5–25 |
| `TRANSFER_BASE` per tier | C30 U60 R150 Baby80 Ultra600 Leg1500 Myth2500 | ±50%, Common < 100 always |
| `TRANSFER_XP_BASE` / `_PER_LV` | 8 / 2 | 4–20 / 1–4 |
| `BOUNTY_CHANCE` / range | 1/40, ₽1.5–4k | 1/60–1/25 |
| `GRUNT_COIN_BASE` / `_PER_AVG` | 1200 / 20 | 600–2500 / 10–40 |
| `LEADER_COIN_MIN/MAX` | 8k / 15k | 5k–25k |
| `QUEST_DAILY_MIN/MAX`, `QUEST_WEEKLY_MIN/MAX` | 800/1800, 5k/8k | ±40% |
| `RESEARCH_COIN` | 15k–30k | ±40% |
| `ACHIEVEMENT_COIN` by tier | 500/1.5k/5k/15k | ±50% |
| `TRAINER_LEVEL_COIN_PER_LV` | 250 | 100–500 |
| `THEME_PRICE` | 45k | 35k–60k |
| Shop item prices | today's | keep relative order |

Everything not in this table is fixed by this spec.

# Appendix U — UI specs

General rules for every new UI: one pixel font (`var(--pkr-font-body)`), sizes from `--pkr-text-*` only, colours from `--pkr-*` tokens only (no new inline hex), bevelled flat buttons like the existing command buttons (`--pkr-bevel-light`/`--pkr-bevel-dark`), radius `--pkr-radius-md`, min tap target 32px tall, works at 280–520px with no horizontal scroll, reduced motion = no movement, same colours.

New semantic tokens (defined on `:root` in `style.css`, overridable per theme):
`--pkr-bg`, `--pkr-panel`, `--pkr-panel-2`, `--pkr-ink`, `--pkr-ink-muted` (exists), `--pkr-border`, `--pkr-accent`, `--pkr-accent-2`, `--pkr-glow`,
`--pkr-btn-lead: #3768c9`, `--pkr-btn-upgrade: #2f8f45`, `--pkr-btn-transfer: #b8432f`, `--pkr-btn-ink: #fffaf0`, `--pkr-coin: #fbbf24`.
Default values: `--pkr-bg = --pkr-arcade-ink (#101326)`, `--pkr-border = --pkr-arcade-border (#65709a)`, `--pkr-ink = --pkr-arcade-paper (#f8edcf)`, `--pkr-panel: #1a1f3a`, `--pkr-panel-2: #232a4d`, `--pkr-accent: #a78bfa`, `--pkr-accent-2: #fde68a`, `--pkr-glow: rgba(167,139,250,.3)`.

**U1 Party card action row** (`PartyPokemonCard`): one row of three equal-width buttons under the card header, gap 4px.
- `Lead` (bg `--pkr-btn-lead`): label "Lead"; disabled + label "Leading" on the current lead; disabled when fainted ("Fainted").
- `Upgrade` (bg `--pkr-btn-upgrade`): label "Upgrade" + second line `formatCoins(powerUpCost)`; opens U2. Muted (opacity .55, still tappable to view sheet) if you can't afford Power Up.
- `Transfer` (bg `--pkr-btn-transfer`): label "Transfer" + second line `+₽payout`; opens U3. Disabled for last party member (title "Your last party Pokémon").
- HP bar gets a 20×20 `+` button at its right end only when hp < maxHp: tap = `bestHealItemFor` (revive if fainted). Hidden if no usable item; title says the item used.

**U2 Upgrade sheet** (portaled bottom sheet, themed): header sprite + name + Lv. Rows (each a full-width button with cost on the right): "Power Up → Lv N+1" (cost), "Evolve → Species" (only when ready; stone shown), "Bottle Cap" (owned count), "Move Tutor". Close ✕ top-right, Esc closes. Reuses existing reducers (`powerUpPokemon`, stone evolution, bottle caps, tutor).

**U3 Transfer confirm** (portaled modal): title "Transfer N Pokémon?"; list (max 6 shown + "and N more"); totals line "You get ₽X and Y XP for matching types"; warning chips (amber) for each present: "✦ Shiny", "HUNDO", "Legendary", "♥ Your starter — buddy bonus will be lost". Favourites block with message "Unfavourite ★ first". Buttons: "Cancel" (neutral) / "Transfer" (red). Copy line: "This can't be undone. Your Pokédex keeps the entry."

**U4 View all grid** (`CollectionGridScreen`, full screen within sidebar, back arrow to Party): header "All Pokémon (count)" + capacity meter "Storage 58/60". Toolbar row 1: search input. Row 2: sort select (Level, IV %, Power, Dex #, Type, Caught, Rarity) + ↑/↓ toggle. Row 3: filter chips (scrollable wrap, not horizontal scroll): Shiny, HUNDO, Legendary, Favourites, Duplicates, Party, Storage, + type select. Grid: `repeat(auto-fill, minmax(84px, 1fr))`, tiles 84×104: sprite 56px, "Lv N", IV stars or HUNDO badge, corner icons ✦ ★ ♥, type dot(s) bottom-left; party tiles have a thin accent outline. Tap = open that Pokémon's detail (existing party detail); in select mode tap = toggle (checkmark corner, accent outline). Empty filter state: "No Pokémon match these filters."; windowed render (only rows in view + 2 buffer).

**U5 Bulk bar** (sticky bottom of grid in select mode): "N selected" + buttons: Transfer (red), ★ Favourite, Move to storage, Move to party, and an overflow row with "Select duplicates (keep best)", "Select all filtered", "Clear". "Keep best" = per species keep highest IV%, ties by level, always keeps shiny/HUNDO/fav/starter.

**U6 Capacity meters**: text "Storage 58/60" and "Bag 180/200" with a 4px bar; amber ≥ 90%, red at 100%. In Party header and Bag header. Level-up card adds a line "Storage +10 · Bag +20" when capacity grows.

**U7 Rocket intro**: battle start shows a 0.6s red-and-black diagonal wipe, "TEAM ROCKET" stamp, then "Grunt <Name> (Fire)" with the type chip. Leader: same wipe in black-and-gold, "ROCKET LEADER CORVIN" banner. Reduced motion: static banner 1s.

**U8 Leader prize reveal**: after Leader win, field switches to the prize encounter with a gold star wipe (reuse shiny star wipe style but gold-red), dialogue "THE LEADER'S PRIZE: Raikou appeared!" Encounter plate shows a "PRIZE" chip. Run asks confirm "Give up the prize? It won't come back."

**U9 Rocket Radar chip**: on Play under the trek strip and on Trainer screen: "Rocket Radar ●●●○○" (filled = grunt wins this cycle). At 5: "Rocket Leader nearby!" in gold.

**U10 Team pick** (`TeamPickScreen`): title "Choose your team"; three tall cards (stacked at <360px, side by side ≥360px): crest (original SVG: Ember = stylised flame-wing, Tide = wave-crest wing, Volt = zig-zag wing), team name, one-line flavour (Ember: "Fierce hearts that never back down." Tide: "Calm minds that see further." Volt: "Quick instincts that strike first."), team colour border (Ember `#e0533a`, Tide `#3a8fe0`, Volt `#f2c53a`). Tap → confirm "Join Team X? This can't be changed." Existing players: same screen with subtitle "New in 1.6.0 — pick a team. Your progress is safe."

**U11 Theme shop** (Shop → "Themes" tab): grid of 18 swatch cards (2 cols <360px, 3 cols ≥360px): mini preview (bg + pattern + panel + accent bar), type name, price or "Owned"/"Equipped". Tap → detail with "Preview 15s" (applies theme live with a countdown chip "Preview 12s · Buy"), "Buy ₽45k", or "Equip"/"Unequip". "Default arcade" card first, always owned.

**U12 Area chip**: in the dialogue box when an area starts: "→ Mossy Forest" for 3s, fades. Area names = existing scene names from `battleAmbience.ts`.

**U13 Lucky / bounty chips**: Lucky: gold chip "Lucky card! +₽620" above the dialogue box for 2.5s, ₽ counter ticks up. Bounty: wild plate gets a "BOUNTY ₽2.4k" chip; paid line in the result card.

**U14 Daily ticks**: on Play, small row "Today: ☐ First catch ☐ First defeat" (✓ when done) + streak "🔥 4 days" text (no emoji in pixel font — use the GameIcon flame if present, else "Streak 4").

**U15 Research panel**: Trainer screen section "Special Research": line title, step list with progress bars, reward line, "Claim" when done. One active line.

**U16 Battle layout (A17)**: see A17. Foe column = right 55% of field, foe box anchored top of that column above the sprite (box bottom 6px above sprite top), right-aligned. Your column = left 55%, your box anchored directly under your sprite's platform, left-aligned. Notch: 6px triangle in the box border colour pointing to the sprite (down for foe box, up for yours). ≤320px: sprites 80% size, boxes compact (one line name+Lv, HP bar 4px, no HP numbers on foe). Trainer: same, team-ball pips in foe box second line.

# Appendix H — 18 themes

Each theme is a CSS class `pkr-theme-<type>` setting the tokens below plus `--pkr-pattern` (an original CSS gradient / inline SVG data URI, opacity ≤ 0.12) and an optional ambient layer `.pkr-theme-ambient` (CSS only, 10–20s loops, disabled by reduced motion). Ink on panel must meet WCAG AA (4.5:1).

| Type | bg | panel | ink | border | accent | accent-2 | Pattern | Ambient |
|---|---|---|---|---|---|---|---|---|
| Normal | #1c1a17 | #2a2722 | #f3ead8 | #8a8170 | #c9b98f | #e8dcc0 | soft diamond quilt | none |
| Fire | #1f0d08 | #33150c | #ffeedd | #b4532a | #ff7a2f | #ffc145 | ember dots | embers rise |
| Water | #07182b | #0d2742 | #e6f4ff | #3a7cc0 | #3fa9f5 | #8fe3ff | concentric ripples | ripple drift |
| Grass | #0c1d10 | #15301a | #eafbe2 | #4f9a4a | #6fd25a | #c8f07a | leaf weave | leaf sway |
| Electric | #17150a | #27230e | #fffbe0 | #b59a1e | #ffd83a | #fff27a | circuit traces | spark pulse |
| Ice | #0b1a24 | #13293a | #effbff | #6fb8d6 | #9ee7ff | #e0fbff | frost lattice | snow drift |
| Fighting | #1d0b0b | #2f1312 | #ffe9e4 | #a8423a | #e2553f | #f5a46a | diagonal dojo stripes | none |
| Poison | #170b1d | #26112f | #f6e8ff | #8a4fb0 | #b65cf0 | #d9a0ff | bubbles | bubbles rise |
| Ground | #1c140a | #2e2111 | #fbefd9 | #a07a3c | #d9a650 | #f0cf86 | strata lines | dust drift |
| Flying | #0e1530 | #18224a | #eef2ff | #6b7fd6 | #8fa8ff | #c9d6ff | feather chevrons | wind streaks |
| Psychic | #1d0a18 | #301027 | #ffe8f6 | #b44c8f | #ff5fae | #ffa8d6 | spiral rings | slow pulse |
| Bug | #121808 | #1f290f | #f2fadc | #7f9a2c | #a8d23a | #dcf07a | honeycomb | firefly twinkle |
| Rock | #171512 | #27231d | #f2ece0 | #8f8268 | #c2a878 | #e3d2a8 | cracked stones | none |
| Ghost | #0f0b1d | #1a1430 | #efe8ff | #6b5aa8 | #9b7cff | #c9b8ff | wisps | wisp float |
| Dragon | #0c0d24 | #15183d | #ecedff | #5a5ed0 | #7a6cff | #ffb35a | scales | shimmer sweep |
| Dark | #0d0b0b | #1a1615 | #f0e8e2 | #6e5a50 | #b0866a | #e0b890 | crescent moons | star twinkle |
| Steel | #101419 | #1c232b | #eef3f8 | #7f90a3 | #a9bccf | #dfe9f2 | rivet plates | sheen sweep |
| Fairy | #1e0f1b | #2f1830 | #fff0fa | #c07ab8 | #ff9be0 | #ffd1f0 | sparkles | twinkle |

`--pkr-panel-2` = panel lightened ~6%; `--pkr-glow` = accent at 30% alpha.

# Appendix R — Rocket tables

- Grunt names (random per battle): Rhea, Dax, Mina, Kobe, Sela, Orrin, Pax, Tula, Brent, Vey, Juno, Cass.
- Grunt types: all 18. Type order this cycle = random among types not in `rocket.typesBeaten`; when all 18 are beaten, reset the list.
- Grunt team: 2 everyday species of that type (`pickEverydaySpecies` filtered by type) at avg−2..avg, + ace at avg..avg+2.
- Ace pool (rule, not a hand list): non-event species of that type with `baseCatchRate ≤ 45` **or** in a starter line (`isStarterSpecies` on any stage), `minWildLevel ≤ ace level`. If empty, the lowest-catch-rate eligible species of that type. Prefer uncaught 70%.
- Leader: "Rocket Leader Corvin". Team: 3 Pokémon of mixed types (Dark, Poison, Ground preferred), elite moveset/AI, avg+4.
- Leader prize pool: species with classification legendary or mythical in enabled gens, excluding Galarian forms and Ultra Beasts; prefer uncaught (100% if any uncaught remain).
- Rewards: grunt `GRUNT_COIN_BASE + GRUNT_COIN_PER_AVG·avg` + loot (30%: 1–3 Great/Ultra balls or a potion; 10%: ₽3–6k cache). Leader: uniform ₽`LEADER_COIN_MIN`–`MAX`, Rocket badge (achievement), prize encounter.
- Radar: `gruntWins` resets to 0 when the Leader is beaten. Losing to the Leader keeps `leaderReady` (rematch next Rocket slot).

# Appendix S — New save fields (all optional on `GameStateV4`, normalised in `persistence.ts`)

| Field | Type | Default / normaliser | Backfill |
|---|---|---|---|
| `sceneIndexVersion` | `2` | absent → run legacy remap once, then set 2 | — |
| `area` | `{ sceneIndex: number; encountersLeft: number }` | from `battleSceneIndex`, encountersLeft random 5–8 | — |
| `team` | `'ember' \| 'tide' \| 'volt'` | invalid → undefined | — |
| `teamPrompted` | `boolean` | false | — |
| `starterId` | `string` (owned id) | must exist in party/storage, else re-backfill | earliest-caught owned Pokémon whose species line contains a starter (lowest numeric id / earliest `caughtAt`); none → undefined |
| `themesOwned` | `string[]` of type ids | filter to valid types, dedupe | [] |
| `themeActive` | type id \| undefined | must be in `themesOwned` | — |
| `storageBonus` / `bagBonus` | `number` (bought slots) | clamp 0..200 / 0..250, int | 0 |
| `storageUpgrades` / `bagUpgrades` | `number` (purchase count, for price) | int ≥ 0 | 0 |
| `rocket` | `{ gruntWins: number; typesBeaten: string[]; leaderReady: boolean; leaderWins: number }` | sanitise | zeros |
| `daily` | `{ day: string; firstCatch: boolean; firstDefeat: boolean }` | invalid → reset for today | — |
| `research` | `{ lineId: string; step: number; progress: number; completed: string[] }` | unknown line → first line | — |
| `balanceVersion` | `1` | — | — |

Owned Pokémon get no required new fields. `pendingPrize?: boolean` on the encounter object marks a Leader prize (never flees).

# Appendix N — Interpretation notes

- Owner asked that party Pokémon "level up more" and progress at a similar rate. XP Share (L17) roughly doubles bench XP versus 1.5.0 and the catch-up boost pulls laggards up; the overall pace slows at the top (Part C bands) so that progress stays meaningful. Both are approved in the plan.
- "1 in 250 cards, adjusted with encounter frequency, more cards per encounter decreases the odds" is implemented as L1.
