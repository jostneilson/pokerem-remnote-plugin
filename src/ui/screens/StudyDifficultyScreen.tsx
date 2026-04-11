import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { themeStyles } from '../theme/gameTheme';
import {
  STUDY_PRESET_DEFAULTS,
  STUDY_PRESET_LABEL,
  type StudyDifficultyPreset,
} from '../../game/engine/studyDifficulty';

const PRESETS: Exclude<StudyDifficultyPreset, 'custom'>[] = ['easy', 'medium', 'hard'];

export function StudyDifficultyScreen({
  onChoose,
}: {
  onChoose: (preset: StudyDifficultyPreset, custom?: { reviews: number; weight: number }) => void;
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
            <GameIcon name="book" size={18} style={{ color: '#fde68a' }} />
            <span className="pkr-pixel-title text-[10px] font-black tracking-tight sm:text-[11px]" style={{ color: '#ede9fe' }}>
              Study difficulty
            </span>
          </span>
          <p className="max-w-[20rem] text-[10px] font-semibold leading-snug" style={themeStyles.textSecondary}>
            This sets how often wild Pokémon appear per review, and how much trainer XP each flashcard grants.{' '}
            <span className="font-bold text-slate-300">Hard</span> means more reviews before each battle — for when you want a serious
            study grind. You can change this anytime in Settings.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 pb-1">
        {PRESETS.map((preset) => {
          const d = STUDY_PRESET_DEFAULTS[preset];
          const label = STUDY_PRESET_LABEL[preset];
          const blurb =
            preset === 'easy'
              ? 'Wilds appear often; each review counts a bit more toward trainer XP — lighter pacing.'
              : preset === 'medium'
                ? 'Balanced — the default PokéRem loop.'
                : 'Wilds are rarer; each review grants less trainer XP — you need more flashcards to progress.';

          return (
            <Panel key={preset} title={label} accent={preset === 'hard' ? '#f87171' : preset === 'easy' ? '#4ade80' : '#fbbf24'}>
              <p className="mb-2 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
                {blurb}
              </p>
              <div className="mb-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[8px] font-bold" style={{ color: '#cbd5e1' }}>
                <span className="text-amber-200/90">~{d.reviews}</span> reviews per wild ·{' '}
                <span className="text-cyan-200/90">{Math.round(d.weight * 100)}%</span> card XP &amp; coin scaling
              </div>
              <button
                type="button"
                onClick={() => onChoose(preset)}
                className="pkr-game-btn w-full rounded-lg border-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide"
                style={{
                  borderColor: '#166534',
                  background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 45%, #15803d 100%)',
                  color: '#052e16',
                }}
              >
                Choose {label}
              </button>
            </Panel>
          );
        })}

        <Panel title="Custom" accent="#a78bfa">
          <p className="mb-2 text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
            Tune reviews per wild (2–15) and study intensity (50–150%). Same knobs as in Settings.
          </p>
          <CustomDifficultyForm
            onApply={(reviews, weight) => onChoose('custom', { reviews, weight })}
          />
        </Panel>
      </div>
    </div>
  );
}

function CustomDifficultyForm({ onApply }: { onApply: (reviews: number, weight: number) => void }) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const r = parseInt(String(fd.get('reviews') ?? '3'), 10);
        const w = parseFloat(String(fd.get('weight') ?? '1'));
        const reviews = Number.isFinite(r) ? Math.max(2, Math.min(15, r)) : 3;
        const weight = Number.isFinite(w) ? Math.max(0.5, Math.min(1.5, w)) : 1;
        onApply(reviews, weight);
      }}
    >
      <label className="flex flex-col gap-0.5 text-[9px] font-bold" style={{ color: '#94a3b8' }}>
        Reviews per wild
        <input
          name="reviews"
          type="number"
          min={2}
          max={15}
          defaultValue={3}
          className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] font-bold text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[9px] font-bold" style={{ color: '#94a3b8' }}>
        Card XP intensity (0.5–1.5)
        <input
          name="weight"
          type="number"
          min={0.5}
          max={1.5}
          step={0.05}
          defaultValue={1}
          className="rounded border border-white/15 bg-black/30 px-2 py-1 text-[11px] font-bold text-slate-100"
        />
      </label>
      <button
        type="submit"
        className="pkr-game-btn mt-1 rounded-lg border-2 px-3 py-2 text-[10px] font-black uppercase"
        style={{
          borderColor: '#6d28d9',
          background: 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)',
          color: '#f5f3ff',
        }}
      >
        Use custom
      </button>
    </form>
  );
}
