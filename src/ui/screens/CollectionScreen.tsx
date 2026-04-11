import { useState, useMemo, useEffect, useRef } from 'react';
import { SPECIES_LIST } from '../../game/data/species';
import type { PokemonType } from '../../game/data/species';
import { ALL_TYPES } from '../../game/data/typeChart';
import { typePillStyle } from '../battle/battleTheme';
import { TypeSymbolImage } from '../battle/TypeBattleIcon';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { DexEntryTile } from '../components/DexEntryTile';
import { DexDetailPanel } from './DexDetailPanel';

const GEN_LABELS = ['Gen 1', 'Gen 2', 'Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'Gen 7', 'Gen 8'];
type CaughtFilter = 'all' | 'caught' | 'uncaught';

export function CollectionScreen({
  rootURL,
  collectionDex,
}: {
  rootURL: string | undefined;
  collectionDex: Record<number, number>;
}) {
  const [selectedGen, setSelectedGen] = useState(1);
  const [typeFilter, setTypeFilter] = useState<PokemonType | null>(null);
  const [caughtFilter, setCaughtFilter] = useState<CaughtFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedDex, setSelectedDex] = useState<number | null>(null);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const [dexCols, setDexCols] = useState(3);

  const totalCaught = Object.values(collectionDex).filter((n) => n > 0).length;

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const read = () => {
      const w = el.clientWidth;
      if (w < 220) setDexCols(2);
      else if (w < 340) setDexCols(3);
      else setDexCols(4);
    };
    read();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(read);
      ro.observe(el);
    }
    window.addEventListener('resize', read);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', read);
    };
  }, []);

  const filtered = useMemo(() => {
    let list = SPECIES_LIST.filter((s) => s.generation === selectedGen);
    if (typeFilter) list = list.filter((s) => s.types.includes(typeFilter));
    if (caughtFilter === 'caught') list = list.filter((s) => (collectionDex[s.dexNum] ?? 0) > 0);
    if (caughtFilter === 'uncaught') list = list.filter((s) => (collectionDex[s.dexNum] ?? 0) === 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || String(s.dexNum).includes(q));
    }
    return list;
  }, [selectedGen, typeFilter, caughtFilter, search, collectionDex]);

  const genCaughtCounts = useMemo(() => {
    const counts: Record<number, { caught: number; total: number }> = {};
    for (let g = 1; g <= 8; g++) {
      const genPoke = SPECIES_LIST.filter((s) => s.generation === g);
      counts[g] = { caught: genPoke.filter((s) => (collectionDex[s.dexNum] ?? 0) > 0).length, total: genPoke.length };
    }
    return counts;
  }, [collectionDex]);

  const gc = genCaughtCounts[selectedGen];

  return (
    <Panel title={`Pokedex · ${totalCaught} registered`} icon={<GameIcon name="book" size={14} />}>
      {selectedDex != null ? (
        <DexDetailPanel
          dexNum={selectedDex}
          rootURL={rootURL}
          caughtCount={collectionDex[selectedDex] ?? 0}
          onClose={() => setSelectedDex(null)}
        />
      ) : null}

      <div className="pkr-dex-screen-hero flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="pkr-pixel-title text-[7px] font-black uppercase leading-tight tracking-wide" style={{ color: '#a5b4fc' }}>
            National dex
          </div>
          <div className="mt-0.5 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
            Tap a species to open its entry. Unknown silhouettes clear when you catch one.
          </div>
        </div>
        <div
          className="shrink-0 rounded-lg border-2 px-2 py-1 text-center"
          style={{ borderColor: 'rgba(52,211,153,0.35)', background: 'rgba(6,78,59,0.35)' }}
        >
          <div className="pkr-pixel-title text-[8px] font-black tabular-nums" style={{ color: '#6ee7b7' }}>
            {totalCaught}
          </div>
          <div className="text-[6px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>
            / {SPECIES_LIST.length}
          </div>
        </div>
      </div>

      <div className="pkr-dex-toolbar">
        <div className="pkr-dex-toolbar-label">Generation</div>
        <div className="flex flex-wrap gap-1">
          {GEN_LABELS.map((label, i) => {
            const gen = i + 1;
            const info = genCaughtCounts[gen];
            const isActive = selectedGen === gen;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedGen(gen)}
                className={`pkr-pill ${isActive ? 'pkr-pill-active' : 'pkr-pill-inactive'}`}
              >
                {label}{' '}
                <span className="tabular-nums opacity-80">
                  ({info.caught}/{info.total})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pkr-dex-toolbar">
        <div className="pkr-dex-toolbar-label">Find</div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or dex #…"
          className="pkr-input mb-2 w-full px-2.5 py-2 text-[11px]"
        />
        <div className="pkr-dex-toolbar-label">Caught</div>
        <div className="mb-2 flex flex-wrap gap-1">
          {(['all', 'caught', 'uncaught'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setCaughtFilter(f)}
              className={`capitalize pkr-pill ${caughtFilter === f ? 'pkr-pill-active' : 'pkr-pill-inactive'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="pkr-dex-toolbar-label">Type</div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setTypeFilter(null)}
            className={`pkr-pill ${!typeFilter ? 'pkr-pill-active' : 'pkr-pill-inactive'}`}
          >
            All types
          </button>
          {ALL_TYPES.map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(active ? null : t)}
                className={`flex items-center gap-1 rounded-md border-2 px-1.5 py-1 text-[7px] font-black uppercase transition-all ${
                  active ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-[#0f172a]' : 'opacity-75 hover:opacity-100'
                }`}
                style={typePillStyle(t)}
                title={t}
              >
                <TypeSymbolImage rootURL={rootURL} type={t} size={14} variant="resist" />
                <span className="max-w-[3.25rem] truncate">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="mb-2 rounded-md border border-white/10 px-2 py-1.5 text-center"
        style={{ background: 'rgba(0,0,0,0.2)' }}
      >
        <span className="text-[10px] font-bold" style={{ color: '#cbd5e1' }}>
          Gen {selectedGen}:{' '}
          <span className="tabular-nums text-emerald-300">
            {gc.caught}/{gc.total}
          </span>{' '}
          caught
        </span>
        <span className="mx-1.5 opacity-40" style={{ color: '#64748b' }}>
          ·
        </span>
        <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>
          {filtered.length} shown
        </span>
      </div>

      <div ref={gridWrapRef} className="min-w-0">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${dexCols}, minmax(0, 1fr))` }}>
          {filtered.map((s) => {
            const count = collectionDex[s.dexNum] ?? 0;
            const owned = count > 0;
            return (
              <DexEntryTile
                key={s.dexNum}
                rootURL={rootURL}
                species={{ dexNum: s.dexNum, name: s.name }}
                owned={owned}
                onSelect={() => setSelectedDex(s.dexNum)}
              />
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-[10px] font-semibold leading-relaxed" style={{ color: '#64748b', gridColumn: '1 / -1' }}>
              No species match these filters.
              <br />
              <span className="text-[9px] opacity-90">Try another generation or clear type / caught filters.</span>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
