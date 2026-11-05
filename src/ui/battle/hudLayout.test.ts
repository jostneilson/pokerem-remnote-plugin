import { describe, expect, it } from 'vitest';
import { HUD_INSET, battleHudLayout } from './hudLayout';

describe('battleHudLayout (A17, owner revision: your box above, foe box below)', () => {
  it.each([
    [280, 190],
    [320, 190],
    [400, 232],
    [520, 270]
  ])('keeps both boxes clear of both sprites and inside the field at %ipx', (layoutW, height) => {
    const l = battleHudLayout({ layoutW, height, foeFeetShare: 0.58, foeSprite: 96, allySprite: 125 });
    const allyBoxH = l.tight ? 44 : 60;
    expect(l.tight).toBe(layoutW <= 320);
    // Your box ends above the top of your sprite's whole square, so it never covers your Pokémon.
    expect(l.allyTop).toBe(HUD_INSET);
    expect(l.allyTop + allyBoxH).toBeLessThan(l.allyFeet - l.allySprite);
    // The foe's box mirrors yours from the bottom-right corner and still starts under the foe's feet.
    expect(height - (l.foeTop + (l.tight ? 34 : 66))).toBe(HUD_INSET);
    expect(l.foeTop).toBeGreaterThan(height * 0.58);
  });

  it('shrinks your sprite rather than letting your box cover it on a short field', () => {
    const l = battleHudLayout({ layoutW: 400, height: 150, foeFeetShare: 0.58, foeSprite: 96, allySprite: 160 });
    expect(l.allySprite).toBeLessThan(160);
    expect(l.allyTop).toBe(HUD_INSET);
  });
});
