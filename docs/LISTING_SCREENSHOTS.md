# Marketplace image refresh — captures bundled

The old README used relative `docs/screenshots` URLs. Webpack copied the README but not `docs/`, so those images were absent from the release assets. The rewritten overview uses absolute, version-specific RemNote asset URLs and expects the images in `public/assets/screenshots/`, which webpack already copies.

The old images remain in `docs/screenshots/` for reference. They are not presented as updated 1.2.0 screenshots. The previous README was preserved in `docs/README-before-listing-refresh.md`.

## Capture actual 1.2.0 screens

Run `npm run preview:qa` if the preview is not already running. Open each link in your browser, allow sprites to load, and capture only the 400px sidebar. These are actual UI components with a separate demo save, not live RemNote data.

| Image file in `public/assets/screenshots/` | Capture link |
|---|---|
| study-companion.jpg | http://127.0.0.1:8081/?capture=1&screen=status |
| trainer-battle.jpg | http://127.0.0.1:8081/?capture=1&screen=trainer |
| xp-doublers.jpg | http://127.0.0.1:8081/?capture=1&screen=bag |
| progress.jpg | http://127.0.0.1:8081/?capture=1&screen=progress |
| collection.jpg | http://127.0.0.1:8081/?capture=1&screen=dex |

If using PNG screenshots, keep `.png` filenames and update matching README URLs rather than renaming PNG bytes to JPG. Images can also be attached in chat for placement and checking.

## Required checks before upload

- `npm run listing:check` rejects missing images and mismatched host/version links. It is part of `npm run build`, so a release cannot silently ship broken image references.
- Visually inspect every new image; trainer combat and the booster queue must match the described features.
- Run `npm run release`, then independently verify that every referenced image exists in the zip under the exact `assets/screenshots/` path.
- After uploading, open the public listing and confirm every image renders there. Local files and zip checks cannot establish public CDN availability or marketplace rendering before publication.

Current state: all five images were cropped from Jost's supplied October 7 screenshots and visually inspected. Only plugin content is included. The XP image highlights the HUD counter; it does not claim to show the queued booster controls. Public rendering remains to be checked after upload; browser automation is blocked by the required security-policy check.
