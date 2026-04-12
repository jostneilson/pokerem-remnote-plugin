/**
 * Display version shown in-app (Settings → About) and **right-sidebar tab icon** cache-bust query (`widgetTabIcon` → `assets/items/poke-ball.png` in `src/widgets/index.tsx`).
 * Keep in sync with `public/manifest.json` and `package.json` — see `docs/VERSIONING.md`.
 */
export const POKEREM_VERSION = '1.1.2';

/**
 * Shown in-app (Settings → About, sidebar footer). Must match `author` in `public/manifest.json`
 * — RemNote’s plugin details / marketplace listing read the manifest, not bundled JS.
 */
export const POKEREM_AUTHOR = 'Jost Neilson';
