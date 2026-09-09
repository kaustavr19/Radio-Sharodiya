from pathlib import Path
from urllib.parse import urlencode

from reportlab.graphics.barcode import qr
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "assets" / "station"
UPI_ID = "kaustavr25@okhdfcbank"


def generate_qr(amount: int) -> None:
    query = urlencode(
        {
            "pa": UPI_ID,
            "pn": "Kaustav Roy",
            "am": f"{amount:.2f}",
            "cu": "INR",
            "tn": "Radio Sharodiya Pujo charity contribution",
        }
    )
    widget = qr.QrCodeWidget(f"upi://pay?{query}")
    widget.qr.make()
    modules = widget.qr.modules
    module_count = widget.qr.getModuleCount()
    quiet_zone = 4
    module_size = 8
    image_size = (module_count + (quiet_zone * 2)) * module_size
    image = Image.new("1", (image_size, image_size), 1)
    draw = ImageDraw.Draw(image)
    for row, module_row in enumerate(modules):
        for column, is_dark in enumerate(module_row):
            if not is_dark:
                continue
            x0 = (column + quiet_zone) * module_size
            y0 = (row + quiet_zone) * module_size
            draw.rectangle((x0, y0, x0 + module_size - 1, y0 + module_size - 1), fill=0)
    image.save(OUTPUT_DIR / f"donation-{amount}.png", optimize=True)


if __name__ == "__main__":
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for fixed_amount in (10, 20):
        generate_qr(fixed_amount)
