import type { OwnedPokemon, PokemonIVs } from '../state/model';
import { SPECIES_BY_DEX } from '../data/species';
import { getUnlockedLearnsetMoveIds } from './moveLearn';
export function stableIVs(id: string): PokemonIVs {
  const roll = (stat:string):1|2|3 => { let h=2166136261; for(const c of 'pkr-v5:'+id+':'+stat) h=Math.imul(h^c.charCodeAt(0),16777619); return ((h>>>0)%3+1) as 1|2|3; };
  return {hp:roll('hp'),attack:roll('attack'),defense:roll('defense')};
}
export function rollIVs(rng:()=>number=Math.random):PokemonIVs {
  const roll=()=>Math.max(1,Math.min(3,1+Math.floor(rng()*3))) as 1|2|3;
  return {hp:roll(),attack:roll(),defense:roll()};
}
export function ivsFor(mon:{id?:string;dexNum:number;ivs?:PokemonIVs}):PokemonIVs {
  const fallback=stableIVs(mon.id??'wild:'+mon.dexNum);
  const valid=(v:unknown):v is 1|2|3=>v===1||v===2||v===3;
  return {hp:valid(mon.ivs?.hp)?mon.ivs!.hp:fallback.hp,attack:valid(mon.ivs?.attack)?mon.ivs!.attack:fallback.attack,defense:valid(mon.ivs?.defense)?mon.ivs!.defense:fallback.defense};
}
export const ivMultiplier=(n:number)=>.8+.1*n;
export const ivAverage=(mon:Parameters<typeof ivsFor>[0])=>{const i=ivsFor(mon);return (i.hp+i.attack+i.defense)/3;};
export function battleStats(mon:{id?:string;dexNum:number;level:number;ivs?:PokemonIVs}) {
  const s=SPECIES_BY_DEX.get(mon.dexNum) as any; const iv=ivsFor(mon), l=Math.max(1,Math.min(100,mon.level));
  const stat=(base:number|undefined,v:number)=>Math.max(1,Math.floor(((2*(base??50)*l)/100+5)*ivMultiplier(v)));
  // Sized for the canonical damage formula: about 3-6 same-level hits at any level.
  const hp=Math.max(10,Math.floor((Math.floor(2*(s?.baseHp??40)*l/100)+2*l+14)*ivMultiplier(iv.hp)));
  const attack=stat(s?.baseAttack,iv.attack),defense=stat(s?.baseDefense,iv.defense),specialAttack=stat(s?.baseSpecialAttack,iv.attack),specialDefense=stat(s?.baseSpecialDefense,iv.defense),speed=stat(s?.baseSpeed,2);
  const power=Math.floor((attack+specialAttack)*Math.sqrt(defense+specialDefense)*Math.sqrt(hp)/10);
  return {hp,attack,defense,specialAttack,specialDefense,speed,power};
}
export const powerUpCost=(level:number)=>100+20*level+2*level*level;
export function powerUpPreview(mon:OwnedPokemon) {
 const level=Math.min(100,mon.level+1),old=new Set(getUnlockedLearnsetMoveIds(mon.dexNum,mon.level));
 return {cost:powerUpCost(mon.level),level,stats:battleStats({...mon,level}),newMoves:getUnlockedLearnsetMoveIds(mon.dexNum,level).filter(m=>!old.has(m))};
}
