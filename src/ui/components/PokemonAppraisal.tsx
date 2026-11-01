import type { OwnedPokemon } from '../../game/state/model';
import { battleStats, ivAverage, ivsFor } from '../../game/engine/pokemonStats';

export function appraisalFillPercent(average: number): number {
  return (Math.max(0, Math.min(3, average)) / 3) * 100;
}

export function PokemonAppraisal({ pokemon, compact = false }: { pokemon: OwnedPokemon; compact?: boolean }) {
  const ivs = ivsFor(pokemon);
  const average = ivAverage(pokemon);
  const stats = battleStats(pokemon);
  const label = `${average.toFixed(2)} of 3 stars. HP ${ivs.hp} of 3, Attack ${ivs.attack} of 3, Defense ${ivs.defense} of 3.`;

  return (
    <section className={`pkr-appraisal ${compact ? 'pkr-appraisal--compact' : ''}`} aria-label="Pokemon appraisal">
      <div className="pkr-appraisal__summary">
        <div className="pkr-appraisal-stars" role="img" aria-label={label}>
          <span aria-hidden="true" className="pkr-appraisal-stars__empty">★★★</span>
          <span aria-hidden="true" className="pkr-appraisal-stars__clip" style={{ width: `${appraisalFillPercent(average)}%` }}>
            <span className="pkr-appraisal-stars__fill">★★★</span>
          </span>
        </div>
        <span className="pkr-appraisal__number">{average.toFixed(2)}/3 IV</span>
        <span className="pkr-appraisal__power">Power {stats.power}</span>
      </div>
      {!compact ? (
        <p className="pkr-appraisal__stats">HP {stats.hp} · ATK {stats.attack} · DEF {stats.defense} · SPA {stats.specialAttack} · SPD {stats.specialDefense} · SPE {stats.speed}</p>
      ) : null}
      {!compact ? (
        <div className="pkr-appraisal__bars">
          {([['HP', ivs.hp], ['ATK', ivs.attack], ['DEF', ivs.defense]] as const).map(([name, value]) => (
            <div className="pkr-iv-row" key={name}>
              <span>{name}</span>
              <div className="pkr-iv-track" aria-hidden="true"><i style={{ width: `${(value / 3) * 100}%` }} /></div>
              <strong>{value}/3</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
