import { DAILY_FIRST_COINS, DAILY_FIRST_XP_MULT, isDailyFirst, markDaily } from '../../engine/daily';
import { STORAGE_FULL_MESSAGE, catchBlockedByStorage } from '../../engine/capacity';
import { BALANCE, defeatCoins as defeatCoinsFor, themeMult } from '../../balance';
import { resolveExchange, WILD_FOE_DAMAGE_SCALE } from '../../engine/moveMechanics';
import { isGuaranteedCatch, wildCatchChancePreview } from '../../engine/encounters';
import { getInitialMoves, movesetForBattle } from '../../engine/moveLearn';
import { MOVES } from '../../data/moves';
import { CURRENCY_REWARDS } from '../../engine/shop';
import { getEffectiveness } from '../../data/typeChart';
import { xpFromPlayerAttack, xpFromTakingHit } from '../../engine/combatXp';
import { TRAINER_XP_SOURCES } from '../../engine/trainerLevel';
import { isBuddy, scaledXp, splitKnockoutXp } from '../../engine/xpShare';
import { rollPostBattleScrap } from '../../engine/routeFinds';
import { moveDisplayName } from '../../engine/combatExchange';
import { chooseFoeMove } from '../../engine/foeAi';
import type {
  PokeRemGameState,
  BattleResult,
  BattleOutcomeKind,
  CombatStrikeSnapshot,
  OwnedPokemon,
} from '../model';
import {
  activePokemon,
  addTrainerXp,
  applyTypeShareXpBoost,
  battleResult,
  bestMoveAgainst,
  computeDefeatXp,
  grantCatch,
  growPokemonWithXp,
  isTrainerBattleActive,
  resetWildIdle,
  withTouch,
} from './core';
import { applyRouteFindToState, bumpBattleOutcome, sanitizeEncounterHp } from './persistence';

export function catchEncounter(
  state: PokeRemGameState,
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball' = 'poke-ball'
): PokeRemGameState {
  return resetWildIdle(state, catchEncounterInner(state, ball));
}

function catchEncounterInner(
  state: PokeRemGameState,
  ball: 'poke-ball' | 'great-ball' | 'ultra-ball'
): PokeRemGameState {
  if (!state.currentEncounter) return state;
  if (catchBlockedByStorage(state, state.currentEncounter)) {
    return withTouch({ ...state, ...bumpBattleOutcome(state, 'none', STORAGE_FULL_MESSAGE) });
  }
  const count = state.bag[ball] ?? 0;
  if (count <= 0) {
    return withTouch({
      ...state,
      ...bumpBattleOutcome(state, 'no_balls', 'No balls left!'),
    });
  }

  const enc = state.currentEncounter;
  const success = Math.random() < wildCatchChancePreview(enc, activePokemon(state), ball);
  const decremented = { ...state.bag, [ball]: Math.max(0, count - 1) };
  if (!success) {
    return withTouch({
      ...state,
      bag: decremented,
      ...bumpBattleOutcome(state, 'catch_fail', `${enc.name} broke free!`),
    });
  }

  return grantCatch(
    { ...state, bag: decremented, currentEncounter: null, selectedTab: 'status' },
    enc
  );
}

/** After full-party catch: swap `replacePartyPokemonId` out to storage for `pendingCaughtMon`. */
export function resolvePendingCaughtReplace(
  state: PokeRemGameState,
  replacePartyPokemonId: string
): PokeRemGameState {
  const incoming = state.pendingCaughtMon;
  if (!incoming) return state;
  const idx = state.party.findIndex((p) => p.id === replacePartyPokemonId);
  if (idx < 0) return state;
  const outgoing = state.party[idx]!;
  const party = [...state.party];
  party[idx] = incoming;
  const storagePokemon = [...state.storagePokemon, outgoing];
  let activePokemonId = state.activePokemonId;
  if (activePokemonId === replacePartyPokemonId) {
    activePokemonId = incoming.id;
  }
  const outName = outgoing.nickname || outgoing.name;
  const inName = incoming.nickname || incoming.name;
  return withTouch({
    ...state,
    party,
    storagePokemon,
    activePokemonId,
    pendingCaughtMon: null,
    selectedTab: 'status',
    ...bumpBattleOutcome(
      state,
      'catch_success',
      `${inName} is in your party. ${outName} → storage.`
    ),
  });
}

