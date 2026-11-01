# PokéRem 1.4.1 release handoff

Patch for 1.4.0, which could not save at all inside RemNote. Upload `Release 1.4.1.zip` (identical to `PluginZip.zip`) to the RemNote marketplace.

Save data: 1.4.0's failed writes never reached storage, so 1.3.x and 1.4.0 saves are intact. The first successful write migrates to schema 5 and keeps the old save at `pokerem_game_v1_pre_v5`.

Status: uploaded to RemNote by the owner, who confirmed it works there. Before that, testing used `tools/hostsim`, which applies RemNote's sandbox flags with a stand-in for the SDK.

See `docs/HANDOVER_1.4.1.md` for the technical hand-off.
