import { useState, type CSSProperties } from 'react';
import type { PokemonType } from '../../game/data/species';
import { ALL_TYPES, getWeaknesses, getResistances, getImmunities, getEffectiveness } from '../../game/data/typeChart';
import { typePillStyle, TYPE_COLORS } from '../battle/battleTheme';
import { TypeSymbolImage } from '../battle/TypeBattleIcon';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';

type ViewMode = 'simple' | 'chart';

function TypePickerButton({
  rootURL,
  type,
  selected,
  onClick,
}: {
  rootURL: string | undefined;
  type: PokemonType;
  selected: boolean;
  onClick: () => void;
}) {
  const pill = typePillStyle(type);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[1.85rem] items-center gap-1 rounded-md border-2 px-1.5 py-1 text-[7px] font-black uppercase transition-all ${
        selected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0f172a]' : 'opacity-80 hover:opacity-100'
      }`}
      style={pill}
      title={type}
    >
      <TypeSymbolImage rootURL={rootURL} type={type} size={15} variant="resist" />
      <span className="max-w-[3.5rem] truncate">{type}</span>
    </button>
  );
}

function TypeChip({ type }: { type: PokemonType }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded border-2 px-1 py-px text-[7px] font-black uppercase" style={typePillStyle(type)}>
      {type}
    </span>
  );
}

function SimpleView({ selected }: { selected: PokemonType }) {
  const weakTo = getWeaknesses([selected]);
  const resists = getResistances([selected]);
  const immune = getImmunities([selected]);
  const strongAgainst = ALL_TYPES.filter((def) => getEffectiveness(selected, [def]) >= 2);
  const weakAgainst = ALL_TYPES.filter((def) => {
    const eff = getEffectiveness(selected, [def]);
    return eff > 0 && eff < 1;
  });
  const noEffect = ALL_TYPES.filter((def) => getEffectiveness(selected, [def]) === 0);

  return (
    <div className="space-y-2 text-[10px]">
      <div className="pkr-typechart-section">
        <div className="pkr-typechart-section-title">Defending as {selected}</div>
        <div className="space-y-1.5" style={{ color: '#cbd5e1' }}>
          {weakTo.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#fca5a5' }}>
                Weak (2× damage)
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {weakTo.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
          {resists.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#86efac' }}>
                Resists (½×)
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {resists.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
          {immune.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#94a3b8' }}>
                Immune (0×)
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {immune.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pkr-typechart-section">
        <div className="pkr-typechart-section-title">Attacking as {selected}</div>
        <div className="space-y-1.5" style={{ color: '#cbd5e1' }}>
          {strongAgainst.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#86efac' }}>
                Super-effective vs
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {strongAgainst.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
          {weakAgainst.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#fca5a5' }}>
                Not very effective vs
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {weakAgainst.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
          {noEffect.length > 0 ? (
            <div>
              <span className="font-black" style={{ color: '#94a3b8' }}>
                No effect on
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {noEffect.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function typeHeaderCellStyle(t: PokemonType): CSSProperties {
  const pill = typePillStyle(t);
  return {
    borderColor: pill.borderColor as string,
    borderWidth: 1,
    borderStyle: 'solid',
    color: pill.color as string,
    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.68) 100%), linear-gradient(180deg, ${TYPE_COLORS[t].bg} 0%, ${TYPE_COLORS[t].bg} 100%)`,
  };
}

function cellStyle(eff: number): CSSProperties {
  if (eff >= 2) {
    return {
      background: 'linear-gradient(180deg, rgba(34,197,94,0.55) 0%, rgba(21,128,61,0.5) 100%)',
      color: '#ecfdf5',
      textShadow: '0 1px 0 rgba(0,0,0,0.5)',
    };
  }
  if (eff === 0) {
    return {
      background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
      color: '#64748b',
      fontWeight: 900,
    };
  }
  if (eff < 1) {
    return {
      background: 'linear-gradient(180deg, rgba(239,68,68,0.45) 0%, rgba(127,29,29,0.4) 100%)',
      color: '#fef2f2',
      textShadow: '0 1px 0 rgba(0,0,0,0.45)',
    };
  }
  return {
    background: 'rgba(30,41,59,0.35)',
    color: '#475569',
    fontWeight: 700,
  };
}

