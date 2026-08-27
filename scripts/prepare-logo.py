from pathlib import Path
from PIL import Image

SOURCE = Path("/home/ubuntu/upload/file_000000009e44820ab93175aaafd27167.png")
OUTPUT = Path("/home/ubuntu/alameer-pro-mobile/assets/images")

if not SOURCE.exists():
    raise SystemExit(f"الشعار المرفوع غير موجود: {SOURCE}")

original = Image.open(SOURCE).convert("RGBA")

def on_white(size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), "white")
    copy = original.copy()
    copy.thumbnail((size, size), Image.Resampling.LANCZOS)
    offset = ((size - copy.width) // 2, (size - copy.height) // 2)
    canvas.paste(copy, offset, copy)
    return canvas

(OUTPUT / "user-logo-source.png").write_bytes(SOURCE.read_bytes())
for filename, size in {
    "icon.png": 1024,
    "splash-icon.png": 1024,
    "favicon.png": 512,
    "android-icon-foreground.png": 1024,
}.items():
    on_white(size).save(OUTPUT / filename, "PNG", optimize=True)
