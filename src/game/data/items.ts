export type ItemId =
  | 'poke-ball' | 'great-ball' | 'ultra-ball'
  | 'potion' | 'super-potion' | 'max-potion' | 'revive'
  | 'oran-berry' | 'rare-candy' | 'exp-candy-s'
  | 'fire-stone' | 'water-stone' | 'thunder-stone' | 'leaf-stone' | 'moon-stone'
  | 'everstone'
  | 'catch-scope';

export interface ItemData {
  id: ItemId;
  name: string;
  iconFile: string;
  kind: 'catch' | 'heal' | 'utility' | 'evolution' | 'hold';
  power?: number;
  price: number;
  description: string;
}

export const ITEMS: ItemData[] = [
  { id: 'poke-ball', name: 'Poke Ball', iconFile: 'poke-ball.png', kind: 'catch', price: 100, description: 'Standard catch ball' },
  { id: 'great-ball', name: 'Great Ball', iconFile: 'great-ball.png', kind: 'catch', price: 300, description: 'Better catch rate (+0.2)' },
  { id: 'ultra-ball', name: 'Ultra Ball', iconFile: 'ultra-ball.png', kind: 'catch', price: 600, description: 'High catch rate (+0.4)' },
  { id: 'potion', name: 'Potion', iconFile: 'potion.png', kind: 'heal', power: 20, price: 150, description: 'Restores 20 HP' },
  { id: 'super-potion', name: 'Super Potion', iconFile: 'super-potion.png', kind: 'heal', power: 50, price: 350, description: 'Restores 50 HP' },
  { id: 'max-potion', name: 'Max Potion', iconFile: 'max-potion.png', kind: 'heal', power: 9999, price: 1000, description: 'Fully restores HP' },
  { id: 'revive', name: 'Revive', iconFile: 'revive.png', kind: 'heal', power: -1, price: 800, description: 'Revives fainted Pokemon to 50% HP' },
  { id: 'oran-berry', name: 'Oran Berry', iconFile: 'oran-berry.png', kind: 'heal', power: 10, price: 80, description: 'Restores 10 HP' },
  { id: 'rare-candy', name: 'Rare Candy', iconFile: 'rare-candy.png', kind: 'utility', price: 2000, description: 'Instantly raises level by 1' },
  {
    id: 'exp-candy-s',
    name: 'Exp. Candy S',
    iconFile: 'rare-candy.png',
    kind: 'utility',
    price: 450,
    description: 'Grants a chunk of Exp. Points to your lead Pokémon (+45 XP)',
  },
  { id: 'fire-stone', name: 'Fire Stone', iconFile: 'fire-stone.png', kind: 'evolution', price: 1500, description: 'Evolves certain Fire-type Pokemon' },
  { id: 'water-stone', name: 'Water Stone', iconFile: 'water-stone.png', kind: 'evolution', price: 1500, description: 'Evolves certain Water-type Pokemon' },
  { id: 'thunder-stone', name: 'Thunder Stone', iconFile: 'thunder-stone.png', kind: 'evolution', price: 1500, description: 'Evolves certain Electric-type Pokemon' },
  { id: 'leaf-stone', name: 'Leaf Stone', iconFile: 'leaf-stone.png', kind: 'evolution', price: 1500, description: 'Evolves certain Grass-type Pokemon' },
  { id: 'moon-stone', name: 'Moon Stone', iconFile: 'moon-stone.png', kind: 'evolution', price: 1500, description: 'Evolves certain Pokemon' },
  { id: 'everstone', name: 'Everstone', iconFile: 'everstone.png', kind: 'hold', price: 500, description: 'Prevents evolution when held' },
  {
    id: 'catch-scope',
    name: 'Catch Scope',
    iconFile: 'key.png',
    kind: 'utility',
    price: 200,
    description: 'One battle reading — estimates catch odds for your next throw (wild battles only).',
  },
];

export const ITEM_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export const STARTING_BAG: Record<ItemId, number> = {
  'poke-ball': 6,
  'great-ball': 1,
  'ultra-ball': 0,
  'potion': 3,
  'super-potion': 1,
  'max-potion': 0,
  'revive': 0,
  'oran-berry': 2,
  'rare-candy': 0,
  'exp-candy-s': 0,
  'fire-stone': 0,
  'water-stone': 0,
  'thunder-stone': 0,
  'leaf-stone': 0,
  'moon-stone': 0,
  'everstone': 0,
  'catch-scope': 1,
};
