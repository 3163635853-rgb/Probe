from __future__ import annotations

import math
from pathlib import Path
from typing import Mapping

import qrcode
from PIL import Image, ImageDraw, ImageFont

from config import settings


CANVAS_SIZE = (1080, 1440)
ACCENT = "#D97706"
INK = "#1C1917"
MUTED = "#78716C"
PAPER = "#FAFAF9"
CARD = "#FFFFFF"
GRID = "#E7E5E4"


def _font_path() -> str | None:
    candidates = [
        settings.SHARE_FONT_PATH,
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
        r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
    ]
    return next((path for path in candidates if path and Path(path).exists()), None)


def _font(size: int):
    path = _font_path()
    return ImageFont.truetype(path, size) if path else ImageFont.load_default(size=size)


def _rounded_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int = 36):
    draw.rounded_rectangle(box, radius=radius, fill=CARD, outline=GRID, width=2)


def _dimension_items(report: Mapping[str, object] | None) -> list[tuple[str, float]]:
    raw = (report or {}).get("dimensions", {})
    if not isinstance(raw, Mapping):
        return []
    items: list[tuple[str, float]] = []
    for name, value in raw.items():
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        items.append((str(name), max(0.0, min(10.0, number))))
    return items[:6]


def render_share_image(
    *,
    output_path: Path,
    score: int,
    position: str,
    mode: str,
    dimensions: Mapping[str, object] | None,
    callback_url: str,
    template: str,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", CANVAS_SIZE, PAPER)
    draw = ImageDraw.Draw(image)

    # Warm editorial background.
    draw.ellipse((-220, -280, 660, 600), fill="#FEF3C7")
    draw.ellipse((720, 1080, 1320, 1680), fill="#CCFBF1")
    draw.text((72, 72), "PROBE / AI INTERVIEW", font=_font(26), fill=ACCENT)
    draw.text((72, 126), "面试能力诊断", font=_font(62), fill=INK)
    draw.text((72, 210), f"{position} · {mode}", font=_font(30), fill=MUTED)

    _rounded_card(draw, (60, 292, 1020, 1148), 44)
    draw.text((104, 340), "综合得分", font=_font(30), fill=MUTED)
    draw.text((100, 382), str(max(0, min(100, score))), font=_font(150), fill=INK)
    draw.text((365, 486), "/ 100", font=_font(36), fill=ACCENT)

    items = _dimension_items(dimensions)
    if len(items) >= 3:
        center = (704, 570)
        radius = 215
        count = len(items)
        for ring in range(1, 6):
            points = []
            for index in range(count):
                angle = -math.pi / 2 + index * 2 * math.pi / count
                r = radius * ring / 5
                points.append((center[0] + math.cos(angle) * r, center[1] + math.sin(angle) * r))
            draw.polygon(points, outline=GRID)
        value_points = []
        for index, (name, value) in enumerate(items):
            angle = -math.pi / 2 + index * 2 * math.pi / count
            x = center[0] + math.cos(angle) * radius
            y = center[1] + math.sin(angle) * radius
            draw.line((center[0], center[1], x, y), fill=GRID, width=2)
            value_radius = radius * value / 10
            value_points.append(
                (center[0] + math.cos(angle) * value_radius, center[1] + math.sin(angle) * value_radius)
            )
            label_x = center[0] + math.cos(angle) * (radius + 54)
            label_y = center[1] + math.sin(angle) * (radius + 42)
            draw.text((label_x, label_y), name, font=_font(22), fill=MUTED, anchor="mm")
        draw.polygon(value_points, fill="#F59E0B66", outline=ACCENT)

        y = 830
        for index, (name, value) in enumerate(items):
            column = index % 2
            row = index // 2
            x = 104 + column * 430
            item_y = y + row * 82
            draw.text((x, item_y), name, font=_font(25), fill=MUTED)
            draw.text((x + 315, item_y), f"{value:g}", font=_font(28), fill=INK)
    else:
        draw.text((104, 680), "完成更多轮次后，将生成五维能力雷达图", font=_font(30), fill=MUTED)

    qr = qrcode.make(callback_url).convert("RGB").resize((210, 210))
    image.paste(qr, (72, 1192))
    draw.text((320, 1226), "扫码开启一次真实的 AI 模拟面试", font=_font(30), fill=INK)
    draw.text((320, 1282), "实时追问 · 即时评分 · 精准复盘", font=_font(24), fill=MUTED)
    draw.text((320, 1340), f"probe.app  /  {template}", font=_font(22), fill=ACCENT)

    image.save(output_path, "PNG", optimize=True)
