import { coinsSpoken, formatCoins } from '../format/coins';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { OwnedPokemon, PokeRemGameState } from '../../game/state/model';
import type { PokemonType } from '../../game/data/species';
import { ITEMS, ITEM_BY_ID } from '../../game/data/items';
import { checkItemEvolution } from '../../game/engine/evolution';
import { MOVES } from '../../game/data/moves';
import { dedupeMoveIds, getUnlockedLearnsetMoveIds, moveUiDescription } from '../../game/engine/moveLearn';
import { frontSpriteUrl } from '../../game/sprites';
import { typePillStyle } from '../battle/battleTheme';
import { Panel } from '../components/Panel';
import { PokemonSprite } from '../components/PokemonSprite';
import { GameIcon } from '../components/GameIcon';
import { PartyPokemonCard } from '../components/PartyPokemonCard';
import { TransferConfirm } from '../components/TransferConfirm';
import { UpgradeSheet } from '../components/UpgradeSheet';
import { CollectionGridScreen } from './CollectionGridScreen';
import { CapacityMeter } from '../components/CapacityMeter';
import type { GridFlag } from '../../game/engine/collectionGrid';
import { transferCoins, transferPreview } from '../../game/engine/transfer';
import { catchUpGap } from '../../game/engine/xpShare';
import { PokemonGrowthPanel } from '../components/PokemonGrowthPanel';
import { PokemonAppraisal } from '../components/PokemonAppraisal';
import { battleStats, isPerfectIVs, ivAverage, ivsFor, powerUpPreview } from '../../game/engine/pokemonStats';
import { bestHealItemFor, type TrainableIv } from '../../game/state/store';
import { tutorOptions } from '../../game/engine/sinks';
import { moveDisplayName } from '../../game/engine/combatExchange';
import '../collection.css';

function sortTeachableMoves(types: readonly PokemonType[], ids: string[]): string[] {
  const primary = types[0];
  const secondary = types[1];
  const band = (id: string) => {
    const t = MOVES[id]!.type;
    if (t === primary || (secondary !== undefined && t === secondary)) return 0;
    if (t === 'Normal') return 1;
    return 2;
  };
  return [...ids].sort((a, b) => {
    const ba = band(a);
    const bb = band(b);
    if (ba !== bb) return ba - bb;
    const pa = MOVES[a]!.power;
    const pb = MOVES[b]!.power;
    if (pa !== pb) return pb - pa;
    return MOVES[a]!.name.localeCompare(MOVES[b]!.name);
  });
}

