"""Run with Python + Pillow to regenerate WebP assets from preserved originals."""
import hashlib
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
source_files = list((ROOT / "src").rglob("*.tsx")) + list((ROOT / "src").rglob("*.ts"))
replacements = {}
report = []


def encode(source, limit):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        output = BytesIO()
        image.save(output, "WEBP", quality=84, method=6)
        data = output.getvalue()
        report.append({"source": source.relative_to(ROOT).as_posix(),
                       "before": source.stat().st_size, "after": len(data),
                       "width": image.width, "height": image.height})
        return data


# Include existing WebP imports so rerunning also regenerates their derivatives.
for file in source_files:
    content = file.read_text(encoding="utf-8")
    for binding, asset in re.findall(r"import\s+(\w+)\s+from\s+['\"]@/assets/([^'\"]+)['\"]", content):
        if len(re.findall(r"\b" + re.escape(binding) + r"\b", content)) < 2:
            continue
        path = ROOT / "src/assets" / asset
        if path.suffix.lower() == ".webp":
            path = next((path.with_suffix(ext) for ext in [".png", ".jpg", ".jpeg"]
                         if path.with_suffix(ext).exists()), path)
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg"} or path.stat().st_size < 25000:
            continue
        replacements["@/assets/" + path.relative_to(ROOT / "src/assets").as_posix()] = path

for asset, path in replacements.items():
    limit = 256 if path.parent.name == "muscles" else 512 if path.stem == "npc-guide" else 768 if path.stem == "mochila" else 1024
    data = encode(path, limit)
    if len(data) >= path.stat().st_size:
        continue
    path.with_suffix(".webp").write_bytes(data)
    for file in source_files:
        content = file.read_text(encoding="utf-8")
        updated = content.replace(asset + "'", str(Path(asset).with_suffix(".webp")).replace("\\", "/") + "'")
        updated = updated.replace(asset + '"', str(Path(asset).with_suffix(".webp")).replace("\\", "/") + '"')
        if updated != content:
            file.write_text(updated, encoding="utf-8", newline="\n")

# Preserve old public URLs for existing clients and records, and map them to
# immutable, content-versioned URLs in the current app without database edits.
manifest = {}
public = ROOT / "public"
paths = [public / "mochila.png"] + sorted((public / "images").rglob("*"))
target = public / "images/optimized"
target.mkdir(parents=True, exist_ok=True)
for path in paths:
    if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
        continue
    data = encode(path, 768)
    name = f"{path.stem}-{hashlib.sha256(data).hexdigest()[:12]}.webp"
    (target / name).write_bytes(data)
    manifest["/" + path.relative_to(public).as_posix()] = "/images/optimized/" + name
(ROOT / "src/lib/localImageManifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
(ROOT / "tmp").mkdir(exist_ok=True)
(ROOT / "tmp/image-optimization-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
before, after = sum(r["before"] for r in report), sum(r["after"] for r in report)
print(f"{len(report)} images: {before:,} -> {after:,} bytes ({100 * (1 - after / before):.1f}% smaller)")
