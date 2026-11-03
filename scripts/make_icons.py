#!/usr/bin/env python3
"""Generate Hassala's app icons and brand artwork.

Development-only helper. The extension ships the generated PNGs, so users and
contributors never need Pillow to build or run Hassala.

Usage:
    python3 scripts/make_icons.py

Requires Pillow with FreeType/Raqm support for Arabic shaping.
"""

from __future__ import annotations

import os
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
ICONS_DIR = os.path.join(ROOT, "src", "icons")
ASSETS_DIR = os.path.join(ROOT, "assets")

DESIGN = 1024

CREAM = (255, 249, 236, 255)
CREAM_DARK = (246, 230, 200, 255)
CREAM_SHADE = (233, 210, 170, 255)
GOLD_LIGHT = (248, 215, 132, 255)
GOLD_DARK = (201, 148, 52, 255)
GOLD_RIM = (172, 122, 38, 255)
ENGRAVE = (116, 72, 16, 255)
TEAL_TOP = (20, 138, 126)
TEAL_BOTTOM = (9, 88, 80)
TEAL = (15, 118, 110, 255)
TEAL_DARK = (9, 74, 68, 255)
TERRA = (180, 83, 42, 255)

FONT_CANDIDATES = {
    "kufi": [
        "/usr/share/fonts/truetype/noto/NotoKufiArabic-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoKufiArabic-ExtraBold.ttf",
    ],
    "display": [
        "/usr/share/fonts/truetype/baloo-bhaijaan-2/BalooBhaijaan2-ExtraBold.ttf",
        "/usr/share/fonts/truetype/baloo-bhaijaan-2/BalooBhaijaan2-Bold.ttf",
    ],
}


def find_font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES[kind]:
        if os.path.isfile(path):
            return ImageFont.truetype(path, size)

    family = "Noto Kufi Arabic:bold" if kind == "kufi" else "Baloo Bhaijaan 2"
    match = shutil.which("fc-match")
    if match:
        try:
            result = subprocess.run(
                [match, "-f", "%{file}", family],
                check=True,
                capture_output=True,
                text=True,
            )
            path = result.stdout.strip()
            if os.path.isfile(path):
                return ImageFont.truetype(path, size)
        except (OSError, subprocess.CalledProcessError):
            pass

    raise SystemExit(f"Arabic font not found for {kind!r}")


def vertical_gradient(
    size: int, top: tuple[int, int, int], bottom: tuple[int, int, int]
) -> Image.Image:
    gradient = Image.new("RGBA", (1, size))
    pixels = gradient.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        pixels[0, y] = (
            round(top[0] + (bottom[0] - top[0]) * t),
            round(top[1] + (bottom[1] - top[1]) * t),
            round(top[2] + (bottom[2] - top[2]) * t),
            255,
        )
    return gradient.resize((size, size), Image.Resampling.NEAREST)


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=radius, fill=255
    )
    return mask


def gradient_rounded_rect(
    size: int,
    box: tuple[float, float, float, float],
    radius: float,
    top: tuple[int, int, int],
    bottom: tuple[int, int, int],
) -> tuple[Image.Image, tuple[int, int]]:
    x0, y0, x1, y1 = (int(value) for value in box)
    width, height = max(1, x1 - x0), max(1, y1 - y0)
    layer = vertical_gradient(height, top, bottom).resize(
        (width, height), Image.Resampling.BILINEAR
    )
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, width - 1, height - 1), radius=int(radius), fill=255
    )
    layer.putalpha(mask)
    return layer, (x0, y0)


def star(draw: ImageDraw.ImageDraw, cx: float, cy: float, size: float, fill) -> None:
    points = [
        (cx, cy - size),
        (cx + size * 0.26, cy - size * 0.26),
        (cx + size, cy),
        (cx + size * 0.26, cy + size * 0.26),
        (cx, cy + size),
        (cx - size * 0.26, cy + size * 0.26),
        (cx - size, cy),
        (cx - size * 0.26, cy - size * 0.26),
    ]
    draw.polygon(points, fill=fill)


