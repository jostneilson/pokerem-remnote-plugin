import {describe,it,expect} from 'vitest';
import {chooseStarter,createInitialStateV4,parseGameState,configureStudyDifficulty} from './store';
describe('legacy save preservation for UI polish',()=>{
 it('preserves progression, inventory, collection, nicknames and preferences through v3 upgrade and a second round trip',()=>{
  const seeded=configureStudyDifficulty(chooseStarter(createInitialStateV4(),656),'hard');
  const legacy={...seeded,schemaVersion:3,currency:5432,cardsReviewed:987,trainerXp:670,party:seeded.party.map(p=>({...p,nickname:'Study buddy',shiny:true})),bag:{...seeded.bag,'revive':3,'great-ball':9},collectionDex:{1:2,656:1},claimedAchievementIds:['cards_10'],selectedTab:'party'};
  const migrated=parseGameState(JSON.parse(JSON.stringify(legacy)));
  expect(migrated.party).toEqual(legacy.party);
  expect(migrated.bag).toEqual(legacy.bag);
  expect(migrated.currency).toBe(5432);
  expect(migrated.cardsReviewed).toBe(987);
  expect(migrated.collectionDex).toEqual(legacy.collectionDex);
  expect(migrated.claimedAchievementIds).toEqual(legacy.claimedAchievementIds);
  expect(migrated.selectedTab).toBe('party');
  expect(migrated.studyDifficultyPreset).toBe('hard');
  const restored=parseGameState(JSON.parse(JSON.stringify(migrated)));
  expect(restored).toEqual(migrated);
 });
});
