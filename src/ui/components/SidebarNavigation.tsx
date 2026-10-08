import { useRef, useState, type KeyboardEvent } from 'react';
import type { SectionTab } from '../../game/state/model';
import { GameIcon, type GameIconName } from './GameIcon';
const PRIMARY: {id:SectionTab;label:string;icon:GameIconName}[]=[
 {id:'status',label:'Play',icon:'navStatus'}, {id:'party',label:'Party',icon:'navParty'},
 {id:'bag',label:'Bag',icon:'navBag'}, {id:'dex',label:'Dex',icon:'navDex'},
];
const MORE: {id:SectionTab;label:string;icon:GameIconName}[]=[
 {id:'progress',label:'Progress',icon:'navProgress'},
 {id:'rewards',label:'Rewards',icon:'navRewards'}, {id:'types',label:'Types',icon:'navTypes'},
];
export function SidebarNavigation({active,settings,rewardsAttention,progressAttention,onSelect,onSettings}:{
 active:SectionTab;settings:boolean;rewardsAttention:boolean;progressAttention:boolean;
 onSelect:(tab:SectionTab)=>void;onSettings:()=>void;
}){
 const [open,setOpen]=useState(false);
 const ref=useRef<HTMLElement>(null);
 const moreRef=useRef<HTMLButtonElement>(null);
 const selectedMore=settings?'Settings':MORE.find(t=>t.id===active)?.label;
 const onKeyDown=(e:KeyboardEvent)=>{
  if(e.key==='Escape'){setOpen(false);moreRef.current?.focus();return;}
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
  const buttons=Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button')??[]);
  const i=buttons.indexOf(e.target as HTMLButtonElement);if(i<0)return;e.preventDefault();
  buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length]?.focus();
 };
 const button=(t:typeof PRIMARY[number])=>{
  const selected=!settings&&(active===t.id || t.id==='bag' && active==='shop');
  const attention=t.id==='rewards'&&rewardsAttention||t.id==='progress'&&progressAttention;
  return <button key={t.id} type="button" className={`pkr-tab-tap ${selected?'pkr-tab-active':'pkr-tab-inactive'}`}
   aria-current={selected?'page':undefined} aria-label={`${t.label}${attention?', rewards available':''}`} title={t.label}
   onClick={()=>{onSelect(t.id);setOpen(false);if(MORE.some(m=>m.id===t.id))moreRef.current?.focus();}}><span className="pkr-nav-icon" aria-hidden="true"><GameIcon name={t.icon} size={24} tabPixel/>{attention?<i className="pkr-nav-dot"/>:null}</span><span>{t.label}</span></button>;
 };
 return <nav ref={ref} className="pkr-navigation-shell" aria-label="PokéRem sections" onKeyDown={onKeyDown}>
  <div className="pkr-tab-bar pkr-navigation">{PRIMARY.map(button)}
   <button ref={moreRef} type="button" className={`pkr-tab-tap ${selectedMore||open?'pkr-tab-active':'pkr-tab-inactive'}`} aria-label={selectedMore?`Menu, current section ${selectedMore}`:'Menu'} aria-expanded={open} aria-controls="pkr-more-navigation" onClick={()=>setOpen(v=>!v)}>
    <span className="pkr-nav-icon" aria-hidden="true"><GameIcon name="navSettings" size={24} tabPixel/>{rewardsAttention||progressAttention?<i className="pkr-nav-dot"/>:null}</span><span>Menu {open?'−':'+'}</span>
   </button>
  </div>
  {open?<div id="pkr-more-navigation" className="pkr-more-navigation">{MORE.map(button)}<button type="button" className={`pkr-tab-tap ${settings?'pkr-tab-active':'pkr-tab-inactive'}`} aria-current={settings?'page':undefined} onClick={()=>{if(!settings)onSettings();setOpen(false);}}><GameIcon name="navSettings" size={24} tabPixel/><span>Settings</span></button></div>:null}
 </nav>;
}
