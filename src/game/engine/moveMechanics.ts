import { MOVES } from '../data/moves';
import { getEffectiveness } from '../data/typeChart';
import { battleStats } from './pokemonStats';
import type { PokemonIVs, BattleCondition } from '../state/model';
import type { PokemonType } from '../data/species';

export interface Fighter {
  dexNum: number;
  level: number;
  types: PokemonType[];
  currentHp: number;
  maxHp: number;
  ivs?: PokemonIVs;
  condition?: BattleCondition;
  name?: string;
  /** Your starter: its misses are halved. */
  isBuddy?: boolean;
}

const supportedAilments = new Set(['none', 'sleep', 'poison', 'burn', 'freeze', 'paralysis', 'confusion']);

export function isMoveSupported(m: any): boolean {
  if (!m) return false;
  if (m.id === 'splash' || m.id === 'struggle') return true;
  if (m.metaCategory === 'heal' && m.healing > 0 && !/wish|swallow|weather|sunlight/i.test(m.description ?? '')) return true;
  if (!m.metaCategory) return m.power > 0;
  if (!supportedAilments.has(m.ailment ?? 'none')) return false;
  if (['damage', 'damage+ailment', 'damage+lower', 'damage+raise', 'damage+heal'].includes(m.metaCategory)) {
    // Variable/fixed damage, charging, counters and bespoke effects need dedicated handlers.
    return (
      m.power > 0 &&
      !/two turns|next turn|first turn|charges|recharge|counter|twice the|user’s HP|user's HP|weather|consecutive|last move|random move|switch|faint|one.hit|OHKO|remaining HP|happiness|friendship|weight|stockpil|terrain|type changes/i.test(
        m.description ?? '',
      )
    );
  }
  return (
    ['ailment', 'net-good-stats', 'heal'].includes(m.metaCategory) &&
    (m.healing > 0 || (m.statChanges?.length ?? 0) > 0 || (m.ailment && m.ailment !== 'none')) &&
    !/weather|sunlight|stockpil|sacrifice|belly drum|switch|wish|next turn/i.test(m.description ?? '')
  );
}

const statLabel = (s: string): string =>
  (({ specialAttack: 'Sp. Atk', specialDefense: 'Sp. Def', attack: 'Attack', defense: 'Defense', speed: 'Speed', accuracy: 'accuracy', evasion: 'evasion' } as Record<string, string>)[s] ?? s);
/** Wild and trainer Pokémon hit softer than the lead so a same-level fight is winnable. */
export const WILD_FOE_DAMAGE_SCALE = 0.4;
export const TRAINER_FOE_DAMAGE_SCALE = 0.7;
const clampStage = (v: number) => Math.max(-6, Math.min(6, v));
const stage = (v = 0) => (v >= 0 ? (2 + v) / 2 : 2 / (2 - v));
const statName = (s: string): string =>
  (({ 'special-attack': 'specialAttack', 'special-defense': 'specialDefense' } as Record<string, string>)[s] ?? s);

export function damageCeiling(attacker: Fighter, defender: Fighter, id: string, critical = true): number {
  const m = MOVES[id] as any;
  if (!m || m.power <= 0 || !isMoveSupported(m)) return 0;
  const a = battleStats(attacker),
    d = battleStats(defender),
    special = m.category === 'special';
  const ac = attacker.condition?.stages as any,
    dc = defender.condition?.stages as any;
  const offense =
    (special ? a.specialAttack : a.attack) *
    stage(critical ? Math.max(0, ac?.[special ? 'specialAttack' : 'attack'] ?? 0) : ac?.[special ? 'specialAttack' : 'attack']);
  const defense =
    (special ? d.specialDefense : d.defense) *
    stage(critical ? Math.min(0, dc?.[special ? 'specialDefense' : 'defense'] ?? 0) : dc?.[special ? 'specialDefense' : 'defense']);
  const effectiveness = getEffectiveness(m.type, defender.types);
  if (effectiveness === 0) return 0;
  const stab = attacker.types.includes(m.type) ? 1.5 : 1;
  const burn = !special && attacker.condition?.ailment === 'burn' ? 0.5 : 1;
  const base = Math.floor(((Math.floor((2 * attacker.level) / 5) + 2) * m.power * offense) / Math.max(1, defense) / 50) + 2;
  return Math.max(1, Math.floor(base * stab * effectiveness * (critical ? 1.5 : 1) * burn)) * Math.max(1, m.maxHits ?? 1);
}

