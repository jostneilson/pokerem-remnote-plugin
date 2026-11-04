import { useEffect, useMemo, useRef, useState } from 'react';
import type { PokemonType } from '../../game/data/species';
import { ALL_TYPES } from '../../game/data/typeChart';
import {
  allOwned,
  queryGrid,
  selectDuplicatesKeepBest,
  type GridEntry,
  type GridFlag,
  type GridSort
} from '../../game/engine/collectionGrid';
import { isPerfectIVs, ivAverage } from '../../game/engine/pokemonStats';
import type { OwnedPokemon } from '../../game/state/model';
import { frontSpriteUrl } from '../../game/sprites';
import { TYPE_COLORS } from '../battle/battleTheme';
import { PokemonSprite } from '../components/PokemonSprite';

/*
 * View all grid (SPEC U4) with select mode and the bulk bar (U5). Windowed: only the rows in view plus two
 * buffer rows above and below are rendered, so 500+ tiles stay smooth.
 */

const TILE_W = 84;
const TILE_H = 104;
const GAP = 6;
const ROW_H = TILE_H + GAP;
const BUFFER_ROWS = 2;
const LONG_PRESS_MS = 450;

const SORTS: { id: GridSort; label: string }[] = [
  { id: 'level', label: 'Level' },
  { id: 'iv', label: 'IV %' },
  { id: 'power', label: 'Power' },
  { id: 'dex', label: 'Dex #' },
  { id: 'type', label: 'Type' },
  { id: 'caught', label: 'Caught' },
  { id: 'rarity', label: 'Rarity' }
];

const FLAGS: { id: GridFlag; label: string }[] = [
  { id: 'shiny', label: '✦ Shiny' },
  { id: 'hundo', label: 'HUNDO' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'favorite', label: '★ Favourites' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'party', label: 'Party' },
  { id: 'storage', label: 'Storage' }
];

