import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { frontSpriteUrl, backSpriteUrl } from '../game/sprites';
import { PokemonSprite } from './components/PokemonSprite';
describe('true shiny sprites',()=>{
  it('uses the species-specific front and back shiny files while leaving normal sprites unchanged',()=>{
    expect(frontSpriteUrl('/',6,true)).toContain('/pokemon/shiny/6.png');
    expect(backSpriteUrl('/',6,true)).toContain('/pokemon/back/shiny/6.png');
    expect(frontSpriteUrl('/',6)).toContain('/pokemon/6.png');
  });
  it('keeps the actual shiny colors in both motion modes',()=>{
    for(const reducedMotion of [true,false]) {
      const html=renderToStaticMarkup(<PokemonSprite src={frontSpriteUrl('/',6,true)} alt="Charizard" size={96} shiny reducedMotion={reducedMotion}/>);
      expect(html).toContain('/shiny/6.png'); expect(html).toContain('Shiny Pokémon');
      expect(html).not.toContain('hue-rotate'); expect(html).not.toContain('animate-pkr-shiny-hue');
    }
  });
});
