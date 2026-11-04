# Changelog

All notable changes to PokéRem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for **published** marketplace releases. During heavy development, patch bumps may be frequent.

## [Unreleased]

### Added

- **XP Share.** Every party Pokémon now earns study XP on every card (your lead a little more), and a knockout's XP is split: 60% to your lead, the rest shared by the bench. Your whole team grows together.
- **Catch-up boost.** A party member behind the rest earns up to ×2 XP until it catches up, shown by a small "▲ catch-up" tag on its card.
- **Team Rocket is back, and bigger.** About a third of trainer battles are Rocket grunts. Each uses one type and leads with a rare ace of that type (pseudo-legendaries, fossils, starters) that you can try to catch after winning. They're now your main source of rare Pokémon.
- **Rocket Radar and the Rocket Leader.** Beat five grunts (shown on the Rocket Radar) and the Rocket Leader, Corvin, challenges you. Beat him for a big coin prize and a guaranteed legendary or mythical encounter (one you haven't caught, if any are left; shiny 1 in 5). The prize never runs away; keep throwing until you catch it.
- **Trainer Pokémon can be shiny** (1 in 250), and a shiny you catch from a trainer stays shiny.
- **Your starter is your Buddy.** It misses half as often and earns 15% more XP, with a ♥ Buddy badge. Existing saves pick your original starter automatically, and evolving keeps the bonus.
- **Three buttons on every Pokémon card: Lead, Upgrade and Transfer.** Upgrade opens a small sheet with Power Up (cost shown), stone evolutions, Bottle Caps and the Move Tutor. A small + on the HP bar heals a hurt Pokémon in one tap.
- **Transfer.** Send Pokémon away for coins (more for rarer, higher-level, shiny or perfect ones) and XP for every Pokémon you own that shares a type. It asks first, and warns you about shinies, perfect IVs, legendaries, favourites and your Buddy. Your Pokédex keeps the entry.
- **View all.** A fast grid of every Pokémon you own, with sort (level, IV, power, Dex number, type, caught, rarity), filters (shiny, perfect, legendary, favourites, duplicates, party, storage, type) and search. Tap Select (or press and hold) to pick several, then transfer, favourite or move them at once. "Select duplicates (keep best)" picks your spare copies in one tap and never picks your team, shinies, favourites or perfect Pokémon.
- **Storage and bag space.** Storage holds 60 Pokémon and the bag 200 items, growing every 5 trainer levels, with Storage and Bag Upgrades in the Shop. Meters show how full each is. XP Doublers, Bottle Caps and evolution stones don't take bag space. Saves already over a limit keep everything.
- **When storage is full,** Catch turns into "Storage full · Transfer" and opens your duplicates. Shinies, legendaries and the Rocket Leader's prize always get through. When your bag is full, items you find turn into coins at half their shop price.
- **Bounties.** Now and then a wild Pokémon carries a Bounty (shown on its name plate) worth ₽1.5–4k, paid when you defeat or catch it.
- **Lucky cards.** The hidden coin bonus on a review now shows a small gold "Lucky card!" chip above the dialogue box, and the coin counter ticks up.
- **Daily firsts and streaks.** Your first catch and first defeat each day earn ×3 XP and ₽500, shown as two small ticks on Play. Every 7th day in a row you study pays ₽5k and a Rare XP Doubler.
- **Special Research.** Multi-step research lines on the Trainer screen with big rewards: Field Studies and Rocket Investigation. The team-bird line becomes available with teams in 1.6.1.
- **Achievements and trainer levels pay coins.** Achievements pay by tier when you claim them, and every trainer level pays coins too. Milestone levels (10, 20, 30, 40, 50) give a theme voucher. There are new achievements for Team Rocket, transfers, Galarian birds and your Buddy. Theme achievements become available in 1.6.1.

### Fixed

- **The battle arena no longer changes on every card.** An old save migration was re-running on every read and stepping the arena along. You now stay in an area for 5–8 wild encounters, and the arena only moves on between encounters, with a small "→ area name" note and no shake.
- **Ordered sidebar actions.** The sidebar, queue strip and popup now send their actions to one place that saves them in order with your card reviews, so host-delivered commands are serialized with review saves. Hosts without working broadcasts retain a direct-write fallback; old-deck host acceptance remains required. A doubler now doubles every kind of Pokémon XP, including the type-match bonus, and its chip shows the cards left and how many are queued.
- **Mewtwo, Lugia, Rayquaza and 24 other headline legendaries and mythicals** were tagged as common, so they missed their "(Legendary)" label and bonus XP. They're tagged correctly now.
- **A shiny no longer runs away when your lead faints.** It waits for your next Pokémon, just like a shiny legendary.
- **Status conditions help when catching a trainer's Pokémon**, the same as with wild ones.

### Changed

- **Money reads at a glance:** ₽999, then ₽1.5k, ₽15k, ₽152k and ₽1.2M. Hover or use a screen reader for the exact amount.
- **Rare Pokémon are rarer, and the same on every pacing.** Odds are now set per wild encounter, so a slower pacing (more cards per encounter) also means fewer rarities. At Medium: a shiny 1 in 250 encounters, a Galarian bird about 1 in 250 cards (after your first 100), and another wild legendary, mythical or Ultra Beast about 1 in 2,500 cards. Pseudo-legendaries and other rare species turn up half as often in the wild.
- **Legendaries are hard to catch.** Legendary, mythical, Ultra Beast and Galarian bird catches start at 2% at full HP and climb to about 25% near 1 HP. Great Balls (×1.25), Ultra Balls (×1.5), sleep or freeze (×1.5) and paralysis, poison or burn (×1.25) help, up to 40%. A shiny legendary is still a sure catch.
- **Money means more.** Rewards are being checked against daily income targets, from battles first, then quests, research and achievements, then lucky cards and bounties. Defeating a Pokémon always pays more than catching it, and farming catches for transfers pays less than battling. The money achievements were moved to match (₽5k, 25k, 100k, 400k and 1M); any you already have stay unlocked. Your current balance is untouched.
- **Power Up is the main way to spend.** It costs more as a Pokémon levels (about ₽3.4k at Lv20 and ₽11k at Lv40), and Rare Candy now costs ₽6,000.
- **Levelling is slower and steadier.** At about 100 cards a day your team averages around Lv15 after 500 cards, Lv22 after 1,000, Lv38 after 3,000 and Lv50 after 6,000. Later levels take longer, so Lv100 stays a long-term goal. No Pokémon loses a level.
- **Wild levels follow your whole party's average.** Most wilds are at or a little below it, and about a third are weaker, at a level that suits their species. New catches no longer outclass the team you've raised.

## [1.5.0] - 2026-11-03

### Added

- **Quests.** Three daily quests and two weekly ones, each measuring something different (cards, catches, defeats, trainer wins, evolutions, new species). Each pays coins and items, with one-tap Claim and Claim all on the Trainer screen.
- **Galarian Articuno, Zapdos and Moltres.** They appear as legendary events when Gen 8 is enabled, with their real Psychic/Flying, Fighting/Flying and Dark/Flying types, base stats and learnsets (including Freezing Glare, Thunderous Kick and Fiery Wrath) and official sprites. A quarter of their encounters are shiny, and a shiny one is a sure catch. The Dex shows them as #144–146.
- **Perfect IVs are a HUNDO.** A Pokémon with all three IVs maxed shows four gold stars and a gold HUNDO badge wherever its appraisal appears. Existing Pokémon are rated automatically; their IVs don't change.
- **Hyper training.** Bottle Caps (₽25,000) max one IV; Gold Bottle Caps (₽90,000) max all three for a HUNDO. Use them from a Pokémon's card in Party. Both sell in the shop, and the ₽1,000,000 milestone gives a Gold Bottle Cap.
- **Bigger money milestones:** ₽100,000 and ₽1,000,000 earned, matching today's income.
- **Gym badges.** Eight badges for trainer wins (1, 3, 6, 10, 15, 21, 28 and 36), shown with your prestige badges.
- **Collection goals:** own a shiny, own five shinies, own a perfect-IV Pokémon, own ten of them, and register 30 species of one type.

- **Automatic best moves.** Every party Pokémon keeps its strongest four moves and re-picks whenever a level-up, Rare Candy, Power Up or evolution unlocks a better one. Picks weigh power, accuracy, multi-hit, same-type bonus, the Pokémon's stronger attacking stat and super-effective coverage, plus at most one status move when it earns the slot. Teaching or forgetting a move by hand turns this off for that Pokémon; tick **Auto best moves** in Party to turn it back on. Trainers field the same picks.
- **Battle from the queue.** The queue strip shows your lead's HP and, during an encounter, Catch (with its odds), Fight, Auto and Run. With no wild, a Heal button appears when your lead is hurt. The floating popup has the same buttons. These, and the RemNote Catch/Fight/Run commands, now run without the sidebar open.
- **Trainer rematch.** After a loss, **Heal & rematch** pays the Pokémon Center price and faces the same trainer again at full health.
- **Trainer screen.** Rewards and Progress are one screen (Menu → Trainer): trainer card, level rewards with Claim all, quests, achievements, badges, and the stats and streak panels that used to sit under Play.
- **One-tap care.** Party cards have Lead and Heal (or Revive) buttons that pick the right potion. Bag items show **Use ▾** to choose any party member. The shop sells ×5 and ×10 of items under ₽5,000. Reward banners have Claim and Claim all.
- **Starter confirmation** before your pick is locked in.
- **Battle result card.** After a knockout or catch, the battle panel shows the XP bar filling, then the new level, any moves learned and any evolution, with an OK to close it. The next wild clears it on its own.
- **Main-series battle prompts.** "What will Charmander do?" types out in the dialogue box. Move tiles say Super effective, Not very effective or No effect against the current foe.
- **Keyboard play.** Battle buttons are back in the tab order. In the battle panel: C catch, F fight, A auto, R run, 1–4 pick a move, Esc goes back.
- **A shiny encounter feels different.** A gold-and-white star wipe replaces the black one, the sprite lands with a sparkle burst and keeps a soft gold aura, the plates turn gold, the prompt reads "✦ A shiny … appeared!", and the ball wobbles with gold sparks. Catching one shows a SHINY CAUGHT! card with a star sweep, plus a HUNDO line for perfect IVs. Reduced motion keeps the gold styling without the movement.
- **Shiny Case** in the Dex, laid out as a display case: each shiny stands on a lit stage with its Dex number, rarity, the date and card number it was caught, and a gold HUNDO ribbon for perfect IVs. Shinies you owned before the log existed are listed too.
- **Evolution sequence.** Whenever a Pokémon evolves, by battle, Rare Candy, Power Up, stone or trainer battle, the panel plays "What? X is evolving!": its white silhouette trades places with the new form faster and faster, a flash, then the new Pokémon with a sparkle burst. Skip jumps to the end; reduced motion shows the result at once.
- **Move Tutor** (Party → a Pokémon). Teaches a level-up move up to 15 levels early, priced by power and how early (about ₽2,000–₽8,000). Auto best moves uses it when it earns a slot, and tutored moves survive saves.
- **Route tickets** (Shop). ₽6,000 sends your next 10 wild Pokémon to one of nine places (Meadow, Waterside, Spooky Woods and more), with that place's types more likely. More of the same ticket stacks; Play shows how many wilds are left.
- **Trainer card styles** (Shop). Six cosmetic looks for your trainer license, from Ember (₽25,000) to Champion Gold (₽300,000). Equip any style you own, or go back to Classic.

### Changed

- **Wild encounters make sense.** A Pokémon only appears at or above the level it evolves at, so no more Lv2 Alakazam. Rarity is per species, from its real catch rate. Legendaries, Mythicals and Ultra Beasts are rare events (about 1 in 80) once your top Pokémon average Lv25 and you've reviewed 500 cards. Each battle scene favours its own types: water on the pond, ghosts in the woods.
- **You can meet species you've already caught.** About 70% of encounters favour uncaught species until your Dex is complete. You can still meet caught ones, so you can hunt shinies and better IVs.
- **The other starters are obtainable** as uncommon wild encounters.
- **Encounter levels follow your three strongest party members.** A bench of new Lv2 catches no longer drags every encounter down. Trainer teams use the same rule.
- **Starters begin at Lv5**, as in the main series, with rolled IVs.
- **Smarter foes.** Wild and trainer Pokémon choose moves by the damage they'd really do, with the occasional status move. Elite trainers almost always pick their best move.
- **Shorter, fairer wild fights:** about 3 turns. Wild Pokémon have 65% of their owned HP in battle, and caught Pokémon get their full HP.
- **Shinies: still 1 in 250, with a safety net.** After 500 encounters without a shiny, the odds climb until one is guaranteed by 750. At 100 cards a day, most players meet their first shiny within about a week, and almost everyone within four. Long-run odds stay near 1 in 250.
- **Shiny art is the real thing.** An audit confirmed all 908 species have official shiny front and back sprites, drawn in the same style as the normal ones. If a back sprite is ever missing, the shiny front is mirrored in its place.
- **Healing keeps up with your Pokémon.** Potions restore a quarter of max HP (at least 20), Super Potions half (at least 50), Oran Berries a tenth. The Pokémon Center charges more as your team levels up (1 coin per HP per 10 levels, plus 20 per level for each fainted Pokémon), so carrying potions pays off. Income is unchanged.
- **New trainers start with 10 Poké Balls** instead of 6.
- **Choose your ball.** Each ball in the battle menu shows how many you have and its live catch %. Tap one to throw it. One-tap Catch throws the cheapest ball with at least a 50% chance (otherwise your best one), so Ultra Balls aren't wasted on Pidgeys. The throw animation shows the ball you threw.
- **Status helps catching:** asleep or frozen ×2; paralysed, poisoned or burned ×1.5.
- **Auto attack keeps going through status.** Protected turns can't knock the wild out by any route, including poison, burn, confusion or recoil, so sleep and paralysis no longer stop it.
- **Shiny Legendaries are a sure catch.** A shiny Legendary, Mythical or Ultra Beast is caught by your first ball, whatever its HP. Attacks can't knock it out, and it stays if your lead faints.
- **Trainer battles.** Teams follow the same evolution-level rules, with no repeats, and the ace is a level higher. Knocking out a trainer's Pokémon earns 1.5× the wild XP instead of a flat 25. Losing costs 5% of your coins, capped by party level. A small party fights with only what it has; no more copies of one Pokémon.

- Use the original pixel body font consistently across titles, controls, stats, hints, and secondary windows. Redraw only the digit **5** with a clear top bar and left stem; preserve all other characters and spacing.

- **Ignored wild Pokémon wander off** after 12 cards with no action, so progress, healing and trainer XP keep moving. Shinies and Legendary events never leave.
- **Nothing waiting in the sidebar can stall your studying.** After a full-party catch you can still pick who swaps out, but reviewing the next card sends the new Pokémon to storage instead of pausing wilds. A trainer challenge you don't take moves on after 12 cards, so wild encounters keep coming. If your lead faints, the healthiest teammate takes over on the next card; if the whole team is down, it rests while you study and is back at half HP after 12 cards. The queue strip says what's waiting and how many cards are left, and has a one-tap **Storage** button.
- **The sidebar starts at the menu.** The per-card "Lead +XP · Party +XP" line at the top is gone; XP still shows on the bars and in battle.
- **The queue strip fits any width.** In a narrow strip the wild gets its own row with four even Catch / Fight / Auto / Run buttons beneath; the buttons are larger, bevelled and pressable. The encounter popup uses a 2×2 grid, shows the catch chance, and puts away its buttons once the wild is gone.
- **Trainer battles start with your best team picked.** Your three strongest healthy Pokémon are pre-selected, so locking in is one tap; tap to change them.
- **The shop fits a narrow sidebar.** Under 340px, Buy and ×5 / ×10 sit in one row under the item text.
- **One notification per event.** A wild Pokémon shows in the queue strip when it's on, otherwise the floating popup, otherwise a toast. A shiny always gets the popup too.
- **One pacing control.** The in-game Study difficulty sets reviews per wild and how much each card is worth. The RemNote settings "Encounter Frequency" and "Review rewards & wild pacing" did nothing once a difficulty was chosen and are gone. "Every 2 reviews" stays as **Extra wild slowdown**.
- **Easy pacing is 2 reviews per wild** (Medium stays 3), so the two presets differ.
- **Play is shorter:** the arena, commands, quick care, your lead and next milestone. One restock button reads "Buy 5 Poké Balls · ₽500".
- **First run:** brand-new saves skip the release notes, and onboarding points to Menu → Settings.
- **Cleaner battle commands.** Catch, Fight and Run are flat, bevelled pixel buttons in the arcade palette instead of glossy gradients, and they press down when tapped. Trainer battle headers use the same navy panels with a tier-coloured edge.
- **Shiny and rare sprites glow along their outline** instead of sitting in a gold or coloured box, so wings and tails are never boxed in.
- **The field stays clear when no wild is around.** Next-wild progress moved into the command area, so it no longer covers your Pokémon, and the duplicate "Keep reviewing" box is gone.
- **Readable new panels.** The result card, Shiny Case, queue prompts and other new panels use the same type scale as the rest of the sidebar (11/12/14/15px).
- **Currency is ₽ everywhere** on screen, including trainer battle rewards and the shop balance.
- Party sprites are drawn larger in narrow sidebars, and the Dex grid keeps names on one line at every width.

### Fixed

- **Setup works in a short sidebar.** The starter and difficulty screens scroll as one page instead of squeezing the list under a fixed header. The "Start your journey with…?" confirmation stays pinned in view while you browse, with its button focused.
- **First Catch means a catch.** Picking a starter no longer unlocks it. The species-count achievements now say what they count: species registered in your Pokédex.
- **The "First time with PokéRem?" tip stops coming back.** Dismissing it, or opening Settings from it, is now remembered across restarts and devices (it used to reset every session), and it only shows during a new player's first 30 cards.
- **Updates can never restart your progress.** Each of these could replace a real save with a fresh game, and none of them can now:
  - A review that reads an empty or unreadable save (RemNote storage still starting up) no longer writes.
  - The sidebar retries an empty first read before showing the starter picker.
  - Picking a starter can't replace an existing team.
  - A save from a newer or unrecognised version is kept rather than reset.
  - Any save with Pokémon skips the setup screens.
- **PokéRem always shows up after install** ([#3](https://github.com/jostneilson/pokerem-remnote-plugin/issues/3)). The Poké Ball sidebar tab now registers before anything else, and each setup step that follows is guarded, so a failing setting or menu registration on some RemNote versions can no longer leave the plugin invisible. A fresh install opens the sidebar once and says where to find it. There is a new **Open PokéRem** command, the store description points to the right sidebar, and an empty `snippet.css` now ships, so RemNote's request for it no longer logs a 403.
- Keep wild and trainer Pokémon visible with the main-series battle layout: the foe's name/HP plate sits top-left, yours bottom-right, each over open field instead of a Pokémon. The field keeps its size; nothing is added above it.
- Make battle plates compact. Rarity is a small chip beside the role, shiny is a gold sparkle beside the name, and plate text is sized for narrow sidebars.
- Play the shiny reveal over the field for about three seconds instead of pushing the field down. Shiny sprites glow instead of sitting in a box.
- Let the Dex generation picker wrap below its label instead of cutting off at 280px.
- **Achievements you couldn't earn.** The Lv25/50/100 Pokémon goals count Pokémon in storage. "Trainer Lv100" is impossible with the level cap of 50, so it became "Pokémon Legend": trainer Lv50 with six Pokémon at Lv50+ (same badge). "Complete every enabled generation" now reads your real generation settings, which are saved with your progress.
- **Pokédex registration.** Your starter and every Pokémon you evolve (level-up, stone or Power Up) now count in the Dex. Older saves backfill from the Pokémon you own when they load.
- **One catch rule.** Wild and trainer catches share the same code and the same type-advantage bonus (it was 0.15 for wild and 0.10 for trainer).
- **Revive costs ₽200 everywhere.** The item listing said ₽500.
- **Shop prices come from the shop.** Purchases use today's shop price, whatever the UI sends, and can buy several at once.
- Power Up evolutions award trainer XP, as stone evolutions do.
- The Team Rocket trainer is "Team Rocket Grunt", not "Team Rocket Grunt Grunt".
- The header no longer wraps to two lines in a 320px sidebar; today's review/encounter/catch counter shows from 380px.
- Bold pixel text no longer smears: the font now covers the heaviest weight the UI uses, so a bold 2 can't be misread as an 8.
- The battle message box is valid HTML (React logged a nesting warning every combat turn).
- Auto attack keeps its "don't knock out" protection when it picks a lead for you.

## [1.4.1] - 2026-10-31

### Fixed

- **Saving works again.** 1.4.0 serialized game writes with the Web Locks API. RemNote runs plugin iframes without `allow-same-origin`, so `navigator.locks.request` always rejected with SecurityError and every write failed: starter choice, reviews, battles, and purchases. Writes now use a promise chain inside the iframe. Failed 1.4.0 writes never overwrote saves, so existing progress is intact.
- **Fair fights.** HP now follows a level-based formula, and wild and trainer foes deal scaled damage (`WILD_FOE_DAMAGE_SCALE` 0.45, `TRAINER_FOE_DAMAGE_SCALE` 0.7). A starter can win a same-level fight.
- **Move mechanics.** Struggle recoil hurts the user instead of healing it, "damage+raise" moves raise the user's stats, and unsupported moves are no longer equipped. Species with no attack get Struggle. Species whose learnset starts above level 1 (for example Crabrawler) receive their first moves.
- **Trainer battles.** Enemy teams use the shared stats and IVs. When your Pokémon faints, the next selected one comes out.
- **Migration.** Repair refills only slots vacated by invalid moves, and level never drops when a save is repaired.

### Added

- **Quick Care panel on Play.** One tap for Revive (buys one if needed), send out the next healthy Pokémon, use the best potion, heal the whole team, or restock Poké Balls.
- **Battle presentation.** Letterbox wipe into wild battles, slide-in sprites, ball throw on catches, and idle breathing. All respect reduced motion.
- **Transparent battle power.** The appraisal panel shows the stats behind the Power number.

### Changed

- **Clearer pixel fonts.** Keeps Press Start 2P and Pixelify Sans, with larger minimum sizes and better contrast.
- **Battlefield layout.** Removed the dark band across the field, seated sprites on their platforms, and moved the trainer battle HUD so it no longer covers your Pokémon.
- **Narrow panels.** Party cards and Bag items no longer hide names or overlap counts at 280px.

### Tooling

- `tools/hostsim` runs the real widgets under RemNote's exact iframe sandbox flags.

## [1.4.0] - 2026-10-31

### Collection, Combat & Appraisal Revamp

- **Species & Learnsets**: Imported canonical battle stats, physical/special attack and defense split, and authentic species-specific level-up learnsets from pinned PokéAPI dataset across 905 species. Pokémon can learn legitimate coverage moves outside their elemental types.
- **Combat Mechanics**: Added genuine battle mechanics including status ailments (sleep, burn, freeze, paralysis, poison, confusion), stat stages (-6 to +6), flinching, healing moves, authentic Splash exceptions, and critical hit calculation.
- **Unified Battle Calculations**: Shared `battleStats` and `damageCeiling` logic across wild encounters, trainer battles, damage preview, and auto-attack knockout safety checks.
- **Individual Values (IVs) & Appraisal**: Introduced HP, Attack, and Defense IVs (rolled 1–3 equally), permanent across evolutions, storage, and reloads. Appraisal displays 3 stat bars and precise clipped stars (e.g. 2⅓ stars) with accessible text. IV multipliers (90%, 100%, 110%) scale calculated battle stats.
- **Party Power Up**: Added Power Up action previewing next level, stat increases, unlocked moves, and cash cost (`100 + 20L + 2L²` coins). Gated during active combat.
- **Defeat vs Catch Rewards**: Defeating a Pokémon awards substantially more money (250+ coins + level bonus) and full combat XP compared to catching.
- **High-Value Rewards & Bonuses**: Increased study review cash to 25 coins, expanded cash bonus rolls (Lucky find 350–850, Rare find 2,000–5,000, Jackpot 10,000–25,000 coins), and boosted trainer battle purses (600–2,000+ coins).
- **Type-Sharing Collection XP Boost**: Defeating or catching any Pokémon grants an XP resonance boost to all other caught Pokémon in your collection sharing a type, with a larger boost for party members and a minor boost for stored Pokémon.
- **Average Party Level Scaling**: Wild encounter levels dynamically scale based on the average level of all active party members.
- **Full-Party Catch Flow**: Wild and trainer catches with a full party present an in-place review on Play, allowing inspection of moves, stats, and IVs to swap a party member to storage or send the catch directly to storage.
- **Shiny Balance & Sprites**: Shiny odds baseline set to 1/250 with pacing compensation. Battlefield sprites grounded to platform positions.
- **Save Migration & Safety**: Version 5 migration creates a pre-v5 backup in storage (`STORAGE_KEY + '_pre_v5'`), assigns stable deterministic IVs to existing Pokémon, preserves nicknames, items, currencies, and shinies, and repairs invalid legacy moves into legal unlocked moves with historical move retention.

## [1.3.1] - 2026-10-07

- Added confirmed stone evolution in Party, with one-stone consumption, compatible-target previews, battle/faint/Everstone guards, preserved identity and shiny status, collection progress, and evolution rewards.
- Corrected 29 existing stone mappings against PokéAPI data; added Sun, Shiny, Dusk, and Dawn Stones with bundled icons, daily deals, and rare route drops.
- Revives remain always stocked, now cost 200 coins, and can appear in common route finds and all biome scrap tables. Need bias increases their availability for a fainted party without multiplying item quantities.
- Replaced arbitrary hue cycling with actual species-specific shiny front/back sprites across owned-Pokémon and encounter surfaces. Missing back sprites try the correct front variant before a neutral placeholder.
- Added a finite gold-star reveal/catch celebration that respects reduced motion. Regular shiny odds stay the same, while slower encounter pacing proportionally increases odds per encounter. v4 save format is unchanged.
- Automated evolution, save-preservation, revive-balance, and shiny-rendering tests added. Native animation timing is not independently verified.

## [1.3.0] - 2026-10-07

### Arcade revival

- Locally bundled Pixelify Sans and Press Start 2P fonts, consistent pixel typography, crisp framed chrome, and semantic battle/type colors.
- Full-panel management screens; persistent Play/Party/Bag/Dex navigation and an expandable Menu with all secondary destinations.
- Return to Play for pending encounters without dismissing them.
- Collapsible secondary status stats, achievement categories, inventory categories, and Settings guidance.
- Compact generation/type selectors, larger readable Pokédex labels, and a larger scrollable type matrix.
- Matching detail-sheet styles, simpler Settings hierarchy, reduced decorative shimmer, and integer movement feedback.
- Bag combines My items and Shop, with owned counts alongside purchases and readable unavailable items. Existing saved Shop destinations still open the Shop inside Bag.
- Larger navigation, type, and trainer lineup icons, shorter notices, and menu/disclosure/purchase feedback that respects reduced motion.
- Removed the Study companion / Compact view top strip; Compact view now lives in Settings > Display.
- Opt-in wild auto attack uses the strongest effective move and stops at its critical-hit knockout ceiling, when the lead faints, on a changed encounter, or on Stop/manual actions/navigation. Catch remains manual. Each turn reloads and checks the synced save under the existing write lock.
- Save schema remains v4. Normal attack randomness and existing progression are preserved. Automated safety and save compatibility checks pass. User-supplied native screenshots were inspected for the listing; auto-attack native interaction and animation timing were not independently verified.

## [1.2.1] - 2026-10-07

### Fixed

- Marketplace screenshot links now use immutable GitHub-hosted image URLs. The deployed RemNote asset URLs returned HTTP 403 despite the image files being present in the ZIP.
- Added `listing:check:remote` to verify every public image returns an image response whose bytes match the bundled screenshot.
- Gameplay and save schema remain the same as 1.2.0.

## [1.2.0] - 2026-10-07

A real expansion: trainer battles slot in as rare mini-bosses, XP Doublers stack and queue across sessions, achievements grow into long-term and prestige tiers (with full-generation completion rewards), the battle and reward UIs get a polish pass, and Settings gains a Ko-fi support card. No save migration friction — v3 saves load as v4 with all new fields safely defaulted.

### Polish pass — 2026-10-07

- Readable sans-serif menu and body text, quieter panels, larger controls, visible keyboard focus, and labeled responsive navigation.
- Compact study view retains encounter actions and lead HP while hiding the wild arena. The view preference is session-scoped and does not alter game saves.
- Shorter responsive arena, smaller status sprite, next-achievement milestone and adventure summary.
- Trainer turns animate after the save commits, with controls gated during the exchange; trainer moves now have complete button styling.
- Explicit save-loading and save-failure feedback, synchronous guards against duplicate battle clicks, sprite fallback reset when species changes, adaptive trek dots for long encounter rates, and low-HP meter colors.
- Skip a trainer challenge before locking a team, including an entirely fainted party; active battle restrictions remain intact.
- Plugin and OS reduced-motion preferences suppress motion throughout the sidebar.
- Added an isolated UI QA preview and preservation/rendering regression tests. Production entrypoints and CSS injection stay unchanged.

### Added

- **Trainer battles** as a rare mini-boss event that replaces a wild encounter on threshold (Off / Rare 100 / Normal 50 / Frequent 25 cards via new `pokerem.trainerBattleFrequency` setting). Pick 3 party Pokémon at battle start (locked in — no switching, healing, or items mid-battle); fight 3 themed enemies; on victory, choose 1 of the 3 to attempt to catch with a slightly boosted catch chance. **Elite trainers** appear as a rare prestige variant (~12% of trainer battles) with stronger scaling, evolved teams, guaranteed Rare XP Doubler reward, and a purple/gold visual treatment.
- **XP Doubler consumables** in three tiers — Common (25 cards), Rare (50 cards), Legendary (100 cards). Activate from Bag → Boosters; only one active at a time, additional doublers queue automatically. Doubles XP for every Pokémon that gains XP (lead and bench), tracked by card count, never trainer XP. Clear status + queue strip in Bag and a `x2 XP · N` chip in the battle header.
- **Long-term achievements & prestige** — new trainer-battle, party-growth, generation-completion, prestige, and 365-day streak achievements grouped into Daily / Milestone / Prestige buckets in Progress. Generation completion grants coins, a guaranteed Legendary XP Doubler, Ultra Balls, and a permanent prestige badge shown on the Status dashboard.
- **Claim-all** for visible unclaimed achievements, plus inline claim from main-battle notice banners.
- **Trainer-battle identity overlay** that layers progression titles (Rookie Challenger → Study Ace → Scholar Duelist → Elite Scholar → Champion Scholar) on top of the existing trainer-level rank as you accumulate trainer wins.
- **Ko-fi support card** at the top of Settings — gold button linking to https://ko-fi.com/pokerem with the message "Support the student that supports you and your studying." No popups, no nags.
- **What's New card** that appears once per version in the sidebar and dismisses to synced storage. Re-openable from Settings → About.

### Changed

- **Marketplace description** updated to communicate the full study-RPG loop (encounters, catching, party, trainer battles, XP doublers, shop, achievements) in one punchy line.
- **Battle and reward UIs** polished: HP and XP bars use smooth width transitions with subtle pulses, reward banners share a cleaner `RewardBanner` layout primitive with number count-up, the floating encounter popup gets tighter framing, and the Status screen is restructured as a quick study-RPG dashboard (identity / rank / prestige / today / closest goal). All animations respect the existing `pokerem.reducedMotion` setting.
- **Bag** gets a Boosters category at the top, surfacing the active XP Doubler countdown and queued doublers.

### Fixed

- **Queue completion dedupe** no longer treats every **table / list-style** flashcard completion as the same review when RemNote reuses one parent `remId` — keys now prefer `card._id` (and related instance ids) and suffix row/list/column-style fields when only rem-scoped ids exist.

### Notes for distributors

- Save schema bumped to v4 (additive only). v3 saves upgrade automatically — no data loss; new fields default to safe values. Style bundling unchanged (`style-loader` for all widget CSS), `PluginZip.zip` rebuilt fresh on `npm run build`.

## [1.1.3] - 2026-04-17

### Added

- **Party → Teachable moves**: browse moves **unlocked on the level-up learnset at the Pokémon’s current level**, short summaries, learn into an open slot, or replace a slot when full (opaque bottom-sheet UI in installed mode). Forgetting a move works from PC storage Pokémon as well.
- **Revive** always available in the Shop at **500** PokéCoins (no daily rotation); clearer faint vs heal rules and bag feedback when potions cannot heal fainted Pokémon.
- **Wild encounter pool** respects caught species until every encounterable species in enabled generations is caught; then duplicates return and **shiny rate becomes 1/200**.
- **Main battle notifications** for newly unlocked achievements and claimable trainer rewards (dismiss hides banner only; claim in Progress / Rewards).
- **Party-wide study XP** (weighted random per card) and **encounter-paced passive healing** with fractional carry; smoother **Pokémon XP curve** (early levels faster than the old flat 100 XP step).

### Changed

- **Learnsets** are now generated for every `FULL_POKEDEX` species from the move catalog with deterministic pacing, type-legal moves only (species typings + Normal), validation, and small hand-authored overrides (Magikarp, Ditto, Unown, Eeveelutions).
- **Status → Today’s stats (UTC)** replaces separate “This session” / “Today” panels; counts use the same `dailyStats` source as the rest of the pipeline.
- **Eeveelution learnsets** (Vaporeon, Jolteon, Flareon) corrected to proper Water / Electric / Fire progressions using existing move catalog entries.
- **Marketplace manifest description** — clearer value prop, how to open the panel from Flashcard Queue, and fan-project line (still under RemNote’s short-description length cap).

### Fixed

- **Run / retreat icon** vertical alignment with command labels.
- **Achievement fanfare** no longer only appears after claiming from Progress; unlocks surface in the main battle chrome.
- **Catch Scope** shop/bag icon: `key.png` was never shipped (404 in installed builds); icon now uses existing `master-ball.png`.
- **Combat tests** now pick the lead’s actual default battle move instead of assuming `Scratch` on Charmander.

## [1.1.2] - 2026-04-13

Marketplace **CSS delivery parity** with local development: production webpack now injects widget styles via `style-loader` (same as dev) so Tailwind and `style.css` apply when RemNote loads widget JS without sibling extracted `.css` files. Release metadata bumped to **1.1.2**.

### Fixed

- **Installed / marketplace widgets missing most theme styles** — separate `MiniCssExtractPlugin` `.css` files were not reliably loaded alongside widget bundles in the host iframe; styles are now bundled into each widget JS so they inject at runtime like localhost.

### Notes for distributors

- **`npm run build`** still removes `dist/`, runs production webpack, deletes any previous **`PluginZip.zip`**, then zips `dist/*` only (no stale zip).

## [1.1.1] - 2026-04-12

Marketplace **resubmit / parity** pass: aligned shipped metadata with in-app version label, ensured plugin listing icons ship as raster + SVG, tightened public-folder copy ignores, and added a single `npm run release` gate (types + tests + build).

### Fixed

- **`package.json` / `releaseMeta.ts` / `manifest.json` version drift** — all now use **1.1.1** so Settings → About, tab icon cache-bust query, and RemNote marketplace version match.

### Changed

- **`webpack` CopyPlugin** — ignore `.DS_Store` at `public/` root so production zips do not accidentally include Finder metadata.
- **`npm run release`** — runs `check-types`, `test`, then `build` before you upload a zip.

### Notes for distributors

- Keep **`public/logo.png`** and **`public/logo.svg`** in sync with branding; regenerate PNG via `npm run generate:logo` (Pillow). RemNote’s plugin card UI expects raster **`logo.png`** at bundle root alongside **`logo.svg`**.

## [0.2.0] - 2026-04-10

First **marketplace-oriented** public track: playable loop, documented assets, and explicit fan-project disclaimers.

### Added

- Wild encounters tied to review pacing; Catch / Fight / Run in the battle UI.
- RemNote **command palette** and **queue menu** actions that dispatch battle commands without focusing the plugin iframe.
- Trainer progression, achievements, bag, shop, party, Pokédex-style collection, type chart, and route-find flavor.
- **Export save as JSON** and **full progress reset** (with confirmation) from the in-plugin Settings tab.
- Legacy save migration from pre-rename synced storage key into `pokerem_game_v1`.
- Release documentation: `docs/ASSETS.md`, `docs/VERSIONING.md`, `docs/RELEASE_CHECKLIST.md`, `docs/SCOPE_AND_PRIVACY.md`, `ATTRIBUTION.md`, `public/assets/README.md`.

### Changed

- Battle interaction model centers on **sidebar controls + RemNote commands** (no custom global queue keybind layer).
- Root `README` expanded for developers and shippers; manifest description carries fan-disclaimer + attribution pointer.

### Notes for distributors

- Bundled raster art under `public/assets/` must ship with a clear license trail per `docs/ASSETS.md` / `ATTRIBUTION.md`.
- Party sprites load from **PokeAPI** when online; confirm their terms before publication.
