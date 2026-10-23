"""Montage helper (system python with Pillow, not Blender): python sheet.py out.png cols tile img1.png img2.png ...
Labels each tile with its file stem. Used to compare previews at a glance."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

out, cols, tile = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tile, rows * tile), (237, 222, 194))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((tile, tile), Image.LANCZOS)
    x, y = (i % cols) * tile, (i // cols) * tile
    sheet.paste(im, (x, y))
    d.text((x + 8, y + 6), Path(f).stem, fill=(60, 40, 30))
sheet.save(out)
