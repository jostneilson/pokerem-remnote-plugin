import { describe, expect, it } from 'vitest';
import { createInitialStateV4, chooseStarter } from '../state/store';
import { rollTravelRouteFind } from './routeFinds';
import { getShopInventory } from './shop';
function sample(fainted:boolean) {
  const s=chooseStarter(createInitialStateV4(),4); s.party[0].currentHp=fainted?0:s.party[0].maxHp;
  let seed=127, revives=0;
  const rng=()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
  for(let i=0;i<12000;i++) {
    s.battleSceneIndex=i%19;
    const roll=rollTravelRouteFind(s,rng);
    if(roll.itemId==='revive'){revives++; expect(roll.quantity).toBe(1);}
  }
  return revives/12000;
}
describe('accessible revives',()=>{
  it('stocks an affordable revive at every trainer level',()=>{
    for(const level of [1,5,10,100]) expect(getShopInventory(level).find(i=>i.item.id==='revive')).toMatchObject({price:200,isDaily:false});
  });
  it('offers modest recurring drops across routes and improves odds when the party needs one',()=>{
    const healthy=sample(false), fainted=sample(true);
    expect(healthy).toBeGreaterThan(.07); expect(healthy).toBeLessThan(.2);
    expect(fainted).toBeGreaterThan(healthy); expect(fainted).toBeLessThan(.3);
  });
});
