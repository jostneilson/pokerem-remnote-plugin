import { POKEREM_VERSION } from '../../releaseMeta';

interface Props {
  seenVersion: string | undefined;
  onDismiss: () => void;
}

// Highlights for the next release. Shown once per version (bump POKEREM_VERSION when publishing).
const RELEASE_ENTRIES = [
  { title: 'Wilds that make sense', body: 'Wild Pokémon now appear at believable levels for their evolution stage, near your team’s strength, and each battle scene favours its own types. Legendaries are rare events once your team is strong.' },
  { title: 'Pick your ball', body: 'Catch shows your odds for every ball you carry and suggests the cheapest good one. Sleep and paralysis make catching easier.' },
  { title: 'Shinies and HUNDOs', body: 'A gentle pity means every regular studier meets a shiny. Shiny legendaries are always caught by the first ball, and a quarter of Galarian birds are shiny. Perfect-IV Pokémon earn four stars and a HUNDO badge.' },
  { title: 'Best moves, automatically', body: 'Every Pokémon now keeps its strongest four moves, weighing power, accuracy, same-type bonus, its better attacking stat and type coverage, and re-picks whenever a new move unlocks. Teach a move by hand to take control, or turn Auto best moves back on in Party.' },
  { title: 'Smarter foes', body: 'Wild and trainer Pokémon use their best moves. Fights are shorter, trainer knockouts pay more, and you can heal and rematch after a loss.' },
  { title: 'Quests and badges', body: 'Three daily and two weekly quests, eight gym badges, and new goals for shinies, perfect IVs and type specialists. Your Pokédex now counts your starter and every evolution.' },
  { title: 'One-tap care', body: 'Lead and Heal buttons sit on every party card, Bag items can go to any Pokémon, the shop sells ×5 and ×10, and rewards have Claim all.' },
  { title: 'Battle from the queue', body: 'Catch, Fight, Auto and Run right from the queue strip or popup, no sidebar needed. Wild Pokémon you ignore wander off after a while, except shinies and legendaries.' },
  { title: 'Shinies feel special', body: 'A shiny gets its own gold star wipe, sparkles, gold plates and a SHINY CAUGHT! card. Every shiny you catch goes in the new Shiny Case in the Dex.' },
  { title: 'Battle results and shortcuts', body: 'After each win a result card fills your XP bar and shows new levels and moves. Move tiles show type effectiveness, and C, F, A, R and 1–4 work from the keyboard.' },
  { title: 'New ways to spend', body: 'The Move Tutor teaches moves early, route tickets send your next wilds to a place you pick, and trainer card styles dress up your license.' },
  { title: 'Evolution, in full', body: 'Every evolution now plays in the panel: the glowing silhouette, the flash, and your new Pokémon.' },
  { title: 'Studying never gets stuck', body: 'If your lead faints, a teammate steps in. A team that is fully down rests while you study. Catches with a full party and trainer challenges you skip no longer pause your wild Pokémon.' },
  { title: 'Trainer screen', body: 'Rewards and Progress are now one Trainer screen in the Menu, with your quests, badges and stats together.' },
];

export function WhatsNewCard({ seenVersion, onDismiss }: Props) {
  if (seenVersion === POKEREM_VERSION) return null;
  return (
    <aside className="pkr-whats-new" aria-label="Release highlights">
      <div className="pkr-release-heading">
        <strong>NEW · {POKEREM_VERSION}</strong>
        <button type="button" className="pkr-btn-secondary" onClick={onDismiss} aria-label="Dismiss release highlights">Got it</button>
      </div>
      <details className="pkr-release-details">
        <summary>See what’s new</summary>
        <div className="pkr-release-entries">
          {RELEASE_ENTRIES.map((entry) => (
            <p key={entry.title}><strong>{entry.title}</strong><br />{entry.body}</p>
          ))}
        </div>
      </details>
    </aside>
  );
}
