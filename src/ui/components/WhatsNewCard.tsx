import { POKEREM_VERSION } from '../../releaseMeta';

interface Props {
  seenVersion: string | undefined;
  onDismiss: () => void;
}

const RELEASE_ENTRIES = [
  { title: 'Stone evolution', body: 'Select a Pokémon in Party, choose a compatible stone, and confirm. Nine stone types are available.' },
  { title: 'Keep your team going', body: 'Revives stay stocked at 200 coins and appear more often in route finds.' },
  { title: 'True shinies', body: 'Rare wild Pokémon now use their actual shiny sprites, with a gold star celebration. Slower encounters get higher shiny odds.' },
  { title: 'Arcade revival', body: 'Crisp pixel lettering, framed menus, and responsive game controls.' },
  { title: 'More room to play', body: 'Play keeps the arena. Bag now brings your items and Shop together. Party and Dex get the full panel.' },
  { title: 'Auto attack', body: 'Weaken wild Pokémon automatically, then stop before knockout range and choose Catch. Compact view now lives in Settings.' },
  { title: 'Find what matters', body: 'Fold away extra stats and browse your collection with simpler filters.' },
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
        <summary>Arcade revival · see what’s new</summary>
        <div className="pkr-release-entries">
          {RELEASE_ENTRIES.map((entry) => (
            <p key={entry.title}><strong>{entry.title}</strong><br />{entry.body}</p>
          ))}
        </div>
      </details>
    </aside>
  );
}
