/**
 * Battle info-box layout (SPEC A17 / U16): each box sits with its own Pokémon. The foe box is in the foe's
 * column above its sprite; your box is in your column directly under your lead, whose feet move up to make room.
 * Sprite art fills roughly the lower 62% of its square, so "above the sprite" is measured from that visible top.
 */
export interface HudLayout {
  /** ≤ 320px: sprites at 80% and one-line boxes. */
  tight: boolean;
  spriteSize: number;
  /** Top of the foe box, px from the field top. */
  foeTop: number;
  /** Your lead's feet, px from the field top. */
  allyFeet: number;
  /** Top of your box, px from the field top. */
  allyTop: number;
}

const VISIBLE_SHARE = 0.62;
const GAP = 6;

export function battleHudLayout(o: { layoutW: number; height: number; foeFeetShare: number; foeSprite: number; allySprite: number }): HudLayout & { allySprite: number } {
  const tight = o.layoutW <= 320;
  const scale = tight ? 0.8 : 1;
  const foeSprite = Math.round(o.foeSprite * scale);
  const allySprite = Math.round(o.allySprite * scale);
  const boxH = tight ? 30 : 50;
  const foeTop = Math.max(4, Math.round(o.height * o.foeFeetShare - foeSprite * VISIBLE_SHARE - GAP - boxH));
  // Your box also carries the HP numbers and the XP bar, so it is taller than the foe's.
  const allyBoxH = tight ? 44 : 60;
  const allyFeet = o.height - allyBoxH - 8;
  return { tight, spriteSize: foeSprite, allySprite, foeTop, allyFeet, allyTop: allyFeet + 4 };
}
