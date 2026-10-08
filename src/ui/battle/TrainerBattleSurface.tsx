import { useTrainerPresentation } from '../hooks/useTrainerPresentation';
import { useMemo, useState } from 'react';
import type {
  OwnedPokemon,
  PokeRemGameState,
  TrainerBattleState,
  TrainerEnemyMon,
} from '../../game/state/model';
import { backSpriteUrl, frontSpriteUrl, itemIconUrl } from '../../game/sprites';
import { PokemonSprite } from '../components/PokemonSprite';
import { movesetForBattle } from '../../game/engine/moveLearn';
import { MOVES } from '../../game/data/moves';
import { trainerCatchChance } from '../../game/engine/trainerBattles';
import { battleSceneBackgroundStyle } from '../../game/engine/battleAmbience';

interface BallPrice {
  id: 'poke-ball' | 'great-ball' | 'ultra-ball';
  price: number;
  unlocked: boolean;
}

interface Props {
  state: PokeRemGameState;
  rootURL?: string;
  reducedMotion: boolean;
  busy?: boolean;
  onLockTeam: (ids: string[]) => void;
  onCombatTurn: (moveId?: string) => void;
  onClaimCatch: (enemyIndex: number, ball: 'poke-ball' | 'great-ball' | 'ultra-ball') => void;
  onDismissCatchOffer: () => void;
  onBuyBall: (id: 'poke-ball' | 'great-ball' | 'ultra-ball', price: number) => void;
  onClose: () => void;
  ballPrices: BallPrice[];
}

const TIER_ACCENT: Record<
  'standard' | 'elite',
  { glow: string; ribbon: string; label: string; accent: string; pillFill: string }
> = {
  standard: {
    glow: 'rgba(96,165,250,0.45)',
    ribbon: 'linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)',
    label: 'Trainer',
    accent: '#93c5fd',
    pillFill: 'linear-gradient(180deg,#93c5fd 0%,#3b82f6 55%,#1e3a8a 100%)',
  },
  elite: {
    glow: 'rgba(192,132,252,0.55)',
    ribbon: 'linear-gradient(180deg, #6d28d9 0%, #4c1d95 100%)',
    label: 'Elite Trainer',
    accent: '#c084fc',
    pillFill: 'linear-gradient(180deg,#e9d5ff 0%,#a855f7 55%,#6d28d9 100%)',
  },
};

function hpColorTokens(ratio: number): { fill: string; text: string } {
  if (ratio > 0.5) {
    return { fill: 'linear-gradient(180deg,#86efac 0%,#22c55e 55%,#15803d 100%)', text: '#86efac' };
  }
  if (ratio > 0.2) {
    return { fill: 'linear-gradient(180deg,#fde68a 0%,#eab308 55%,#a16207 100%)', text: '#fde68a' };
  }
  return { fill: 'linear-gradient(180deg,#fca5a5 0%,#ef4444 55%,#b91c1c 100%)', text: '#fca5a5' };
}

function HpMeter({ hp, max, height = 6 }: { hp: number; max: number; height?: number }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const tokens = hpColorTokens(ratio);
  return (
    <div className="pkr-battle-hp-track overflow-hidden" style={{ height }}>
      <div
        className="pkr-battle-hp-fill h-full"
        style={{
          width: `${(ratio * 100).toFixed(2)}%`,
          background: tokens.fill,
          transition: 'width 360ms cubic-bezier(.2,.8,.2,1), background 360ms ease',
        }}
      />
    </div>
  );
}

