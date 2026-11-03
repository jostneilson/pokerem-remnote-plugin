import { useEffect, useRef, useState } from 'react';
import type { OwnedPokemon } from '../../game/state/model';
import { frontSpriteUrl } from '../../game/sprites';

export interface EvolutionEvent {
  key: string;
  fromDex: number;
  toDex: number;
  fromName: string;
  toName: string;
  shiny: boolean;
}

type Snapshot = Map<string, { dexNum: number; name: string }>;

/** Pokémon that kept their id but changed species since the last snapshot. */
export function detectEvolutions(prev: Snapshot, mons: OwnedPokemon[]): EvolutionEvent[] {
  const events: EvolutionEvent[] = [];
  for (const m of mons) {
    const before = prev.get(m.id);
    if (before && before.dexNum !== m.dexNum) {
      events.push({ key: `${m.id}:${m.dexNum}`, fromDex: before.dexNum, toDex: m.dexNum, fromName: m.nickname || before.name, toName: m.name, shiny: m.shiny === true });
    }
  }
  return events;
}

/**
 * Watches the player's Pokémon and reports any that changed species under the same id — that is an
 * evolution, whichever path caused it (battle XP, Rare Candy, Power Up, a stone, a trainer battle).
 * The first snapshot only records; nothing plays for Pokémon that were already evolved on load.
 */
export function useEvolutionWatcher(mons: OwnedPokemon[], ready: boolean): [EvolutionEvent[], () => void] {
  const seen = useRef<Snapshot | null>(null);
  const [queue, setQueue] = useState<EvolutionEvent[]>([]);
  useEffect(() => {
    if (!ready) return;
    const prev = seen.current;
    const next = new Map(mons.map((m) => [m.id, { dexNum: m.dexNum, name: m.name }]));
    seen.current = next;
    if (!prev) return;
    const events = detectEvolutions(prev, mons);
    if (events.length) setQueue((q) => [...q, ...events]);
  }, [mons, ready]);
  return [queue, () => setQueue((q) => q.slice(1))];
}

const PULSE_MS = 3200;
const FLASH_MS = 450;

/**
 * Main-series style evolution: "What? X is evolving!", the white silhouette pulses between the old
 * and new forms faster and faster, a flash, then the new Pokémon with a sparkle. Reduced motion
 * shows the result straight away.
 */
export function EvolutionScene({ event, rootURL, reducedMotion, onDone }: { event: EvolutionEvent; rootURL: string | undefined; reducedMotion: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<'evolving' | 'flash' | 'done'>(reducedMotion ? 'done' : 'evolving');
  const okRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (reducedMotion) return;
    const t1 = window.setTimeout(() => setPhase('flash'), PULSE_MS);
    const t2 = window.setTimeout(() => setPhase('done'), PULSE_MS + FLASH_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [event.key, reducedMotion]);
  useEffect(() => {
    if (phase === 'done') okRef.current?.focus();
  }, [phase]);

  const fromSrc = frontSpriteUrl(rootURL, event.fromDex, event.shiny);
  const toSrc = frontSpriteUrl(rootURL, event.toDex, event.shiny);
  const done = phase === 'done';
  return (
    <div className={`pkr-evo-scene pkr-evo-scene--${phase}`} role="dialog" aria-modal="true" aria-label={`${event.fromName} evolved into ${event.toName}`}>
      <div className="pkr-evo-card">
        <div className="pkr-evo-stage" aria-hidden="true">
          <span className="pkr-evo-rays" />
          {done ? (
            <>
              <img className="pkr-evo-sprite pkr-evo-sprite--reveal" src={toSrc} alt="" width={112} height={112} />
              <span className="pkr-evo-sparkles">
                {Array.from({ length: 8 }, (_, i) => (
                  <i key={i} style={{ ['--i' as string]: i }} />
                ))}
              </span>
            </>
          ) : (
            <>
              <img className="pkr-evo-sprite pkr-evo-sprite--from" src={fromSrc} alt="" width={112} height={112} />
              <img className="pkr-evo-sprite pkr-evo-sprite--to" src={toSrc} alt="" width={112} height={112} />
            </>
          )}
          {phase === 'flash' ? <span className="pkr-evo-flash" /> : null}
        </div>
        <p className="pkr-evo-text" role="status" aria-live="polite">
          {done ? (
            <>
              Congratulations! Your {event.fromName} evolved into <strong>{event.toName}</strong>!
            </>
          ) : (
            <>What? {event.fromName} is evolving!</>
          )}
        </p>
        {done ? (
          <button ref={okRef} type="button" className="pkr-game-btn pkr-evo-ok" onClick={onDone}>
            OK
          </button>
        ) : (
          <button type="button" className="pkr-evo-skip" onClick={() => setPhase('done')}>
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
