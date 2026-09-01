from __future__ import annotations

from pathlib import Path
from random import Random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


WIDTH = 1200
HEIGHT = 630
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "og.png"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default(size=size)


def centered(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, face: ImageFont.ImageFont, fill: str) -> None:
    box = draw.textbbox((0, 0), text, font=face)
    draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1] - (box[3] - box[1]) / 2), text, font=face, fill=fill)


def rounded_shadow(canvas: Image.Image, box: tuple[int, int, int, int], radius: int, offset: tuple[int, int], fill: str) -> None:
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    shifted = tuple(value + offset[index % 2] for index, value in enumerate(box))
    sd.rounded_rectangle(shifted, radius=radius, fill=fill)
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))


def ticket(canvas: Image.Image, xy: tuple[int, int], title: str, year: str, angle: float) -> None:
    card = Image.new("RGBA", (246, 116), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((4, 4, 238, 106), radius=12, fill="#f7efce", outline="#112b35", width=4)
    d.line((50, 8, 50, 102), fill="#de4f45", width=3)
    for y in range(15, 101, 14):
        d.ellipse((44, y, 56, y + 6), fill="#0d5f68")
    d.text((68, 18), title, font=font(24, True), fill="#142c38")
    d.text((68, 58), year, font=font(20, True), fill="#de4f45")
    d.text((188, 63), "->", font=font(24, True), fill="#0b7781")
    tilted = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    x, y = xy
    shadow = Image.new("RGBA", tilted.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((12, 14, tilted.width - 2, tilted.height - 2), radius=14, fill=(0, 0, 0, 115))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6)), (x + 10, y + 14))
    canvas.alpha_composite(tilted, (x, y))


