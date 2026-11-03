import type { OwnedPokemon, ShinyLogEntry } from '../../game/state/model';
import { frontSpriteUrl } from '../../game/sprites';
import { displayDexNumber } from '../../game/data/species';
import { PokemonSprite } from './PokemonSprite';
import { SpeciesBadge } from './SpeciesBadge';

/**
 * Every shiny you've caught, newest first, with the date and card it arrived on. Shinies owned
 * from before the catch log existed are listed from your party and storage without a date.
 */
export function ShinyCase({
  rootURL,
  log,
  owned,
}: {
  rootURL: string | undefined;
  log: ShinyLogEntry[];
  owned: OwnedPokemon[];
}) {
  const logged = new Map<number, number>();
  for (const e of log) logged.set(e.dexNum, (logged.get(e.dexNum) ?? 0) + 1);
  // Owned shinies not covered by a log entry (caught before the log, or evolved since).
  const unlogged = owned.filter((p) => {
    if (!p.shiny) return false;
    const n = logged.get(p.dexNum) ?? 0;
    if (n > 0) {
      logged.set(p.dexNum, n - 1);
      return false;
    }
    return true;
  });
  const rows = [
    ...[...log].reverse().map((e, i) => ({ key: `log-${i}`, dexNum: e.dexNum, name: e.name, ...shinyNote(e), hundo: e.perfectIvs })),
    ...unlogged.map((p) => ({ key: p.id, dexNum: p.dexNum, name: p.nickname || p.name, date: 'On your team', card: '', hundo: false })),
  ];
  return (
    <details className="pkr-shiny-case" open={rows.length > 0 || undefined}>
      <summary>
        <span className="pkr-shiny-case-title">
          <span className="pkr-shiny-case-star" aria-hidden="true">✦</span> Shiny Case
        </span>
        <span className="pkr-shiny-case-count">{rows.length}</span>
      </summary>
      {rows.length === 0 ? (
        <p className="pkr-shiny-case-empty">No shinies yet. About 1 in 250 wild Pokémon sparkles, and a safety net makes sure you meet one.</p>
      ) : (
        <ul className="pkr-shiny-case-grid">
          {rows.map((r) => (
            <li key={r.key} className={`pkr-shiny-case-item${r.hundo ? ' pkr-shiny-case-item--hundo' : ''}`}>
              <div className="pkr-shiny-case-stage">
                <span className="pkr-shiny-case-dex">#{String(displayDexNumber(r.dexNum)).padStart(3, '0')}</span>
                <span className="pkr-shiny-case-twinkle" aria-hidden="true">✦</span>
                <PokemonSprite src={frontSpriteUrl(rootURL, r.dexNum, true)} alt={`Shiny ${r.name}`} size={56} className="pkr-shiny-case-sprite" />
              </div>
              <div className="pkr-shiny-case-info">
                <strong>{r.name}</strong>
                <SpeciesBadge dexNum={r.dexNum} />
                <span>{r.date}</span>
                {r.card ? <span>{r.card}</span> : null}
              </div>
              {r.hundo ? (
                <span className="pkr-shiny-case-hundo">
                  <span aria-hidden="true">★★★★</span> HUNDO
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function shinyNote(e: ShinyLogEntry): { date: string; card: string } {
  const d = e.caughtAt ? new Date(e.caughtAt) : null;
  const date = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unknown';
  return { date, card: e.card ? `Card ${e.card.toLocaleString()}` : '' };
}
