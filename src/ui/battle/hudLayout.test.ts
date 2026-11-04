import { describe, expect, it } from 'vitest';
import { battleHudLayout } from './hudLayout';

describe('battleHudLayout (A17)', () => {
  it.each([
    [280, 190],
    [320, 190],
    [400, 232],
    [520, 270]
  ])('keeps both boxes inside the field and in their own column at %ipx', (layoutW, height) => {
    const l = battleHudLayout({ layoutW, height, foeFeetShare: 0.58, foeSprite: 96, allySprite: 125 });
    expect(l.tight).toBe(layoutW <= 320);
    expect(l.foeTop).toBeGreaterThanOrEqual(4);
    // Your box sits under your lead's feet and its measured height (44 tight, 60 wide) fits above the field edge.
    expect(l.allyTop).toBeGreaterThan(l.allyFeet);
    expect(l.allyTop + (l.tight ? 44 : 60)).toBeLessThanOrEqual(height);
    expect(l.spriteSize).toBe(Math.round(96 * (l.tight ? 0.8 : 1)));
  });
});
