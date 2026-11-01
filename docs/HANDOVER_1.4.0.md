# PokéRem 1.4.0 — Agent Handover & Architecture Document

> **Superseded in part by [`HANDOVER_1.4.1.md`](HANDOVER_1.4.1.md).** 1.4.0 could not save inside RemNote because of Web Locks, despite the "Complete, Tested" status below. Read the 1.4.1 hand-off first.

**Date:** October 31, 2026  
**Version:** 1.4.0 (Schema Version: 5)  
**Status:** Complete, Tested (141 tests passing), Built (`PluginZip.zip` and `Release 1.4.0.zip` ready)

---

## 1. Executive Summary & Continuity

This handover document provides a clear, fluid transition guide for Codex or any subsequent development session. All features of the **PokéRem 1.4.0 — Collection and Battle Revamp** plan and the user's specific additional requirements have been implemented, tested, and packaged.

### Key Additions & Requirements Implemented:
1. **User Progress Preservation**:
   - Version 5 migration loads v1, v2, v3, and v4 saves seamlessly without losing any nicknames, XP, levels, shinies, items, currencies, stats, or pending catches.
   - A durable pre-v5 backup is automatically saved to storage key `pokerem_game_v1_pre_v5` prior to applying any v5 state transitions.
   - Stable, deterministic ID-derived random IVs (`stableIVs(mon.id)`) are assigned to legacy Pokémon so subsequent loads never reroll.
   - Invalid legacy moves are repaired into unlocked legal moves while preserving historical choices in `legacyMoves`. Legal moves from pre-evolutions are preserved.
2. **Defeat vs Catch Rewards**:
   - Defeating a Pokémon awards substantially more currency (`CURRENCY_REWARDS.defeat` = 250 + `level * 10` coins) than catching (100 coins).
   - Defeating awards full combat XP to the active battler (`computeDefeatXp`), whereas capturing awards 0 combat XP to the active Pokémon.
3. **High-Value Currency & Bonuses**:
   - Flashcard review reward increased to 25 coins.
   - Study cash bonus rolls revamped with much higher rewards:
     - **Jackpot** (0.05%): 10,000 – 25,000 coins.
     - **Rare find** (0.5%): 2,000 – 5,000 coins.
     - **Lucky find** (4%): 350 – 850 coins.
   - Trainer battle victories awarded significantly increased coins: 1,500+ coins for Elite trainers and 600+ coins for Standard trainers.
4. **Type-Sharing Collection XP Boost**:
   - `applyTypeShareXpBoost`: When a Pokémon is defeated or caught, every other caught Pokémon in your collection (both party and storage) that shares an elemental type with the defeated/caught Pokémon receives an XP boost.
   - Party members receive a **larger XP boost** (`Math.max(15, 15 + level * 2)`).
   - Stored Pokémon receive a **minor XP boost** (`Math.max(5, 5 + level * 0.5)`).
   - Fully integrated into wild combat defeat, wild capture, trainer battle enemy defeat, and trainer battle capture.
5. **Encounter Level Scaling Based on Average Party Level**:
   - `averagePartyLevel(party)` accurately computes the rounded mean level of all current party members.
   - Wild encounters and trainer battle enemy levels scale directly from this average party level with small randomized variance (±1) and tier skews.
6. **Canonical Species Stats & Learnsets**:
   - 905 canonical Pokémon species imported with real base stats (HP, Attack, Defense, Special Attack, Special Defense, Speed).
   - Distinguishes Physical and Special moves/stats.
   - Canonical level-up learnsets pinned from PokéAPI preferring SV/SwSh, allowing legitimate coverage moves outside elemental typing.
7. **Mechanics & Combat Engine**:
   - Unified `battleStats` and `damageCeiling` calculation across wild encounters, trainer battles, damage preview, and auto-attack knockout safety checks.
   - Real status ailments (sleep, burn, freeze, paralysis, poison, confusion), stat stages (-6 to +6), flinch, healing moves, Splash exceptions.
