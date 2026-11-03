# PokéRem arcade design contract — next release (after 1.4.1)

## Visual identity

A crisp 90s handheld/arcade game inside a study tool. One pixel font, square framed panels, stepped highlights, restrained movement, and real Pokémon sprite art. No sound. Navy ink and cream are the shared chrome, violet is the supporting frame color, and gold signals rewards and shinies. Scene backgrounds and type/HP colors keep their gameplay meaning.

## Typography

- **One face:** the bundled original "PokeRem Pixel" font (`--pkr-font-body`; `--pkr-font-display` points at the same face). It ships in `public/assets/fonts` and is embedded in the widget CSS, so there is no external font request. Only the digit 5 was redrawn, for clarity.
- **Type scale** (tokens on `:root` in `src/style.css`):

  | Token | Size | Use |
  |---|---|---|
  | `--pkr-text-title` | 15px | Panel and card titles (display face) |
  | `--pkr-text-body` | 14px | Body text, prompts, names |
  | `--pkr-text-label` | 12px | Buttons, labels, secondary lines |
  | `--pkr-text-micro` | 11px | Chips, dates, Dex numbers |

  New markup uses these tokens, or the `pkr-type-title` / `pkr-type-body` / `pkr-type-label` / `pkr-type-micro` classes. Don't add new `text-[Npx]` Tailwind sizes.
- **Fine print and copy:** older screens use three sidebar classes instead of Tailwind sizes. `pkr-fine` is fine print: 15px in the sidebar, 14px on portaled pixel surfaces (queue strip, popup, Dex sheet) and 13px inside compact battle plates. `pkr-copy` is 15px and `pkr-lead` is 17px. Titles and panel headers (`pkr-pixel-title`, `pkr-panel-header`) come last in the cascade, so they keep the title style even when combined with fine print or bold. None of these use `!important`. The only `!important` left in `src/style.css` is for reduced motion and for overriding inline layout sizes.
- `text-[12px]` and `text-[13px]` survive in a few trainer-battle and stat spots, where they draw at their real size.
- **Currency** is written ₽ on screen. Screen-reader labels may say "Poké Dollars".

## Color and contrast

- Body text meets 4.5:1 against its panel. Every scene's `uiMuted` colour in `battleAmbience.ts` is at least 4.6:1 on the `#1a2039` panel.
- Type labels are white with a 1px dark outline (`TYPE_LABEL_OUTLINE`), as in the main games. Electric, Ice, Ground, Steel, Fairy and Normal use dark ink.
- Battle commands are flat fills with a pixel bevel (`.pkr-cmd`, `--catch`/`--fight`/`--run`), not glossy gradients.

## Sprites

- Official PokeAPI sprites only, never recoloured. Pixelated rendering. Translate sprites; never scale them by fractions.
- Shiny and rare sprites glow along their silhouette (a `drop-shadow` on the `img`). Never put a ring, outline or box around the sprite image.
- Showcase stages (Shiny Case, result card, evolution) give the sprite room: a radial glow, a pedestal shadow, and no clipping.

## Layout

Play owns the arena. Party, Bag (including Shop), Dex, the Trainer screen (rewards and progress), Types and Settings use the full panel without repeating the arena above their content. Play, Party, Bag, Dex and Menu stay available at the top; Menu reveals the less frequent destinations. Navigation shows labels, reward attention and keyboard focus.

When no wild is out, the field stays clear: next-wild progress lives in the command area, never over a Pokémon.

A pending wild or trainer encounter shows a Return to Play button on management screens. Viewing menus does not dismiss encounters or override trainer restrictions. Saves and reducers remain authoritative.

## Shared controls

1–2px corners; 2px frames; subtle inset light and dark pixels. Buttons have clear focus, hover, disabled and pressed states. Pressing translates by 1–2px; it never scales. Main action targets are at least 36px tall. Meters use `pkr-meter-track`/`pkr-meter-fill` and keep semantic colors and accessible values.

## Motion

Decorative motion uses only transform and opacity, with `--pkr-motion-*` durations and `--pkr-ease-*` curves. Reduced motion (the RemNote setting or the OS) keeps every state and its gold styling, but still: no wipes, sparkles, twinkles or silhouette pulses. Moments with sequences, such as a shiny encounter, the result card or evolution, can be skipped and jump straight to their final state.

## Verification boundary

Type checks, reducer tests and server rendering don't prove visual quality. Before a release:
- run the overflow check, the contrast check and screenshots at 280, 320, 400 and 520px;
- open sheets and disclosures;
- tab through the battle controls;
- check the installed plugin against the old testing deck.