function actionAllowed(f: Fighter, rng: () => number, log: string[]): boolean {
  const c = f.condition!;
  if ((c as any).flinch) {
    delete (c as any).flinch;
    log.push(`${f.name ?? 'Pokémon'} flinched.`);
    return false;
  }
  if (c.ailment === 'sleep') {
    c.turns = (c.turns ?? 2) - 1;
    if (c.turns > 0) {
      log.push(`${f.name ?? 'Pokémon'} is asleep.`);
      return false;
    }
    delete c.ailment;
  }
  if (c.ailment === 'freeze') {
    if (rng() < 0.2) delete c.ailment;
    else {
      log.push(`${f.name ?? 'Pokémon'} is frozen.`);
      return false;
    }
  }
  if (c.ailment === 'paralysis' && rng() < 0.25) {
    log.push(`${f.name ?? 'Pokémon'} is paralyzed.`);
    return false;
  }
  if ((c.confusion ?? 0) > 0) {
    c.confusion!--;
    if (rng() < 1 / 3) {
      const hurt = Math.max(1, Math.floor(f.maxHp / 12));
      f.currentHp = Math.max(0, f.currentHp - hurt);
      log.push(`${f.name ?? 'Pokémon'} hurt itself in confusion.`);
      return false;
    }
  }
  return true;
}

