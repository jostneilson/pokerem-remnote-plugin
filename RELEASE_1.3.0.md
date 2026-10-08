# PokéRem 1.3.0 release handoff

Upload `PluginZip.zip` (or its identical `PokeRem-1.3.0.zip` copy) using RemNote Settings > Plugins > Build > Upload plugin. Do not unpack the archive. GitHub publication does not itself submit the update to RemNote.

## Listing images

The README uses ordinary Markdown image syntax with direct HTTPS PNG responses from the public GitHub repository. Each URL is pinned to the full screenshot commit SHA. The cropped screenshots contain no notes or flashcards. Both the README and image files are included in the ZIP.

The earlier deployed RemNote image URLs returned HTTP 403. Absolute GitHub raw image URLs avoid both that inaccessible host and relative paths in the marketplace renderer. `npm run listing:check:remote` checks successful public HTTP responses, image content types, and exact byte equality with the bundled files. Actual rendering inside RemNote must still be confirmed after the ZIP is uploaded and the listing refreshes.

Sources consulted:
- https://plugins.remnote.com/advanced/submitting_plugins (public source repository, build ZIP, upload from Build tab)
- https://plugins.remnote.com/advanced/assets (public assets and runtime rootURL handling; README cannot interpolate runtime rootURL)
- https://docs.github.com/en/rest/repos/contents (direct raw download URLs)

## Verification boundaries

95 automated tests cover gameplay, save compatibility, rendering structure, and auto-attack safety. Release checks cover version alignment, types, tests, manifest validation, listing assets, and production build. ZIP inspection checks manifest 1.3.0, README/image equality, all eight entrypoint bundles with embedded fonts, and absence of loose CSS.

Native static screenshots provided by Jost were inspected and cropped. Auto-attack live interaction, animation timing, and post-upload marketplace image rendering have not been independently verified. No current flashcards were changed or graded by the agent.
