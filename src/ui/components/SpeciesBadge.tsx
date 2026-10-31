import { SPECIES_BY_DEX } from '../../game/data/species';
export function classificationFor(dex:number){return SPECIES_BY_DEX.get(dex)?.classification??'ordinary';}
export function speciesLabel(dex:number,rarity?:string){const c=classificationFor(dex);return c==='legendary'?'Legendary':c==='mythical'?'Mythical':c==='ultra-beast'?'Ultra Beast':rarity==='Ultra'?'Rare':rarity??'Common';}
export function SpeciesBadge({dexNum}:{dexNum:number}){const c=classificationFor(dexNum);return c==='ordinary'?null:<span className={`pkr-species-badge pkr-species-badge--${c}`}>{speciesLabel(dexNum)}</span>;}