/** Row of 3 small Pokémon heads used as the lineup strip at the top of the field. */
function LineupIcon({
  rootURL,
  dexNum,
  defeated,
  active,
  label,
  accent,
  reducedMotion,
  shiny = false,
}: {
  shiny?: boolean;
  rootURL?: string;
  dexNum: number;
  defeated: boolean;
  active: boolean;
  label: string;
  accent: string;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="pkr-lineup-icon relative grid place-items-center rounded-full"
      style={{
        width: 40,
        height: 40,
        background: defeated
          ? 'rgba(15,23,42,0.85)'
          : active
          ? 'rgba(15,23,42,0.55)'
          : 'rgba(15,23,42,0.5)',
        border: active ? `2px solid ${accent}` : '1.5px solid rgba(15,23,42,0.75)',
        boxShadow: active ? `0 0 8px ${accent}88` : undefined,
        opacity: defeated ? 0.55 : 1,
      }}
      title={label}
    >
      <PokemonSprite
        src={frontSpriteUrl(rootURL, dexNum, shiny)}
        alt={label}
        size={36}
        reducedMotion={reducedMotion}
      />
      {defeated ? (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-[7px] font-black"
          style={{ color: '#fca5a5', textShadow: '1px 1px 0 rgba(0,0,0,0.8)' }}
        >
          ×
        </span>
      ) : null}
    </div>
  );
}

