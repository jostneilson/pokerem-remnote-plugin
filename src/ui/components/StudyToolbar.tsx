import type { OwnedPokemon } from '../../game/state/model';
export function StudyToolbar({compact,onToggle,active,trainerBattle}:{compact:boolean;onToggle:()=>void;active?:OwnedPokemon;trainerBattle:boolean}) {
  return <div className="pkr-study-toolbar">
    <div className="min-w-0"><span className="pkr-study-status-dot" aria-hidden="true"/><strong>{trainerBattle?'Trainer challenge':'Study companion'}</strong>
      {compact&&active&&!trainerBattle?<span className="pkr-study-hp">{active.nickname||active.name} · HP {Math.max(0,active.currentHp)}/{active.maxHp}</span>:null}
    </div>
    {!trainerBattle?<button type="button" aria-pressed={compact} onClick={onToggle} title="Compact view hides the arena while keeping encounters and actions available">{compact?'Show arena':'Compact view'}</button>:null}
  </div>;
}
