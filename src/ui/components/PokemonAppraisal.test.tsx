import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseStarter, createInitialStateV4 } from '../../game/state/store';
import { appraisalFillPercent, PokemonAppraisal } from './PokemonAppraisal';

describe('Pokemon appraisal', () => {
  it('clips stars to the exact fractional IV average', () => {
    expect(appraisalFillPercent(7 / 3)).toBeCloseTo(77.777777, 5);
  });

  it('renders precise accessible IVs and battle power for a real owned Pokemon', () => {
    const pokemon = chooseStarter(createInitialStateV4(), 656).party[0]!;
    pokemon.ivs = { hp: 2, attack: 3, defense: 2 };
    const html = renderToStaticMarkup(<PokemonAppraisal pokemon={pokemon} />);
    expect(html).toContain('2.33 of 3 stars');
    expect(html).toContain('HP 2 of 3, Attack 3 of 3, Defense 2 of 3');
    expect(html).toContain('width:77.777');
    expect(html).toContain('Power ');
  });
});
