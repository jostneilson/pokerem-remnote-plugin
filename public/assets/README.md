# `public/assets/` — ship these with the plugin

PokéRem expects PNG assets here so they are copied into `dist/` when you run `npm run build`.

**Full inventory:** see [`docs/ASSETS.md`](../../docs/ASSETS.md) in the repository (paths, filenames, and code references).

**Quick checklist**

1. `items/` — all bag/shop icons listed in `docs/ASSETS.md`
2. `types/` — lowercase `{type}.png` for each Pokémon type
3. `battle_scenes/team_aqua/` — all `bg_*.png` backgrounds from `battleAmbience.ts`
4. `battle_effects/team_aqua/small_ember.png`

Until these exist, the plugin UI may show broken images for items, types, or battle backgrounds even if the game logic runs.
