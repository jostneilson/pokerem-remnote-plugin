# PokéRem (RemNote plugin)

**PokéRem** is a Pokémon-inspired study companion for [RemNote](https://www.remnote.com/). It ties flashcard reviews to light RPG loops: wild encounters, catching, party management, shop, type chart, achievements, and trainer progression.

**Important:** This is an **unofficial fan project**. It is not affiliated with Nintendo, The Pokémon Company, or Game Freak. See [`ATTRIBUTION.md`](ATTRIBUTION.md) and the [`public/manifest.json`](public/manifest.json) description.

**Git root:** Treat **this directory** (`remnote-plugin/`) as the repository root when you `git init` / connect GitHub. A parent folder may contain unrelated local assets; they are not part of this plugin tree.

---

## Using PokéRem (players)

1. Open the **PokéRem** tab in RemNote’s **right sidebar** while reviewing.
2. Complete the **starter** and **study difficulty** prompts once per knowledge base.
3. Review cards as usual — you earn coins, trainer XP, and progress toward wild Pokémon.
4. When a wild appears, use **Catch**, **Fight**, or **Run** in the sidebar battle UI. You can also run the same actions from the **RemNote command palette** or the **review queue menu** (when RemNote exposes it) without clicking the plugin first.
5. Optional: enable the **queue toolbar strip** or **floating encounter popup** under **RemNote → Settings → Plugins → PokéRem** (see in-plugin **Settings** for a readable summary).

**Save data** lives in RemNote’s **synced plugin storage** for this knowledge base (`pokerem_game_v1`). Use **Settings → Export save as JSON** before risky experiments. **Restart all progress** wipes only game storage, not RemNote plugin toggles.

**Troubleshooting:** Open the **Settings** (gear) tab inside PokéRem for workflow tips, data backup, and the expandable help section. For sprites and fonts, see [`ATTRIBUTION.md`](ATTRIBUTION.md).

---

## Repository layout

| Path | Role |
|------|------|
| [`src/widgets/`](src/widgets/) | Plugin entrypoints: main index, sidebar, queue strip, encounter popup |
| [`src/game/`](src/game/) | Rules, save state, pipeline, encounters, combat |
| [`src/ui/`](src/ui/) | React screens and battle HUD |
| [`public/`](public/) | **Shipped as-is** into `dist/` — manifest, data, and **`public/assets/`** raster art |
| [`docs/`](docs/) | Release prep, asset inventory, versioning, checklist |
| [`DESIGN_CONTRACT.md`](DESIGN_CONTRACT.md) | Visual / typography contract for contributors |

---

## Development

### Prerequisites

- **Node.js 18+** (see `package.json` `engines`)
- npm

### Commands

```bash
npm install
npm run dev          # webpack dev server (widget sandbox)
npm run check-types  # TypeScript
npm test             # Vitest
npm run build        # validate + production bundle + PluginZip.zip
```

Pinned **`@remnote/plugin-sdk`** version is intentional; see the architecture comment in [`src/widgets/index.tsx`](src/widgets/index.tsx).

### Bundled assets

Battle backgrounds, item icons, and type orbs must live under **`public/assets/`** so production builds are complete. See **[`docs/ASSETS.md`](docs/ASSETS.md)** and [`public/assets/README.md`](public/assets/README.md).

Party Pokémon **sprites** load from the **PokeAPI** CDN at runtime when online (not stored in `public/`).

---

## Release and versioning

- **Version source of truth:** [`public/manifest.json`](public/manifest.json) — keep in sync with [`package.json`](package.json) and [`src/releaseMeta.ts`](src/releaseMeta.ts) per [`docs/VERSIONING.md`](docs/VERSIONING.md).
- **Changelog:** [`CHANGELOG.md`](CHANGELOG.md).
- **Pre-submit / update QA:** [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).
- **Scopes / privacy draft:** [`docs/SCOPE_AND_PRIVACY.md`](docs/SCOPE_AND_PRIVACY.md).
- **Credits:** [`ATTRIBUTION.md`](ATTRIBUTION.md).

### Ship to RemNote (summary)

1. Run `npm run check-types`, `npm test`, and `npm run build`.
2. Upload the generated **`PluginZip.zip`** from the repo root (produced beside `dist/` after a successful build) through RemNote’s plugin developer flow.
3. Replace **`repoUrl`** in [`public/manifest.json`](public/manifest.json) if your public GitHub URL differs from the placeholder.
4. Confirm **`public/assets/`** is complete per [`docs/ASSETS.md`](docs/ASSETS.md) and licenses are documented in [`ATTRIBUTION.md`](ATTRIBUTION.md).
5. Walk [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) manually before each submission.

---

## License

See [`LICENSE`](LICENSE) (MIT unless changed). Third-party and fan-work notices are in [`ATTRIBUTION.md`](ATTRIBUTION.md).
