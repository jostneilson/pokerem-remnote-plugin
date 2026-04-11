# Bundled assets (source of truth)

Webpack copies everything under [`public/`](../public/) into the plugin root at build time ([`webpack.config.js`](../webpack.config.js) `CopyPlugin`). Runtime URLs are built from RemNote’s `plugin.rootURL`, so shipped paths look like `{rootURL}assets/...`.

**Rule:** All raster art that ships with the plugin should live under `public/assets/` in this repository so a **clean clone + `npm run build`** produces a complete `dist/` without relying on uncommitted local files.

---

## Directory layout

| Path under `public/assets/` | Purpose |
|-----------------------------|---------|
| `items/` | Bag/shop icons (`*.png`) — filenames from [`src/game/data/items.ts`](../src/game/data/items.ts) `iconFile` |
| `types/` | Type chart / battle orbs: `{type}.png` lowercase (e.g. `fire.png`) — see [`src/ui/battle/typeSymbolUrl.ts`](../src/ui/battle/typeSymbolUrl.ts) |
| `battle_scenes/team_aqua/` | Full-screen battle backgrounds — filenames from [`src/game/engine/battleAmbience.ts`](../src/game/engine/battleAmbience.ts) `SCENES[]` |
| `battle_effects/team_aqua/` | Small HUD effects (e.g. [`BattleReviewSurface`](../src/ui/battle/BattleReviewSurface.tsx) `small_ember.png`) |
| `progress/` | Optional trainer badge art (`badge-{n}.png`) — reserved by [`badgeIconUrl`](../src/game/sprites.ts) (currently unused in UI) |

---

## Item icons (required)

From `ITEMS` in `items.ts` (unique `iconFile` values):

`poke-ball.png`, `great-ball.png`, `ultra-ball.png`, `potion.png`, `super-potion.png`, `max-potion.png`, `revive.png`, `oran-berry.png`, `rare-candy.png`, `fire-stone.png`, `water-stone.png`, `thunder-stone.png`, `leaf-stone.png`, `moon-stone.png`, `everstone.png`, `key.png` (Catch Scope).

Place each under `public/assets/items/`.

---

## Type orbs (required for type chart / battle)

One PNG per type, **lowercase** filename matching [`PokemonType`](../src/game/data/species.ts):

`normal.png`, `fire.png`, `water.png`, `grass.png`, `electric.png`, `ice.png`, `fighting.png`, `poison.png`, `ground.png`, `flying.png`, `psychic.png`, `bug.png`, `rock.png`, `ghost.png`, `dragon.png`, `dark.png`, `steel.png`, `fairy.png`.

Place under `public/assets/types/`.

---

## Battle scenes — Team Aqua pack (required)

[`battleSceneImageUrl`](../src/game/engine/battleAmbience.ts) resolves:

`assets/battle_scenes/team_aqua/<file>`

These **`file` values** appear in `SCENES` (deduplicated):

- `bg_forest.png`
- `bg_plain.png`
- `bg_mountain.png`
- `bg_cave.png`
- `bg_cave_scalding.png`
- `bg_cave_torma.png`
- `bg_snow.png`
- `bg_sand.png`
- `bg_pond.png`
- `bg_water.png`
- `bg_electric.png`
- `bg_misty.png`
- `bg_building.png`
- `bg_psychic.png`
- `bg_trick.png`
- `bg_spooky.png`

Place all under `public/assets/battle_scenes/team_aqua/`.

**Provenance:** Backgrounds are styled around the **Team Aqua–style** field pack used in development. Before a public GitHub or marketplace release, confirm your copy’s **license** matches how you redistribute (see [ATTRIBUTION.md](../ATTRIBUTION.md)).

---

## Battle effect sprite

- `public/assets/battle_effects/team_aqua/small_ember.png` — used in the battle HUD.

---

## Party / wild Pokémon sprites (not in `public/`)

[`frontSpriteUrl` / `backSpriteUrl`](../src/game/sprites.ts) load from **PokeAPI’s public sprite CDN** (`raw.githubusercontent.com/PokeAPI/sprites/...`). That is a **runtime network** dependency, not a bundled file. Documented in [ATTRIBUTION.md](../ATTRIBUTION.md).

---

## Legacy / unused helpers

- [`battleSceneUrl`](../src/game/sprites.ts) (`assets/battle_scenes/grass_pkmnbattlescene.png` etc.) — **not referenced** elsewhere in the codebase; rotation uses `team_aqua/` only.

---

## Verify after adding files

```bash
npm run build
# Inspect dist/assets/ — same tree should exist under dist/
```

If any path 404s in the RemNote sidebar, check that the file exists under `public/assets/...` and rebuild.