function LineupStrip({
  battle,
  state,
  rootURL,
  reducedMotion,
}: {
  battle: TrainerBattleState;
  state: PokeRemGameState;
  rootURL?: string;
  reducedMotion: boolean;
}) {
  const accent = TIER_ACCENT[battle.tier];
  const selectedIds = battle.selectedPartyIds;
  const selectedMons = selectedIds
    .map((id: string) => state.party.find((p: OwnedPokemon) => p.id === id))
    .filter((p: OwnedPokemon | undefined): p is OwnedPokemon => !!p);

  return (
    <div
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
      style={{
        background: 'rgba(0,0,0,0.7)',
        border: '1.5px solid rgba(0,0,0,0.55)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="pkr-battle-hud-role" style={{ color: accent.accent }}>
          {accent.label}
        </span>
        <div className="flex items-center gap-1">
          {battle.enemies.map((e, i) => (
            <LineupIcon
              key={`e-${i}`}
              rootURL={rootURL}
              dexNum={e.dexNum}
              defeated={e.defeated || e.currentHp <= 0}
              active={i === battle.activeEnemyIndex && !(e.defeated || e.currentHp <= 0)}
              label={`${e.name} Lv${e.level}`}
              accent={accent.accent}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>

      <span
        aria-hidden
        className="pkr-pixel-title text-[8px] font-black"
        style={{ color: '#fde68a', textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
      >
        VS
      </span>

      <div className="flex flex-col items-end gap-0.5">
        <span className="pkr-battle-hud-role" style={{ color: '#7dd3fc' }}>
          Your team
        </span>
        <div className="flex items-center gap-1">
          {selectedMons.map((m: OwnedPokemon, i: number) => (
            <LineupIcon
              key={`p-${i}`}
              rootURL={rootURL}
              dexNum={m.dexNum}
              shiny={m.shiny === true}
              defeated={m.currentHp <= 0}
              active={m.id === state.activePokemonId && m.currentHp > 0}
              label={`${m.nickname ?? m.name} Lv${m.level}`}
              accent="#7dd3fc"
              reducedMotion={reducedMotion}
            />
          ))}
          {/* Fill any missing slots (e.g. auto-fill when player didn't pick 3) */}
          {Array.from({ length: Math.max(0, 3 - selectedMons.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="grid place-items-center rounded-full text-[9px]"
              style={{
                width: 40,
                height: 40,
                background: 'rgba(15,23,42,0.55)',
                border: '1.5px dashed rgba(100,116,139,0.4)',
                color: '#475569',
              }}
            >
              —
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrainerHudPlate({
  enemy,
  accent,
  glow,
}: {
  enemy: TrainerEnemyMon;
  accent: string;
  glow: string;
}) {
  const ratio = enemy.maxHp > 0 ? enemy.currentHp / enemy.maxHp : 0;
  return (
    <div
      className="pkr-battle-hud pkr-battle-hud--compact absolute right-1.5 top-1.5 z-[25] max-w-[62%] px-2 py-1.5 text-right"
      style={{
        borderColor: `${accent}55`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 1px 1px 0 rgba(0,0,0,0.45), 0 0 12px ${glow}`,
      }}
    >
      <div className="pkr-battle-hud-role mb-0.5" style={{ color: accent }}>
        Trainer
      </div>
      <div
        className="line-clamp-1 text-[8px] font-black leading-tight sm:text-[9px]"
        style={{ color: 'white' }}
      >
        {enemy.name}{' '}
        <span className="whitespace-nowrap font-bold" style={{ color: '#fca5a5' }}>
          Lv{enemy.level}
        </span>
      </div>
      <div className="mt-0.5 flex flex-row-reverse items-center gap-1">
        <span
          className="shrink-0 text-[7px] font-bold tabular-nums leading-none sm:text-[8px]"
          style={{ color: hpColorTokens(ratio).text }}
        >
          {Math.max(0, Math.floor(enemy.currentHp))}/{Math.floor(enemy.maxHp)}
        </span>
        <div className="min-w-0 flex-1">
          <HpMeter hp={enemy.currentHp} max={enemy.maxHp} height={4} />
        </div>
      </div>
    </div>
  );
}

function PlayerHudPlate({ mon }: { mon: OwnedPokemon }) {
  const ratio = mon.maxHp > 0 ? mon.currentHp / mon.maxHp : 0;
  return (
    <div
      className="pkr-battle-hud pkr-battle-hud--compact absolute bottom-1.5 left-1.5 z-[25] max-w-[62%] px-2 py-1.5 text-left"
      style={{
        borderColor: 'rgba(96,165,250,0.45)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 1px 1px 0 rgba(0,0,0,0.45), 0 0 12px rgba(96,165,250,0.25)',
      }}
    >
      <div className="pkr-battle-hud-role mb-0.5" style={{ color: '#93c5fd' }}>
        You
      </div>
      <div
        className="line-clamp-1 text-[8px] font-black leading-tight sm:text-[9px]"
        style={{ color: 'white' }}
      >
        {mon.nickname || mon.name}{' '}
        <span className="whitespace-nowrap font-bold" style={{ color: '#a5b4fc' }}>
          Lv{mon.level}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <HpMeter hp={mon.currentHp} max={mon.maxHp} height={4} />
        </div>
        <span
          className="shrink-0 text-[7px] font-bold tabular-nums leading-none sm:text-[8px]"
          style={{ color: hpColorTokens(ratio).text }}
        >
          {Math.max(0, Math.floor(mon.currentHp))}/{Math.floor(mon.maxHp)}
        </span>
      </div>
    </div>
  );
}

function EnemyCard({
  enemy,
  active,
  rootURL,
  reducedMotion,
  small,
}: {
  enemy: TrainerEnemyMon;
  active: boolean;
  rootURL?: string;
  reducedMotion: boolean;
  small?: boolean;
}) {
  const sz = small ? 56 : 84;
  const isKO = enemy.defeated || enemy.currentHp <= 0;
  return (
    <div
      className={`pkr-game-card flex flex-col items-center gap-1 rounded-md p-2 ${active ? 'pkr-trainer-enemy--active' : ''}`}
      style={{
        background: active ? 'rgba(15,23,42,0.55)' : 'rgba(15,23,42,0.35)',
        border: active ? '2px solid #fde68a' : '1px solid rgba(148,163,184,0.35)',
        opacity: isKO ? 0.55 : 1,
        minWidth: sz + 16,
      }}
    >
      <div className="relative">
        <PokemonSprite
          src={frontSpriteUrl(rootURL, enemy.dexNum)}
          alt={enemy.name}
          size={sz}
          reducedMotion={reducedMotion}
        />
        {isKO ? (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-[10px] font-black"
            style={{ color: '#fca5a5', textShadow: '1px 1px 0 rgba(0,0,0,0.6)' }}
          >
            KO
          </div>
        ) : null}
      </div>
      <div className="text-[10px] font-bold text-center" style={{ color: '#f8fafc' }}>
        {enemy.name}
      </div>
      <div className="text-[9px]" style={{ color: '#cbd5e1' }}>
        Lv {enemy.level}
      </div>
      <div className="w-full">
        <HpMeter hp={enemy.currentHp} max={enemy.maxHp} />
      </div>
    </div>
  );
}

function PartyPickRow({
  mon,
  rootURL,
  reducedMotion,
  selected,
  onToggle,
  disabled,
}: {
  mon: OwnedPokemon;
  rootURL?: string;
  reducedMotion: boolean;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const fainted = mon.currentHp <= 0;
  return (
    <button
      type="button"
      disabled={disabled || fainted}
      aria-pressed={selected}
      onClick={onToggle}
      className={`pkr-game-card flex w-full items-center gap-3 rounded-md p-2 text-left transition-transform`}
      style={{
        background: selected ? 'rgba(253,224,71,0.18)' : 'rgba(15,23,42,0.4)',
        border: selected ? '2px solid #fde68a' : '1px solid rgba(148,163,184,0.35)',
        opacity: fainted ? 0.45 : 1,
        cursor: fainted || disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <PokemonSprite
        src={frontSpriteUrl(rootURL, mon.dexNum, mon.shiny === true)}
        alt={mon.name}
        size={48}
        reducedMotion={reducedMotion}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold" style={{ color: '#f1f5f9' }}>
            {mon.nickname || mon.name}
          </span>
          <span className="text-[10px]" style={{ color: '#cbd5e1' }}>
            Lv {mon.level}
          </span>
        </div>
        <HpMeter hp={mon.currentHp} max={mon.maxHp} />
        <div className="text-[9px]" style={{ color: fainted ? '#fca5a5' : '#94a3b8' }}>
          {fainted ? 'Fainted — heal in Bag before selecting' : `${mon.currentHp} / ${mon.maxHp} HP`}
        </div>
      </div>
      <div
        aria-hidden
        className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-black"
        style={{
          background: selected ? '#fde68a' : 'rgba(148,163,184,0.25)',
          color: selected ? '#1e1b4b' : '#94a3b8',
        }}
      >
        {selected ? '✓' : ''}
      </div>
    </button>
  );
}

function TrainerHeader({
  battle,
  state,
  compact,
}: {
  battle: TrainerBattleState;
  state: PokeRemGameState;
  compact?: boolean;
}) {
  const accent = TIER_ACCENT[battle.tier];
  return (
    <div
      className={`flex flex-col gap-1 rounded-md ${battle.tier === 'elite' ? 'pkr-trainer-elite' : ''}`}
      style={{
        background: accent.ribbon,
        boxShadow: `0 0 18px ${accent.glow}`,
        border: '1px solid rgba(255,255,255,0.15)',
        padding: compact ? '8px 10px' : '12px',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#fde68a' }}>
            {accent.label}
          </div>
          <div className={`font-black ${compact ? 'text-[11px]' : 'text-[12px]'}`} style={{ color: '#f8fafc' }}>
            {battle.trainer.className}
            {battle.trainer.displayName ? ` ${battle.trainer.displayName}` : ''}
          </div>
        </div>
        <div className="text-right text-[9px]" style={{ color: '#e0e7ff' }}>
          Trainer wins
          <br />
          <span className="text-[12px] font-black" style={{ color: '#fde68a' }}>
            {state.trainerBattleStats?.totalWon ?? 0}
          </span>
        </div>
      </div>
      {!compact && (battle.phase === 'team_select' || battle.phase === 'active') ? (
        <p className="text-[10px] italic" style={{ color: '#e0e7ff' }}>
          “{battle.trainer.taunt}”
        </p>
      ) : null}
      {battle.lastLog ? (
        <p className="text-[10px] font-semibold" style={{ color: '#fde68a' }}>
          {battle.lastLog}
        </p>
      ) : null}
    </div>
  );
}

export function TrainerBattleSurface({
  state: committedState,
  rootURL,
  reducedMotion,
  busy = false,
  onLockTeam,
  onCombatTurn,
  onClaimCatch,
  onDismissCatchOffer,
  onBuyBall,
  onClose,
  ballPrices,
}: Props) {
  const {state, phase: motionPhase, animating} = useTrainerPresentation(committedState, reducedMotion);
  const battle = state.currentTrainerBattle;
  const [picked, setPicked] = useState<string[]>([]);
  const [chosenCatchIndex, setChosenCatchIndex] = useState<number | null>(null);
  const [catchBall, setCatchBall] = useState<'poke-ball' | 'great-ball' | 'ultra-ball'>('poke-ball');

  const activeId = state.activePokemonId;
  const activeMon = state.party.find((p) => p.id === activeId);

  const battleReadyParty = useMemo(
    () => state.party.filter((p) => p.currentHp > 0),
    [state.party],
  );

  if (!battle) return null;

  // ── team_select ────────────────────────────────────────────────────────
  if (battle.phase === 'team_select') {
    const togglePick = (id: string) => {
      setPicked((cur) => {
        if (cur.includes(id)) return cur.filter((p) => p !== id);
        if (cur.length >= 3) return cur;
        return [...cur, id];
      });
    };
    const canLock = picked.length > 0 && picked.length >= Math.min(3, battleReadyParty.length);
    const autoFillNeeded = picked.length < 3 && battleReadyParty.length >= 3;

    return (
      <div className="flex flex-col gap-3 p-2">
        <TrainerHeader battle={battle} state={state} />

        <div className="flex items-center justify-between gap-3">
          {battle.enemies.map((e, i) => (
            <EnemyCard
              key={i}
              enemy={e}
              active={false}
              rootURL={rootURL}
              reducedMotion={reducedMotion}
              small
            />
          ))}
        </div>

        <div className="rounded-md border p-2" style={{ borderColor: 'rgba(148,163,184,0.35)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#e2e8f0' }}>
              Pick {Math.min(3, battleReadyParty.length) || 3} Pokémon
            </span>
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>
              {picked.length}/{Math.min(3, battleReadyParty.length) || 3} selected
            </span>
          </div>
          <p className="mb-2 text-[10px]" style={{ color: '#cbd5e1' }}>
            Locked in once the battle starts. No switching, healing, or items mid-battle.
          </p>
          <div className="flex flex-col gap-1.5">
            {state.party.map((p) => (
              <PartyPickRow
                key={p.id}
                mon={p}
                rootURL={rootURL}
                reducedMotion={reducedMotion}
                selected={picked.includes(p.id)}
                onToggle={() => togglePick(p.id)}
                disabled={!picked.includes(p.id) && picked.length >= 3}
              />
            ))}
          </div>
        </div>

        {battleReadyParty.length === 0 ? (
          <p className="rounded-md p-2 text-center text-[10px] font-bold" style={{ background: 'rgba(127,29,29,0.4)', color: '#fecaca' }}>
            All your Pokémon are fainted. Return to studying, then revive one in Bag before the next challenge.
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || !canLock}
          className="pkr-btn-gold w-full rounded-md py-2 text-[12px] font-black"
          onClick={() => onLockTeam(picked)}
        >
          {busy ? 'Saving…' : !canLock ? 'Choose your team' : 'Lock in team'}
        </button>
        <button type="button" disabled={busy} onClick={onClose} className="pkr-btn-secondary">Skip challenge · keep studying</button>
      </div>
    );
  }

  // ── active combat — styled like a normal wild battle ────────────────────
  if (battle.phase === 'active') {
    const enemy = battle.enemies[battle.activeEnemyIndex];
    const moves = activeMon ? movesetForBattle(activeMon) : [];
    // Scene index derived from enemy dex so it feels stable per opponent.
    const sceneIdx = enemy ? enemy.dexNum : 0;
    const sceneBg = battleSceneBackgroundStyle(rootURL, sceneIdx);

    return (
      <div className="flex flex-col gap-2 p-2">
        <TrainerHeader battle={battle} state={state} compact />
        <LineupStrip battle={battle} state={state} rootURL={rootURL} reducedMotion={reducedMotion} />

        {/* ═══ Battle field ═══ */}
        <div
          className="pkr-battle-field relative w-full overflow-hidden rounded-md shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
          style={{ height: 220, border: '2px solid rgba(0,0,0,0.55)' }}
        >
          {/* Scene background */}
          <div className="pointer-events-none absolute inset-0 z-0" style={sceneBg} />
          {!reducedMotion ? <div className="pkr-crt-lines" aria-hidden /> : null}

          {/* Arena shadow beneath sprites */}
          <div
            className="pointer-events-none absolute bottom-[6%] left-1/2 z-[2] h-[26%] w-[78%] -translate-x-1/2"
            style={{
              background:
                'radial-gradient(ellipse 85% 55% at 50% 60%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 45%, transparent 72%)',
            }}
            aria-hidden
          />

          {/* Enemy sprite (upper-right) */}
          {enemy && !(enemy.defeated || enemy.currentHp <= 0) ? (
            <div className={`pointer-events-none absolute right-[8%] top-[20%] z-[6] ${motionPhase === 'enemy' ? 'pkr-trainer-enemy-strike' : ''}`}>
              <PokemonSprite
                src={frontSpriteUrl(rootURL, enemy.dexNum)}
                alt={enemy.name}
                size={84}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : null}

          {/* Player sprite (lower-left, back-facing) */}
          {activeMon && activeMon.currentHp > 0 ? (
            <div className={`pointer-events-none absolute bottom-[18%] left-[8%] z-[6] ${motionPhase === 'player' ? 'pkr-trainer-player-strike' : ''}`}>
              <PokemonSprite
                src={backSpriteUrl(rootURL, activeMon.dexNum, activeMon.shiny === true)}
                alt={activeMon.name}
                size={88}
                reducedMotion={reducedMotion}
              />
            </div>
          ) : null}

          {/* HUD plates */}
          {enemy ? (
            <TrainerHudPlate
              enemy={enemy}
              accent={TIER_ACCENT[battle.tier].accent}
              glow={TIER_ACCENT[battle.tier].glow}
            />
          ) : null}
          {activeMon ? <PlayerHudPlate mon={activeMon} /> : null}
        </div>

        {/* Moves grid — same cartridge feel as normal battle */}
        <div className="pkr-trainer-moves grid grid-cols-2 gap-1.5">
          {moves.length === 0 ? (
            <button
              type="button"
              className="pkr-game-btn col-span-2 rounded-md py-2 text-[11px] font-black"
              disabled={busy || animating}
              onClick={() => onCombatTurn()}
            >
              Attack
            </button>
          ) : (
            moves.map((mid) => {
              const m = MOVES[mid];
              return (
                <button
                  key={mid}
                  type="button"
                  className="pkr-game-btn rounded-md p-2 text-left"
                  disabled={busy || animating}
                  onClick={() => onCombatTurn(mid)}
                  title={m?.name ?? mid}
                >
                  <div className="text-[10px] font-black" style={{ color: '#f1f5f9' }}>
                    {m?.name ?? mid}
                  </div>
                  <div className="text-[9px]" style={{ color: '#94a3b8' }}>
                    {m ? `${m.type} · ${m.power > 0 ? `${m.power} PWR` : 'Status'}` : ''}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="pkr-trainer-log" role="status" aria-live="polite"><span key={battle.feedbackSeq}>{animating ? 'Exchanging attacks…' : battle.lastLog || 'Choose a move. Your team is ready.'}</span></div>
        <p className="text-center text-[9px] italic" style={{ color: '#94a3b8' }}>
          No switching, healing, or items during a trainer battle.
        </p>
      </div>
    );
  }

  // ── post_win (with retry-friendly catch offer) ─────────────────────────
  if (battle.phase === 'post_win') {
    const reward = battle.rewardSnapshot;
    const ballCounts = {
      'poke-ball': state.bag['poke-ball'] ?? 0,
      'great-ball': state.bag['great-ball'] ?? 0,
      'ultra-ball': state.bag['ultra-ball'] ?? 0,
    };
    const totalBalls = ballCounts['poke-ball'] + ballCounts['great-ball'] + ballCounts['ultra-ball'];
    const chosenEnemy =
      chosenCatchIndex != null ? battle.enemies[chosenCatchIndex] ?? null : null;
    const previewChance = chosenEnemy
      ? Math.round(trainerCatchChance(chosenEnemy, activeMon, catchBall, battle.tier) * 100)
      : null;
    const canCatch = !battle.catchOfferClaimed && battle.catchOfferActive;
    const currency = state.currency ?? 0;
    const cheapestUnlockedBall = ballPrices.find((b) => b.unlocked && b.price <= currency);
    const noMoreTries = totalBalls <= 0 && !cheapestUnlockedBall;

    // Auto-pick the ball type the player actually owns so the Throw button works the moment
    // they select a Pokémon.
    const catchBallCount = ballCounts[catchBall];

    return (
      <div className="flex flex-col gap-3 p-2">
        <TrainerHeader battle={battle} state={state} />

        {reward ? (
          <div
            className="flex flex-col gap-2 rounded-md p-3"
            style={{
              background: 'linear-gradient(180deg, rgba(252,211,77,0.18) 0%, rgba(15,23,42,0.55) 90%)',
              border: '1px solid rgba(253,224,71,0.5)',
            }}
          >
            <div className="text-[12px] font-black" style={{ color: '#fde68a' }}>
              {reward.headline}
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: '#f8fafc' }}>
              <span className="rounded bg-black/30 px-2 py-1">+{reward.coins} ¢</span>
              <span className="rounded bg-black/30 px-2 py-1">+{reward.trainerXp} TR XP</span>
              {Object.entries(reward.items).map(([id, qty]) => (
                <span key={id} className="rounded bg-black/30 px-2 py-1">
                  +{qty}× {id.replace(/-/g, ' ')}
                </span>
              ))}
              {reward.xpDoublerTier ? (
                <span className="rounded bg-yellow-500/20 px-2 py-1 font-black" style={{ color: '#fde68a' }}>
                  +1× XP Doubler ({reward.xpDoublerTier})
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {canCatch ? (
          <div
            className="flex flex-col gap-2.5 rounded-md p-3"
            style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-black uppercase tracking-wider"
                style={{ color: '#e2e8f0' }}
              >
                Catch one Pokémon
              </span>
              <span className="text-[9px] font-bold tabular-nums" style={{ color: '#fde68a' }}>
                Coins: {currency}¢
              </span>
            </div>
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>
              Keep throwing balls until you catch one, run out of balls, or walk away.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {battle.enemies.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChosenCatchIndex(i)}
                  className="pkr-game-card flex flex-col items-center gap-1 rounded-md p-2"
                  style={{
                    background: chosenCatchIndex === i ? 'rgba(253,224,71,0.18)' : 'rgba(15,23,42,0.4)',
                    border: chosenCatchIndex === i ? '2px solid #fde68a' : '1px solid rgba(148,163,184,0.35)',
                  }}
                >
                  <PokemonSprite
                    src={frontSpriteUrl(rootURL, e.dexNum)}
                    alt={e.name}
                    size={48}
                    reducedMotion={reducedMotion}
                  />
                  <span className="text-[10px] font-bold" style={{ color: '#f8fafc' }}>
                    {e.name}
                  </span>
                  <span className="text-[9px]" style={{ color: '#cbd5e1' }}>
                    Lv {e.level}
                  </span>
                </button>
              ))}
            </div>

            {/* Ball selector — mirrors wild catch UI */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['poke-ball', 'great-ball', 'ultra-ball'] as const).map((b) => {
                const count = ballCounts[b];
                const selected = catchBall === b;
                const unlocked = ballPrices.find((p) => p.id === b)?.unlocked ?? true;
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={count <= 0 || !unlocked}
                    onClick={() => setCatchBall(b)}
                    className="pkr-game-btn flex items-center gap-1 rounded-md p-1.5 text-[10px] font-bold"
                    style={{
                      background: selected ? 'rgba(253,224,71,0.2)' : 'rgba(15,23,42,0.4)',
                      border: selected ? '2px solid #fde68a' : '1px solid rgba(148,163,184,0.35)',
                      opacity: count <= 0 ? 0.4 : 1,
                    }}
                    title={!unlocked ? 'Locked — level up trainer to unlock' : `${count} available`}
                  >
                    <img
                      src={itemIconUrl(rootURL, `${b}.png`)}
                      width={16}
                      height={16}
                      alt={b}
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <span style={{ color: '#f8fafc' }}>×{count}</span>
                  </button>
                );
              })}
              {previewChance != null && catchBallCount > 0 ? (
                <span className="ml-auto text-[10px] font-black" style={{ color: '#fde68a' }}>
                  ~{previewChance}% chance
                </span>
              ) : null}
            </div>

            {/* Inline buy strip — runs out-of-balls like wild catch */}
            <div
              className="flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5"
              style={{
                background: 'rgba(15,23,42,0.4)',
                border: '1px dashed rgba(148,163,184,0.3)',
              }}
            >
              <span
                className="text-[8px] font-black uppercase tracking-widest"
                style={{ color: '#94a3b8' }}
              >
                Buy
              </span>
              {ballPrices.map((b) => {
                const canAfford = currency >= b.price;
                const disabled = !b.unlocked || !canAfford;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onBuyBall(b.id, b.price)}
                    className="pkr-game-btn flex items-center gap-1 rounded-md p-1 text-[9px] font-bold"
                    style={{
                      background: disabled ? 'rgba(71,85,105,0.3)' : 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(148,163,184,0.35)',
                      opacity: disabled ? 0.5 : 1,
                    }}
                    title={
                      !b.unlocked
                        ? 'Locked — level up trainer to unlock'
                        : !canAfford
                        ? `Need ${b.price}¢ (have ${currency}¢)`
                        : `Buy ${b.id.replace(/-/g, ' ')} for ${b.price}¢`
                    }
                  >
                    <img
                      src={itemIconUrl(rootURL, `${b.id}.png`)}
                      width={12}
                      height={12}
                      alt={b.id}
                      style={{ imageRendering: 'pixelated', opacity: disabled ? 0.6 : 1 }}
                    />
                    <span style={{ color: '#fde68a' }}>{b.price}¢</span>
                  </button>
                );
              })}
            </div>

            {/* Retry-friendly action row */}
            <div className="flex gap-2">
              <button
                type="button"
                className="pkr-btn-gold flex-1 rounded-md py-2 text-[11px] font-black"
                disabled={chosenCatchIndex == null || catchBallCount <= 0}
                onClick={() => {
                  if (chosenCatchIndex == null) return;
                  onClaimCatch(chosenCatchIndex, catchBall);
                }}
              >
                {chosenCatchIndex == null
                  ? 'Pick a Pokémon'
                  : catchBallCount <= 0
                  ? 'Out of selected ball'
                  : `Throw ${catchBall.replace(/-/g, ' ')}`}
              </button>
              <button
                type="button"
                className="pkr-game-btn shrink-0 rounded-md px-3 py-2 text-[10px] font-bold"
                onClick={onDismissCatchOffer}
                title="Give up the catch attempt and return to studying"
              >
                Walk away
              </button>
            </div>

            {noMoreTries ? (
              <p
                className="rounded-md p-2 text-center text-[9px] font-bold"
                style={{ background: 'rgba(127,29,29,0.35)', color: '#fecaca' }}
              >
                Out of balls and coins — the trainer's Pokémon got away. Walk away to end the battle.
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="pkr-btn-gold w-full rounded-md py-2 text-[12px] font-black"
            onClick={onClose}
          >
            Back to studying
          </button>
        )}
      </div>
    );
  }

  // ── post_loss ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 p-2">
      <TrainerHeader battle={battle} state={state} />
      <div
        className="flex flex-col items-center gap-2 rounded-md p-3 text-center"
        style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(248,113,113,0.4)' }}
      >
        <div className="text-[12px] font-black" style={{ color: '#fca5a5' }}>
          Defeated by {battle.trainer.className}
        </div>
        <p className="text-[10px]" style={{ color: '#cbd5e1' }}>
          “{battle.trainer.victoryLine}”
        </p>
        <p className="text-[10px]" style={{ color: '#94a3b8' }}>
          Heal up your party in Bag and try again next time. Your collection and progress are safe.
        </p>
      </div>
      <button
        type="button"
        className="pkr-btn-gold w-full rounded-md py-2 text-[12px] font-black"
        onClick={onClose}
      >
        Back to studying
      </button>
    </div>
  );
}