def draw_icon(size: int) -> Image.Image:
    """Draw a word box: an open cream box holding Arabic and English word cards."""
    render = max(size * 4, 64)
    u = render / DESIGN

    def s(value: float) -> float:
        return value * u

    # Rounded teal tile.
    tile = vertical_gradient(render, TEAL_TOP, TEAL_BOTTOM).convert("RGBA")
    tile.putalpha(rounded_mask(render, int(s(220))))

    # Soft light from the top-left.
    glow = Image.new("RGBA", (render, render), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        (s(-180), s(-260), s(640), s(520)), fill=(255, 255, 255, 30)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(s(120)))
    tile = Image.alpha_composite(
        tile,
        Image.composite(
            glow,
            Image.new("RGBA", (render, render), (0, 0, 0, 0)),
            tile.getchannel("A"),
        ),
    )

    canvas = Image.new("RGBA", (render, render), (0, 0, 0, 0))

    # Ground shadow.
    shadow = Image.new("RGBA", (render, render), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse(
        (s(260), s(818), s(764), s(892)), fill=(0, 0, 0, 72)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(s(20)))
    canvas = Image.alpha_composite(canvas, shadow)

    def draw_card(
        cx: float,
        cy: float,
        width: float,
        height: float,
        angle: float,
        fill,
        outline,
        letter: str,
        letter_size: float,
        letter_fill,
    ) -> None:
        layer = Image.new("RGBA", (render, render), (0, 0, 0, 0))
        card_draw = ImageDraw.Draw(layer)
        card_draw.rounded_rectangle(
            (s(cx - width / 2), s(cy - height / 2),
             s(cx + width / 2), s(cy + height / 2)),
            radius=s(26),
            fill=fill,
        )
        card_draw.rounded_rectangle(
            (s(cx - width / 2), s(cy - height / 2),
             s(cx + width / 2), s(cy + height / 2)),
            radius=s(26),
            outline=outline,
            width=max(1, int(s(7))),
        )
        card_draw.text(
            (s(cx), s(cy - 10)),
            letter,
            font=find_font("display", max(10, int(s(letter_size)))),
            fill=letter_fill,
            anchor="mm",
            direction="rtl" if letter == "ح" else "ltr",
            language="ar" if letter == "ح" else "en",
        )
        layer = layer.rotate(angle, center=(s(cx), s(cy)), resample=Image.Resampling.BICUBIC)
        canvas.alpha_composite(layer)

    # Word cards rising out of the box.
    draw_card(448, 445, 150, 210, -9, TEAL, CREAM, "ح", 120, CREAM)
    draw_card(586, 433, 150, 210, 7, TERRA, CREAM_SHADE, "A", 105, CREAM)

    # Box body in front of the card bottoms.
    body, body_pos = gradient_rounded_rect(
        render, (s(300), s(520), s(724), s(840)), s(72), CREAM, CREAM_DARK
    )
    canvas.alpha_composite(body, body_pos)
    draw = ImageDraw.Draw(canvas)

    # Box rim.
    draw.rounded_rectangle(
        (s(300), s(520), s(724), s(582)), radius=s(34), fill=CREAM_DARK
    )

    # Brand badge on the front of the box.
    draw.rounded_rectangle(
        (s(402), s(692), s(622), s(768)), radius=s(30), fill=TEAL
    )
    star(draw, s(512), s(730), s(25), CREAM)

    # A small sparkle keeps the brand's magic.
    star(draw, s(792), s(236), s(34), (255, 249, 236, 225))
    star(draw, s(854), s(304), s(15), (255, 249, 236, 170))

    result = Image.alpha_composite(tile, canvas)
    if render != size:
        result = result.resize((size, size), Image.Resampling.LANCZOS)
    return result


def draw_toolbar_icon(size: int) -> Image.Image:
    """Draw a bold toolbar icon that stays readable at 16 px."""
    render = max(size * 8, 128)
    u = render / DESIGN

    def s(value: float) -> float:
        return value * u

    tile = vertical_gradient(render, TEAL_TOP, TEAL_BOTTOM).convert("RGBA")
    tile.putalpha(rounded_mask(render, int(s(220))))

    canvas = Image.new("RGBA", (render, render), (0, 0, 0, 0))
    canvas.alpha_composite(tile)
    draw = ImageDraw.Draw(canvas)

    # One large Arabic letter. At 16 px this is far clearer than the detailed
    # box-and-cards artwork used for the store and the extensions page.
    letter_size = 780 if size <= 16 else 720
    draw.text(
        (s(512), s(520)),
        "ح",
        font=find_font("display", max(10, int(s(letter_size)))),
        fill=CREAM,
        anchor="mm",
        direction="rtl",
        language="ar",
    )

    # A small gold sparkle adds brand recognition without adding noise.
    if size >= 24:
        star(draw, s(800), s(212), s(46), (255, 249, 236, 230))

    result = canvas
    if render != size:
        result = result.resize((size, size), Image.Resampling.LANCZOS)
    return result


def draw_social_preview() -> Image.Image:
    width, height = 1280, 640
    bg = vertical_gradient(height, (245, 233, 210), (234, 212, 171)).resize(
        (width, height), Image.Resampling.BILINEAR
    ).convert("RGBA")

    # Soft shadow under the floating app icon.
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (152, 168, 488, 504), radius=84, fill=(0, 0, 0, 58)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    bg = Image.alpha_composite(bg, shadow)

    icon = draw_icon(360)
    bg.alpha_composite(icon, (140, 140))

    draw = ImageDraw.Draw(bg)
    kufi = find_font("kufi", 164)
    display = find_font("display", 52)
    small = find_font("display", 36)
    tiny = find_font("display", 27)
    eyebrow = find_font("display", 24)

    right = 1180
    draw.text(
        (right, 88),
        "ARABIC WORD BANK",
        font=eyebrow,
        fill=(184, 134, 47, 255),
        anchor="rt",
    )
    draw.text(
        (right, 132),
        "حصالة",
        font=kufi,
        fill=(15, 118, 110, 255),
        anchor="rt",
        direction="rtl",
        language="ar",
    )
    draw.text(
        (right, 386),
        "كلماتك مش هتتوه… هتتحوش.",
        font=display,
        fill=(44, 33, 24, 255),
        anchor="rt",
        direction="rtl",
        language="ar",
    )
    draw.text(
        (right, 466),
        "مترجم وحافظ الكلمات",
        font=small,
        fill=(127, 107, 84, 255),
        anchor="rt",
        direction="rtl",
        language="ar",
    )
    draw.line((right - 420, 526, right, 526), fill=(211, 187, 146, 255), width=3)
    draw.text(
        (right, 552),
        "بنك كلماتك على جهازك",
        font=tiny,
        fill=(15, 118, 110, 255),
        anchor="rt",
        direction="rtl",
        language="ar",
    )

    return bg.convert("RGB")


def main() -> int:
    os.makedirs(ICONS_DIR, exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    draw_icon(DESIGN).save(os.path.join(ASSETS_DIR, "icon-1024.png"))

    for size in (16, 32, 48, 128):
        draw_icon(size).save(os.path.join(ICONS_DIR, f"icon{size}.png"))

    for size in (16, 32):
        draw_toolbar_icon(size).save(
            os.path.join(ICONS_DIR, f"toolbar{size}.png")
        )

    draw_social_preview().save(os.path.join(ASSETS_DIR, "social-preview.png"))

    print("Generated:")
    for name in ("icon-1024.png", "social-preview.png"):
        print(f"  assets/{name}")
    for size in (16, 32, 48, 128):
        print(f"  icons/icon{size}.png")
    for size in (16, 32):
        print(f"  icons/toolbar{size}.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
