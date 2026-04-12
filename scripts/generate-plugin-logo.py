#!/usr/bin/env python3
"""
Regenerate public/logo.png — classic red/white Poké Ball (same palette as public/logo.svg).
RemNote’s plugin card / listing UI often uses PNG; keep logo.svg for vector + validate.
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError as e:
    print("Install Pillow: pip install Pillow", file=sys.stderr)
    raise SystemExit(1) from e

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "logo.png"


def main() -> None:
    w = 256
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = w // 2
    r = int(w * 7 / 16)
    red = (220, 38, 38, 255)
    white = (248, 250, 252, 255)
    black = (15, 23, 42, 255)
    bbox = (cx - r, cy - r, cx + r, cy + r)
    # PIL: angles CCW from +x; y increases downward → 180°→360° is upper semicircle.
    d.pieslice(bbox, 180, 360, fill=red)
    d.pieslice(bbox, 0, 180, fill=white)
    band = max(2, int(round(w * 1.25 / 16)))
    d.line((cx - r, cy, cx + r, cy), fill=black, width=band)
    lw = max(2, int(round(w * 1.2 / 16)))
    d.ellipse(bbox, outline=black, width=lw)
    br = int(round(w * 2.35 / 16))
    d.ellipse((cx - br, cy - br, cx + br, cy + br), fill=white, outline=black, width=max(2, int(w / 16)))
    ir = max(2, int(round(w * 0.9 / 16)))
    d.ellipse((cx - ir, cy - ir, cx + ir, cy + ir), fill=black)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG")
    print(f"Wrote {OUT} ({w}x{w})")


if __name__ == "__main__":
    main()
