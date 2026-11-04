import '../../src/style.css';
import {storageCap} from '../../src/game/engine/capacity';
import {useEffect,useMemo,useState} from 'react';
import {SPECIES_BY_DEX} from '../../src/game/data/species';
import {EvolutionScene,useEvolutionWatcher} from '../../src/ui/battle/EvolutionScene';
import {render} from 'react-dom';
import * as game from '../../src/game/state/store';
import type {PokeRemGameState, SectionTab} from '../../src/game/state/model';
import {getBattleFlowPhase} from '../../src/game/battleFlow';
import {battleAmbienceCssVars,getBattleAmbience} from '../../src/game/engine/battleAmbience';
import {SidebarNavigation} from '../../src/ui/components/SidebarNavigation';
import {BattleReviewSurface} from '../../src/ui/battle/BattleReviewSurface';
import {TrainerBattleSurface} from '../../src/ui/battle/TrainerBattleSurface';
import {StatusScreen} from '../../src/ui/screens/StatusScreen';
import {PartyScreen} from '../../src/ui/screens/PartyScreen';
import {rollLeaderPrize as rocketPrize} from '../../src/game/engine/rocket';
import {ItemsScreen} from '../../src/ui/screens/ItemsScreen';
import {CollectionScreen} from '../../src/ui/screens/CollectionScreen';
import {TypeChartScreen} from '../../src/ui/screens/TypeChartScreen';
import {ProgressScreen} from '../../src/ui/screens/ProgressScreen';
import {RewardsScreen} from '../../src/ui/screens/RewardsScreen';
import {SettingsScreen} from '../../src/ui/screens/SettingsScreen';
import {WhatsNewCard} from '../../src/ui/components/WhatsNewCard';
import {QuickCarePanel} from '../../src/ui/components/QuickCarePanel';
const GRID_REQUEST={key:1,flags:[] as never[]};
function fixture(){
 let s=game.configureStudyDifficulty(game.chooseStarter(game.createInitialStateV4(),656),'medium');
 const others=[1,4,7].map(dex=>game.chooseStarter(game.createInitialStateV4(),dex).party[0]);
 s={...s,party:[...s.party,...others].map((p,i)=>({...p,id:'qa-'+i,level:11,totalXp:1800,maxHp:90,currentHp:i===1?24:90})),activePokemonId:'qa-0',currency:3000,trainerLevel:8,trainerXp:900,cardsReviewed:42,encounterProgress:7,currentStreak:3,longestStreak:7,bag:{'poke-ball':12,'great-ball':3,'potion':5,'revive':2,'xp-doubler-common':3,'xp-doubler-rare':1},collectionDex:{1:1,4:1,7:1,656:1},achievements:{'cards_10':true},dailyStats:{date:new Date().toISOString().slice(0,10),reviews:42,encounters:4,catches:2,defeats:2},whatsNewSeenVersion:'1.3.0'};
 return s;
}
const captureParams=new URLSearchParams(window.location.search);
const captureMode=captureParams.get('capture')==='1';
const captureScreen=captureParams.get('screen')??'status';
const captureScenario=captureParams.get('scenario')??'common';
const requestedWidth=Number(captureParams.get('width'));
const captureWidth=[280,320,400,520].includes(requestedWidth)?requestedWidth:400;
const requestedReducedMotion=captureParams.get('reducedMotion')==='1';
function captureFixture(){
 let s=fixture();
 if(captureScreen==='trainer'&&(captureScenario==='rocket'||captureScenario==='leader'||captureScenario==='leader-win')){
  if(captureScenario!=='rocket') s={...s,rocket:{gruntWins:5,typesBeaten:['Fire','Water','Grass','Bug','Normal'],leaderReady:true,leaderWins:0}};
  else s={...s,rocket:{gruntWins:2,typesBeaten:['Fire','Water'],leaderReady:false,leaderWins:0}};
  s=game.startRocketBattle(s,[1,2,3,4],()=>.4);
  if(captureScenario==='leader-win') s=game.resolveTrainerBattle(s,'win',()=>.4);
 } else if(captureScreen==='trainer'){
  s=game.startTrainerBattle(s,'standard',[1],()=>.4);
  s=game.lockTrainerTeam(s,['qa-0','qa-2','qa-3']);
 }
 if(captureScreen==='bag'){
  s=game.activateXpDoubler(s,'common');
  s=game.activateXpDoubler(s,'rare');
 }
 const seed=s.party[0]!;
 const owned=(id:string,dexNum:number,name:string,extra:Partial<typeof seed>={})=>({...seed,id,dexNum,name,ivs:{hp:2,attack:3,defense:2} as const,...extra});
 if(captureScenario==='legendary') s={...s,party:[owned('qa-legendary',150,'Mewtwo',{types:['Psychic'],level:42,totalXp:30000,ivs:{hp:3,attack:3,defense:3}})],activePokemonId:'qa-legendary'};
 if(captureScenario==='ultra-beast') s={...s,party:[owned('qa-ultra',793,'Nihilego',{types:['Rock','Poison'],level:36,totalXp:22000,ivs:{hp:3,attack:2,defense:3}})],activePokemonId:'qa-ultra'};
 if(captureScenario==='wild-ultra'||captureScenario==='wild-shiny') s={...s,party:[owned('qa-mewtwo',150,'Mewtwo',{types:['Psychic'],level:49,maxHp:218,currentHp:218,moves:['psychic','shadowball','aurasphere','icebeam'],autoMoves:false})],activePokemonId:'qa-mewtwo',currentEncounter:{dexNum:795,name:'Pheromosa',level:42,maxHp:172,currentHp:172,types:['Bug','Fighting'],moves:['bug-bite'],shiny:captureScenario==='wild-shiny',tier:'Ultra'},currentTrainerBattle:null};
 if(captureScenario==='shiny') s={...s,party:[owned('qa-shiny',4,'Charmander',{types:['Fire'],shiny:true,level:18,totalXp:6000,ivs:{hp:3,attack:3,defense:2}})],activePokemonId:'qa-shiny'};
 if(captureScenario==='fainted') s={...s,party:s.party.map((p,i)=>i===0?{...p,currentHp:0,ivs:{hp:1,attack:2,defense:3}}:p)};
 if(captureScenario==='shiny-zapdos') s={...s,currentEncounter:{dexNum:10170,name:'Galarian Zapdos',level:52,maxHp:180,currentHp:180,types:['Fighting','Flying'],shiny:true,tier:'Legendary'},currentTrainerBattle:null};
 if(captureScenario==='result-level') s={...s,currentEncounter:null,lastBattleResult:{seq:1,kind:'defeat',name:'Pidgey',dexNum:16,monName:'Froakie',xp:142,coins:210,fromLevel:11,toLevel:12,xpPctBefore:70,xpPctAfter:18,newMoves:['Quick Attack']}};
 if(captureScenario==='result-shiny') s={...s,currentEncounter:null,lastBattleResult:{seq:2,kind:'catch',name:'Galarian Zapdos',dexNum:10170,monName:'Galarian Zapdos',xp:0,coins:150,fromLevel:52,toLevel:52,xpPctBefore:0,xpPctAfter:0,newMoves:[],shiny:true,perfectIvs:true},shinyLog:[{dexNum:10170,name:'Galarian Zapdos',caughtAt:'2026-11-02T18:20:00.000Z',card:321,perfectIvs:true},{dexNum:41,name:'Zubat',caughtAt:'2026-10-21T09:05:00.000Z',card:118}]};
 if(captureScenario==='bench-hurt') s={...s,party:s.party.map((p,i)=>i===1?{...p,currentHp:Math.max(1,Math.floor(p.maxHp/3))}:i===2?{...p,currentHp:0}:p),bag:{...s.bag,revive:2,potion:3}};
 if(captureScenario==='prize') s={...s,rocket:{gruntWins:0,typesBeaten:[],leaderReady:false,leaderWins:1},currentTrainerBattle:null,currentEncounter:rocketPrize(30,[1,2,3,4],{},()=>.3)};
 if(captureScenario==='buddy') s={...game.activateXpDoubler({...s,bag:{...s.bag,'xp-doubler-common':2}},'common'),starterId:s.party[0]!.id,party:s.party.map((p,i)=>i===2?{...p,level:Math.max(2,p.level-8)}:p)};
 if(captureScenario==='buddy') s=game.activateXpDoubler(s,'common');
 if(captureScenario==='storage-full'){const base=s.party[0]!;s={...s,activePokemonId:'pk_1_p',party:Array.from({length:6},(_,i)=>({...base,id:`pk_${i+1}_p`})),storagePokemon:Array.from({length:storageCap(s)},(_,i)=>({...base,id:`pk_${100+i}_s`})),currentEncounter:{dexNum:16,name:'Pidgey',level:4,currentHp:18,maxHp:18,types:['Normal','Flying']}};}
 if(captureScenario==='grid'){const base=s.party[0]!;const dexes=[...SPECIES_BY_DEX.values()].filter(x=>x.dexNum<400).slice(0,60);s={...s,starterId:base.id,storagePokemon:Array.from({length:520},(_,i)=>{const sp=dexes[(i*7)%dexes.length]!;return {...base,id:`pk_${1000+i}_g`,dexNum:sp.dexNum,name:sp.name,types:[...sp.types],level:3+(i*13)%40,shiny:i%37===0,favorite:i%23===0,ivs:i%41===0?{hp:3,attack:3,defense:3}:{hp:i%4,attack:(i>>2)%4,defense:(i>>4)%4}};})};}
 if(captureScenario==='hurt') s={...s,party:s.party.map((p,i)=>i===0?{...p,currentHp:20}:p)};
 if(captureScenario==='cash-bonus') s={...s,lastStudyReward:{seq:s.cardsReviewed,leadXp:14,benchXp:4,bonus:2500,tier:'Jackpot'}};
 if(captureScenario==='full-party-catch') {
  const six=[...s.party,owned('qa-4',25,'Pikachu',{types:['Electric']}),owned('qa-5',133,'Eevee',{types:['Normal']})].slice(0,6);
  s={...s,party:six,activePokemonId:six[0]!.id,pendingCaughtMon:owned('qa-catch',147,'Dratini',{types:['Dragon'],level:14,totalXp:2500,ivs:{hp:3,attack:3,defense:2}}),currentEncounter:null,currentTrainerBattle:null};
 }
 return s;
}
function Preview(){
 const [s,set]=useState<PokeRemGameState>(captureMode?captureFixture:fixture);const [tab,setTab]=useState<SectionTab>(captureScreen==='trainer'||captureScreen==='settings'?'status':captureScreen as SectionTab);
 const [settings,setSettings]=useState(captureScreen==='settings');

 const [width,setWidth]=useState(captureMode?captureWidth:400),[compact,setCompact]=useState(false),[rm,setRm]=useState(captureMode?requestedReducedMotion:false),[news,setNews]=useState(false); const demoPlugin={settings:{getSetting:async(key:string)=>key.includes('reducedMotion')?rm:true},storage:{getSynced:async()=>s,setSynced:async()=>{}},app:{toast:async()=>{}}} as any;
 const act=(f:(s:PokeRemGameState)=>PokeRemGameState)=>set(f);
 const [evos,nextEvo]=useEvolutionWatcher(useMemo(()=>[...s.party,...s.storagePokemon],[s.party,s.storagePokemon]),true);
 useEffect(()=>{if(captureScenario!=='evolve')return;const t=setTimeout(()=>set(p=>({...p,party:p.party.map(m=>m.id===p.activePokemonId?{...m,dexNum:m.dexNum+1,name:SPECIES_BY_DEX.get(m.dexNum+1)?.name??m.name}:m)})),400);return()=>clearTimeout(t);},[]);
 const active=game.activePokemon(s)!;
 const tail=<>{tab==='status'&&!settings?<QuickCarePanel state={s} onApply={act}/>:null}<div className="pkr-content-vignette"><div className="pkr-panel-mount" key={tab}>
 {news?<WhatsNewCard seenVersion="" onDismiss={()=>setNews(false)}/>:null}
 {settings?<SettingsScreen compact={compact} onToggleCompact={()=>setCompact(v=>!v)} plugin={demoPlugin} studyProfile={{configured:true,preset:s.studyDifficultyPreset,reviews:s.studyReviewsPerEncounter,weight:s.studyCardWeight}} onConfigureStudy={(p,c)=>act(s=>game.configureStudyDifficulty(s,p,c))}/>:null}
 {!settings && tab==='status'?<StatusScreen rootURL="/" state={s} active={active}/>:null}
 {!settings && tab==='party'?<PartyScreen rootURL="/" storageCap={storageCap(s)} viewAllRequest={captureScenario==='grid'?GRID_REQUEST:undefined} party={s.party} starterId={s.starterId} gameState={s} onTransfer={(ids)=>act(x=>game.transferPokemon(x,ids))} bag={s.bag} currency={s.currency} powerUpBlocked={!!s.currentEncounter || !!s.currentTrainerBattle || !!s.pendingCaughtMon} evolutionBlocked={!!s.currentEncounter || !!s.currentTrainerBattle} evolutionMessage={s.lastOutcomeKind==='evolution'?s.lastBattleLog:undefined} onPowerUp={(id,level)=>act(s=>game.powerUpPokemon(s,id,level))} onToggleFavorite={id=>act(s=>game.togglePokemonFavorite(s,id))} onEvolve={(pid,item)=>act(s=>game.useEvolutionStone(s,pid,item))} activeId={s.activePokemonId} storagePokemon={s.storagePokemon} onSwitch={id=>act(s=>game.switchActivePokemon(s,id))} onLearnMove={(id,mid,i)=>act(s=>game.learnMoveAction(s,id,mid,i))} onRename={(id,name)=>act(s=>game.renamePokemon(s,id,name))} onRelease={id=>act(s=>game.releasePokemon(s,id))} onMoveToStorage={id=>act(s=>game.moveToStorage(s,id))} onMoveToParty={id=>act(s=>game.moveToParty(s,id))} onSwapStorageForParty={(sid,pid)=>act(s=>game.swapPartyWithStorage(s,sid,pid))} onHeal={id=>act(s=>game.quickHealPokemon(s,id))} onSetAutoMoves={(id,on)=>act(s=>game.setAutoMoves(s,id,on))} healBlocked={!!s.currentTrainerBattle} onBottleCap={(pid,item,stat)=>act(s=>game.useBottleCap(s,pid,item,stat))} onTutor={(pid,mid)=>act(s=>game.teachTutorMove(s,pid,mid))}/>:null}
 {!settings && (tab==='bag'||tab==='shop')?<ItemsScreen rootURL="/" state={s} initialView={tab==='shop'?'shop':'inventory'} reducedMotion={rm} onUseItem={(id,t)=>act(s=>id==='rare-candy'||id==='exp-candy-s'?game.useLeadUtilityItem(s,id,t):game.useHealingItem(s,id,t))} onActivateXpDoubler={tier=>act(s=>game.activateXpDoubler(s,tier))} onBuy={(id,qty)=>act(s=>game.buyItem(s,id,qty))} onBuyRouteTicket={id=>act(s=>game.buyRouteTicket(s,id))} onBuyCardStyle={id=>act(s=>game.buyCardStyle(s,id))} onBuyStorageUpgrade={()=>act(game.buyStorageUpgrade)} onBuyBagUpgrade={()=>act(game.buyBagUpgrade)} onEquipCardStyle={id=>act(s=>game.equipCardStyle(s,id))}/>:null}
 {!settings && tab==='dex'?<CollectionScreen rootURL="/" collectionDex={s.collectionDex} shinyLog={s.shinyLog} ownedPokemon={[...s.party,...s.storagePokemon]}/>:null}
 {!settings && tab==='types'?<TypeChartScreen rootURL="/"/>:null}
 {!settings && (tab==='progress'||tab==='rewards')?<ProgressScreen state={s} reducedMotion={rm} onClaimAchievement={id=>act(s=>game.claimAchievement(s,id))} onClaimAllAchievements={()=>act(game.claimAllAchievements)} onClaimQuest={id=>act(s=>game.claimQuest(s,id))} onClaimAllQuests={()=>act(game.claimAllQuests)} rewards={<RewardsScreen embedded state={s} reducedMotion={rm} onClaimReward={lv=>act(s=>game.claimTrainerReward(s,lv))} onClaimAll={()=>act(game.claimAllTrainerRewards)}/>}/>:null}
 </div></div></>;
 return <main style={{display:'flex',gap:32,padding:captureMode?0:24,background:captureMode?'#0c171b':'#e8eeed',minHeight:'100vh',alignItems:'flex-start'}}>
 {!captureMode?<aside style={{width:230,fontFamily:'system-ui',color:'#234',position:'sticky',top:24}}><h1 style={{fontSize:20,fontWeight:800}}>PokéRem QA</h1><p style={{fontSize:13,margin:'12px 0'}}>Isolated demo save. No RemNote connection. All gameplay controls below use the real game reducers.</p>
 <div style={{display:'grid',gap:8}}>{[280,320,400,520].map(w=><button key={w} onClick={()=>setWidth(w)} style={{background:'#fff',padding:8,borderRadius:8}}>{w}px sidebar</button>)}
 <button onClick={()=>act(s=>game.onQueueCardComplete(s,[1,6],10,{trainerFrequency:'off'}))}>Review demo card</button>
 <button onClick={()=>act(s=>({...s,currentEncounter:{dexNum:25,name:'Pikachu',level:12,maxHp:62,currentHp:62,types:['Electric'],moves:['thunder-shock'],shiny:false,tier:'Common'},currentTrainerBattle:null}))}>Wild encounter</button>
 <button onClick={()=>act(s=>game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'standard',[1],()=>.4))}>Trainer challenge</button>
 <button onClick={()=>act(s=>{const b=game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'standard',[1],()=>.4);return {...b,currentTrainerBattle:{...b.currentTrainerBattle!,enemies:b.currentTrainerBattle!.enemies.map(e=>({...e,currentHp:1}))}};})}>Trainer victory scenario</button>
 <button onClick={()=>act(s=>{const b=game.startTrainerBattle({...s,currentEncounter:null,currentTrainerBattle:null},'elite',[1],()=>.4);return {...b,party:b.party.map(p=>({...p,currentHp:1})),currentTrainerBattle:{...b.currentTrainerBattle!,enemies:b.currentTrainerBattle!.enemies.map(e=>({...e,level:100,maxHp:500,currentHp:500}))}};})}>Trainer loss scenario</button>
 <button onClick={()=>setRm(v=>!v)}>Reduced motion: {rm?'on':'off'}</button><button onClick={()=>set(fixture())}>Reset demo</button></div>
 <pre style={{fontSize:11,marginTop:16,whiteSpace:'pre-wrap'}}>Cards: {s.cardsReviewed} · coins: {s.currency}<br/>Booster: {s.xpBoosterActive?.cardsRemaining??0} · queued: {s.xpBoosterQueue?.length??0}<br/>Trainer: {s.currentTrainerBattle?.phase??'none'} · turns: {s.currentTrainerBattle?.feedbackSeq??0}</pre></aside>:null}
 <div className={`pokerem-sidebar pkr-pixel-ui ${compact?'pkr-focus-mode':''}`} data-reduced-motion={rm} style={{...battleAmbienceCssVars(getBattleAmbience(s.battleSceneIndex??0)),position:'relative',width,flexShrink:0,height:900,display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:captureMode?0:14,boxShadow:captureMode?'none':'0 18px 60px #10232430'}}>
 {evos[0]?<EvolutionScene key={evos[0].key} event={evos[0]} rootURL="/" reducedMotion={rm} onDone={nextEvo}/>:null}
 <SidebarNavigation active={tab} settings={settings} rewardsAttention={true} progressAttention={true} onSelect={t=>{setSettings(false);setTab(t);}} onSettings={()=>setSettings(v=>!v)}/>
 {settings||tab!=='status'?<div className="pkr-sidebar-scroll-body" style={{overflowY:'auto',minHeight:0,flex:1}}>{tail}</div>:s.currentTrainerBattle&&!s.pendingCaughtMon?<div className="pkr-sidebar-scroll-body" style={{overflowY:'auto'}}><TrainerBattleSurface key={s.currentTrainerBattle.id} state={s} rootURL="/" reducedMotion={rm} onLockTeam={ids=>act(s=>game.lockTrainerTeam(s,ids))} onCombatTurn={mid=>act(s=>game.applyTrainerCombatTurn(s,mid))} onClaimCatch={(idx,ball)=>act(s=>game.claimTrainerCatch(s,idx,ball))} onDismissCatchOffer={()=>act(game.dismissTrainerCatchOffer)} onBuyBall={(id)=>act(s=>game.buyItem(s,id))} onClose={()=>act(game.closeTrainerBattle)} onRematch={()=>act(game.rematchTrainer)} rematchCost={game.trainerRematchCost(s)} ballPrices={[{id:'poke-ball',price:100,unlocked:true}]}/>{tail}</div>:
 <BattleReviewSurface state={s} rootURL="/" active={active} hasEncounter={!!s.currentEncounter} wild={s.currentEncounter} canCatch={(s.bag['poke-ball']??0)>0} battleBusy={false} flowPhase={getBattleFlowPhase(s,false)} outcomeKind={s.lastOutcomeKind} feedbackSeq={s.battleFeedbackSeq} busyAction={null} onCatch={(ball)=>act(s=>game.catchEncounter(s,ball))} onFightMove={mid=>act(s=>game.applyCombatTurn(s,mid))} onRun={()=>act(game.runFromEncounter)} onOpenStorageTransfer={()=>{setTab('party');}} encounterRate={10} currency={s.currency} reducedMotion={rm} pendingCaughtMon={s.pendingCaughtMon} partyForReplace={s.party} activePartyId={s.activePokemonId} onPendingCatchReplace={id=>act(s=>game.resolvePendingCaughtReplace(s,id))} onPendingCatchCancel={()=>act(game.cancelPendingCaught)} onDismissMainNotice={id=>act(s=>game.dismissMainNotice(s,id))} onClaimMainNotice={id=>act(s=>game.claimMainNotice(s,id))} onDismissResult={()=>act(game.dismissBattleResult)} onClaimAllRewards={()=>act(game.claimAllRewards)} pendingRewards={game.pendingRewardCount(s)} sidebarSplitLayout={({sticky,lower})=><>{sticky}<div className="pkr-sidebar-scroll-body" style={{overflowY:'auto',minHeight:0,flex:1}}>{lower}{tail}</div></>}/>}</div></main>;
}
render(<Preview/>,document.getElementById('app'));