export function resolveExchange(
  player: Fighter,
  wild: Fighter,
  playerMove: string,
  wildMove: string,
  key: string,
  rng: () => number = Math.random,
  protectWild = false,
  foeDamageScale = 1,
) {
  const clone = (f: Fighter): Fighter => ({
    ...f,
    condition: f.condition?.key === key ? { ...f.condition, stages: { ...f.condition.stages } } : { key, stages: {} },
  });
  const p = clone(player),
    w = clone(wild),
    log: string[] = [];
  let pDamage = 0,
    wDamage = 0;
  const act = (a: Fighter, d: Fighter, id: string, isPlayer: boolean) => {
    if (a.currentHp <= 0 || d.currentHp <= 0 || !actionAllowed(a, rng, log)) return;
    const m = MOVES[id] as any;
    if (!isMoveSupported(m)) {
      log.push('That move is not available in this battle system.');
      return;
    }
    if (isPlayer && protectWild && damageCeiling(a, d, id, true) >= d.currentHp) {
      log.push('Within knockout range — try Catch!');
      return;
    }
    log.push(`${a.name ?? 'Pokémon'} used ${m.name}!`);
    const ac = a.condition!.stages as any,
      dc = d.condition!.stages as any;
    const raw = (m.accuracy ?? 100) * stage((ac?.accuracy ?? 0) - (dc?.evasion ?? 0));
    // Buddy: half the miss chance, so 70% accuracy hits 85% of the time.
    const accuracy = a.isBuddy && raw < 100 ? 100 - (100 - raw) / 2 : raw;
    if (m.accuracy != null && rng() * 100 >= accuracy) {
      log.push('The attack missed!');
      return;
    }
    if (m.id === 'splash') {
      log.push('But nothing happened.');
      return;
    }
    const critRates = [1 / 24, 1 / 8, 1 / 2, 1];
    const crit = rng() < critRates[Math.min(3, m.critRate ?? 0)];
    const maxHits = Math.max(1, m.maxHits ?? 1),
      minHits = Math.max(1, m.minHits ?? maxHits);
    const hits = minHits + Math.floor(rng() * (maxHits - minHits + 1));
    const rawDamage = m.power > 0 ? Math.max(0, Math.floor((damageCeiling(a, d, id, crit) / maxHits) * hits)) : 0;
    const damage = !isPlayer && rawDamage > 0 ? Math.max(1, Math.floor(rawDamage * foeDamageScale)) : rawDamage;
    if (damage > 0 && crit) log.push('A critical hit!');
    const eff = m.power > 0 ? getEffectiveness(m.type, d.types) : 1;
    if (m.power > 0 && eff === 0) log.push(`It doesn't affect ${d.name ?? 'the target'}...`);
    else if (eff > 1) log.push("It's super effective!");
    else if (eff > 0 && eff < 1) log.push("It's not very effective...");
    const taken = Math.min(d.currentHp, damage);
    d.currentHp -= taken;
    if (isPlayer) pDamage = taken;
    else wDamage = taken;
    if (m.drain) {
      const delta = Math.round((taken * m.drain) / 100);
      a.currentHp = Math.max(0, Math.min(a.maxHp, a.currentHp + delta));
    }
    if (m.healing > 0) a.currentHp = Math.min(a.maxHp, a.currentHp + Math.max(1, Math.floor((a.maxHp * m.healing) / 100)));
    if (m.healing < 0) a.currentHp = Math.max(0, a.currentHp - Math.max(1, Math.floor((a.maxHp * -m.healing) / 100)));
    if (m.flinchChance && rng() * 100 < m.flinchChance) {
      (d.condition as any).flinch = true;
    }
    // "damage+raise" moves change the user's stats even though they target the foe
    // (Power-Up Punch raises, Close Combat lowers). A stored chance of 0 means "always".
    const self = m.metaCategory === 'damage+raise' || ['user', 'users-field', 'user-and-allies', 'all-allies'].includes(m.target);
    const chance = m.category === 'status' ? 100 : m.effectChance || m.statChance || 100;
    if (rng() * 100 < chance) {
      for (const change of m.statChanges ?? []) {
        const target = self ? a : d,
          stat = statName(change.stat);
        const stages = target.condition!.stages as any;
        stages[stat] = clampStage((stages[stat] ?? 0) + change.change);
        log.push(`${target.name ?? 'Pokémon'}'s ${statLabel(stat)} ${change.change > 0 ? 'rose' : 'fell'}.`);
      }
    }
    if (m.ailment && m.ailment !== 'none' && rng() * 100 < (m.ailmentChance || 100)) {
      const target = self ? a : d;
      if (m.ailment === 'confusion') {
        target.condition!.confusion = 2 + Math.floor(rng() * 3);
        log.push(`${target.name ?? 'The target'} became confused.`);
      } else if (
        !target.condition!.ailment &&
        !(m.ailment === 'burn' && target.types.includes('Fire')) &&
        !(m.ailment === 'poison' && (target.types.includes('Poison') || target.types.includes('Steel'))) &&
        !(m.ailment === 'paralysis' && target.types.includes('Electric')) &&
        !(m.ailment === 'freeze' && target.types.includes('Ice'))
      ) {
        target.condition!.ailment = m.ailment;
        target.condition!.turns = 2 + Math.floor(rng() * 3);
        log.push(`${target.name ?? 'The target'} is affected by ${m.ailment}.`);
      }
    }
  };
  const priority = (id: string) => (MOVES[id] as any)?.priority ?? 0;
  const speed = (f: Fighter) =>
    battleStats(f).speed * stage(f.condition?.stages?.speed) * (f.condition?.ailment === 'paralysis' ? 0.5 : 1);
  const playerFirst =
    priority(playerMove) > priority(wildMove) ||
    (priority(playerMove) === priority(wildMove) && speed(p) >= speed(w));
  if (playerFirst) {
    act(p, w, playerMove, true);
    act(w, p, wildMove, false);
  } else {
    act(w, p, wildMove, false);
    act(p, w, playerMove, true);
  }
  for (const f of [p, w]) {
    delete (f.condition as any).flinch;
    if (f.currentHp > 0 && ['poison', 'burn'].includes(f.condition!.ailment ?? '')) {
      const residual = Math.max(1, Math.floor(f.maxHp / (f.condition!.ailment === 'burn' ? 16 : 8)));
      f.currentHp = Math.max(0, f.currentHp - residual);
      log.push(`${f.name ?? 'Pokémon'} takes ${residual} status damage.`);
    }
  }
  // Protected wilds (auto attack, shiny legendaries) can't be knocked out by status, confusion or recoil either.
  if (protectWild && w.currentHp <= 0) w.currentHp = 1;
  return { player: p, wild: w, pDamage, wDamage, log: log.join(' '), playerFirst };
}
