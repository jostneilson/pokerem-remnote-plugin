# Plugin scopes and privacy (pre-submit notes)

## Current declaration

[`public/manifest.json`](../public/manifest.json) includes:

```json
"requiredScopes": [
  { "type": "All", "level": "Read" }
]
```

This matches the **default broad read** scope pattern used by many RemNote plugins that only need to react to the review queue and read plugin settings — but the exact semantics are defined by **RemNote’s plugin manifest schema** for your target app version.

## Rationale (reviewer-facing draft)

PokéRem:

- Reads **plugin-owned synced storage** for game save data (`pokerem_game_v1` and related keys).
- Reads **plugin settings** registered under `pokerem.*` (encounter pacing, feature toggles, and similar).
- Listens to **queue / review lifecycle** events exposed by the SDK to advance encounters and trainer progress when cards are completed.
- Does not ship a separate remote backend; game state stays in the user’s knowledge base / RemNote sync.

**Before final marketplace submission:** re-check RemNote’s current documentation for whether a narrower scope is available and sufficient for:

- `plugin.storage.getSynced` / `setSynced`
- `plugin.settings.getSetting` / `registerStringSetting`
- `AppEvents.QueueCompleteCard` (or equivalent) and sidebar widget mounting

If RemNote adds finer-grained scopes that cover only these surfaces, consider tightening `requiredScopes` to improve user trust — after regression testing.

## User-facing communication

The in-app **Settings** screen already explains battle controls, pacing, data export, and full reset. For the marketplace listing, add one line that save data lives in **synced plugin storage** for this knowledge base (not sent to a PokéRem server).