function MoveList({ moves, onForget }: { moves: string[]; onForget?: (id: string) => void }) {
  const list = dedupeMoveIds(moves);
  if (list.length === 0) {
    return (
      <div className="rounded border border-dashed border-white/10 px-2 py-1.5 pkr-fine font-semibold" style={{ color: 'var(--pkr-ink-muted)' }}>
        No moves in this moveset yet — use “Teachable moves” to pull from moves unlocked at this level.
      </div>
    );
  }
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {list.map((mid) => {
        const m = MOVES[mid];
        if (!m) return null;
        return (
          <div key={mid} className="flex min-h-[2rem] items-start gap-1">
            <div className="min-w-0 flex-1 rounded border px-1.5 py-1" style={typePillStyle(m.type)}>
              <div className="flex items-center gap-1">
                <span className="truncate pkr-fine font-black">{m.name}</span>
                {m.power > 0 ? (
                  <span className="shrink-0 rounded px-0.5 pkr-fine font-bold" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {m.power}
                  </span>
                ) : (
                  <span className="shrink-0 rounded px-0.5 pkr-fine font-bold uppercase" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    Status
                  </span>
                )}
              </div>
              <div className="mt-0.5 pkr-fine font-semibold leading-snug" style={{ color: 'inherit', opacity: 0.88 }}>
                {moveUiDescription(mid)}
              </div>
            </div>
            {onForget ? (
              <button
                type="button"
                onClick={() => onForget(mid)}
                className="pkr-btn-secondary shrink-0 px-2 py-1 pkr-fine font-bold"
                title={`Forget ${m.name}`}
                aria-label={`Forget ${m.name}`}
              >
                Drop
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TeachableMovesBrowser({
  pokemon,
  onPickMove,
}: {
  pokemon: OwnedPokemon;
  onPickMove: (moveId: string) => void;
}) {
  const current = dedupeMoveIds(pokemon.moves ?? []);
  const unlocked = dedupeMoveIds([...getUnlockedLearnsetMoveIds(pokemon.dexNum, pokemon.level), ...(pokemon.tutorMoves ?? [])]);
  const candidates = sortTeachableMoves(
    pokemon.types,
    unlocked.filter((id) => !current.includes(id)),
  );

  if (candidates.length === 0) {
    return (
      <p className="mt-1 rounded border border-white/10 px-2 py-1.5 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
        {unlocked.length === 0
          ? 'No learnset moves unlocked at this level yet — level up to grow this path.'
          : 'Every move unlocked at this level is already in the moveset. Level up to unlock more, or drop a move to swap one back in.'}
      </p>
    );
  }

  return (
    <div className="mt-1 max-h-52 space-y-1 overflow-y-auto rounded border border-white/10 p-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
      {candidates.map((mid) => {
        const m = MOVES[mid]!;
        return (
          <div
            key={mid}
            className="flex flex-col gap-0.5 rounded border border-white/[0.06] px-1.5 py-1"
            style={{ background: 'rgba(30,41,59,0.45)' }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="rounded border px-1 py-px pkr-fine font-black uppercase" style={typePillStyle(m.type)}>
                    {m.type}
                  </span>
                  <span className="pkr-fine font-black" style={{ color: 'var(--pkr-ink-text)' }}>
                    {m.name}
                  </span>
                  {m.power > 0 ? (
                    <span className="pkr-fine font-bold tabular-nums" style={{ color: 'var(--pkr-ink-muted)' }}>
                      Pow {m.power}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
                  {moveUiDescription(mid)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPickMove(mid)}
                className="pkr-btn-primary shrink-0 px-2 py-0.5 pkr-fine font-black uppercase"
              >
                Learn
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PartyScreen({
  rootURL,
  party,
  storagePokemon,
  activeId,
  onSwitch,
  onForgetMove,
  onLearnMove,
  onRename,
  onRelease,
  onMoveToStorage,
  onMoveToParty,
  onSwapStorageForParty,
  bag, onEvolve, evolutionBlocked = false, evolutionMessage,
  currency = 0, onPowerUp, onToggleFavorite, powerUpBlocked = false, onBottleCap, onHeal, healBlocked = false, onSetAutoMoves, onTutor,
  starterId,
  gameState,
  onTransfer,
  storageCap,
  viewAllRequest,
}: {
  /** Storage capacity, when capacity caps are on. */
  storageCap?: number;
  /** Open the View all grid with these filters (changes to `key` reopen it). */
  viewAllRequest?: { key: number; flags: GridFlag[] };
  rootURL: string | undefined;
  /** Your original starter (buddy): ♥ badge on its card. */
  starterId?: string;
  /** Full save, for transfer previews. */
  gameState?: PokeRemGameState;
  /** Transfer Pokémon away for coins and type-matched XP (replaces Release). */
  onTransfer?: (ids: string[]) => void;
  bag?: Record<string, number>;
  onEvolve?: (pokemonId: string, itemId: string) => void;
  evolutionBlocked?: boolean;
  evolutionMessage?: string;
  party: OwnedPokemon[];
  storagePokemon?: OwnedPokemon[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onForgetMove?: (pokemonId: string, moveId: string) => void;
  /** Manual teach: move must match species typings or Normal; pass `replaceIndex` 0–3 when moveset is full. */
  onLearnMove?: (pokemonId: string, moveId: string, replaceIndex?: number) => void;
  onRename?: (pokemonId: string, name: string) => void;
  onRelease?: (pokemonId: string) => void;
  onMoveToStorage?: (pokemonId: string) => void;
  onMoveToParty?: (pokemonId: string) => void;
  /** When party is full (6), swap a storage mon in for a chosen party member. */
  onSwapStorageForParty?: (storagePokemonId: string, replacePartyPokemonId: string) => void;
  currency?: number;
  onPowerUp?: (id: string, expectedLevel: number) => void;
  onToggleFavorite?: (id: string) => void;
  powerUpBlocked?: boolean;
  /** Hyper training: Bottle Cap maxes `stat`; Gold Bottle Cap maxes all IVs. */
  onBottleCap?: (pokemonId: string, itemId: 'bottle-cap' | 'gold-bottle-cap', stat?: TrainableIv) => void;
  /** One-tap heal from the card: uses the best owned potion, or a Revive when fainted. */
  onHeal?: (pokemonId: string) => void;
  healBlocked?: boolean;
  /** Turn automatic best-move picking on or off; teaching or forgetting a move by hand turns it off. */
  onSetAutoMoves?: (pokemonId: string, on: boolean) => void;
  /** Teach a move from the Move Tutor. */
  onTutor?: (pokemonId: string, moveId: string) => void;
}) {
  const [pendingStone, setPendingStone] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showStorage, setShowStorage] = useState(false);
  const [replaceStorageId, setReplaceStorageId] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<{ id: string; name: string } | null>(null);
  const [transferIds, setTransferIds] = useState<string[] | null>(null);
  const [upgradeId, setUpgradeId] = useState<string | null>(null);
  const [viewAll, setViewAll] = useState<{ flags: GridFlag[] } | null>(null);
  const [movePickerPokemonId, setMovePickerPokemonId] = useState<string | null>(null);
  const [moveReplacePrompt, setMoveReplacePrompt] = useState<{ pokemonId: string; moveId: string } | null>(null);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'level' | 'power' | 'iv' | 'species'>('level');
  const [powerConfirm, setPowerConfirm] = useState<string | null>(null);
  const replacePanelRef = useRef<HTMLDivElement | null>(null);
  const releasePanelRef = useRef<HTMLDivElement | null>(null);
  const storage = storagePokemon ?? [];
  const incomingReplace = replaceStorageId ? storage.find((x) => x.id === replaceStorageId) : undefined;
  const filterAndSort = (list: OwnedPokemon[]) => list.filter((p) => {
    const q = search.trim().toLowerCase();
    return (!favoritesOnly || p.favorite === true) && (!q || `${p.nickname ?? ''} ${p.name} ${p.dexNum}`.toLowerCase().includes(q));
  }).sort((a, b) => {
    if (sortBy === 'species') return a.name.localeCompare(b.name) || a.dexNum - b.dexNum;
    if (sortBy === 'iv') return ivAverage(b) - ivAverage(a) || b.level - a.level;
    if (sortBy === 'power') return battleStats(b).power - battleStats(a).power || b.level - a.level;
    return b.level - a.level || a.name.localeCompare(b.name);
  });
  const visibleParty = filterAndSort(party);
  const visibleStorage = filterAndSort(storage);

  useEffect(() => {
    if (viewAllRequest) setViewAll({ flags: viewAllRequest.flags });
  }, [viewAllRequest?.key]);

  const openFromGrid = (id: string, inParty: boolean) => {
    setViewAll(null);
    setSearch('');
    setFavoritesOnly(false);
    if (!inParty) setShowStorage(true);
    setExpanded(id);
    window.setTimeout(() => {
      document.querySelector(`[data-pokemon-id="${id}"]`)?.scrollIntoView({ block: 'start' });
    }, 0);
  };

  const replaceKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !replacePanelRef.current) return;
    const root = replacePanelRef.current;
    const nodes = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const list = [...nodes].filter((el) => !el.hasAttribute('disabled'));
    if (list.length === 0) return;
    const first = list[0]!;
    const last = list[list.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!releaseTarget) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setReleaseTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [releaseTarget]);

  useEffect(() => {
    if (!replaceStorageId || !onSwapStorageForParty || !incomingReplace) return;
    const root = replacePanelRef.current;
    if (!root) return;
    const t = window.setTimeout(() => {
      const first = root.querySelector<HTMLElement>('button:not([disabled])');
      first?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [replaceStorageId, onSwapStorageForParty, incomingReplace?.id]);

  useEffect(() => {
    if (!releaseTarget) return;
    const t = window.setTimeout(() => {
      // Focus safe default: Cancel (last destructive-adjacent control in DOM)
      const buttons = releasePanelRef.current?.querySelectorAll<HTMLButtonElement>('button');
      const cancel = buttons?.[buttons.length - 1];
      cancel?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [releaseTarget]);

  useEffect(() => {
    if (!moveReplacePrompt) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moveReplacePrompt]);

  function renderPokemon(p: OwnedPokemon, isParty: boolean) {
    const isExpanded = expanded === p.id;
    const isActive = p.id === activeId;
    const displayName = p.nickname || p.name;
    const preview = p.level < 100 ? powerUpPreview(p) : null;
    const currentStats = battleStats(p);
    const powerDisabled = !onPowerUp || powerUpBlocked || p.level >= 100 || !preview || currency < preview.cost;

    const detail = (
      <>
        <PokemonAppraisal pokemon={p} />
        <PokemonGrowthPanel pokemon={p} />
        {onPowerUp ? <section className="pkr-power-up" aria-label="Power up Pokemon">
          <div className="flex items-center justify-between gap-2"><strong>POWER UP</strong><span>{preview ? formatCoins(preview.cost) : '—'}</span></div>
          {preview ? <>
            <p>Lv{p.level} → Lv{preview.level}</p>
            <div className="pkr-power-up__stats">
              <span>HP +{Math.max(0, preview.stats.hp - currentStats.hp)}</span>
              <span>ATK +{Math.max(0, preview.stats.attack - currentStats.attack)}</span>
              <span>DEF +{Math.max(0, preview.stats.defense - currentStats.defense)}</span>
            </div>
            {preview.newMoves.length ? <p>Unlocks: {preview.newMoves.map((id) => MOVES[id]?.name ?? id).join(', ')}</p> : <p>No move unlock this level.</p>}
            {powerConfirm === p.id ? <div className="mt-2 flex flex-wrap gap-2"><button type="button" className="pkr-btn-primary" disabled={powerDisabled} onClick={() => { onPowerUp(p.id, p.level); setPowerConfirm(null); }}>Confirm ₽{preview.cost}</button><button type="button" className="pkr-btn-secondary" onClick={() => setPowerConfirm(null)}>Cancel</button></div> : <button type="button" className="pkr-btn-primary mt-2 w-full" disabled={powerDisabled} onClick={() => setPowerConfirm(p.id)}>{powerUpBlocked ? 'Finish encounter first' : currency < preview.cost ? `Need ₽${preview.cost - currency}` : `Power up · ₽${preview.cost}`}</button>}
          </> : <p>Maximum level reached.</p>}
        </section> : null}
        {onEvolve && isParty ? <Panel title="Stone evolution">
          {p.everstone ? <p>Everstone prevents evolution.</p> : null}
          {evolutionMessage ? <p role="status" className="pkr-evolution-message">{evolutionMessage}</p> : null}
          {evolutionBlocked ? <p>Finish the encounter before evolving.</p> : p.currentHp <= 0 ? <p>Revive this Pokémon before evolving.</p> : null}
          {ITEMS.filter(item => item.kind === 'evolution' && checkItemEvolution(p, item.id)).map(item => {
            const result = checkItemEvolution(p, item.id)!;
            const key = p.id + ':' + item.id;
            return <div key={key} className="mt-2">
              <button type="button" className="pkr-game-btn w-full px-3 py-2" disabled={evolutionBlocked || p.currentHp <= 0 || !(bag?.[item.id])}
                onClick={() => setPendingStone(key)}>{item.name} → {result.intoName} · ×{bag?.[item.id] ?? 0}</button>
              {pendingStone === key ? <div className="mt-2" role="group" aria-label="Confirm stone evolution">
                <p>Use one {item.name} to evolve into {result.intoName}?</p>
                <button type="button" className="pkr-game-btn px-3 py-2" disabled={evolutionBlocked || p.currentHp <= 0 || !(bag?.[item.id])} onClick={() => { onEvolve(p.id, item.id); setPendingStone(null); }}>Confirm evolution</button>
                <button type="button" className="pkr-btn-secondary px-3 py-2" onClick={() => setPendingStone(null)}>Cancel</button>
              </div> : null}
            </div>;
          })}
          {!ITEMS.some(item => item.kind === 'evolution' && checkItemEvolution(p, item.id)) ? <p>No compatible stone evolution for this Pokémon.</p> : <p className="mt-2">Find stones while studying or in Bag → Shop’s daily deals.</p>}
        </Panel> : null}
        {onBottleCap && ((bag?.['bottle-cap'] ?? 0) > 0 || (bag?.['gold-bottle-cap'] ?? 0) > 0) ? (() => {
          const ivs = ivsFor(p);
          const perfect = isPerfectIVs(ivs);
          const caps = bag?.['bottle-cap'] ?? 0;
          const golds = bag?.['gold-bottle-cap'] ?? 0;
          return <Panel title="Hyper training">
            {perfect ? <p>Every IV is already maxed.</p> : <>
              {caps > 0 ? <div className="pkr-hyper-row" role="group" aria-label={`Bottle Cap, ${caps} left`}>
                <span>Bottle Cap ×{caps}</span>
                {(['hp', 'attack', 'defense'] as const).map(stat => (
                  <button key={stat} type="button" className="pkr-game-btn px-2 py-1" disabled={powerUpBlocked || ivs[stat] >= 3}
                    onClick={() => onBottleCap(p.id, 'bottle-cap', stat)}>
                    {stat === 'hp' ? 'HP' : stat === 'attack' ? 'ATK' : 'DEF'} {ivs[stat]}/3
                  </button>
                ))}
              </div> : null}
              {golds > 0 ? <button type="button" className="pkr-game-btn mt-2 w-full px-3 py-2" disabled={powerUpBlocked}
                onClick={() => onBottleCap(p.id, 'gold-bottle-cap')}>Gold Bottle Cap ×{golds} · make a HUNDO</button> : null}
            </>}
          </Panel>;
        })() : null}
        {onTutor ? (() => {
          const options = tutorOptions(p);
          if (options.length === 0) return null;
          return <details className="pkr-tutor">
            <summary><span>Move Tutor</span><span className="pkr-tutor__count">{options.length} move{options.length === 1 ? '' : 's'}</span></summary>
            <p className="pkr-tutor__note">Learn a move early, up to 15 levels before {p.nickname || p.name} would.{p.autoMoves !== false ? ' Auto best moves uses it if it earns a slot.' : ''}</p>
            <ul className="pkr-tutor__list">
              {options.map(o => {
                const m = MOVES[o.moveId];
                return <li key={o.moveId} className="pkr-tutor__row">
                  <span className="pkr-tutor__move">
                    <strong>{moveDisplayName(o.moveId)}</strong>
                    <span>{m?.type ?? ''}{m && m.power > 0 ? ` · ${m.power}\u00a0PWR` : ' · Status'} · <span className="whitespace-nowrap">Lv {o.learnLevel}</span></span>
                  </span>
                  <button type="button" className="pkr-game-btn pkr-tutor__buy" disabled={powerUpBlocked || currency < o.price}
                    aria-label={`Teach ${moveDisplayName(o.moveId)} for ${coinsSpoken(o.price)}`}
                    onClick={() => onTutor(p.id, o.moveId)}>{formatCoins(o.price)}</button>
                </li>;
              })}
            </ul>
          </details>;
        })() : null}
        <div className="pkr-pixel-title mb-1 mt-1 pkr-fine font-black uppercase tracking-wide" style={{ color: 'var(--pkr-ink-muted)' }}>
          Moves ({dedupeMoveIds(p.moves ?? []).length}/4)
        </div>
        {onSetAutoMoves ? (
          <label className="pkr-auto-moves">
            <input
              type="checkbox"
              checked={p.autoMoves !== false}
              onChange={(e) => onSetAutoMoves(p.id, e.target.checked)}
            />
            <span>
              <strong>Auto best moves</strong>
              {p.autoMoves !== false
                ? ' · picks the strongest set and updates as new moves unlock'
                : ' · off, you chose these moves'}
            </span>
          </label>
        ) : null}
        <MoveList moves={p.moves ?? []} onForget={onForgetMove ? (mid) => onForgetMove(p.id, mid) : undefined} />
        {onLearnMove ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setMovePickerPokemonId((cur) => (cur === p.id ? null : p.id))}
              className="w-full pkr-btn-secondary py-1.5 pkr-fine font-black uppercase"
            >
              {movePickerPokemonId === p.id ? 'Hide teachable moves' : 'Teachable moves'}
            </button>
            {movePickerPokemonId === p.id ? (
              <TeachableMovesBrowser
                pokemon={p}
                onPickMove={(mid) => {
                  const n = dedupeMoveIds(p.moves ?? []).length;
                  if (n < 4) {
                    onLearnMove(p.id, mid);
                    setMovePickerPokemonId(null);
                  } else {
                    setMoveReplacePrompt({ pokemonId: p.id, moveId: mid });
                  }
                }}
              />
            ) : null}
          </div>
        ) : null}
        <div className="pkr-party-card__actions mt-2">
          {renaming === p.id ? (
            <div className="flex w-full flex-wrap items-center gap-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="pkr-input min-w-0 flex-1 rounded border px-2 py-1 pkr-fine"
                placeholder="Nickname"
                maxLength={12}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  onRename?.(p.id, renameValue);
                  setRenaming(null);
                }}
                className="pkr-btn-primary"
              >
                Save
              </button>
              <button type="button" onClick={() => setRenaming(null)} className="pkr-btn-secondary">
                Cancel
              </button>
            </div>
          ) : (
            <>
              {onRename ? (
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(p.id);
                    setRenameValue(p.nickname || '');
                  }}
                  className="pkr-btn-secondary"
                >
                  Rename
                </button>
              ) : null}
              {isParty && !isActive ? (
                <button
                  type="button"
                  onClick={() => {
                    onSwitch(p.id);
                    setExpanded(null);
                  }}
                  className="pkr-btn-primary"
                >
                  Set lead
                </button>
              ) : null}
              {isParty && onMoveToStorage ? (
                <button
                  type="button"
                  disabled={party.length <= 1}
                  title={
                    party.length <= 1
                      ? 'Catch or add another Pokémon before moving your only party member to storage'
                      : 'Send to PC Storage'
                  }
                  onClick={() => onMoveToStorage(p.id)}
                  className="pkr-btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  To storage
                </button>
              ) : null}
              {!isParty && onMoveToParty ? (
                <button
                  type="button"
                  disabled={party.length >= 6 && !onSwapStorageForParty}
                  title={party.length >= 6 && !onSwapStorageForParty ? 'Party is full (6/6)' : 'Add to party'}
                  onClick={() => {
                    if (party.length >= 6) {
                      if (onSwapStorageForParty) setReplaceStorageId(p.id);
                    } else {
                      onMoveToParty(p.id);
                      setExpanded(null);
                    }
                  }}
                  className="pkr-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {party.length >= 6 && onSwapStorageForParty ? 'To party (swap…)' : 'To party'}
                </button>
              ) : null}
              {onTransfer ? (
                <button
                  type="button"
                  disabled={p.favorite === true || (isParty && party.length <= 1)}
                  title={p.favorite ? 'Unfavourite ★ first' : isParty && party.length <= 1 ? 'Your last party Pokémon' : undefined}
                  onClick={() => setTransferIds([p.id])}
                  className="pkr-btn-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Transfer…
                </button>
              ) : onRelease ? (
                <button
                  type="button"
                  disabled={p.favorite === true || (isParty && party.length <= 1)}
                  title={p.favorite ? 'Remove this Pokémon from favorites before releasing it' : isParty && party.length <= 1 ? 'You need at least one Pokémon in your party' : undefined}
                  onClick={() => setReleaseTarget({ id: p.id, name: displayName })}
                  className="pkr-btn-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Release…
                </button>
              ) : null}
            </>
          )}
        </div>
      </>
    );

    const healItem = isParty && onHeal ? bestHealItemFor(bag ?? {}, p) : null;
    const needsCare = p.currentHp < p.maxHp;
    const lastParty = isParty && party.length <= 1;
    const payout = transferCoins(p);
    // Lead / Upgrade / Transfer (SPEC U1). Storage cards swap Lead for "To party".
    const actions = (
      <div className="pkr-card-actions3">
        {isParty ? (
          <button
            type="button"
            className="pkr-act-btn pkr-act-btn--lead"
            disabled={isActive || p.currentHp <= 0}
            onClick={() => onSwitch(p.id)}
            aria-label={isActive ? `${displayName} is leading` : `Make ${displayName} your lead`}
          >
            {isActive ? 'Leading' : p.currentHp <= 0 ? 'Fainted' : 'Lead'}
          </button>
        ) : (
          <button
            type="button"
            className="pkr-act-btn pkr-act-btn--lead"
            disabled={!onMoveToParty || (party.length >= 6 && !onSwapStorageForParty)}
            onClick={() => {
              if (party.length >= 6) {
                if (onSwapStorageForParty) setReplaceStorageId(p.id);
              } else onMoveToParty?.(p.id);
            }}
          >
            {party.length >= 6 ? 'Swap in' : 'To party'}
          </button>
        )}
        <button
          type="button"
          className={`pkr-act-btn pkr-act-btn--upgrade${!preview || currency < preview.cost ? ' pkr-act-btn--muted' : ''}`}
          onClick={() => setUpgradeId(p.id)}
          aria-label={preview ? `Upgrade ${displayName}: Power Up costs ${coinsSpoken(preview.cost)}` : `Upgrade ${displayName}`}
        >
          Upgrade
          <small>{preview ? formatCoins(preview.cost) : 'Max'}</small>
        </button>
        {onTransfer ? (
          <button
            type="button"
            className="pkr-act-btn pkr-act-btn--transfer"
            disabled={lastParty}
            title={lastParty ? 'Your last party Pokémon' : p.favorite ? 'Unfavourite ★ first' : undefined}
            onClick={() => setTransferIds([p.id])}
            aria-label={`Transfer ${displayName} for ${coinsSpoken(payout)}`}
          >
            Transfer
            <small>+{formatCoins(payout)}</small>
          </button>
        ) : null}
      </div>
    );
    const quickHeal =
      isParty && onHeal && needsCare && healItem && !healBlocked
        ? { onHeal: () => onHeal(p.id), title: `Use ${ITEM_BY_ID.get(healItem)?.name} on ${displayName}` }
        : undefined;

    return (
      <PartyPokemonCard
        key={p.id}
        actions={actions}
        rootURL={rootURL}
        pokemon={p}
        variant={isParty ? 'party' : 'storage'}
        isActive={isActive}
        isExpanded={isExpanded}
        onToggle={() => setExpanded(isExpanded ? null : p.id)}
        detail={detail}
        onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(p.id) : undefined}
        quickHeal={quickHeal}
        catchUp={isParty && catchUpGap(p, party) > 0}
        buddy={!!starterId && starterId === p.id}
      />
    );
  }

  const upgradeMon = upgradeId ? [...party, ...storage].find((x) => x.id === upgradeId) : undefined;
  const upgradeIsParty = !!upgradeMon && party.some((x) => x.id === upgradeMon.id);

  const replaceModalMon =
    moveReplacePrompt && [...party, ...storage].find((x) => x.id === moveReplacePrompt.pokemonId);
  const replaceNewMove = moveReplacePrompt ? MOVES[moveReplacePrompt.moveId] : undefined;

  const replaceMovePortal =
    typeof document !== 'undefined' &&
    moveReplacePrompt &&
    onLearnMove &&
    replaceModalMon &&
    replaceNewMove
      ? createPortal(
          <div
            className="fixed inset-0 z-[300] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.82)' }}
            role="presentation"
            onClick={() => setMoveReplacePrompt(null)}
          >
            {/* Portaled outside sidebar — pixel font + chrome must be explicit */}
            <div className="pkr-pixel-surface pkr-retro-chrome w-full max-w-lg sm:mx-3 sm:mb-3">
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="pkr-replace-move-title"
                tabIndex={-1}
                className="pkr-panel !rounded-t-2xl border-2 !shadow-[0_-12px_40px_rgba(0,0,0,0.65)] outline-none sm:!rounded-2xl"
                style={{
                  /* Opaque shell — overrides .pkr-panel translucent gradient so list behind does not bleed through */
                  background: 'linear-gradient(180deg, #1f3d1a 0%, #0f1f0d 52%, #0a1409 100%)',
                  borderColor: 'rgba(56, 112, 72, 0.95)',
                  maxHeight: 'min(88vh, 520px)',
                  paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="pkr-panel-header"
                  style={{
                    background: 'linear-gradient(90deg, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.06) 45%, transparent 100%)',
                  }}
                >
                  <div
                    id="pkr-replace-move-title"
                    className="pkr-pixel-title pkr-fine font-black uppercase leading-snug tracking-wide"
                  >
                    Replace a move?
                  </div>
                </div>
                <p className="pkr-fine font-semibold leading-relaxed" style={{ color: 'var(--pkr-ink-muted)' }}>
                  Teach <span style={{ color: 'var(--pkr-ink-gold)' }}>{replaceNewMove.name}</span> — tap a slot to overwrite (moveset is full).
                </p>
                <div
                  className="mt-2 flex min-h-0 flex-1 flex-col rounded border p-1"
                  style={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    background: '#050a05',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.45)',
                  }}
                >
                  <div className="max-h-[min(52vh,320px)] space-y-1 overflow-y-auto pr-0.5">
                    {dedupeMoveIds(replaceModalMon.moves ?? []).map((mid, idx) => {
                      const m = MOVES[mid];
                      const label = m?.name ?? mid;
                      return (
                        <button
                          key={`${mid}-${idx}`}
                          type="button"
                          className="flex w-full flex-col gap-0.5 rounded border px-1.5 py-1.5 text-left transition-[filter,box-shadow] hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pkr-accent,#fbbf24)]"
                          style={{
                            borderColor: 'rgba(255,255,255,0.1)',
                            background: '#142818',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                          }}
                          onClick={() => {
                            onLearnMove(moveReplacePrompt.pokemonId, moveReplacePrompt.moveId, idx);
                            setMoveReplacePrompt(null);
                            setMovePickerPokemonId(null);
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="pkr-fine font-black uppercase tabular-nums" style={{ color: 'var(--pkr-ink-muted)' }}>
                              Slot {idx + 1}
                            </span>
                            {m ? (
                              <span
                                className="rounded border px-1 py-px pkr-fine font-black uppercase"
                                style={typePillStyle(m.type)}
                              >
                                {m.type}
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1 truncate pkr-fine font-black" style={{ color: 'var(--pkr-ink-text)' }}>
                              {label}
                            </span>
                            {m && m.power > 0 ? (
                              <span className="shrink-0 pkr-fine font-bold tabular-nums" style={{ color: 'var(--pkr-ink-muted)' }}>
                                Pow {m.power}
                              </span>
                            ) : m ? (
                              <span className="shrink-0 pkr-fine font-bold uppercase" style={{ color: 'var(--pkr-ink-muted)' }}>
                                Status
                              </span>
                            ) : null}
                          </div>
                          {m ? (
                            <p className="pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
                              {moveUiDescription(mid)}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full pkr-btn-secondary pkr-fine font-black uppercase tracking-wide"
                  onClick={() => setMoveReplacePrompt(null)}
                >
                  Cancel
                </button>
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  const transferConfirm = transferIds && gameState && onTransfer ? (
        <TransferConfirm
          preview={transferPreview(gameState, transferIds)}
          onCancel={() => setTransferIds(null)}
          onConfirm={() => {
            onTransfer(transferIds);
            setTransferIds(null);
            setExpanded(null);
          }}
        />
      ) : null;

  if (viewAll) {
    return (
      <div className="space-y-3">
        {transferConfirm}
        <CollectionGridScreen
          rootURL={rootURL}
          party={party}
          storage={storage}
          activeId={activeId}
          starterId={starterId}
          storageCap={storageCap}
          initialFlags={viewAll.flags}
          onBack={() => setViewAll(null)}
          onOpen={openFromGrid}
          onTransfer={gameState && onTransfer ? (ids) => setTransferIds(ids) : undefined}
          onToggleFavorite={onToggleFavorite}
          onMoveToStorage={onMoveToStorage}
          onMoveToParty={onMoveToParty}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replaceMovePortal}
      <div className="pkr-party-viewall">
        {storageCap !== undefined ? <CapacityMeter label="Storage" used={storage.length} cap={storageCap} /> : <span />}
        <button type="button" onClick={() => setViewAll({ flags: [] })}>
          View all ({party.length + storage.length})
        </button>
      </div>

      <section className="pkr-collection-tools" aria-label="Collection filters">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search Pokémon by name or Pokédex number" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} aria-label="Sort Pokemon">
          <option value="level">Level</option><option value="power">Battle power</option><option value="iv">IV rating</option><option value="species">Species</option>
        </select>
        <label className="pkr-collection-tools__favorites"><input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only</label>
      </section>

      {transferConfirm}
      {upgradeMon ? (
        <UpgradeSheet
          rootURL={rootURL}
          pokemon={upgradeMon}
          bag={bag ?? {}}
          currency={currency}
          blocked={powerUpBlocked}
          evolutionBlocked={evolutionBlocked}
          onPowerUp={onPowerUp}
          onEvolve={upgradeIsParty ? onEvolve : undefined}
          onOpenDetail={() => {
            setExpanded(upgradeMon.id);
            setUpgradeId(null);
          }}
          onClose={() => setUpgradeId(null)}
        />
      ) : null}
      {releaseTarget && onRelease ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          role="presentation"
          onClick={() => setReleaseTarget(null)}
        >
          <div
            ref={releasePanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pkr-release-title"
            tabIndex={-1}
            className="pkr-battle-hud w-full max-w-sm rounded-lg border-2 p-4 shadow-xl outline-none"
            style={{
              borderColor: 'rgba(248,113,113,0.45)',
              background: 'linear-gradient(180deg, rgba(69,10,10,0.95) 0%, rgba(15,23,42,0.98) 100%)',
              boxShadow: '0 0 24px rgba(220,38,38,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div id="pkr-release-title" className="pkr-pixel-title pkr-fine font-black uppercase leading-snug" style={{ color: '#fecaca' }}>
              Release Pokémon?
            </div>
            <p className="mt-2 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-text)' }}>
              <span className="font-black text-amber-200">{releaseTarget.name}</span> will be gone forever. This cannot be undone.
            </p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:flex-row-reverse sm:flex-wrap sm:justify-start sm:gap-2">
              <button
                type="button"
                className="pkr-btn-destructive w-full sm:w-auto"
                onClick={() => {
                  onRelease(releaseTarget.id);
                  setReleaseTarget(null);
                  setExpanded(null);
                }}
              >
                Release permanently
              </button>
              <button type="button" className="pkr-btn-secondary w-full sm:w-auto" onClick={() => setReleaseTarget(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {replaceStorageId && onSwapStorageForParty && incomingReplace ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-2 sm:items-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          role="dialog"
          aria-modal
          aria-label="Choose party member to replace"
          onClick={() => setReplaceStorageId(null)}
        >
          <div
            ref={replacePanelRef}
            tabIndex={-1}
            onKeyDown={replaceKeyDown}
            className="pkr-battle-hud max-h-[min(70vh,420px)] w-full max-w-sm overflow-y-auto rounded-lg border p-3 shadow-xl outline-none"
            style={{ borderColor: 'var(--pkr-panel-border)', background: 'var(--pkr-sidebar-gradient)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pkr-fine font-black" style={{ color: 'var(--pkr-pill-active-text)' }}>
              Party is full — who should return to storage?
            </div>
            <div className="mt-1 pkr-fine font-semibold" style={{ color: 'var(--pkr-accent-muted)' }}>
              <span className="font-bold text-amber-200">{incomingReplace.nickname || incomingReplace.name}</span> will join your party.
            </div>
            <div className="mt-2 space-y-1">
              {party.map((m) => {
                const dn = m.nickname || m.name;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="flex w-full min-h-[3.25rem] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-opacity hover:opacity-95"
                    style={{ borderColor: 'var(--pkr-secondary-btn-border)', background: 'rgba(0,0,0,0.35)' }}
                    onClick={() => {
                      onSwapStorageForParty(replaceStorageId, m.id);
                      setReplaceStorageId(null);
                      setExpanded(null);
                    }}
                  >
                    <PokemonSprite src={frontSpriteUrl(rootURL, m.dexNum, m.shiny === true)} alt={dn} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate pkr-fine font-bold" style={{ color: '#f1f5f9' }}>
                        {dn}
                      </div>
                      <div className="pkr-fine font-semibold" style={{ color: 'var(--pkr-ink-muted)' }}>
                        Lv{m.level}
                      </div>
                    </div>
                    {m.id === activeId ? (
                      <span className="shrink-0 rounded px-1 py-px pkr-fine font-black uppercase" style={{ background: 'var(--pkr-accent)', color: '#0f172a' }}>
                        Lead
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button type="button" className="mt-2 w-full pkr-btn-secondary pkr-fine" onClick={() => setReplaceStorageId(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <Panel title={`Party · ${party.length}/6`} icon={<GameIcon name="party" size={14} />}>
        <p className="mb-2 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
          Select a Pokémon to manage it. Your{' '}
          <span style={{ color: 'var(--pkr-ink-gold-strong)' }}>Lead</span> is your active battler.
        </p>
        <div className="space-y-2">{visibleParty.length ? visibleParty.map((p) => renderPokemon(p, true)) : <div className="pkr-empty-filter">No party Pokémon match these filters.</div>}</div>
      </Panel>

      {storage.length > 0 ? (
        <section className="space-y-2">
          <button type="button" className="pkr-storage-toggle" onClick={() => setShowStorage(!showStorage)} aria-expanded={showStorage}>
            <span className="flex items-center gap-2">
              <GameIcon name="box" size={14} style={{ color: 'var(--pkr-ink-muted)' }} />
              <span style={{ color: 'var(--pkr-ink-text)' }}>PC storage</span>
            </span>
            <span className="tabular-nums pkr-fine font-black" style={{ color: 'var(--pkr-ink-muted)' }}>
              {storage.length} · {showStorage ? 'hide' : 'show'}
            </span>
          </button>
          {showStorage ? (
            <div className="pkr-bag-shelf space-y-2">
              <p className="px-0.5 pkr-fine font-bold uppercase tracking-wide" style={{ color: 'var(--pkr-ink-muted)' }}>
                Not in your party — use “To party” to swap or add.
              </p>
              {visibleStorage.length ? visibleStorage.map((p) => renderPokemon(p, false)) : <div className="pkr-empty-filter">No stored Pokémon match these filters.</div>}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
