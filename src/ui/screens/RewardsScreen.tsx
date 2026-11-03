import { useState } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
import { ACHIEVEMENT_TIER_TRAINER_XP } from '../../game/engine/achievements';
import { TRAINER_REWARDS, TRAINER_XP_SOURCES, trainerXpProgress, type TrainerReward } from '../../game/engine/trainerLevel';
import { Panel } from '../components/Panel';
import { GameIcon } from '../components/GameIcon';
import { TrainerIdentityCard } from '../components/TrainerIdentityCard';

function RewardNode({
  reward,
  trainerLevel,
  claimed,
  claimFlash,
  onClaim,
  reducedMotion,
}: {
  reward: TrainerReward;
  trainerLevel: number;
  claimed: boolean;
  claimFlash: boolean;
  onClaim: (level: number) => void;
  reducedMotion?: boolean;
}) {
  const unlocked = trainerLevel >= reward.level;
  const canClaim = unlocked && !claimed;

  return (
    <div
      className={`pkr-reward-node relative flex gap-2.5 rounded-lg p-2.5 transition-all ${
        claimFlash && !reducedMotion ? 'pkr-reward-node--claim-flash' : ''
      }`}
      style={
        claimed
          ? {
              border: '2px solid rgba(16,185,129,0.45)',
              background: 'linear-gradient(180deg, rgba(16,185,129,0.14) 0%, rgba(6,78,59,0.2) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }
          : canClaim
            ? {
                border: '2px solid rgba(251,191,36,0.55)',
                background: 'linear-gradient(180deg, rgba(251,191,36,0.18) 0%, rgba(120,53,15,0.15) 100%)',
                boxShadow: '0 0 16px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }
            : {
                border: '2px dashed rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                opacity: unlocked ? 1 : 0.55,
              }
      }
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full pkr-lead font-black"
        style={
          claimed
            ? { background: 'linear-gradient(145deg, #10b981 0%, #047857 100%)', color: 'white', boxShadow: '0 2px 0 rgba(0,0,0,0.25)' }
            : canClaim
              ? {
                  background: 'linear-gradient(145deg, #fcd34d 0%, #f59e0b 100%)',
                  color: '#451a03',
                  boxShadow: '0 0 12px rgba(251,191,36,0.45)',
                }
              : { background: 'rgba(255,255,255,0.06)', color: 'var(--pkr-ink-faint)', border: '1px solid rgba(255,255,255,0.06)' }
        }
      >
        {claimed ? <GameIcon name="starFilled" size={20} /> : <span className="tabular-nums">{reward.level}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span
            className="pkr-fine font-black leading-tight"
            style={{ color: claimed ? '#6ee7b7' : canClaim ? '#fde68a' : '#e2e8f0' }}
          >
            Lv {reward.level} — {reward.title}
          </span>
        </div>
        <div className="mt-0.5 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
          {reward.description}
        </div>
        {canClaim ? (
          <button
            type="button"
            onClick={() => onClaim(reward.level)}
            className="pkr-game-btn mt-2 rounded-lg border-2 px-3 py-1.5 pkr-fine font-black uppercase active:translate-y-px"
            style={{
              borderColor: '#b45309',
              background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
              color: '#451a03',
            }}
          >
            Claim reward
          </button>
        ) : null}
        {claimed ? (
          <span className="mt-1 inline-flex items-center gap-0.5 pkr-fine font-black uppercase tracking-wide" style={{ color: 'var(--pkr-ink-success)' }}>
            <GameIcon name="starFilled" size={10} /> Claimed
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function RewardsScreen({
  state,
  onClaimReward,
  reducedMotion,
  embedded = false,
  onClaimAll,
}: {
  state: PokeRemGameState;
  onClaimReward: (level: number) => void;
  onClaimAll?: () => void;
  reducedMotion?: boolean;
  /** Shown inside the Trainer screen, which already has the identity card. */
  embedded?: boolean;
}) {
  const trainerLevel = state.trainerLevel ?? 1;
  const trainerXp = state.trainerXp ?? 0;
  const prog = trainerXpProgress(trainerXp);
  const claimed = state.claimedRewardLevels ?? [];
  const unclaimedCount = TRAINER_REWARDS.filter((r) => r.level <= trainerLevel && !claimed.includes(r.level)).length;
  const [claimFlashLevel, setClaimFlashLevel] = useState<number | null>(null);
  const [rewardSparkleKey, setRewardSparkleKey] = useState(0);

  const streak = state.currentStreak ?? 0;
  const subtitle = streak > 0 ? `${streak}-day study streak` : undefined;

  const handleClaim = (level: number) => {
    onClaimReward(level);
    setRewardSparkleKey((k) => k + 1);
    if (!reducedMotion) {
      setClaimFlashLevel(level);
      window.setTimeout(() => setClaimFlashLevel(null), 900);
    }
  };

  return (
    <div className="space-y-3">
      {embedded ? null : (
        <TrainerIdentityCard
          rankTitle={state.trainerRank || 'Novice Trainer'}
          trainerLevel={trainerLevel}
          trainerXp={trainerXp}
          xpProg={prog}
          subtitle={subtitle}
          reducedMotion={reducedMotion}
          cardStyle={state.trainerCardStyle}
          rewardSparkleKey={rewardSparkleKey}
        />
      )}

      {unclaimedCount > 0 ? (
        <div
          className="flex items-center gap-2 rounded-lg border-2 px-3 py-2"
          style={{
            borderColor: 'rgba(251,191,36,0.45)',
            background: 'linear-gradient(90deg, rgba(251,191,36,0.12) 0%, rgba(120,53,15,0.12) 100%)',
            boxShadow: '0 0 14px rgba(251,191,36,0.12)',
          }}
          role="status"
        >
          <GameIcon name="starFilled" size={18} style={{ color: 'var(--pkr-ink-gold)' }} />
          <div className="min-w-0 flex-1">
            <div className="pkr-pixel-title pkr-fine font-black uppercase tracking-widest" style={{ color: 'var(--pkr-ink-gold)' }}>
              Rewards waiting
            </div>
            <div className="pkr-fine font-bold" style={{ color: '#fffbeb' }}>
              {unclaimedCount} unclaimed level reward{unclaimedCount > 1 ? 's' : ''}
              {onClaimAll ? '' : ' — tap Claim in Trainer milestones.'}
            </div>
          </div>
          {onClaimAll ? (
            <button
              type="button"
              className="pkr-btn-primary shrink-0"
              onClick={() => {
                onClaimAll();
                setRewardSparkleKey((k) => k + 1);
              }}
            >
              {unclaimedCount > 1 ? 'Claim all' : 'Claim'}
            </button>
          ) : null}
        </div>
      ) : embedded ? null : (
        <div className="rounded-lg border border-white/10 px-3 py-2 text-center pkr-fine font-semibold" style={{ color: 'var(--pkr-ink-muted)', background: 'rgba(0,0,0,0.15)' }}>
          No unclaimed rewards right now. Earn trainer XP to level up and unlock the next tier.
        </div>
      )}

      <Panel collapsible title="How you earn trainer XP" icon={<GameIcon name="chart" size={14} />}>
        <p className="mb-2 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
          Milestone achievements grant a one-time trainer XP burst by difficulty (common → epic). The rarest goals also add bonus items to your bag.
        </p>
        <div className="pkr-rewards-xp-grid space-y-0">
          {[
            { label: 'Card review', xp: `+${TRAINER_XP_SOURCES.cardReview}`, color: '#60a5fa' },
            { label: 'Catch Pokémon', xp: `+${TRAINER_XP_SOURCES.catch}`, color: '#4ade80' },
            { label: 'Defeat wild', xp: `+${TRAINER_XP_SOURCES.defeat}`, color: '#f87171' },
            { label: 'Evolution', xp: `+${TRAINER_XP_SOURCES.evolution}`, color: '#c084fc' },
            { label: 'Pokémon level up', xp: `+${TRAINER_XP_SOURCES.levelUp}`, color: '#22d3ee' },
            { label: 'Daily streak', xp: `+${TRAINER_XP_SOURCES.streakDay}`, color: '#fb923c' },
            {
              label: 'Achievement unlocked',
              xp: `+${Math.min(...Object.values(ACHIEVEMENT_TIER_TRAINER_XP))}–${Math.max(...Object.values(ACHIEVEMENT_TIER_TRAINER_XP))}`,
              color: 'var(--pkr-ink-gold-strong)',
            },
          ].map((row, i) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-2 py-1.5 pkr-fine font-semibold"
              style={{
                ...(i % 2 === 0 ? { background: 'rgba(255,255,255,0.04)' } : {}),
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span style={{ color: 'var(--pkr-ink-muted)' }}>{row.label}</span>
              <span className="shrink-0 font-black tabular-nums" style={{ color: row.color }}>
                {row.xp} XP
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        collapsible={embedded}
        defaultOpen={!embedded}
        title="Trainer milestones"
        icon={<GameIcon name="starFilled" size={14} />}
      >
        <p className="mb-2 pkr-fine font-semibold leading-snug" style={{ color: 'var(--pkr-ink-muted)' }}>
          Level rewards grant items, shop unlocks, and new rank titles. Claim each tier once you reach that trainer level.
        </p>
        <div className="space-y-2">
          {TRAINER_REWARDS.map((reward) => (
            <RewardNode
              key={reward.level}
              reward={reward}
              trainerLevel={trainerLevel}
              claimed={claimed.includes(reward.level)}
              claimFlash={claimFlashLevel === reward.level}
              onClaim={handleClaim}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