8. **IVs, Appraisal & Power Ups**:
   - HP, Attack, Defense IVs (1–3), scaling stats by 90%, 100%, and 110%.
   - In-game appraisal showing 3 stat bars and precise clipped stars (e.g. 2⅓ stars) with accessible numeric labels.
   - Party **Power Up** action previewing next level, stat increases, unlocked moves, and coin cost (`100 + 20L + 2L²`), capped at level 100 and blocked during active combat.
9. **Full-Party Catch Flow on Play**:
   - Catching with a full party remains in-place on the Play view with expandable detail views for moves, HP, level, and IVs.
   - Options to replace a party member (sending to storage) or send the catch directly to storage. Preserved across reloads; Pokémon are never discarded.
10. **Shiny Balance & Sprites**:
    - Regular shiny odds baseline set to 1/250, with proportional pacing compensation (1/125 at half frequency).
    - Grounded battlefield sprites anchored to platform positions.

---

## 2. Key Codebase Files & Map

| File Path | Description / Role |
| :--- | :--- |
| `src/game/state/model.ts` | Schema v5 definitions: `PokemonIVs`, `BattleCondition`, `OwnedPokemon.ivs`, `PokeRemGameState.lastStudyReward`. |
| `src/game/state/store.ts` | Core state reducers, v5 save migration (`parseGameState`, `normalizeOwned`), `defeatEncounter`, `applyCatchSuccess`, `catchEncounter`, `powerUpPokemon`, `applyTypeShareXpBoost`, `rollStudyCashBonus`. |
| `src/game/engine/pokemonStats.ts` | Canonical `battleStats`, `damageCeiling`, `ivsFor`, `stableIVs`, `rollIVs`, `ivMultiplier`, `powerUpCost`, `powerUpPreview`. |
| `src/game/engine/moveMechanics.ts` | Turn resolution (`resolveExchange`), ailment turns, stat stage clamps, accuracy checks, flinching, priority, and critical hit odds. |
| `src/game/engine/encounters.ts` | Wild encounter generator with `averagePartyLevel` scaling, 1/250 shiny odds, and pacing compensation. |
| `src/game/engine/trainerBattles.ts` | Trainer battle generation, archetype teams, party level scaling, and scaled coin/item rewards. |
| `src/game/engine/shop.ts` | `CURRENCY_REWARDS` balance: `defeat: 250`, `catch: 100`, `review: 25`, `run: 25`. |
| `src/game/constants.ts` | `getSyncedGameRaw` with automated durable pre-v5 backup to `pokerem_game_v1_pre_v5`. |
| `src/game/state/syncedGameWriteLock.ts` | Mutual exclusion lock leveraging Web Locks API (`navigator.locks`) when available. |
| `src/ui/components/PokemonAppraisal.tsx` | IV bars, partial clipped stars display, accessible aria labels. |
| `src/ui/components/SpeciesBadge.tsx` | Badges and classification styling for Legendary, Mythical, and Ultra Beast species. |
| `src/ui/components/PokemonSprite.tsx` | Canvas-assisted grounded platform placement for battle sprites. |
| `src/ui/battle/BattleReviewSurface.tsx` | Arena review UI with full-party catch choice drawer and grounded sprites. |
| `src/ui/screens/PartyScreen.tsx` | Party screen with Power Up previews, move slot selection, appraisal, favorites, and sorting. |
| `src/game/state/userRequestsV5.test.ts` | Test suite covering all 5 user specific requirements. |

---

## 3. Testing and Verification

All 22 test files and 141 individual unit and regression tests pass cleanly:
```bash
$ npm test
✓ 22 test files passed (141 tests)
```

TypeScript type-checking passes cleanly with zero errors:
```bash
$ npm run check-types
> tsc
```

Version alignment passes across all required files:
```bash
$ npm run version:check
✓ public/manifest.json (canonical): 1.4.0
✓ package.json version: 1.4.0
✓ package-lock.json root .version: 1.4.0
✓ package-lock.json packages[''].version: 1.4.0
✓ src/releaseMeta.ts POKEREM_VERSION: 1.4.0
All plugin release versions aligned on 1.4.0
```

Production build generates clean zip packages:
- `PluginZip.zip` in `/Users/jostneilson/Remnote Ankimon/remnote-plugin/`
- `Release 1.4.0.zip` in `/Users/jostneilson/Development/Projects/PokeRem/`
