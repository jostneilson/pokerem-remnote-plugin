import { useMemo } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
import {
  ACHIEVEMENT_DEFS,
  ACHIEVEMENT_TIER_LABEL,
  achievementRewardSummary,
  getClosestAchievementGoal,
  type AchievementDef,
} from '../../game/engine/achievements';
import { trainerXpProgress, getNextTrainerRewardGate, MAX_TRAINER_LEVEL } from '../../game/engine/trainerLevel';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { TrainerIdentityCard } from '../components/TrainerIdentityCard';

const CATEGORY_LABELS: Record<string, { label: string; iconName: 'book' | 'swords' | 'pokeball' | 'coin' | 'flame' | 'calendar' }> = {
  review: { label: 'Review milestones', iconName: 'book' },
  collection: { label: 'Collection', iconName: 'pokeball' },
  battle: { label: 'Battle', iconName: 'swords' },
  pokemon: { label: 'Pokemon', iconName: 'pokeball' },
  economy: { label: 'Economy', iconName: 'coin' },
  streak: { label: 'Streaks', iconName: 'flame' },
};

const CATEGORY_ORDER = ['review', 'collection', 'battle', 'pokemon', 'economy', 'streak'];

function AchievementRow({
  def,
  unlocked,
  claimed,
  state,
  onClaim,
}: {
  def: AchievementDef;
  unlocked: boolean;
  claimed: boolean;
  state: PokeRemGameState;
  onClaim?: (id: string) => void;
}) {
  const progress = def.progress ? def.progress(state) : null;
  const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : unlocked ? 100 : 0;
  const showClaim = unlocked && !claimed && onClaim;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg p-2.5 transition-all ${
        unlocked ? 'pkr-achievement-unlocked' : 'pkr-achievement-locked'
      }`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={
          unlocked
            ? {
                background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 100%)',
                color: '#451a03',
                boxShadow: '0 0 12px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              }
            : { background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }
        }
      >
        <GameIcon name={unlocked ? 'starFilled' : 'star'} size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-black" style={{ color: '#e2e8f0' }}>
          {def.name}
        </div>
        <div className="text-[9px] font-semibold leading-snug" style={{ color: '#94a3b8' }}>
          {def.description}
        </div>
        <div className="mt-0.5 text-[8px] font-semibold leading-snug" style={{ color: '#64748b' }}>
          <span className="mr-1 rounded px-1 py-px" style={{ background: 'rgba(251,191,36,0.12)', color: '#fcd34d' }}>
            {ACHIEVEMENT_TIER_LABEL[def.tier]}
          </span>
          {achievementRewardSummary(def)}
        </div>
        {progress && !unlocked ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="pkr-meter-track h-[5px] min-w-0 flex-1 overflow-hidden">
              <div className="pkr-meter-fill h-full transition-[width] duration-300" style={{ width: `${pct}%`, background: '#f59e0b' }} />
            </div>
            <span className="text-[8px] font-bold tabular-nums" style={{ color: '#64748b' }}>
              {progress.current}/{progress.target}
            </span>
          </div>
        ) : null}
        {showClaim ? (
          <button
            type="button"
            onClick={() => onClaim?.(def.id)}
            className="mt-2 w-full rounded-lg border-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-wide"
            style={{
              borderColor: 'rgba(251,191,36,0.55)',
              background: 'linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.2) 100%)',
              color: '#fef3c7',
            }}
          >
            Claim reward
          </button>
        ) : unlocked && claimed ? (
          <div className="mt-1 text-[8px] font-bold uppercase tracking-wide" style={{ color: '#6ee7b7' }}>
            Claimed
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressScreen({
  state,
  reducedMotion,
  onClaimAchievement,
}: {
  state: PokeRemGameState;
  reducedMotion?: boolean;
  onClaimAchievement?: (id: string) => void;
}) {
  const claimedSet = new Set(state.claimedAchievementIds ?? []);
  const unlocked = ACHIEVEMENT_DEFS.filter((d) => state.achievements[d.id]).length;
  const totalPct = ACHIEVEMENT_DEFS.length > 0 ? Math.round((unlocked / ACHIEVEMENT_DEFS.length) * 100) : 0;
  const trainerLevel = state.trainerLevel ?? 1;
  const xpProg = trainerXpProgress(state.trainerXp ?? 0);
  const nextGate = getNextTrainerRewardGate(trainerLevel);
  const closest = getClosestAchievementGoal(state);
  const streak = state.currentStreak ?? 0;

  const subtitle = useMemo(() => {
    if (streak > 0) return `${streak}-day study streak · keep it going`;
    return undefined;
  }, [streak]);

  return (
    <div className="space-y-3">
      <TrainerIdentityCard
        rankTitle={state.trainerRank || 'Novice Trainer'}
        trainerLevel={trainerLevel}
        trainerXp={state.trainerXp ?? 0}
        xpProg={xpProg}
        subtitle={subtitle}
        reducedMotion={reducedMotion}
      />

      <div className="pkr-progress-northstar">
        <div className="pkr-pixel-title mb-2 text-[6px] font-black uppercase tracking-widest" style={{ color: '#a5b4fc' }}>
          What you&apos;re working toward
        </div>
        <div className="space-y-2">
          <div className="pkr-progress-northstar__row">
            <span className="pkr-progress-northstar__label">
              <GameIcon name="trophy" size={12} style={{ color: '#fbbf24' }} /> Trainer path
            </span>
            {trainerLevel >= MAX_TRAINER_LEVEL && xpProg.needed <= 0 ? (
              <p className="pkr-progress-northstar__text">You&apos;ve reached the top trainer level. Finish achievements and rewards for long-term goals.</p>
            ) : (
              <p className="pkr-progress-northstar__text">
                <span className="font-black text-amber-200">{Math.max(0, xpProg.needed - xpProg.current)} XP</span> until Trainer Lv{' '}
                <span className="font-black text-slate-100">{Math.min(trainerLevel + 1, MAX_TRAINER_LEVEL)}</span>
                {nextGate ? (
                  <>
                    {' '}
                    · next reward tier: <span className="font-bold text-slate-200">{nextGate.title}</span> (Lv {nextGate.level})
                  </>
                ) : null}
              </p>
            )}
          </div>
          {closest ? (
            <div className="pkr-progress-northstar__row">
              <span className="pkr-progress-northstar__label">
                <GameIcon name="star" size={12} style={{ color: '#c4b5fd' }} /> Closest achievement
              </span>
              <p className="pkr-progress-northstar__text">
                <span className="font-black text-violet-200">{closest.def.name}</span> — {closest.current}/{closest.target}{' '}
                <span className="opacity-80">({Math.round(closest.ratio * 100)}%)</span>
                <span className="block text-[9px] font-semibold text-slate-500">
                  Reward (claim in list below): {achievementRewardSummary(closest.def)}
                </span>
              </p>
            </div>
          ) : (
            <div className="pkr-progress-northstar__row">
              <span className="pkr-progress-northstar__label">
                <GameIcon name="starFilled" size={12} style={{ color: '#6ee7b7' }} /> Achievements
              </span>
              <p className="pkr-progress-northstar__text">Progress milestones are complete or binary — browse categories below.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pkr-progress-completion flex flex-col items-center gap-2 rounded-lg border border-white/10 py-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="5"
              strokeDasharray={`${(totalPct / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.35))' }}
            />
          </svg>
          <span className="text-lg font-black tabular-nums" style={{ color: '#fbbf24' }}>
            {totalPct}%
          </span>
        </div>
        <div className="text-center text-[10px] font-bold" style={{ color: '#94a3b8' }}>
          <span className="tabular-nums text-slate-200">{unlocked}</span> / {ACHIEVEMENT_DEFS.length} achievements earned
        </div>
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const defs = ACHIEVEMENT_DEFS.filter((d) => d.category === cat);
        if (defs.length === 0) return null;
        const catInfo = CATEGORY_LABELS[cat];
        const catUnlocked = defs.filter((d) => state.achievements[d.id]).length;
        return (
          <Panel key={cat} title={`${catInfo.label} · ${catUnlocked}/${defs.length}`} icon={<GameIcon name={catInfo.iconName} size={13} />}>
            <div className="space-y-1.5">
              {defs.map((def) => (
                <AchievementRow
                  key={def.id}
                  def={def}
                  unlocked={!!state.achievements[def.id]}
                  claimed={claimedSet.has(def.id)}
                  state={state}
                  onClaim={onClaimAchievement}
                />
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
