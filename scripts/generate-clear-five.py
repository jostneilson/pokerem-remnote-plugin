"""Build PokéRem's Pixelify Sans derivative, changing only the digit five.

Run with Python + fonttools (4.63.0):
    uv run --with fonttools==4.63.0 python scripts/generate-clear-five.py
The committed TTF is used by normal builds; Python is not a build dependency.
"""

from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables.TupleVariation import TupleVariation

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "public/assets/fonts"
font = TTFont(FONT_DIR / "pixelify-sans.ttf", recalcTimestamp=False)

# Keep the original numeral's baseline, cap height, advance and pixel steps.
# A flat top bar and upright left stem make 5 distinct from S and 6.
# Matching point order lets the existing 400–700 weight axis interpolate.
regular = [
    (60, 631), (525, 631), (525, 530), (161, 530), (161, 361),
    (433, 361), (433, 270), (525, 270), (525, 78), (433, 78),
    (433, -12), (151, -12), (151, 78), (60, 78), (60, 179),
    (161, 179), (161, 88), (423, 88), (423, 260), (60, 260),
]
bold = [
    (61, 638), (542, 638), (542, 501), (188, 501), (188, 381),
    (453, 381), (453, 297), (542, 297), (542, 74), (453, 74),
    (453, -11), (149, -11), (149, 74), (61, 74), (61, 211),
    (188, 211), (188, 125), (414, 125), (414, 246), (61, 246),
]
pen = TTGlyphPen(None)
pen.moveTo(regular[0])
for point in regular[1:]:
    pen.lineTo(point)
pen.closePath()
glyph_name = font.getBestCmap()[ord("5")]
font["glyf"][glyph_name] = pen.glyph()
font["gvar"].variations[glyph_name] = [TupleVariation(
    {"wght": (0, 1, 1)},
    [(bx - x, by - y) for (x, y), (bx, by) in zip(regular, bold)]
    + [None, (17, 0), None, None],  # Original advance-width variation.
)]

# Give the derivative its own name; preserve copyright and OFL metadata.
for record in font["name"].names:
    value = record.toUnicode()
    if record.nameID != 0 and "Pixelify" in value:
        value = value.replace("Pixelify Sans", "PokeRem Pixel").replace("PixelifySans", "PokeRemPixel")
        record.string = value.encode(record.getEncoding())

font.save(FONT_DIR / "pokerem-pixel.ttf")

# Guard the narrow scope: no other glyph or metric may drift on regeneration.
source = TTFont(FONT_DIR / "pixelify-sans.ttf")
result = TTFont(FONT_DIR / "pokerem-pixel.ttf")
assert source.getBestCmap() == result.getBestCmap()
assert source["hmtx"].metrics == result["hmtx"].metrics
for name in source.getGlyphOrder():
    if name == glyph_name:
        continue
    assert source["glyf"][name].compile(source["glyf"]) == result["glyf"][name].compile(result["glyf"]), name
    assert source["gvar"].variations.get(name) == result["gvar"].variations.get(name), name
print("Generated PokeRem Pixel: original Pixelify Sans with a clearer 5.")
