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
  /** Top of the foe box (pinned bottom-right, under the foe's feet), px from the field top. */
  foeTop: number;
  /** Your lead's feet, px from the field top. */
  allyFeet: number;
  /** Top of your box (pinned top-left, above your lead), px from the field top. */
  allyTop: number;
}

const GAP = 6;
/** Both boxes sit this far from their corner of the field (yours top-left, the foe's bottom-right), so they mirror. */
export const HUD_INSET = 6;
/** Your lead stands near the bottom edge, as before A17. */
const ALLY_FEET_SHARE = 0.93;

export function battleHudLayout(o: { layoutW: number; height: number; foeFeetShare: number; foeSprite: number; allySprite: number }): HudLayout & { allySprite: number } {
  const tight = o.layoutW <= 320;
  const scale = tight ? 0.8 : 1;
  const foeSprite = Math.round(o.foeSprite * scale);
  const allyBoxH = tight ? 44 : 60;
  const allyFeet = Math.round(o.height * ALLY_FEET_SHARE);
  const allySprite = Math.min(Math.round(o.allySprite * scale), allyFeet - allyBoxH - GAP - HUD_INSET);
  // The foe's box is pinned to the bottom-right corner; this is its top for the usual box height.
  const foeTop = o.height - HUD_INSET - (tight ? 34 : 66);
  // Your box is pinned to the top-left corner and ends at least GAP px above your sprite's whole square.
  const allyTop = HUD_INSET;
  return { tight, spriteSize: foeSprite, allySprite, foeTop, allyFeet, allyTop };
}
