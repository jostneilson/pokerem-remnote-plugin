import { useLayoutEffect, useRef, useState } from 'react';
import type { PokeRemGameState } from '../../game/state/model';
export function useTrainerPresentation(committed:PokeRemGameState,reducedMotion:boolean) {
  const previous=useRef(committed);
  const [held,setHeld]=useState<PokeRemGameState|null>(null);
  const [phase,setPhase]=useState<'idle'|'player'|'enemy'>('idle');
  useLayoutEffect(()=>{
    const before=previous.current;
    previous.current=committed;
    const old=before.currentTrainerBattle, next=committed.currentTrainerBattle;
    if(reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !old || !next || old.id!==next.id || old.phase!=='active' || old.feedbackSeq===next.feedbackSeq) {
      setHeld(null);setPhase('idle');return;
    }
    setHeld(before);setPhase('player');
    const counterAttack=(next.enemies[old.activeEnemyIndex]?.currentHp ?? 0)>0;
    const enemy=window.setTimeout(()=>setPhase(counterAttack ? 'enemy' : 'idle'),220);
    const finish=window.setTimeout(()=>{setHeld(null);setPhase('idle');},480);
    return ()=>{window.clearTimeout(enemy);window.clearTimeout(finish);};
  },[committed.currentTrainerBattle?.id,committed.currentTrainerBattle?.feedbackSeq,reducedMotion]);
  useLayoutEffect(()=>{previous.current=committed;});
  return {state:held??committed,phase,animating:held!==null};
}
