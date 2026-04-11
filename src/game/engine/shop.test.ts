import { describe, expect, it } from 'vitest';
import { getShopInventory, ULTRA_BALL_UNLOCK_LEVEL } from './shop';

describe('getShopInventory', () => {
  it('includes Ultra Ball in always stock at or above unlock level', () => {
    const low = getShopInventory(ULTRA_BALL_UNLOCK_LEVEL - 1);
    expect(low.some((s) => s.item.id === 'ultra-ball')).toBe(false);

    const ok = getShopInventory(ULTRA_BALL_UNLOCK_LEVEL);
    const ultra = ok.filter((s) => s.item.id === 'ultra-ball');
    expect(ultra.length).toBe(1);
    expect(ultra[0]!.isDaily).toBe(false);

    const alwaysIds = ok.filter((s) => !s.isDaily).map((s) => s.item.id);
    const ig = alwaysIds.indexOf('great-ball');
    const iu = alwaysIds.indexOf('ultra-ball');
    expect(iu).toBe(ig + 1);
  });
});