function ChartView() {
  return (
    <div>
      <div className="pkr-typechart-legend">
        <span className="pkr-typechart-legend-item">
          <span className="pkr-typechart-swatch" style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.7), rgba(21,128,61,0.6))' }} />{' '}
          2× super-effective
        </span>
        <span className="pkr-typechart-legend-item">
          <span className="pkr-typechart-swatch" style={{ background: 'rgba(30,41,59,0.5)' }} /> 1× neutral
        </span>
        <span className="pkr-typechart-legend-item">
          <span className="pkr-typechart-swatch" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.55), rgba(127,29,29,0.45))' }} />{' '}
          ½× resisted
        </span>
        <span className="pkr-typechart-legend-item">
          <span className="pkr-typechart-swatch" style={{ background: '#020617' }} /> 0× immune
        </span>
      </div>
      <div className="pkr-typechart-matrix-wrap pkr-no-scrollbar">
        <table className="pkr-typechart-matrix w-full">
          <thead>
            <tr>
              <th
                className="pkr-typechart-corner"
                style={{
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 25,
                }}
              >
                Attack →
                <br />
                ↓ Defend
              </th>
              {ALL_TYPES.map((t) => (
                <th key={t} className="pkr-typechart-colhead" style={typeHeaderCellStyle(t)}>
                  {t.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_TYPES.map((atk) => (
              <tr key={atk}>
                <td className="pkr-typechart-rowhead" style={typeHeaderCellStyle(atk)}>
                  {atk.slice(0, 3)}
                </td>
                {ALL_TYPES.map((def) => {
                  const eff = getEffectiveness(atk, [def]);
                  return (
                    <td key={def} className="text-center align-middle font-black" style={cellStyle(eff)}>
                      {eff === 0 ? '0' : eff === 0.5 ? '½' : eff === 1 ? '·' : `${eff}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TypeChartScreen({ rootURL }: { rootURL?: string }) {
  const [mode, setMode] = useState<ViewMode>('simple');
  const [selected, setSelected] = useState<PokemonType>('Fire');

  return (
    <Panel title="Type matchups" icon={<GameIcon name="diamond" size={14} />}>
      <div className="pkr-typechart-hero">
        <div className="pkr-pixel-title text-[6px] font-black uppercase leading-snug tracking-wide" style={{ color: '#a5b4fc' }}>
          Battle reference
        </div>
        <p className="mt-1 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
          <span className="font-bold text-slate-300">Simple</span> highlights one type.{' '}
          <span className="font-bold text-slate-300">Full chart</span> is the classic attack-vs-defend matrix.
        </p>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setMode('simple')}
          className={`pkr-pill ${mode === 'simple' ? 'pkr-pill-active' : 'pkr-pill-inactive'}`}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => setMode('chart')}
          className={`pkr-pill ${mode === 'chart' ? 'pkr-pill-active' : 'pkr-pill-inactive'}`}
        >
          Full chart
        </button>
      </div>

      {mode === 'simple' ? (
        <>
          <div className="pkr-dex-toolbar mb-2">
            <div className="pkr-dex-toolbar-label">Select type</div>
            <div className="flex flex-wrap gap-1">
              {ALL_TYPES.map((t) => (
                <TypePickerButton
                  key={t}
                  rootURL={rootURL}
                  type={t}
                  selected={selected === t}
                  onClick={() => setSelected(t)}
                />
              ))}
            </div>
          </div>
          <SimpleView selected={selected} />
        </>
      ) : (
        <ChartView />
      )}
    </Panel>
  );
}
