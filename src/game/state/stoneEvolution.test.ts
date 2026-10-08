import { describe, expect, it } from 'vitest';
import { STONE_REFERENCE as reference } from '../data/stoneEvolutionReference';
import { EVOLUTION_TABLE } from '../data/evolutions';
import { ITEM_BY_ID } from '../data/items';
import { chooseStarter, createInitialStateV4, useEvolutionStone, parseGameState } from './store';
function eevee() {
  const s = chooseStarter(createInitialStateV4(), 4);
  s.party[0] = {...s.party[0],dexNum:133,name:'Eevee',types:['Normal']};
  s.bag['water-stone'] = 2; s.party[0].nickname = 'Buddy'; s.party[0].shiny = true;
  return s;
}
describe('stone evolution', () => {
  it('matches supported stones to independently sourced canonical evolution targets', () => {
    for(const evo of EVOLUTION_TABLE.filter(e => e.trigger==='item' && ITEM_BY_ID.has(e.itemId as any))) {
      expect(evo.itemId, `evolution into ${evo.toDex}`).toBe((reference.targets as Record<string,string>)[evo.toDex]);
    }
  });
  it('evolves the selected Pokémon, spends one stone, and retains its identity and shiny status through save reload', () => {
    const s = eevee(), id = s.party[0].id;
    const n = useEvolutionStone(s, id, 'water-stone');
    expect(s.party[0].dexNum).toBe(133); expect(s.bag['water-stone']).toBe(2);
    expect(n.party[0]).toMatchObject({ id, dexNum: 134, nickname: 'Buddy', shiny: true });
    expect(n.bag['water-stone']).toBe(1); expect(n.totalEvolutions).toBe(1);
    expect(n.collectionDex[134]).toBeGreaterThan(0);
    expect(parseGameState(n).party[0]).toMatchObject({ dexNum:134, shiny:true, nickname:'Buddy' });
    expect(useEvolutionStone(n, id, 'water-stone')).toBe(n);
  });
  it('never consumes an incompatible, missing, or invalid stone', () => {
    const s = eevee(), id = s.party[0].id;
    s.bag['moon-stone']=1;
    expect(useEvolutionStone(s,id,'moon-stone')).toBe(s);
    expect(useEvolutionStone(s,id,'fire-stone')).toBe(s);
    expect(useEvolutionStone(s,'missing','water-stone')).toBe(s);
    expect(useEvolutionStone(s,id,'potion')).toBe(s);
  });
  it('blocks Everstone, fainted Pokémon, and active encounters without spending anything', () => {
    const s = eevee(), id=s.party[0].id;
    s.party[0].everstone=true; expect(useEvolutionStone(s,id,'water-stone')).toBe(s);
    s.party[0].everstone=false; s.party[0].currentHp=0; expect(useEvolutionStone(s,id,'water-stone')).toBe(s);
    s.party[0].currentHp=20; s.currentTrainerBattle={phase:'active'} as any; expect(useEvolutionStone(s,id,'water-stone')).toBe(s);
    s.currentTrainerBattle=null; s.currentEncounter={} as any; expect(useEvolutionStone(s,id,'water-stone')).toBe(s);
  });
  it('preserves damage ratio, XP, and unrelated bag contents', () => {
    const s=eevee(); s.party[0].currentHp=Math.round(s.party[0].maxHp/2);
    const n=useEvolutionStone(s,s.party[0].id,'water-stone');
    expect(Math.abs(n.party[0].currentHp/n.party[0].maxHp-s.party[0].currentHp/s.party[0].maxHp)).toBeLessThan(.03);
    expect(n.party[0].totalXp).toBe(s.party[0].totalXp); expect(n.bag.potion).toBe(s.bag.potion);
  });
});
