import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {chooseStarter,createInitialStateV4} from '../game/state/store';
import {ItemsScreen} from './screens/ItemsScreen';
import {Panel} from './components/Panel';
import {SidebarNavigation} from './components/SidebarNavigation';
import {BagScreen} from './screens/BagScreen';
import {PartyScreen} from './screens/PartyScreen';
import {ShopScreen} from './screens/ShopScreen';
import {CollectionScreen} from './screens/CollectionScreen';
import {ProgressScreen} from './screens/ProgressScreen';
import {RewardsScreen} from './screens/RewardsScreen';
import {TypeChartScreen} from './screens/TypeChartScreen';
const state=chooseStarter(createInitialStateV4(),656);
const noop=()=>{};
describe('arcade management screens',()=>{
 it('keeps four primary destinations and a labeled expandable menu',()=>{
  const html=renderToStaticMarkup(<SidebarNavigation active="status" settings={false} rewardsAttention progressAttention onSelect={noop} onSettings={noop}/>);
  expect((html.match(/<button/g)||[]).length).toBe(5);
  expect(html).toContain('aria-expanded="false"');expect(html).toContain('aria-current="page"');
  for(const name of ['Play','Party','Bag','Dex','Menu'])expect(html).toContain(name);
 });
 it('identifies a secondary destination while keeping the menu reachable',()=>{
  const html=renderToStaticMarkup(<SidebarNavigation active="progress" settings={false} rewardsAttention={false} progressAttention={false} onSelect={noop} onSettings={noop}/>);
  expect(html).toContain('Menu, current section Progress');expect(html).toContain('aria-controls="pkr-more-navigation"');
 });
 it('retains content under a native keyboard-operable disclosure',()=>{
  const html=renderToStaticMarkup(<Panel collapsible title="Statistics"><p>Retained statistics</p></Panel>);
  expect(html).toContain('<details');expect(html).toContain('<summary');expect(html).toContain('Retained statistics');expect(html).not.toContain(' open=');
 });
 it('renders every management screen with an existing save',()=>{
  const screens=[
   <PartyScreen rootURL="/" party={state.party} storagePokemon={state.storagePokemon} activeId={state.activePokemonId} onSwitch={noop}/>,
   <BagScreen rootURL="/" state={state} bag={state.bag} onUseItem={noop} onActivateXpDoubler={noop}/>,
   <ShopScreen rootURL="/" currency={state.currency} trainerLevel={state.trainerLevel} onBuy={noop}/>,
   <CollectionScreen rootURL="/" collectionDex={state.collectionDex}/>,
   <ProgressScreen state={state} onClaimAchievement={noop} onClaimAllAchievements={noop}/>,
   <RewardsScreen state={state} onClaimReward={noop}/>,
   <TypeChartScreen rootURL="/"/>,
  ];
  for(const screen of screens)expect(renderToStaticMarkup(screen).length).toBeGreaterThan(100);
 });
 it('combines inventory and shop without losing a saved Shop destination',()=>{
  const props={rootURL:'/',state,onUseItem:noop,onActivateXpDoubler:noop,onBuy:noop};
  const inventory=renderToStaticMarkup(<ItemsScreen {...props}/>);
  const shop=renderToStaticMarkup(<ItemsScreen {...props} initialView="shop"/>);
  expect(inventory).toContain('Bag and shop');expect(inventory).toContain('My items');expect(inventory).toContain('Shop');
  expect(shop).toContain('Owned:');expect(shop).toContain('Buy Potion');
  const nav=renderToStaticMarkup(<SidebarNavigation active="shop" settings={false} rewardsAttention={false} progressAttention={false} onSelect={noop} onSettings={noop}/>);
  expect(nav).toContain('aria-current="page" aria-label="Bag"');
 });
 it('retains all eight generations and all types in compact dex selectors',()=>{
  const html=renderToStaticMarkup(<CollectionScreen rootURL="/" collectionDex={state.collectionDex}/>);
  expect(html).toContain('Gen 8');expect(html).toContain('Fairy');expect(html).toContain('Search Pokémon by name or dex number');
 });
});