def director_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, count: str) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle((x1 + 9, y1 + 10, x2 + 9, y2 + 10), radius=14, fill="#092b30")
    draw.rounded_rectangle(box, radius=14, fill="#e49b24", outline="#ffe29d", width=4)
    draw.rectangle((x1 + 10, y1 + 12, x2 - 10, y1 + 48), fill="#172f3a")
    centered(draw, ((x1 + x2) // 2, y1 + 28), label, font(20, True), "#fff2c9")
    draw.line((x1 + 18, y1 + 61, x2 - 18, y1 + 61), fill="#9f561e", width=3)
    draw.line((x1 + 18, y1 + 80, x2 - 28, y1 + 80), fill="#c6771d", width=4)
    draw.line((x1 + 18, y1 + 98, x2 - 42, y1 + 98), fill="#c6771d", width=4)
    centered(draw, ((x1 + x2) // 2, y2 - 16), count, font(18, True), "#17313b")


def main() -> None:
    rng = Random(19)
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#0b1117")
    pixels = canvas.load()
    for y in range(HEIGHT):
        blend = y / HEIGHT
        for x in range(WIDTH):
            glow = max(0.0, 1.0 - (((x - 600) / 760) ** 2 + ((y - 290) / 500) ** 2))
            pixels[x, y] = (
                int(7 + 8 * glow),
                int(14 + 17 * glow + 3 * blend),
                int(24 + 31 * glow),
                255,
            )

    draw = ImageDraw.Draw(canvas)
    for _ in range(90):
        x = rng.randrange(WIDTH)
        y = rng.randrange(HEIGHT)
        draw.point((x, y), fill=(86, 131, 143, rng.randrange(25, 70)))

    # A compact, code-native 90s television cabinet.
    rounded_shadow(canvas, (48, 30, 1152, 594), 48, (0, 20), "#000000cc")
    draw.rounded_rectangle((48, 30, 1152, 594), radius=48, fill="#30383a", outline="#566266", width=5)
    draw.rounded_rectangle((67, 48, 1133, 575), radius=39, fill="#181f22", outline="#0a0f11", width=8)
    draw.rounded_rectangle((85, 64, 1115, 117), radius=15, fill="#11191c", outline="#607074", width=3)
    draw.rounded_rectangle((206, 73, 914, 111), radius=8, fill="#a75b17", outline="#f4b53d", width=3)
    centered(draw, (560, 92), "THE DIRECTOR GAME", font(34, True), "#fff2ca")
    draw.text((956, 76), "CHANNEL 09", font=font(17, True), fill="#66e3df")
    draw.text((957, 96), "LIVE RUN", font=font(14, True), fill="#ef6559")

    screen_box = (86, 130, 902, 522)
    screen = Image.new("RGBA", (screen_box[2] - screen_box[0], screen_box[3] - screen_box[1]), "#0b6262")
    sp = screen.load()
    sw, sh = screen.size
    for y in range(sh):
        for x in range(sw):
            glow = max(0.0, 1.0 - (((x - sw / 2) / (sw * 0.7)) ** 2 + ((y - sh / 2) / (sh * 0.72)) ** 2))
            sp[x, y] = (8 + int(5 * glow), 74 + int(47 * glow), 76 + int(44 * glow), 255)
    screen_draw = ImageDraw.Draw(screen)
    for x in range(-80, sw + 80, 78):
        screen_draw.line((x, 0, x + 180, sh), fill=(34, 154, 143, 36), width=20)
    canvas.alpha_composite(screen, screen_box[:2])
    draw.rounded_rectangle(screen_box, radius=56, outline="#647478", width=8)
    draw.rounded_rectangle((96, 140, 892, 512), radius=48, outline="#092e32", width=3)

    director_card(draw, (153, 198, 347, 328), "RIDLEY SCOTT", "2 / 3")
    director_card(draw, (642, 198, 836, 328), "S. KUBRICK", "1 / 3")
    ticket(canvas, (348, 164), "ALIEN", "1979", -5)
    ticket(canvas, (408, 316), "THE SHINING", "1980", 3)
    ticket(canvas, (181, 340), "GLADIATOR", "2000", -2)
    ticket(canvas, (594, 341), "2001", "1968", 5)

    # Hardware HUD on the right bezel.
    draw.rounded_rectangle((926, 137, 1105, 378), radius=20, fill="#11191c", outline="#4b595c", width=4)
    draw.text((950, 157), "RUN SCORE", font=font(17, True), fill="#8ca2a4")
    draw.text((948, 182), "02400", font=font(36, True), fill="#fff0b2")
    draw.line((946, 231, 1084, 231), fill="#39484c", width=3)
    draw.text((950, 247), "DIRECTORS", font=font(15, True), fill="#8ca2a4")
    draw.text((950, 270), "03 / 09", font=font(30, True), fill="#66e3df")
    draw.text((950, 317), "COINS", font=font(15, True), fill="#8ca2a4")
    draw.text((950, 339), "+ 12", font=font(27, True), fill="#f4b53d")
    draw.ellipse((949, 409, 1019, 479), fill="#151d20", outline="#667579", width=5)
    draw.ellipse((966, 426, 1002, 462), fill="#e65b45", outline="#ff9e7a", width=4)
    draw.ellipse((1030, 409, 1100, 479), fill="#151d20", outline="#667579", width=5)
    draw.ellipse((1046, 425, 1084, 463), fill="#e0a12d", outline="#ffda70", width=4)
    centered(draw, (984, 497), "SOUND", font(13, True), "#77898c")
    centered(draw, (1065, 497), "CRT FX", font(13, True), "#77898c")

    draw.rounded_rectangle((222, 535, 902, 570), radius=8, fill="#0a1216", outline="#364449", width=2)
    centered(draw, (562, 551), "MATCH THE MOVIE. NAME THE VISION.", font(22, True), "#66e3df")
    for x in range(245, 890, 18):
        draw.rectangle((x, 577, x + 9, 581), fill="#101719")
    draw.rounded_rectangle((77, 588, 264, 607), radius=5, fill="#20292c")
    draw.rounded_rectangle((935, 588, 1122, 607), radius=5, fill="#20292c")

    # Soft glass bloom, subtle curvature shading, and scanlines.
    bloom = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(bloom)
    bd.ellipse((210, 124, 787, 420), fill=(107, 255, 230, 20))
    canvas.alpha_composite(bloom.filter(ImageFilter.GaussianBlur(42)))
    draw = ImageDraw.Draw(canvas)
    for y in range(134, 520, 4):
        draw.line((92, y, 896, y), fill=(0, 12, 18, 42), width=1)
    glass = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(glass).arc((91, 135, 897, 738), 198, 342, fill=(255, 255, 255, 34), width=3)
    canvas.alpha_composite(glass)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
