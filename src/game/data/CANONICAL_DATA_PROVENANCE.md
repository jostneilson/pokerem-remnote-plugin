# Canonical Pokémon data provenance

PokéRem's offline species, move, and level-up learnset data is generated from the
PokéAPI database repository at commit
`6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce`.

Source: <https://github.com/PokeAPI/pokeapi/tree/6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce/data/v2/csv>

Generation command:

```sh
python3 scripts/import-pokemon-data.py /path/to/pokeapi/data/v2/csv
```

The importer keeps PokéRem's existing Gen 1-8 roster (National Dex 1-905), display
names, and legacy encounter tiers for save/gameplay compatibility. It imports
canonical types, six base stats, catch rates, generation, species classification,
move metadata, and species-specific level-up moves. Learnset selection prefers
Scarlet/Violet, then Sword/Shield, then the latest available earlier version group.
Level-0 evolution moves remain present as recallable unlocked moves.

Ultra Beast classification is applied to National Dex 793-799 and 803-806 because
PokéAPI's species flags distinguish Legendary and Mythical species but do not expose
an Ultra Beast flag.
