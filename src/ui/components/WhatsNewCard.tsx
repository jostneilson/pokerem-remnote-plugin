import { POKEREM_VERSION } from '../../releaseMeta';
import { GameIcon } from './GameIcon';

interface Props {
  seenVersion: string | undefined;
  onDismiss: () => void;
}

interface ReleaseEntry {
  icon: 'swords' | 'star' | 'trophy' | 'coin' | 'pokeball';
  title: string;
  body: string;
}

const RELEASE_ENTRIES: ReleaseEntry[] = [
  {
    icon: 'swords',
    title: 'Trainer battles',
    body: 'Rare 3-on-3 mini-boss encounters replace some wild spawns. Pick a team, lock in, no heals mid-fight. Win to catch one of theirs.',
  },
  {
    icon: 'coin',
    title: 'XP Doublers',
    body: 'Stackable x2 XP boosters for 25 / 50 / 100 reviewed cards. Queue them up; they apply to every Pokémon.',
  },
  {
    icon: 'trophy',
    title: 'Long-term progression',
    body: 'Trainer-battle achievements, generation-completion prestige, and a claim-all button on Progress.',
  },
  {
    icon: 'star',
    title: 'A smoother study companion',
    body: 'Readable menus, labeled navigation, a compact study view, smoother trainer turns, and clearer feedback. Your existing progress stays with you.',
  },
];

export function WhatsNewCard({ seenVersion, onDismiss }: Props) {
  if (seenVersion === POKEREM_VERSION) return null;

  return (
    <div
      className="pkr-whats-new relative overflow-hidden rounded-lg p-3"
      style={{
        background:
          'linear-gradient(180deg, rgba(30,58,138,0.55) 0%, rgba(15,23,42,0.8) 100%)',
        border: '1px solid rgba(253,224,71,0.35)',
        boxShadow: '0 0 14px rgba(59,130,246,0.25)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="pkr-pixel-title rounded-full px-2 py-0.5 text-[6px] font-black uppercase tracking-widest"
          style={{
            background: 'rgba(253,224,71,0.25)',
            color: '#fde68a',
            border: '1px solid rgba(253,224,71,0.5)',
          }}
        >
          New in v{POKEREM_VERSION}
        </span>
        <span className="text-[11px] font-black" style={{ color: '#f8fafc' }}>
          What's new in PokéRem
        </span>
      </div>

      <div className="mt-2 grid gap-1.5">
        {RELEASE_ENTRIES.map((e) => (
          <div
            key={e.title}
            className="flex items-start gap-2 rounded-md p-1.5"
            style={{ background: 'rgba(15,23,42,0.35)' }}
          >
            <span
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
              style={{
                background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 100%)',
                color: '#451a03',
              }}
            >
              <GameIcon name={e.icon} size={12} />
            </span>
            <div className="flex-1">
              <div className="text-[10px] font-black" style={{ color: '#f8fafc' }}>
                {e.title}
              </div>
              <div className="text-[9px] font-semibold leading-snug" style={{ color: '#cbd5e1' }}>
                {e.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 w-full rounded-md py-1.5 text-[10px] font-black uppercase tracking-widest"
        style={{
          background: 'linear-gradient(180deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)',
          border: '2px solid #854d0e',
          color: '#1c1917',
        }}
      >
        Got it
      </button>
    </div>
  );
}
