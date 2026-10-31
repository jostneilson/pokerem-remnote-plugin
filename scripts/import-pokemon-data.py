#!/usr/bin/env python3
"""Generate PokéRem's offline canonical battle data from a pinned PokéAPI CSV checkout.

Usage:
  python3 scripts/import-pokemon-data.py /path/to/pokeapi/data/v2/csv

The script intentionally keeps PokéRem's existing 1-905 roster, display names, and
legacy encounter tiers while replacing canonical facts and level-up learnsets.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


POKEAPI_COMMIT = "6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce"
MAX_DEX = 905
ULTRA_BEASTS = {793, 794, 795, 796, 797, 798, 799, 803, 804, 805, 806}
TYPE_NAMES = {
    "normal": "Normal", "fire": "Fire", "water": "Water", "grass": "Grass",
    "electric": "Electric", "ice": "Ice", "fighting": "Fighting",
    "poison": "Poison", "ground": "Ground", "flying": "Flying",
    "psychic": "Psychic", "bug": "Bug", "rock": "Rock", "ghost": "Ghost",
    "dragon": "Dragon", "dark": "Dark", "steel": "Steel", "fairy": "Fairy",
}


def rows(csv_dir: Path, name: str) -> list[dict[str, str]]:
    with (csv_dir / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def nullable_int(value: str) -> int | None:
    return int(value) if value not in ("", None) else None


def ts(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def move_id(identifier: str) -> str:
    # Preserve the established PokéRem save format (e.g. thunder-shock -> thundershock).
    return re.sub(r"[^a-z0-9]", "", identifier.lower())


def read_legacy_roster(path: Path) -> dict[int, tuple[str, str]]:
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{ dexNum: (\d+), name: (?P<name>'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"), .*? "
        r"tier: (?P<tier>'[^']+'|\"[^\"]+\")",
    )
    result: dict[int, tuple[str, str]] = {}
    for match in pattern.finditer(text):
        dex, raw_name, raw_tier = match.group(1), match.group("name"), match.group("tier")
        if raw_name.startswith('"'):
            name = json.loads(raw_name)
        else:
            name = raw_name[1:-1].replace("\\'", "'")
        result[int(dex)] = (name, raw_tier[1:-1])
    if len(result) != MAX_DEX:
        raise RuntimeError(f"Expected {MAX_DEX} legacy roster entries, found {len(result)}")
    return result


def generate(csv_dir: Path, repo: Path) -> None:
    data_dir = repo / "src/game/data"
    legacy = read_legacy_roster(data_dir / "pokedex.ts")

    types = {int(r["id"]): r["identifier"] for r in rows(csv_dir, "types.csv")}
    stats = {int(r["id"]): r["identifier"] for r in rows(csv_dir, "stats.csv")}
    targets = {int(r["id"]): r["identifier"] for r in rows(csv_dir, "move_targets.csv")}
    damage_classes = {
        int(r["id"]): r["identifier"] for r in rows(csv_dir, "move_damage_classes.csv")
    }
    ailments = {
        int(r["id"]): r["identifier"] for r in rows(csv_dir, "move_meta_ailments.csv")
    }
    meta_categories = {
        int(r["id"]): r["identifier"].replace("damage-ailment", "damage+ailment")
        .replace("damage-lower", "damage+lower")
        .replace("damage-raise", "damage+raise")
        .replace("damage-heal", "damage+heal")
        for r in rows(csv_dir, "move_meta_categories.csv")
    }

    species_rows = {
        int(r["id"]): r for r in rows(csv_dir, "pokemon_species.csv") if int(r["id"]) <= MAX_DEX
    }
    default_pokemon: dict[int, int] = {}
    for r in rows(csv_dir, "pokemon.csv"):
        species_id = int(r["species_id"])
        if species_id <= MAX_DEX and r["is_default"] == "1":
            default_pokemon[species_id] = int(r["id"])

    pokemon_types: dict[int, list[tuple[int, str]]] = defaultdict(list)
    for r in rows(csv_dir, "pokemon_types.csv"):
        type_name = TYPE_NAMES.get(types[int(r["type_id"])])
        if type_name:
            pokemon_types[int(r["pokemon_id"])].append((int(r["slot"]), type_name))

    pokemon_stats: dict[int, dict[str, int]] = defaultdict(dict)
    for r in rows(csv_dir, "pokemon_stats.csv"):
        stat_name = stats[int(r["stat_id"])]
        pokemon_stats[int(r["pokemon_id"])][stat_name] = int(r["base_stat"])

    species_out: list[dict[str, object]] = []
    for dex in range(1, MAX_DEX + 1):
        source = species_rows[dex]
        pokemon_id = default_pokemon[dex]
        base = pokemon_stats[pokemon_id]
        legacy_name, legacy_tier = legacy[dex]
        classification = (
            "ultra-beast" if dex in ULTRA_BEASTS else
            "mythical" if source["is_mythical"] == "1" else
            "legendary" if source["is_legendary"] == "1" else
            "ordinary"
        )
        species_out.append({
            "dexNum": dex,
            "name": legacy_name,
            "types": [name for _, name in sorted(pokemon_types[pokemon_id])],
            "baseHp": base["hp"],
            "baseAttack": base["attack"],
            "baseDefense": base["defense"],
            "baseSpecialAttack": base["special-attack"],
            "baseSpecialDefense": base["special-defense"],
            "baseSpeed": base["speed"],
            "baseCatchRate": int(source["capture_rate"]),
            "tier": legacy_tier,
            "classification": classification,
            "generation": int(source["generation_id"]),
        })

    header = (
        "// GENERATED by scripts/import-pokemon-data.py. Do not hand edit.\n"
        f"// PokéAPI commit: {POKEAPI_COMMIT}\n"
    )
    pokedex_lines = [
        header,
        "import type { PokemonType } from './species';\n\n",
        "export type LegacyEncounterTier = 'Common' | 'Baby' | 'Ultra' | 'Legendary' | 'Mythical';\n",
        "export type SpeciesClassification = 'ordinary' | 'legendary' | 'mythical' | 'ultra-beast';\n\n",
        "export interface FullSpeciesData {\n",
        "  dexNum: number;\n  name: string;\n  types: PokemonType[];\n  baseHp: number;\n",
        "  baseAttack?: number;\n  baseDefense?: number;\n  baseSpecialAttack?: number;\n",
        "  baseSpecialDefense?: number;\n  baseSpeed?: number;\n  baseCatchRate: number;\n",
        "  tier: LegacyEncounterTier;\n  classification: SpeciesClassification;\n  generation: number;\n}\n\n",
        "export const FULL_POKEDEX: FullSpeciesData[] = [\n",
    ]
    for item in species_out:
        pokedex_lines.append(
            "  { " + ", ".join([
                f"dexNum: {item['dexNum']}", f"name: {ts(item['name'])}",
                f"types: {ts(item['types'])} as PokemonType[]", f"baseHp: {item['baseHp']}",
                f"baseAttack: {item['baseAttack']}", f"baseDefense: {item['baseDefense']}",
                f"baseSpecialAttack: {item['baseSpecialAttack']}",
                f"baseSpecialDefense: {item['baseSpecialDefense']}", f"baseSpeed: {item['baseSpeed']}",
                f"baseCatchRate: {item['baseCatchRate']}", f"tier: {ts(item['tier'])}",
                f"classification: {ts(item['classification'])}", f"generation: {item['generation']}",
            ]) + " },\n"
        )
    pokedex_lines.extend([
        "];\n\n",
        "export const POKEDEX_BY_DEX = new Map(FULL_POKEDEX.map((s) => [s.dexNum, s]));\n\n",
        "export const STARTER_DEX_ALL = [\n",
        "  1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393,\n",
        "  495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816,\n",
        "] as const;\n",
    ])
    (data_dir / "pokedex.ts").write_text("".join(pokedex_lines), encoding="utf-8")

    move_names = {
        int(r["move_id"]): r["name"]
        for r in rows(csv_dir, "move_names.csv") if r["local_language_id"] == "9"
    }
    effect_prose = {
        int(r["move_effect_id"]): r["short_effect"].replace("\n", " ").strip()
        for r in rows(csv_dir, "move_effect_prose.csv") if r["local_language_id"] == "9"
    }
    meta = {int(r["move_id"]): r for r in rows(csv_dir, "move_meta.csv")}
    stat_changes: dict[int, list[dict[str, object]]] = defaultdict(list)
    for r in rows(csv_dir, "move_meta_stat_changes.csv"):
        stat_changes[int(r["move_id"])].append({
            "stat": stats[int(r["stat_id"])], "change": int(r["change"]),
        })

    moves_out: dict[str, dict[str, object]] = {}
    move_numeric_to_id: dict[int, str] = {}
    for r in rows(csv_dir, "moves.csv"):
        numeric_id = int(r["id"])
        type_name = TYPE_NAMES.get(types[int(r["type_id"])])
        category = damage_classes.get(int(r["damage_class_id"]))
        if not type_name or category not in {"physical", "special", "status"}:
            continue
        canonical_id = move_id(r["identifier"])
        if canonical_id in moves_out:
            raise RuntimeError(f"Normalized move ID collision: {canonical_id}")
        m = meta.get(numeric_id, {})
        effect_chance = nullable_int(r["effect_chance"])
        effect_id = nullable_int(r["effect_id"]) or 0
        description = effect_prose.get(effect_id, "")
        if effect_chance is not None:
            description = description.replace("$effect_chance", str(effect_chance))
        item = {
            "id": canonical_id, "name": move_names.get(numeric_id, r["identifier"]),
            "type": type_name, "power": nullable_int(r["power"]) or 0,
            "category": category, "accuracy": nullable_int(r["accuracy"]),
            "effectId": effect_id, "effectChance": effect_chance,
            "drain": int(m.get("drain") or 0), "healing": int(m.get("healing") or 0),
            "metaCategory": meta_categories.get(int(m.get("meta_category_id") or 0), "unique"),
            "ailment": ailments.get(int(m.get("meta_ailment_id") or 0), "none"),
            "ailmentChance": int(m.get("ailment_chance") or 0),
            "statChance": int(m.get("stat_chance") or 0),
            "flinchChance": int(m.get("flinch_chance") or 0),
            "critRate": int(m.get("crit_rate") or 0),
            "statChanges": stat_changes.get(numeric_id, []),
            "target": targets.get(nullable_int(r["target_id"]) or 0, "selected-pokemon"),
            "minTurns": nullable_int(m.get("min_turns", "")),
            "maxTurns": nullable_int(m.get("max_turns", "")),
            "minHits": nullable_int(m.get("min_hits", "")),
            "maxHits": nullable_int(m.get("max_hits", "")),
            "priority": int(r["priority"]), "description": description,
        }
        moves_out[canonical_id] = item
        move_numeric_to_id[numeric_id] = canonical_id

    move_lines = [
        header,
        "import type { PokemonType } from './species';\n\n",
        "export interface MoveStatChange { stat: string; change: number; }\n",
        "export interface MoveData {\n",
        "  id: string; name: string; type: PokemonType; power: number;\n",
        "  category: 'physical' | 'special' | 'status'; accuracy: number | null;\n",
        "  effectId: number; effectChance: number | null; drain: number; healing: number; metaCategory: string;\n",
        "  ailment: string; ailmentChance: number; statChance: number; flinchChance: number; critRate: number;\n",
        "  statChanges: MoveStatChange[]; target: string;\n",
        "  minTurns: number | null; maxTurns: number | null; minHits: number | null; maxHits: number | null;\n",
        "  priority: number; description: string;\n",
        "}\n\nexport const MOVES: Record<string, MoveData> = {\n",
    ]
    for canonical_id, item in sorted(moves_out.items()):
        move_lines.append(f"  {ts(canonical_id)}: {ts(item)},\n")
    move_lines.append("};\n")
    (data_dir / "moves.ts").write_text("".join(move_lines), encoding="utf-8")

    version_groups = {int(r["id"]): r for r in rows(csv_dir, "version_groups.csv")}
    version_by_name = {r["identifier"]: int(r["id"]) for r in version_groups.values()}
    sv_id = version_by_name["scarlet-violet"]
    swsh_id = version_by_name["sword-shield"]
    sv_order = int(version_groups[sv_id]["order"])

    candidates: dict[int, dict[int, list[tuple[int, int, int]]]] = defaultdict(lambda: defaultdict(list))
    pokemon_to_species = {pokemon_id: species_id for species_id, pokemon_id in default_pokemon.items()}
    for r in rows(csv_dir, "pokemon_moves.csv"):
        if r["pokemon_move_method_id"] != "1":
            continue
        pokemon_id = int(r["pokemon_id"])
        species_id = pokemon_to_species.get(pokemon_id)
        move = move_numeric_to_id.get(int(r["move_id"]))
        if species_id is None or move is None:
            continue
        candidates[species_id][int(r["version_group_id"])].append(
            (int(r["level"]), int(r["order"] or 0), int(r["move_id"]))
        )

    learnsets: dict[int, list[dict[str, object]]] = {}
    sources: dict[int, str] = {}
    for dex in range(1, MAX_DEX + 1):
        versions = candidates[dex]
        if sv_id in versions:
            selected = sv_id
        elif swsh_id in versions:
            selected = swsh_id
        else:
            earlier = [
                vg for vg in versions
                if int(version_groups[vg]["order"]) < sv_order
            ]
            selected = max(earlier, key=lambda vg: int(version_groups[vg]["order"])) if earlier else max(
                versions, key=lambda vg: int(version_groups[vg]["order"])
            )
        best: dict[str, tuple[int, int]] = {}
        for level, order, numeric_move in versions[selected]:
            canonical_id = move_numeric_to_id[numeric_move]
            previous = best.get(canonical_id)
            if previous is None or (level, order) < previous:
                best[canonical_id] = (level, order)
        ordered = sorted(best.items(), key=lambda item: (item[1][0], item[1][1], item[0]))
        learnsets[dex] = [{"level": level, "moveId": mid} for mid, (level, _) in ordered]
        sources[dex] = version_groups[selected]["identifier"]
        if not learnsets[dex]:
            raise RuntimeError(f"No level-up learnset for dex {dex}")

    learnset_lines = [
        header,
        "import type { LearnsetEntry } from './learnsetRules';\n\n",
        "export const LEARNSET_SOURCE_VERSION_GROUP: Record<number, string> = {\n",
    ]
    for dex in range(1, MAX_DEX + 1):
        learnset_lines.append(f"  {dex}: {ts(sources[dex])},\n")
    learnset_lines.append("};\n\nexport const LEARNSETS: Record<number, LearnsetEntry[]> = {\n")
    for dex in range(1, MAX_DEX + 1):
        learnset_lines.append(f"  {dex}: {ts(learnsets[dex])},\n")
    learnset_lines.append("};\n")
    (data_dir / "learnsets.ts").write_text("".join(learnset_lines), encoding="utf-8")

    print(f"Generated {len(species_out)} species, {len(moves_out)} moves, {len(learnsets)} learnsets")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: import-pokemon-data.py /path/to/pokeapi/data/v2/csv")
    repo = Path(__file__).resolve().parent.parent
    generate(Path(sys.argv[1]).resolve(), repo)


if __name__ == "__main__":
    main()
