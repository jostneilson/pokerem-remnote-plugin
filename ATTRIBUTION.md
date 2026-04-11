# Attribution and third-party content

PokéRem is an **unofficial fan project**. It is not affiliated with, endorsed by, or sponsored by Nintendo, The Pokémon Company, or Game Freak. Pokémon and related marks are trademarks of their respective owners.

---

## Runtime / CDN (not vendored in this repo)

### PokéAPI — Pokémon sprites

Party and wild Pokémon **front/back sprites** are loaded at runtime from the public sprite tree published by the [PokeAPI](https://pokeapi.co/) project:

- Base URL pattern: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/...`

See [`src/game/sprites.ts`](src/game/sprites.ts).

- **License:** PokeAPI and its sprite data are widely used under open terms; confirm the current license at [https://github.com/PokeAPI/sprites](https://github.com/PokeAPI/sprites) and [https://pokeapi.co/docs#fairuse](https://pokeapi.co/docs#fairuse) before marketplace publication.
- **Attribution:** Credit **PokeAPI** in marketplace copy and in-repo credits; party/wild sprites are not bundled in `public/`.

### Google Fonts — typography

UI fonts are loaded via CSS `@import` from Google Fonts:

- **Exo 2** — tooltips, settings prose, long copy ([`src/style.css`](src/style.css)).
- **Press Start 2P** — pixel UI / titles ([`src/style.css`](src/style.css)).

- **License:** [SIL Open Font License](https://scripts.sil.org/OFL) (verify on [Google Fonts](https://fonts.google.com/) for each family).

---

## Bundled raster assets (`public/assets/`)

Item icons, type orbs, battle backgrounds, and small battle effects are **intended** to ship from `public/assets/` (see [`docs/ASSETS.md`](docs/ASSETS.md)).

Battle background filenames follow the **Team Aqua–style** field art set used in development (referenced in code comments, e.g. [`battleAmbience.ts`](src/game/engine/battleAmbience.ts)). **Before you publish** a public GitHub repo or marketplace zip, confirm the **exact pack and license** for every PNG you ship: retain and ship any required `LICENSE` / `NOTICE` files next to the art, and add a one-line provenance row here (pack name, URL, SPDX or plain-language license).

**Runtime note:** Item and type art in this repo are expected to be original or properly licensed pixel work suitable for redistribution with the MIT-licensed plugin code. Do not substitute unknown “ripped” tiles without clearing rights first.

---

## RemNote platform

- Built with [@remnote/plugin-sdk](https://www.npmjs.com/package/@remnote/plugin-sdk) (see `package.json` for the pinned version).
- RemNote is a trademark of its respective owner; this plugin is an independent add-on.

---

## Updating this file

Before each public release, verify:

1. All CDN URLs and licenses above are still accurate.
2. Any new bundled art or audio is listed with source and license.
3. Fan-project disclaimer remains visible in the marketplace listing and README where appropriate.
