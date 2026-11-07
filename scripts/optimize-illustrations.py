"""Create delivery variants; preserve original PNG artwork and its provenance."""

from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
for source in sorted((root / "apps/web/public/illustrations").glob("*.png")):
    with Image.open(source) as original:
        image = original.convert("RGB")
        for target in (480, 960, 1440):
            width = min(target, image.width)
            resized = image.resize(
                (width, round(image.height * width / image.width)), Image.Resampling.LANCZOS
            )
            output = source.with_name(f"{source.stem}-{target}.webp")
            resized.save(output, "WEBP", quality=85, method=6)
            print(f"{output.relative_to(root)}: {output.stat().st_size:,} bytes")