export function CollectionGridScreen({
  rootURL,
  party,
  storage,
  activeId,
  starterId,
  storageCap,
  initialFlags,
  onBack,
  onOpen,
  onTransfer,
  onToggleFavorite,
  onMoveToStorage,
  onMoveToParty
}: {
  rootURL: string | undefined;
  party: OwnedPokemon[];
  storage: OwnedPokemon[];
  activeId: string | null;
  starterId?: string;
  /** Storage capacity, when capacity caps are on. */
  storageCap?: number;
  initialFlags?: GridFlag[];
  onBack: () => void;
  /** Open a Pokémon's detail on the Party screen. */
  onOpen: (id: string, inParty: boolean) => void;
  /** Open the transfer confirm for these ids. */
  onTransfer?: (ids: string[]) => void;
  onToggleFavorite?: (id: string) => void;
  onMoveToStorage?: (id: string) => void;
  onMoveToParty?: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<GridSort>('level');
  const [ascending, setAscending] = useState<boolean | undefined>(undefined);
  const [flags, setFlags] = useState<GridFlag[]>(initialFlags ?? []);
  const [type, setType] = useState<PokemonType | ''>('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ width: 320, height: 480, top: 0 });
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const entries = useMemo(() => allOwned(party, storage), [party, storage]);
  const visible = useMemo(
    () => queryGrid(entries, { search, flags, type: type || null, sort, ascending }),
    [entries, search, flags, type, sort, ascending]
  );
  const ascendingNow = ascending ?? (sort === 'dex' || sort === 'type');

  // Drop selections for Pokémon that are gone (transferred) after a save update.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(entries.map((e) => e.mon.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [entries]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setView({ width: el.clientWidth, height: el.clientHeight, top: el.scrollTop });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro?.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, []);

  const cols = Math.max(1, Math.floor((view.width + GAP) / (TILE_W + GAP)));
  const rows = Math.ceil(visible.length / cols);
  const firstRow = Math.max(0, Math.floor(view.top / ROW_H) - BUFFER_ROWS);
  const lastRow = Math.min(rows, Math.ceil((view.top + view.height) / ROW_H) + BUFFER_ROWS);
  const slice = visible.slice(firstRow * cols, lastRow * cols);

  const toggleFlag = (f: GridFlag) => setFlags((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const exitSelect = () => {
    setSelecting(false);
    clearSelection();
  };

  const startPress = (id: string) => {
    longPressed.current = false;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setSelecting(true);
      toggleSelect(id);
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const tap = (e: GridEntry) => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (selecting) toggleSelect(e.mon.id);
    else onOpen(e.mon.id, e.inParty);
  };

  const selectedEntries = entries.filter((e) => selected.has(e.mon.id));
  const selectedParty = selectedEntries.filter((e) => e.inParty);
  const selectedStorage = selectedEntries.filter((e) => !e.inParty);
  const partyRoom = Math.max(0, 6 - party.length);
  const allFav = selectedEntries.length > 0 && selectedEntries.every((e) => e.mon.favorite);
  // Moving every party member out would leave no lead; keep at least one.
  const canMoveToStorage = !!onMoveToStorage && selectedParty.length > 0 && selectedParty.length < party.length;
  const canMoveToParty = !!onMoveToParty && selectedStorage.length > 0 && partyRoom > 0;

  const bulkFavourite = () => {
    if (!onToggleFavorite) return;
    for (const e of selectedEntries) if (allFav || !e.mon.favorite) onToggleFavorite(e.mon.id);
  };
  const bulkToStorage = () => {
    if (!canMoveToStorage) return;
    for (const e of selectedParty) onMoveToStorage!(e.mon.id);
    clearSelection();
  };
  const bulkToParty = () => {
    if (!canMoveToParty) return;
    for (const e of selectedStorage.slice(0, partyRoom)) onMoveToParty!(e.mon.id);
    clearSelection();
  };

  const capText = storageCap !== undefined ? `Storage ${storage.length}/${storageCap}` : `Storage ${storage.length}`;
  const capFull = storageCap !== undefined && storage.length >= storageCap;

  return (
    <div className="pkr-grid-screen">
      <header className="pkr-grid-head">
        <button type="button" className="pkr-grid-back" onClick={onBack} aria-label="Back to Party">
          ←
        </button>
        <h2 className="pkr-grid-title">All Pokémon ({entries.length})</h2>
        <span className={`pkr-cap-meter${capFull ? ' pkr-cap-meter--full' : ''}`} aria-label={capText}>
          {capText}
        </span>
      </header>

      <div className="pkr-grid-tools">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search Pokémon by name or Pokédex number" />
        <div className="pkr-grid-tools__sort">
          <select value={sort} onChange={(e) => setSort(e.target.value as GridSort)} aria-label="Sort by">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pkr-grid-dir"
            onClick={() => setAscending(!ascendingNow)}
            aria-label={ascendingNow ? 'Ascending; switch to descending' : 'Descending; switch to ascending'}
          >
            {ascendingNow ? '↑' : '↓'}
          </button>
          <button
            type="button"
            className={`pkr-grid-select${selecting ? ' is-on' : ''}`}
            aria-pressed={selecting}
            onClick={() => (selecting ? exitSelect() : setSelecting(true))}
          >
            {selecting ? 'Done' : 'Select'}
          </button>
        </div>
        <div className="pkr-grid-chips" role="group" aria-label="Filters">
          {FLAGS.map((f) => (
            <button key={f.id} type="button" className="pkr-grid-chip" aria-pressed={flags.includes(f.id)} onClick={() => toggleFlag(f.id)}>
              {f.label}
            </button>
          ))}
          <select className="pkr-grid-chip pkr-grid-chip--type" value={type} onChange={(e) => setType(e.target.value as PokemonType | '')} aria-label="Filter by type">
            <option value="">Any type</option>
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={scrollRef} className="pkr-grid-scroll" role="list" aria-label="Owned Pokémon">
        {visible.length === 0 ? (
          <div className="pkr-empty-filter">No Pokémon match these filters.</div>
        ) : (
          <div
            className="pkr-grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              paddingTop: firstRow * ROW_H,
              paddingBottom: Math.max(0, (rows - lastRow) * ROW_H)
            }}
          >
            {slice.map((e) => {
              const m = e.mon;
              const hundo = isPerfectIVs(m.ivs);
              const stars = Math.round(ivAverage(m));
              const isSel = selected.has(m.id);
              const name = m.nickname || m.name;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="listitem"
                  className={`pkr-grid-tile${e.inParty ? ' pkr-grid-tile--party' : ''}${isSel ? ' is-selected' : ''}${m.shiny ? ' pkr-grid-tile--shiny' : ''}`}
                  aria-pressed={selecting ? isSel : undefined}
                  aria-label={`${name}, level ${m.level}${m.shiny ? ', shiny' : ''}${m.favorite ? ', favourite' : ''}${m.id === starterId ? ', buddy' : ''}${e.inParty ? ', in party' : ''}`}
                  onPointerDown={() => startPress(m.id)}
                  onPointerUp={endPress}
                  onPointerLeave={endPress}
                  onPointerCancel={endPress}
                  onContextMenu={(ev) => ev.preventDefault()}
                  onClick={() => tap(e)}
                >
                  <span className="pkr-grid-tile__icons" aria-hidden="true">
                    {m.shiny ? <i className="is-shiny">✦</i> : null}
                    {m.favorite ? <i className="is-fav">★</i> : null}
                    {m.id === starterId ? <i className="is-buddy">♥</i> : null}
                  </span>
                  {selecting ? <span className={`pkr-grid-tile__check${isSel ? ' is-on' : ''}`} aria-hidden="true">{isSel ? '✓' : ''}</span> : null}
                  <PokemonSprite src={frontSpriteUrl(rootURL, m.dexNum, m.shiny === true)} alt="" size={56} lazy />
                  <span className="pkr-grid-tile__lv">Lv {m.level}</span>
                  {hundo ? (
                    <span className="pkr-hundo-badge pkr-grid-tile__hundo">HUNDO</span>
                  ) : (
                    <span className="pkr-grid-tile__stars" aria-hidden="true">
                      {'★'.repeat(stars)}
                      <s>{'★'.repeat(3 - stars)}</s>
                    </span>
                  )}
                  <span className="pkr-grid-tile__types" aria-hidden="true">
                    {m.types.map((t) => (
                      <i key={t} style={{ background: TYPE_COLORS[t]?.bg ?? '#718096' }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selecting ? (
        <div className="pkr-bulk-bar" role="region" aria-label="Selected Pokémon">
          <div className="pkr-bulk-bar__row">
            <span className="pkr-bulk-bar__count">{selected.size} selected</span>
            <button
              type="button"
              className="pkr-act-btn pkr-act-btn--transfer"
              disabled={!onTransfer || selected.size === 0}
              onClick={() => onTransfer?.([...selected])}
            >
              Transfer
            </button>
            <button type="button" className="pkr-bulk-btn" disabled={!onToggleFavorite || selected.size === 0} onClick={bulkFavourite}>
              {allFav ? '☆ Unfavourite' : '★ Favourite'}
            </button>
            <button type="button" className="pkr-bulk-btn" disabled={!canMoveToStorage} onClick={bulkToStorage}>
              Move to storage
            </button>
            <button
              type="button"
              className="pkr-bulk-btn"
              disabled={!canMoveToParty}
              title={partyRoom === 0 ? 'Party is full (6/6)' : undefined}
              onClick={bulkToParty}
            >
              Move to party
            </button>
          </div>
          <div className="pkr-bulk-bar__row pkr-bulk-bar__row--more">
            <button type="button" className="pkr-bulk-link" onClick={() => setSelected(new Set(selectDuplicatesKeepBest(entries, { starterId, activeId })))}>
              Select duplicates (keep best)
            </button>
            <button type="button" className="pkr-bulk-link" onClick={() => setSelected(new Set(visible.map((e) => e.mon.id)))}>
              Select all filtered
            </button>
            <button type="button" className="pkr-bulk-link" onClick={clearSelection}>
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
