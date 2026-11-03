import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvolutionScene, detectEvolutions } from './EvolutionScene';
import type { OwnedPokemon } from '../../game/state/model';

const mon = (patch: Partial<OwnedPokemon>): OwnedPokemon => ({ id: 'a', dexNum: 657, name: 'Frogadier', level: 36, totalXp: 0, currentHp: 10, maxHp: 10, types: ['Water'], ...patch }) as OwnedPokemon;

describe('evolution sequence', () => {
  it('detects a species change under the same id, and nothing else', () => {
    const prev = new Map([['a', { dexNum: 657, name: 'Frogadier' }], ['b', { dexNum: 4, name: 'Charmander' }]]);
    const events = detectEvolutions(prev, [mon({ dexNum: 658, name: 'Greninja', nickname: 'Ribbit', shiny: true }), mon({ id: 'b', dexNum: 4, name: 'Charmander' }), mon({ id: 'new', dexNum: 1 })]);
    expect(events).toEqual([{ key: 'a:658', fromDex: 657, toDex: 658, fromName: 'Ribbit', toName: 'Greninja', shiny: true }]);
  });

  it('shows the finished evolution at once under reduced motion', () => {
    const html = renderToStaticMarkup(<EvolutionScene event={{ key: 'k', fromDex: 657, toDex: 658, fromName: 'Frogadier', toName: 'Greninja', shiny: false }} rootURL="/" reducedMotion onDone={() => {}} />);
    expect(html).toContain('evolved into <strong>Greninja</strong>');
    expect(html).toContain('/658.png');
  });
});
