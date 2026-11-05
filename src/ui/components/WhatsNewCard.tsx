import { POKEREM_VERSION } from '../../releaseMeta';

interface Props {
  seenVersion: string | undefined;
  onDismiss: () => void;
}

// Highlights for the next release. Shown once per version (bump POKEREM_VERSION when publishing).
const RELEASE_ENTRIES = [
  { title: 'Team Rocket returns', body: 'About a third of trainer battles are Rocket grunts, one type each, with a rare ace you can catch after winning. Beat five (watch the Rocket Radar) and the Rocket Leader appears. Beat him for a legendary that never runs away.' },
  { title: 'Your team grows together', body: 'XP Share gives every party Pokémon study XP, knockouts are shared, and anyone behind gets a catch-up boost. Levelling is steadier, so the team you raise keeps up with new catches.' },
  { title: 'Your starter is your Buddy', body: 'It misses half as often and earns 15% more XP, with a ♥ badge.' },
  { title: 'Transfer and View all', body: 'Every card has Lead, Upgrade and Transfer. Transfer pays coins and XP for matching types. View all shows every Pokémon you own, with sort, filters and multi-select. Select duplicates (keep best) clears spares in one tap.' },
  { title: 'Storage and bag space', body: 'Storage and the bag have room that grows with your trainer level, plus upgrades in the Shop. Shinies and legendaries always fit.' },
  { title: 'Rarities that mean something', body: 'Shinies are 1 in 250 encounters, Galarian birds about 1 in 250 cards, and other wild legendaries much rarer. Legendaries are hard to catch: lower their HP, use better balls and status.' },
  { title: 'Money that matters', body: 'Rewards were rebalanced around a day of study. Look for bounties, lucky cards, daily firsts, streaks, Special Research and achievement coins. Power Up is the main way to spend.' },
  { title: 'Pick a team', body: 'Join Team Valor, Team Mystic or Team Instinct. Your crest shows in the header and on your trainer card.' },
  { title: 'Type themes', body: 'Eighteen themes in the Shop restyle the whole game in a type’s colours. Try one for 15 seconds first. With a theme on, Pokémon of that type pay ×1.25 coins and XP.' },
  { title: 'Clearer battles', body: 'Each info box now sits with its own Pokémon, so you never read the wrong HP bar.' },
  { title: 'Fixes', body: 'The arena no longer changes on every card (you stay in an area for a few encounters). XP Doublers can’t be lost. 27 legendaries are tagged correctly. A shiny waits if your lead faints.' },
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