/** Send pending caught Pokémon to storage without swapping (user declined to replace). */
export function cancelPendingCaught(state: PokeRemGameState): PokeRemGameState {
  const incoming = state.pendingCaughtMon;
  if (!incoming) return state;
  const name = incoming.nickname || incoming.name;
  return withTouch({
    ...state,
    pendingCaughtMon: null,
    storagePokemon: [...state.storagePokemon, incoming],
    selectedTab: 'status',
    ...bumpBattleOutcome(state, 'none', `${name} was sent to storage (party stayed full).`),
  });
}

export function applyCombatTurn(
  state: PokeRemGameState,
  moveId?: string,
  protectWild = false
): PokeRemGameState {
  return resetWildIdle(state, applyCombatTurnInner(state, moveId, protectWild));
}

function applyCombatTurnInner(
  state: PokeRemGameState,
  moveId?: string,
  protectWild = false
): PokeRemGameState {
  const enc0 = state.currentEncounter;
  if (!enc0) return state;
  const enc = sanitizeEncounterHp(enc0);
  // A shiny Legendary can never be knocked out or lost: it waits until you catch it.
  const guaranteed = isGuaranteedCatch(enc);
  // The Leader's prize can't be knocked out either: you catch it or give it up.
  protectWild = protectWild || guaranteed || enc.pendingPrize === true;

  let aid = state.activePokemonId;
  if (!aid && state.party.length > 0) {
    return applyCombatTurn({ ...state, activePokemonId: state.party[0]!.id }, moveId, protectWild);
  }
  if (!aid) return state;

  const activeIdx = state.party.findIndex((p) => p.id === aid);
  if (activeIdx < 0) return state;
  const active = state.party[activeIdx]!;
  if (active.currentHp <= 0) return state;

  const legalMoves = movesetForBattle(active);
  if (legalMoves.length === 0) return state;

  let chosen: string;
  if (moveId) {
    if (!legalMoves.includes(moveId)) return state;
    chosen = moveId;
  } else {
    const pick = bestMoveAgainst(active, enc, legalMoves);
    if (!pick) return state;
    chosen = pick;
  }

  const wildMove = chooseFoeMove(
    enc,
    active,
    getInitialMoves(enc.dexNum, enc.level),
    Math.random,
    'wild'
  );
  const key = `wild:${enc.dexNum}:${enc.level}:${state.battleSceneIndex}:${state.totalCaught}:${state.totalDefeated}:${state.totalRuns}`;
  const exchange = resolveExchange(
    { ...active, isBuddy: isBuddy(state, active) },
    enc,
    chosen,
    wildMove,
    key,
    Math.random,
    protectWild,
    WILD_FOE_DAMAGE_SCALE
  );
  const xp = scaledXp(
    state,
    active,
    (xpFromPlayerAttack({ damage: exchange.pDamage, moveId: chosen, defenderTypes: enc.types }) +
      xpFromTakingHit({ damage: exchange.wDamage, wildMoveId: wildMove, playerTypes: active.types })) *
      BALANCE.xp.fightMult
  );
  const grown = growPokemonWithXp(active, xp).pokemon;
  const updated = {
    ...grown,
    currentHp: Math.max(0, Math.min(grown.maxHp, exchange.player.currentHp)),
    condition: exchange.player.condition,
  };
  const party = state.party.map((p, i) => (i === activeIdx ? updated : p));
  const snap = {
    playerMoveId: chosen,
    wildMoveId: wildMove,
    playerDamage: exchange.pDamage,
    wildDamage: exchange.wDamage,
    playerEffectiveness: getEffectiveness(MOVES[chosen]!.type, enc.types),
    wildEffectiveness: getEffectiveness(MOVES[wildMove]!.type, active.types),
  };
  // Any shiny (and every shiny Legendary) waits for your next Pokémon instead of fleeing.
  if (exchange.player.currentHp <= 0 && (guaranteed || enc.shiny === true || enc.pendingPrize === true))
    return withTouch({
      ...state,
      party,
      currentEncounter: { ...enc, ...exchange.wild },
      ...bumpBattleOutcome(
        state,
        'faint',
        exchange.log +
          ` Your lead fainted, but ${enc.name} is still here. Send out another Pokémon or throw a ball!`,
        snap
      ),
    });
  if (exchange.player.currentHp <= 0)
    return withTouch({
      ...state,
      party,
      currentEncounter: null,
      selectedTab: 'status',
      ...bumpBattleOutcome(
        state,
        'faint',
        exchange.log + ' Your lead fainted; the wild Pokémon fled.',
        snap
      ),
    });
  if (exchange.wild.currentHp <= 0)
    return defeatEncounter(
      { ...state, party, currentEncounter: { ...enc, currentHp: 0 } },
      {
        finisher: {
          moveId: chosen,
          displayName: moveDisplayName(chosen),
          damage: exchange.pDamage,
          effectiveness: snap.playerEffectiveness,
        },
        resultFrom: active,
      }
    );
  return withTouch({
    ...state,
    party,
    currentEncounter: { ...enc, ...exchange.wild },
    ...bumpBattleOutcome(state, 'combat', exchange.log, snap),
  });
}

