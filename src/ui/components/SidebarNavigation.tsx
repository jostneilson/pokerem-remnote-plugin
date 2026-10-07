import { useRef, type KeyboardEvent } from 'react';
import type { SectionTab } from '../../game/state/model';
import { GameIcon, type GameIconName } from './GameIcon';
const TABS: { id: SectionTab; label: string; icon: GameIconName }[] = [
  {id:'status',label:'Status',icon:'navStatus'}, {id:'party',label:'Party',icon:'navParty'},
  {id:'bag',label:'Bag',icon:'navBag'}, {id:'shop',label:'Shop',icon:'navShop'},
  {id:'dex',label:'Dex',icon:'navDex'}, {id:'types',label:'Types',icon:'navTypes'},
  {id:'progress',label:'Progress',icon:'navProgress'}, {id:'rewards',label:'Rewards',icon:'navRewards'},
];
export function SidebarNavigation({active,settings,rewardsAttention,progressAttention,onSelect,onSettings}:{
  active:SectionTab;settings:boolean;rewardsAttention:boolean;progressAttention:boolean;
  onSelect:(tab:SectionTab)=>void;onSettings:()=>void;
}) {
  const ref=useRef<HTMLElement>(null);
  const onKeyDown=(e:KeyboardEvent)=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
    const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
    const i=buttons.indexOf(e.target as HTMLButtonElement);
    if(i<0)return;
    e.preventDefault();
    const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next]?.focus();
  };
  return <nav ref={ref} className="pkr-tab-bar pkr-navigation" aria-label="PokéRem sections" onKeyDown={onKeyDown}>
    {TABS.map(t=>{
      const selected=!settings&&active===t.id;
      const attention=(t.id==='rewards'&&rewardsAttention)||(t.id==='progress'&&progressAttention);
      return <button key={t.id} type="button" className={`pkr-tab-tap ${selected?'pkr-tab-active':'pkr-tab-inactive'}`}
        aria-current={selected?'page':undefined} aria-label={`${t.label}${attention?', rewards available':''}`}
        title={t.label} onClick={()=>onSelect(t.id)}>
        <span className="pkr-nav-icon" aria-hidden="true"><GameIcon name={t.icon} size={18} tabPixel />{attention?<i className="pkr-nav-dot"/>:null}</span>
        <span aria-hidden="true">{t.label}</span>
      </button>;
    })}
    <button type="button" aria-label="Settings" aria-current={settings?'page':undefined} className={`pkr-tab-tap ${settings?'pkr-tab-active':'pkr-tab-inactive'}`} onClick={onSettings}>
      <GameIcon name="navSettings" size={18} tabPixel/><span>Settings</span>
    </button>
  </nav>;
}
