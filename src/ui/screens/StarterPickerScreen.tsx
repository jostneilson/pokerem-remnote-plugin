import { SPECIES_BY_DEX } from '../../game/data/species';
import { frontSpriteUrl } from '../../game/sprites';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { typePillStyle } from '../battle/battleTheme';
import { BRAND, themeStyles } from '../theme/gameTheme';

const GEN_STARTERS: { gen: number; label: string; starters: number[]; accent: string }[] = [
  { gen: 1, label: 'Gen 1 — Kanto', starters: [1, 4, 7], accent: '#34d399' },
  { gen: 2, label: 'Gen 2 — Johto', starters: [152, 155, 158], accent: '#38bdf8' },
  { gen: 3, label: 'Gen 3 — Hoenn', starters: [252, 255, 258], accent: '#a78bfa' },
  { gen: 4, label: 'Gen 4 — Sinnoh', starters: [387, 390, 393], accent: '#f472b6' },
  { gen: 5, label: 'Gen 5 — Unova', starters: [495, 498, 501], accent: '#fbbf24' },
  { gen: 6, label: 'Gen 6 — Kalos', starters: [650, 653, 656], accent: '#22d3ee' },
  { gen: 7, label: 'Gen 7 — Alola', starters: [722, 725, 728], accent: '#fb923c' },
  { gen: 8, label: 'Gen 8 — Galar', starters: [810, 813, 816], accent: '#94a3b8' },
];

export function StarterPickerScreen({
  rootURL,
  onChoose,
}: {
  rootURL: string | undefined;
  onChoose: (dexNum: number) => void;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <header
        className="relative shrink-0 overflow-hidden rounded-lg border px-3 py-3 text-center"
        style={{
          borderColor: 'var(--pkr-panel-border)',
          background: 'var(--pkr-header-bar-gradient, linear-gradient(90deg, #065f46 0%, #022c22 48%, #0d4d3a 100%))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 14px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-90"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.65), rgba(34,211,238,0.5), transparent)',
          }}
        />
        <div className="relative flex flex-col items-center gap-2">
          <span className="flex items-center gap-2">
            <GameIcon name="pokeball" size={18} />
            <span className="pkr-pixel-title text-[10px] font-black tracking-tight sm:text-[11px]" style={{ color: '#ede9fe' }}>
              {BRAND.wordmark}
            </span>
          </span>
          <p className="max-w-[18rem] text-[10px] font-semibold leading-snug" style={themeStyles.textSecondary}>
            Choose your starter Pokémon. Your party begins with one partner — pick a generation below.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 pb-1">
        {GEN_STARTERS.map(({ gen, label, starters, accent }) => (
          <Panel key={gen} title={label} accent={accent}>
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((dex) => {
                const s = SPECIES_BY_DEX.get(dex);
                if (!s) return null;
                return (
                  <button
                    key={dex}
                    type="button"
                    onClick={() => onChoose(dex)}
                    className="pkr-card flex flex-col items-center rounded-lg p-2 transition-all hover:brightness-110 active:translate-y-px"
                    style={{ width: '90px' }}
                  >
                    <img
                      src={frontSpriteUrl(rootURL, dex)}
                      alt={s.name}
                      width={48}
                      height={48}
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <div className="mt-1 text-[10px] font-black" style={{ color: '#e2e8f0' }}>
                      {s.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                      {s.types.map((t) => (
                        <span
                          key={t}
                          className="rounded border px-1 py-px text-[7px] font-bold uppercase"
                          style={typePillStyle(t)}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
