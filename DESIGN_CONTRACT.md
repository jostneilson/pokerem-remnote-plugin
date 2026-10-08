# PokéRem arcade design contract — 1.3.0 candidate

## Visual identity

A crisp 90s handheld/arcade game inside a study tool. Pixel fonts, square framed panels, stepped highlights, restrained movement, and real Pokémon sprite art. No sound. Navy ink and cream are the shared chrome, violet is the supporting frame color, and gold signals rewards. Scene backgrounds and type/HP colors keep their gameplay meaning.

## Typography and assets

- Pixelify Sans: body, menu controls, secondary labels, tooltips, and dialogue. Use 14–17px for normal content, with sufficient line height. It is a pixel font designed to remain readable in longer text.
- Press Start 2P: short titles, wordmark, and short panel headings. Use 8px or larger. Do not apply it to paragraphs.
- Both fonts are bundled in `public/assets/fonts`, including original SIL OFL notices. Font bytes are embedded as data URLs in the injected widget CSS during development and build. No external font request or separately hosted font asset is required.
- Sprites use pixelated rendering. Avoid fractional scale animations on sprites; translate them instead.

## Layout

Play owns the arena. Party, Bag (including Shop), Dex, Progress, Rewards, Types, and Settings use the full panel without repeating the arena above their content. Play/Party/Bag/Dex and Menu stay available at the top. Menu reveals the less frequent destinations. Navigation shows labels, reward attention, and keyboard focus.

A pending wild/trainer encounter gets a Return to Play button on management screens. Viewing menus does not dismiss encounters or override trainer restrictions. The underlying saves and reducers remain authoritative.

Extra status statistics, help, Settings explanations, and achievement categories use native disclosures. Actions and owned items stay easy to reach. Dex uses generation/type selectors instead of a wall of buttons. No feature is removed.

## Shared controls

1–2px corners; 2px frames; subtle inset light/dark pixels. Buttons have clear focus, hover, disabled, and pressed states. Press feedback uses a small translation, not scale. Main action targets are at least 36px tall. Meters use `pkr-meter-track`/`pkr-meter-fill` and retain semantic colors and accessible values.

Reduced motion suppresses decorative animation throughout the sidebar. No continuous shimmer on currency. Modal/detail surfaces and standalone widgets must follow the same fonts and frames.

## Verification boundary

Source/type checks, reducer tests, server rendering, and archive checks do not prove visual quality. Inspect the running UI at narrow and wide widths, expand controls, open sheets, and check keyboard navigation before release. Keep screenshot evidence and remaining host checks in the milestone QA document.

## Wild auto attack and display controls

- No Study companion / Compact view toolbar. Settings > Display owns the session-scoped Compact view control.
- Auto attack is explicitly started for one wild encounter. It chooses the strongest effective legal move and checks the maximum critical damage before each turn. Equality with wild HP stops the loop. Catch always remains a user action.
- Turns are spaced by 900ms and serialized through the synced save lock. Cancel on Stop, manual battle actions, leaving Play, hidden document, changed encounter/lead, save failure, or unmount. A 100-turn cap prevents an unbounded loop. No persistent auto-attack save field.
- Automated verification: 95 tests pass, including six auto-attack safety cases and existing save compatibility checks. These checks do not establish animation quality or native-host end-to-end acceptance.
