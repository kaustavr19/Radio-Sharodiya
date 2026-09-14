"""Create responsive AVIF/WebP derivatives from the preserved station masters."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = PROJECT_ROOT / "assets" / "source" / "media-masters"
OUTPUT_ROOT = PROJECT_ROOT / "public" / "assets" / "optimized"
REPORTS = PROJECT_ROOT / "reports"

SOURCES = [
    {"slug": "golper-asor-night", "source": "golper-asor-night.png", "focus": (0.30, 0.55)},
    {"slug": "pujo-vibes-autumn", "source": "pujo-vibes-autumn.png", "focus": (0.70, 0.55)},
    {"slug": "afternoon-city", "source": "pujo-scenes/afternoon-city.png", "focus": (0.67, 0.54)},
    {"slug": "dashami-riverside", "source": "pujo-scenes/dashami-riverside.png", "focus": (0.78, 0.55)},
    {"slug": "dawn-lane", "source": "pujo-scenes/dawn-lane.png", "focus": (0.62, 0.56)},
    {"slug": "durga-dashami-pandal", "source": "pujo-scenes/durga-dashami-pandal.png", "focus": (0.72, 0.54), "avifQuality": 44, "webpQuality": 60},
    {"slug": "durga-grand-night", "source": "pujo-scenes/durga-grand-night.png", "focus": (0.70, 0.53), "avifQuality": 44, "webpQuality": 60},
    {"slug": "durga-modern-pandal", "source": "pujo-scenes/durga-modern-pandal-v2.png", "focus": (0.69, 0.54), "avifQuality": 44, "webpQuality": 60},
    {"slug": "durga-neighbourhood-pandal", "source": "pujo-scenes/durga-neighbourhood-pandal.png", "focus": (0.72, 0.55), "avifQuality": 44, "webpQuality": 60},
    {"slug": "durga-predawn", "source": "pujo-scenes/durga-predawn.png", "focus": (0.72, 0.53), "avifQuality": 44, "webpQuality": 60},
    {"slug": "durga-retro-pandal", "source": "pujo-scenes/durga-retro-pandal-v2.png", "focus": (0.70, 0.54), "avifQuality": 44, "webpQuality": 60},
    {"slug": "golden-rooftop", "source": "pujo-scenes/golden-rooftop.png", "focus": (0.68, 0.58)},
    {"slug": "late-night-tea", "source": "pujo-scenes/late-night-tea.png", "focus": (0.72, 0.56)},
    {"slug": "mahalaya-chandipath", "source": "pujo-scenes/mahalaya-chandipath.png", "focus": (0.66, 0.58)},
    {"slug": "mahalaya-radio", "source": "pujo-scenes/mahalaya-radio.png", "focus": (0.65, 0.56)},
    {"slug": "mahalaya-rooftop", "source": "pujo-scenes/mahalaya-rooftop.png", "focus": (0.76, 0.58)},
    {"slug": "mahalaya-window", "source": "pujo-scenes/mahalaya-window.png", "focus": (0.68, 0.57)},
    {"slug": "morning-pandal", "source": "pujo-scenes/morning-pandal.png", "focus": (0.70, 0.56)},
    {"slug": "night-art-pandal", "source": "pujo-scenes/night-art-pandal.png", "focus": (0.72, 0.55)},
    {"slug": "night-light-gates", "source": "pujo-scenes/night-light-gates.png", "focus": (0.56, 0.57)},
]

VARIANTS = {
    "mobile": (768, 1024),
    "tablet": (1024, 768),
    "desktop": (1536, 1024),
}


def master_path(item: dict) -> Path:
    return MASTER_ROOT / item["source"]


def derivative_path(slug: str, variant: str, extension: str) -> Path:
    return OUTPUT_ROOT / slug / f"{slug}-{variant}.{extension}"


def crop_variant(image: Image.Image, size: tuple[int, int], focus: tuple[float, float]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=focus)


def build_variants() -> dict:
    report = {"sources": [], "totals": {"sourceBytes": 0, "avifBytes": 0, "webpBytes": 0}}
    for item in SOURCES:
        source = master_path(item)
        if not source.exists():
            raise FileNotFoundError(f"Missing media master: {source}")
        source_bytes = source.stat().st_size
        source_image = Image.open(source).convert("RGB")
        entry = {"slug": item["slug"], "sourceBytes": source_bytes, "variants": {}}
        report["totals"]["sourceBytes"] += source_bytes

        for variant, size in VARIANTS.items():
            output_image = crop_variant(source_image, size, item["focus"])
            avif_path = derivative_path(item["slug"], variant, "avif")
            webp_path = derivative_path(item["slug"], variant, "webp")
            avif_path.parent.mkdir(parents=True, exist_ok=True)
            output_image.save(avif_path, "AVIF", quality=item.get("avifQuality", 56), speed=6)
            output_image.save(webp_path, "WEBP", quality=item.get("webpQuality", 78), method=6)
            avif_bytes = avif_path.stat().st_size
            webp_bytes = webp_path.stat().st_size
            entry["variants"][variant] = {
                "width": size[0],
                "height": size[1],
                "avifBytes": avif_bytes,
                "webpBytes": webp_bytes,
            }
            report["totals"]["avifBytes"] += avif_bytes
            report["totals"]["webpBytes"] += webp_bytes
        report["sources"].append(entry)

    REPORTS.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS / "media-variant-report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def build_contact_sheet(kind: str) -> Path:
    columns = 3
    cell_width, image_height, label_height = 300, 400, 42
    rows = (len(SOURCES) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * (image_height + label_height)), "#101513")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=15)

    for index, item in enumerate(SOURCES):
        source = derivative_path(item["slug"], "mobile", "webp") if kind == "mobile" else master_path(item)
        image = Image.open(source).convert("RGB")
        thumbnail = ImageOps.fit(image, (cell_width, image_height), method=Image.Resampling.LANCZOS)
        x = (index % columns) * cell_width
        y = (index // columns) * (image_height + label_height)
        sheet.paste(thumbnail, (x, y))
        draw.text((x + 10, y + image_height + 10), item["slug"], fill="#fff5dc", font=font)

    REPORTS.mkdir(parents=True, exist_ok=True)
    output = REPORTS / f"scene-{kind}-contact-sheet.jpg"
    sheet.save(output, "JPEG", quality=88, optimize=True)
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contact-sheet", choices=["masters", "mobile"])
    parser.add_argument("--build", action="store_true")
    arguments = parser.parse_args()

    if arguments.build:
        report = build_variants()
        print(json.dumps(report["totals"], indent=2))
    if arguments.contact_sheet:
        print(build_contact_sheet(arguments.contact_sheet))
    if not arguments.build and not arguments.contact_sheet:
        parser.error("Choose --build and/or --contact-sheet.")


if __name__ == "__main__":
    main()
