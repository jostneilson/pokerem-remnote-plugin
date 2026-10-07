import '../../src/style.css';
import {useState} from 'react';
import {render} from 'react-dom';
import * as game from '../../src/game/state/store';
import type {PokeRemGameState, SectionTab} from '../../src/game/state/model';
import {getBattleFlowPhase} from '../../src/game/battleFlow';
import {battleAmbienceCssVars,getBattleAmbience} from '../../src/game/engine/battleAmbience';
import {SidebarNavigation} from '../../src/ui/components/SidebarNavigation';
import {StudyToolbar} from '../../src/ui/components/StudyToolbar';
import {BattleReviewSurface} from '../../src/ui/battle/BattleReviewSurface';
import {TrainerBattleSurface} from '../../src/ui/battle/TrainerBattleSurface';
import {StatusScreen} from '../../src/ui/screens/StatusScreen';
import {PartyScreen} from '../../src/ui/screens/PartyScreen';
import {BagScreen} from '../../src/ui/screens/BagScreen';
import {ShopScreen} from '../../src/ui/screens/ShopScreen';
import {CollectionScreen} from '../../src/ui/screens/CollectionScreen';
import {TypeChartScreen} from '../../src/ui/screens/TypeChartScreen';
import {ProgressScreen} from '../../src/ui/screens/ProgressScreen';
import {RewardsScreen} from '../../src/ui/screens/RewardsScreen';
import {SettingsScreen} from '../../src/ui/screens/SettingsScreen';
import {WhatsNewCard} from '../../src/ui/components/WhatsNewCard';
function fixture(){
 let s=game.configureStudyDifficulty(game.chooseStarter(game.createInitialStateV4(),656),'medium');
 const others=[1,4,7].map(dex=>game.chooseStarter(game.createInitialStateV4(),dex).party[0]);
 s={...s,party:[...s.party,...others].map((p,i)=>({...p,id:'qa-'+i,level:11,totalXp:1800,maxHp:90,currentHp:i===1?24:90})),activePokemonId:'qa-0',currency:3000,trainerLevel:8,trainerXp:900,cardsReviewed:42,encounterProgress:7,currentStreak:3,longestStreak:7,bag:{'poke-ball':12,'great-ball':3,'potion':5,'revive':2,'xp-doubler-common':3,'xp-doubler-rare':1},collectionDex:{1:1,4:1,7:1,656:1},achievements:{'cards_10':true},dailyStats:{date:new Date().toISOString().slice(0,10),reviews:42,encounters:4,catches:2,defeats:2},whatsNewSeenVersion:'1.2.0'};
 return s;
}
const captureParams=new URLSearchParams(window.location.search);
const captureMode=captureParams.get('capture')==='1';
const captureScreen=captureParams.get('screen')??'status';
function captureFixture(){
 let s=fixture();
 if(captureScreen==='trainer'){
  s=game.startTrainerBattle(s,'standard',[1],()=>.4);
  s=game.lockTrainerTeam(s,['qa-0','qa-2','qa-3']);
 }
 if(captureScreen==='bag'){
  s=game.activateXpDoubler(s,'common');
  s=game.activateXpDoubler(s,'rare');
 }
 return s;
}
function Preview(){
 const [s,set]=useState<PokeRemGameState>(captureMode?captureFixture:fixture);const [tab,setTab]=useState<SectionTab>(captureScreen==='trainer'?'status':captureScreen as SectionTab);
 const [settings,setSettings]=useState(false);

 const [width,setWidth]=useState(400),[compact,setCompact]=useState(false),[rm,setRm]=useState(false),[news,setNews]=useState(false); const demoPlugin={settings:{getSetting:async(key:string)=>key.includes('reducedMotion')?rm:true},storage:{getSynced:async()=>s,setSynced:async()=>{}},app:{toast:async()=>{}}} as any;
 const act=(f:(s:PokeRemGameState)=>PokeRemGameState)=>set(f);
 const active=game.activePokemon(s)!;
 const tail=<><SidebarNavigation active={tab} settings={settings} rewardsAttention={true} progressAttention={true} onSelect={t=>{setSettings(false);setTab(t);}} onSettings={()=>setSettings(v=>!v)}/><div className="pkr-content-vignette"><div className="pkr-panel-mount" key={tab}>
 {news?<WhatsNewCard seenVersion="" onDismiss={()=>setNews(false)}/>:null}
 {settings?<SettingsScreen plugin={demoPlugin} studyProfile={{configured:true,preset:s.studyDifficultyPreset,reviews:s.studyReviewsPerEncounter,weight:s.studyCardWeight}} onConfigureStudy={(p,c)=>act(s=>game.configureStudyDifficulty(s,p,c))}/>:null}
 {!settings && tab==='status'?<StatusScreen rootURL="/" state={s} active={active}/>:null}
 {!settings && tab==='party'?<PartyScreen rootURL="/" party={s.party} activeId={s.activePokemonId} storagePokemon={s.storagePokemon} onSwitch={id=>act(s=>game.switchActivePokemon(s,id))} onLearnMove={(id,mid,i)=>act(s=>game.learnMoveAction(s,id,mid,i))} onRename={(id,name)=>act(s=>game.renamePokemon(s,id,name))}/>:null}
 {!settings && tab==='bag'?<BagScreen rootURL="/" bag={s.bag} currency={s.currency} state={s} onUseItem={id=>act(s=>game.useHealingItem(s,id))} onActivateXpDoubler={tier=>act(s=>game.activateXpDoubler(s,tier))}/>:null}
 {!settings && tab==='shop'?<ShopScreen rootURL="/" currency={s.currency} trainerLevel={s.trainerLevel} reducedMotion={rm} onBuy={(id,price)=>act(s=>game.buyItem(s,id,price))}/>:null}
 {!settings && tab==='dex'?<CollectionScreen rootURL="/" collectionDex={s.collectionDex}/>:null}
 {!settings && tab==='types'?<TypeChartScreen rootURL="/"/>:null}
 {!settings && tab==='progress'?<ProgressScreen state={s} reducedMotion={rm} onClaimAchievement={id=>act(s=>game.claimAchievement(s,id))} onClaimAllAchievements={()=>act(game.claimAllAchievements)}/>:null}
 {!settings && tab==='rewards'?<RewardsScreen state={s} reducedMotion={rm} onClaimReward={lv=>act(s=>game.claimTrainerReward(s,lv))}/>:null}
 </div></div></>;
 return <main style={{display:'flex',gap:32,padding:captureMode?0:24,background:captureMode?'#0c171b':'#e8eeed',minHeight:'100vh',alignItems:'flex-start'}}>
 {!captureMode?<aside style={{width:230,fontFamily:'system-ui',color:'#234',position:'sticky',top:24}}><h1 style={{fontSize:20,fontWeight:800}}>PokéRem QA</h1><p style={{fontSize:13,margin:'12px 0'}}>Isolated demo save. No RemNote connection. All gameplay controls below use the real game reducers.</p>
 <div style={{display:'grid',gap:8}}>{[280,320,400,560].map(w=><button key={w} onClick={()=>setWidth(w)} style={{background:'#fff',padding:8,borderRadius:8}}>{w}px sidebar</button>)}
 <button onClick={()=>act(s=>game.onQueueCardComplete(s,[1,6],10,{trainerFrequency:'off'}))}>Review demo card</button>
 <button onClick={()=>act(s=>({...s,currentEncounter:{dexNum:25,name:'Pikachu',level:12,maxHp:62,currentHp:62,types:['Electric'],moves:['thunder-shock'],shiny:false,tier:'Common'},currentTrainerBattle:null}))}>Wild encounter</button>
 <button onClick={()=>act(s=>game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'standard',[1],()=>.4))}>Trainer challenge</button>
 <button onClick={()=>act(s=>{const b=game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'standard',[1],()=>.4);return {...b,currentTrainerBattle:{...b.currentTrainerBattle!,enemies:b.currentTrainerBattle!.enemies.map(e=>({...e,currentHp:1}))}};})}>Trainer victory scenario</button>
 <button onClick={()=>act(s=>{const b=game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'elite',[1],()=>.4);return {...b,party:b.party.map(p=>({...p,currentHp:1})),currentTrainerBattle:{...b.currentTrainerBattle!,enemies:b.currentTrainerBattle!.enemies.map(e=>({...e,level:100,maxHp:500,currentHp:500}))}};})}>Trainer loss scenario</button>
 <button onClick={()=>setRm(v=>!v)}>Reduced motion: {rm?'on':'off'}</button><button onClick={()=>set(fixture())}>Reset demo</button></div>
 <pre style={{fontSize:11,marginTop:16,whiteSpace:'pre-wrap'}}>Cards: {s.cardsReviewed} · coins: {s.currency}<br/>Booster: {s.xpBoosterActive?.cardsRemaining??0} · queued: {s.xpBoosterQueue?.length??0}<br/>Trainer: {s.currentTrainerBattle?.phase??'none'} · turns: {s.currentTrainerBattle?.feedbackSeq??0}</pre></aside>:null}
 <div className={`pokerem-sidebar pkr-pixel-ui ${compact?'pkr-focus-mode':''}`} data-reduced-motion={rm} style={{...battleAmbienceCssVars(getBattleAmbience(s.battleSceneIndex??0)),position:'relative',width,flexShrink:0,height:900,display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:captureMode?0:14,boxShadow:captureMode?'none':'0 18px 60px #10232430'}}>
 <StudyToolbar compact={compact} onToggle={()=>setCompact(v=>!v)} active={active} trainerBattle={!!s.currentTrainerBattle}/>
 {s.currentTrainerBattle?<div className="pkr-sidebar-scroll-body" style={{overflowY:'auto'}}><TrainerBattleSurface key={s.currentTrainerBattle.id} state={s} rootURL="/" reducedMotion={rm} onLockTeam={ids=>act(s=>game.lockTrainerTeam(s,ids))} onCombatTurn={mid=>act(s=>game.applyTrainerCombatTurn(s,mid))} onClaimCatch={(idx,ball)=>act(s=>game.claimTrainerCatch(s,idx,ball))} onDismissCatchOffer={()=>act(game.dismissTrainerCatchOffer)} onBuyBall={(id,price)=>act(s=>game.buyItem(s,id,price))} onClose={()=>act(game.closeTrainerBattle)} ballPrices={[{id:'poke-ball',price:100,unlocked:true}]}/>{tail}</div>:
 <BattleReviewSurface state={s} rootURL="/" active={active} hasEncounter={!!s.currentEncounter} wild={s.currentEncounter} canCatch={(s.bag['poke-ball']??0)>0} battleBusy={false} flowPhase={getBattleFlowPhase(s,false)} outcomeKind={s.lastOutcomeKind} feedbackSeq={s.battleFeedbackSeq} busyAction={null} onCatch={()=>act(game.catchEncounter)} onFightMove={mid=>act(s=>game.applyCombatTurn(s,mid))} onRun={()=>act(game.runFromEncounter)} encounterRate={10} currency={s.currency} reducedMotion={rm} onBuyBall={()=>act(s=>game.buyItem(s,'poke-ball',100))} onDismissMainNotice={id=>act(s=>game.dismissMainNotice(s,id))} sidebarSplitLayout={({sticky,lower})=><>{sticky}<div className="pkr-sidebar-scroll-body" style={{overflowY:'auto',minHeight:0,flex:1}}>{lower}{tail}</div></>}/>}</div></main>;
}
render(<Preview/>,document.getElementById('app'));