export type DefeatFinisher = {
  moveId: string;
  displayName: string;
  damage: number;
  effectiveness: number;
};

export function defeatEncounter(
  state: PokeRemGameState,
  opts?: { finisher?: DefeatFinisher; resultFrom?: OwnedPokemon }
): PokeRemGameState {
  if (!state.currentEncounter) return state;
  const finisher = opts?.finisher;
  const wildName = state.currentEncounter.name;
  if (!state.activePokemonId) {
    return withTouch({
      ...state,
      currentEncounter: null,
      selectedTab: 'status',
      totalDefeated: (state.totalDefeated ?? 0) + 1,
      ...bumpBattleOutcome(state, 'defeat', `${wildName} fled — no active lead.`),
    });
  }
  // XP Share: the lead keeps 60% of the knockout XP, the bench shares the rest.
  // Daily first defeat: ×3 XP and ₽500 (SPEC B3).
  const firstToday = isDailyFirst(state, 'firstDefeat');
  const koShares = splitKnockoutXp(
    computeDefeatXp(state) * (firstToday ? DAILY_FIRST_XP_MULT : 1),
    state.party,
    state.activePokemonId
  );
  let xpGain = 0;
  let leveledUp = false;
  let evolvedMon: OwnedPokemon | null = null;
  let evolvedFromName = '';
  let leadBefore: OwnedPokemon | null = null;
  let leadAfter: OwnedPokemon | null = null;
  const party = state.party.map((p) => {
    const share = koShares.get(p.id) ?? 0;
    if (p.id !== state.activePokemonId) return share > 0 ? growPokemonWithXp(p, scaledXp(state, p, share)).pokemon : p;
    xpGain = scaledXp(state, p, share);
    const grown = growPokemonWithXp(p, xpGain);
    // The finishing turn may already have levelled the lead from attack XP; measure the card from before that turn.
    leadBefore = opts?.resultFrom?.id === p.id ? opts.resultFrom : p;
    leadAfter = grown.pokemon;
    if (grown.leveledUp || grown.pokemon.level > (leadBefore as OwnedPokemon).level)
      leveledUp = true;
    if (grown.evolvedMon) {
      evolvedMon = grown.evolvedMon;
      evolvedFromName = grown.evolvedFromName;
    }
    return grown.pokemon;
  });

  let narr: string;
  let outcome: BattleOutcomeKind = 'defeat';
  if (evolvedMon) {
    narr = `${evolvedFromName} evolved into ${(evolvedMon as OwnedPokemon).name}!`;
    outcome = 'evolution';
  } else if (leveledUp) {
    narr = `${wildName} defeated! +${xpGain} XP — ${(leadAfter as OwnedPokemon | null)?.nickname || (leadAfter as OwnedPokemon | null)?.name} grew to Lv ${(leadAfter as OwnedPokemon | null)?.level}!`;
  } else {
    narr = `${wildName} defeated! +${xpGain} XP`;
  }

  if (finisher && outcome === 'defeat') {
    const effBit =
      finisher.effectiveness >= 2
        ? 'Super! '
        : finisher.effectiveness > 0 && finisher.effectiveness < 1
          ? 'Resisted. '
          : finisher.effectiveness <= 0
            ? 'No effect. '
            : '';
    narr = `${effBit}${finisher.displayName} −${finisher.damage} HP · ${narr}`;
  }

  const strikeForBump: CombatStrikeSnapshot | null =
    finisher && outcome === 'defeat'
      ? {
          playerMoveId: finisher.moveId,
          wildMoveId: finisher.moveId,
          playerDamage: finisher.damage,
          playerEffectiveness: finisher.effectiveness,
          wildDefeated: true,
        }
      : null;

  // Theme bonus (SPEC A12): ×1.25 defeat coins, trainer XP and type-share XP when the theme matches.
  const theme = themeMult(state.themeActive, state.currentEncounter.types);
  let trainerXpGain = Math.round(TRAINER_XP_SOURCES.defeat * theme);
  if (leveledUp) trainerXpGain += TRAINER_XP_SOURCES.levelUp;
  if (evolvedMon) trainerXpGain += TRAINER_XP_SOURCES.evolution;

  const defeatCoins =
    Math.round(defeatCoinsFor(state.currentEncounter.level, state.currentEncounter.dexNum) * theme) +
    (state.currentEncounter.bounty ?? 0) +
    (firstToday ? DAILY_FIRST_COINS : 0);
  const typeBoost = applyTypeShareXpBoost(
    party,
    state.storagePokemon,
    state.currentEncounter.types,
    state.activePokemonId,
    state.currentEncounter.level,
    state,
    theme
  );

  let afterDefeat: PokeRemGameState = {
    ...state,
    party: typeBoost.party,
    storagePokemon: typeBoost.storagePokemon,
    currentEncounter: null,
    selectedTab: 'status',
    totalDefeated: (state.totalDefeated ?? 0) + 1,
    totalEvolutions: (state.totalEvolutions ?? 0) + (evolvedMon ? 1 : 0),
    daily: markDaily(state, 'firstDefeat'),
    currency: (state.currency ?? 0) + defeatCoins,
    totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + defeatCoins,
    ...bumpBattleOutcome(state, outcome, narr, strikeForBump),
    achievements: {
      ...state.achievements,
      firstLevelUp: state.achievements.firstLevelUp || leveledUp,
    },
    lastBattleResult:
      leadBefore && leadAfter
        ? withThemeTag(battleResult(
            state,
            'defeat',
            state.currentEncounter,
            leadBefore,
            leadAfter,
            xpGain,
            defeatCoins,
            evolvedMon ? (evolvedMon as OwnedPokemon).name : undefined
          ), theme > 1 ? state.themeActive : undefined)
        : null,
  };

  const scrap = rollPostBattleScrap(afterDefeat);
  if (scrap) afterDefeat = applyRouteFindToState(afterDefeat, scrap);

  return withTouch(addTrainerXp(afterDefeat, trainerXpGain));
}

