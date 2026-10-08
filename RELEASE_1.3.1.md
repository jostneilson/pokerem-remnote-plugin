# PokéRem 1.3.1 release handoff

This patch supersedes the 1.3.0 upload package; the published 1.3.0 GitHub tag remains unchanged. Upload PokeRem-1.3.1.zip in RemNote Settings > Plugins > Build > Upload plugin.

Stone evolution: Party > select a Pokémon > Stone evolution > choose a compatible stone > Confirm evolution. The Bag points to this path. Finish the encounter first, revive fainted Pokémon, and avoid Everstone. Nine stone types appear in daily Shop deals or route finds. Evolution retains identity, nickname, XP, and shiny status.

Revives: always stocked for 200 coins, now part of common route finds and every biome's battle scraps. Fainted parties with fewer than two Revives receive additional need bias. Drops remain one Revive at a time.

Shinies: regular Medium wild odds are 1/1,000 before enabled wild Pokédex completion and 1/200 after. Odds scale with the actual configured encounter interval and every-second-review pacing; half as many encounters doubles the chance per encounter. Actual front/back shiny sprites replace hue filters across battle, Party, storage, Status, queue strip, and encounter popup. Missing back sprites try the corresponding shiny front sprite, never substitute a normal-color Pokémon. A finite star reveal/catch celebration respects reduced motion.

The listing retains the four verified, immutable public screenshot URLs from 1.3.0 and adds the new feature descriptions. Confirm image rendering after marketplace upload. Native celebration timing and live stone interactions were not independently exercised; automated reducer/rendering/save tests cover behavior.
