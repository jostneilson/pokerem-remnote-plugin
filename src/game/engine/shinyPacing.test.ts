import {describe,it,expect} from 'vitest';
import {shinyOddsForPacing, spawnEncounter} from './encounters';
import {chooseStarter,createInitialStateV4} from '../state/store';
import {REVIEWS_PER_ENCOUNTER} from '../constants';
describe('shiny pacing compensation',()=>{
 it('doubles odds when encounters happen half as often',()=>{
  for(const complete of [false,true]) {
   const regular=shinyOddsForPacing(complete,{reviewsPerEncounter:REVIEWS_PER_ENCOUNTER});
   expect(shinyOddsForPacing(complete,{reviewsPerEncounter:REVIEWS_PER_ENCOUNTER*2})).toBeCloseTo(regular*2,12);
   expect(shinyOddsForPacing(complete,{reviewsPerEncounter:REVIEWS_PER_ENCOUNTER,modulo:2})).toBeCloseTo(regular*2,12);
  }
 });
 it('keeps expected shiny discoveries per card stable across configured rates and pacing',()=>{
  for(const rate of [3,6,10,15]) for(const modulo of [1,2]) {
   const odds=shinyOddsForPacing(false,{reviewsPerEncounter:rate,modulo});
   expect(odds/(rate*modulo)).toBeCloseTo((1/1000)/REVIEWS_PER_ENCOUNTER,12);
  }
 });
 it('accounts for faster card batches and never exceeds a valid probability',()=>{
  expect(shinyOddsForPacing(false,{reviewsPerEncounter:6,unitsPerReview:2})).toBe(1/1000);
  expect(shinyOddsForPacing(true,{reviewsPerEncounter:1e6})).toBe(1);
  expect(shinyOddsForPacing(false,{reviewsPerEncounter:NaN,modulo:Infinity})).toBe(1/1000);
 });
 it('applies adjusted odds to the actual shiny encounter roll',()=>{
  const party=chooseStarter(createInitialStateV4(),4).party;
  const roll=()=>{let i=0; const values=[0,0,0,.0015]; return ()=>values[Math.min(i++,3)];};
  expect(spawnEncounter(party,0,[1],0,{rng:roll()}).shiny).toBe(false);
  expect(spawnEncounter(party,0,[1],0,{rng:roll(),pacing:{reviewsPerEncounter:REVIEWS_PER_ENCOUNTER*2}}).shiny).toBe(true);
 });
});