/**
 * Run from the wild Pokémon. The Rocket Leader's prize only goes when `giveUpPrize` is set (the sidebar's
 * confirmed "Give up"), so a stray Run from the queue strip or a shortcut can't lose it.
 */
export function runFromEncounter(state: PokeRemGameState, giveUpPrize = false): PokeRemGameState {
  if (!state.currentEncounter) return state;
  const name = state.currentEncounter.name;
  if (state.currentEncounter.pendingPrize && !giveUpPrize)
    return withTouch({
      ...state,
      ...bumpBattleOutcome(state, 'none', `${name} is the Leader’s prize. To give it up, use Run in the sidebar and confirm.`),
    });
  return withTouch(
    addTrainerXp(
      {
        ...state,
        currentEncounter: null,
        selectedTab: 'status',
        totalRuns: (state.totalRuns ?? 0) + 1,
        currency: (state.currency ?? 0) + CURRENCY_REWARDS.run,
        totalCurrencyEarned: (state.totalCurrencyEarned ?? 0) + CURRENCY_REWARDS.run,
        ...bumpBattleOutcome(state, 'run', `Ran from ${name}.`),
      },
      TRAINER_XP_SOURCES.run
    )
  );
}

export function switchActivePokemon(state: PokeRemGameState, pokemonId: string): PokeRemGameState {
  if (isTrainerBattleActive(state)) return state;
  const found = state.party.some((p) => p.id === pokemonId);
  if (!found) return state;
  return withTouch({ ...state, activePokemonId: pokemonId, selectedTab: 'status' });
}

/** Tag a result card with the theme whose bonus applied. */
function withThemeTag(r: BattleResult, theme: string | undefined): BattleResult {
  return theme ? { ...r, themeBonus: theme } : r;
}
