/**
 * Battle info-box layout (SPEC A17 / U16, as revised by the owner): each box sits with its own Pokémon. Your box is
 * in your column directly above your lead; the foe's box is in the foe's column directly under its feet.
 * Boxes clear each sprite's whole square (not just its visible art), so no box ever covers any part of a Pokémon;
 * when the field is too short for that, your lead's sprite shrinks to fit.
 */
export interface HudLayout {
  /** ≤ 320px: sprites at 80% and one-line boxes. */
  tight: boolean;
  spriteSize: number;
  /** Top of the foe box (just under the foe's feet), px from the field top. */
  foeTop: number;
  /** Your lead's feet, px from the field top. */
  allyFeet: number;
  /** Top of your box (just above your lead's head), px from the field top. */
  allyTop: number;
}

const GAP = 6;
/** Your lead stands near the bottom edge, as before A17. */
const ALLY_FEET_SHARE = 0.93;

export function battleHudLayout(o: { layoutW: number; height: number; foeFeetShare: number; foeSprite: number; allySprite: number }): HudLayout & { allySprite: number } {
  const tight = o.layoutW <= 320;
  const scale = tight ? 0.8 : 1;
  const foeSprite = Math.round(o.foeSprite * scale);
  const allyBoxH = tight ? 44 : 60;
  const allyFeet = Math.round(o.height * ALLY_FEET_SHARE);
  const allySprite = Math.min(Math.round(o.allySprite * scale), allyFeet - allyBoxH - GAP - 4);
  const foeTop = Math.round(o.height * o.foeFeetShare + GAP);
  // Your box (HP numbers and XP bar, so taller than the foe's) ends GAP px above the top of your sprite's square.
  const allyTop = allyFeet - allySprite - GAP - allyBoxH;
  return { tight, spriteSize: foeSprite, allySprite, foeTop, allyFeet, allyTop };
}
