import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { OwnedPokemon } from '../../game/state/model';
import { MOVES } from '../../game/data/moves';
import { frontSpriteUrl } from '../../game/sprites';
import { typePillStyle } from '../battle/battleTheme';
import { Panel } from '../components/Panel';
import { PokemonSprite } from '../components/PokemonSprite';
import { GameIcon } from '../components/GameIcon';
import { PartyPokemonCard } from '../components/PartyPokemonCard';
import { PokemonGrowthPanel } from '../components/PokemonGrowthPanel';

function MoveList({ moves, onForget }: { moves: string[]; onForget?: (id: string) => void }) {
  if (moves.length === 0) {
    return (
      <div className="rounded border border-dashed border-white/10 px-2 py-1.5 text-[9px] font-semibold" style={{ color: '#64748b' }}>
        No moves learned yet.
      </div>
    );
  }
  return (
    <div className="mt-1 flex flex-col gap-1">
      {moves.map((mid) => {
        const m = MOVES[mid];
        if (!m) return null;
        return (
          <div key={mid} className="flex min-h-[2rem] items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded border px-1.5 py-1" style={typePillStyle(m.type)}>
              <span className="truncate text-[8px] font-bold">{m.name}</span>
              {m.power > 0 ? (
                <span className="shrink-0 rounded px-0.5 text-[7px] font-bold" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {m.power}
                </span>
              ) : null}
            </div>
            {onForget ? (
              <button
                type="button"
                onClick={() => onForget(mid)}
                className="pkr-btn-secondary shrink-0 px-2 py-1 text-[8px] font-bold"
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

export function PartyScreen({
  rootURL,
  party,
  storagePokemon,
  activeId,
  onSwitch,
  onForgetMove,
  onRename,
  onRelease,
  onMoveToStorage,
  onMoveToParty,
  onSwapStorageForParty,
}: {
  rootURL: string | undefined;
  party: OwnedPokemon[];
  storagePokemon?: OwnedPokemon[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onForgetMove?: (pokemonId: string, moveId: string) => void;
  onRename?: (pokemonId: string, name: string) => void;
  onRelease?: (pokemonId: string) => void;
  onMoveToStorage?: (pokemonId: string) => void;
  onMoveToParty?: (pokemonId: string) => void;
  /** When party is full (6), swap a storage mon in for a chosen party member. */
  onSwapStorageForParty?: (storagePokemonId: string, replacePartyPokemonId: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showStorage, setShowStorage] = useState(false);
  const [replaceStorageId, setReplaceStorageId] = useState<string | null>(null);
  const [releaseTarget, setReleaseTarget] = useState<{ id: string; name: string } | null>(null);
  const replacePanelRef = useRef<HTMLDivElement | null>(null);
  const releasePanelRef = useRef<HTMLDivElement | null>(null);
  const storage = storagePokemon ?? [];
  const incomingReplace = replaceStorageId ? storage.find((x) => x.id === replaceStorageId) : undefined;

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

  function renderPokemon(p: OwnedPokemon, isParty: boolean) {
    const isExpanded = expanded === p.id;
    const isActive = p.id === activeId;
    const displayName = p.nickname || p.name;

    const detail = (
      <>
        <PokemonGrowthPanel pokemon={p} />
        <div className="pkr-pixel-title mb-1 mt-1 text-[6px] font-black uppercase tracking-wide" style={{ color: '#94a3b8' }}>
          Moves ({(p.moves ?? []).length}/4)
        </div>
        <MoveList moves={p.moves ?? []} onForget={onForgetMove ? (mid) => onForgetMove(p.id, mid) : undefined} />
        <div className="pkr-party-card__actions mt-2">
          {renaming === p.id ? (
            <div className="flex w-full flex-wrap items-center gap-1">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="pkr-input min-w-0 flex-1 rounded border px-2 py-1 text-[10px]"
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
              {onRelease ? (
                <button
                  type="button"
                  disabled={isParty && party.length <= 1}
                  title={isParty && party.length <= 1 ? 'You need at least one Pokémon in your party' : undefined}
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

    return (
      <PartyPokemonCard
        key={p.id}
        rootURL={rootURL}
        pokemon={p}
        variant={isParty ? 'party' : 'storage'}
        isActive={isActive}
        isExpanded={isExpanded}
        onToggle={() => setExpanded(isExpanded ? null : p.id)}
        detail={detail}
      />
    );
  }

  return (
    <div className="space-y-3">
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
            <div id="pkr-release-title" className="pkr-pixel-title text-[8px] font-black uppercase leading-snug" style={{ color: '#fecaca' }}>
              Release Pokémon?
            </div>
            <p className="mt-2 text-[10px] font-semibold leading-snug" style={{ color: '#e2e8f0' }}>
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
            <div className="text-[11px] font-black" style={{ color: 'var(--pkr-pill-active-text)' }}>
              Party is full — who should return to storage?
            </div>
            <div className="mt-1 text-[9px] font-semibold" style={{ color: 'var(--pkr-accent-muted)' }}>
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
                    <PokemonSprite src={frontSpriteUrl(rootURL, m.dexNum)} alt={dn} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-bold" style={{ color: '#f1f5f9' }}>
                        {dn}
                      </div>
                      <div className="text-[8px] font-semibold" style={{ color: '#94a3b8' }}>
                        Lv{m.level}
                      </div>
                    </div>
                    {m.id === activeId ? (
                      <span className="shrink-0 rounded px-1 py-px text-[7px] font-black uppercase" style={{ background: 'var(--pkr-accent)', color: '#0f172a' }}>
                        Lead
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <button type="button" className="mt-2 w-full pkr-btn-secondary text-[10px]" onClick={() => setReplaceStorageId(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <Panel title={`Party · ${party.length}/6`} icon={<GameIcon name="party" size={14} />}>
        <p className="mb-2 text-[9px] font-semibold leading-snug" style={{ color: '#64748b' }}>
          Tap a Pokémon for moves, rename, storage, or release. The <span style={{ color: '#fbbf24' }}>Lead</span> is your active battler.
        </p>
        <div className="space-y-2">{party.map((p) => renderPokemon(p, true))}</div>
      </Panel>

      {storage.length > 0 ? (
        <section className="space-y-2">
          <button type="button" className="pkr-storage-toggle" onClick={() => setShowStorage(!showStorage)} aria-expanded={showStorage}>
            <span className="flex items-center gap-2">
              <GameIcon name="box" size={14} style={{ color: '#94a3b8' }} />
              <span style={{ color: '#e2e8f0' }}>PC storage</span>
            </span>
            <span className="tabular-nums text-[10px] font-black" style={{ color: '#64748b' }}>
              {storage.length} · {showStorage ? 'hide' : 'show'}
            </span>
          </button>
          {showStorage ? (
            <div className="pkr-bag-shelf space-y-2">
              <p className="px-0.5 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#64748b' }}>
                Not in your party — use “To party” to swap or add.
              </p>
              {storage.map((p) => renderPokemon(p, false))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
