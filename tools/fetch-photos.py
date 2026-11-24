#!/usr/bin/env python3
"""按 tools/photo-manifest.json 重新生成 assets/img/ 里的全部照片，并生成雾气贴图。

每张照片的清单项都记着来源（Unsplash 图片 id 与图片页）、作者（页脚署名用）、裁切尺寸与焦点、调色强度。
下载原图后统一做一遍低饱和、暖调、抬黑的电影调色，再转成 WebP。清单里每张都是 Unsplash 上的免费图片
（Unsplash License，可商用、无需授权），只作氛围示意，并非民宿实景。

用法：
    python3 tools/fetch-photos.py                 重新生成清单里的全部照片
    python3 tools/fetch-photos.py hero-sunny-dawn 只重新生成某几张
    SG_IMG_CACHE=/某个目录 python3 tools/fetch-photos.py   指定原图缓存位置（默认 ~/.cache/shangu-liusu）
依赖：pip install pillow
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
MANIFEST = ROOT / "tools" / "photo-manifest.json"
CACHE = Path(os.environ.get("SG_IMG_CACHE", Path.home() / ".cache" / "shangu-liusu"))


def grade(im, k):
    """低饱和、暖调、抬黑的电影调色；k 是强度，夜景只调一点，免得黑位发灰。"""
    im = im.convert("RGB")
    im = Image.blend(im, ImageOps.grayscale(im).convert("RGB"), .18 * k)
    luts = []
    for mul, lift in ((1.028, .012), (1.0, .010), (.952, .016)):
        luts.append([max(0, min(255, round((((v / 255) ** 1.06) * (1 - lift) + lift) * mul * 255))) for v in range(256)])
    r, g, b = im.split()
    im = Image.merge("RGB", (r.point(luts[0]), g.point(luts[1]), b.point(luts[2])))
    return ImageEnhance.Contrast(im).enhance(1 + .05 * k)


def cover(im, w, h, f):
    """裁成 w×h；焦点 (x, y) 取 0–1。h 为空表示只按宽度缩放，保持原比例。"""
    if not h:
        return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = min(max(round(im.width * f[0] - w / 2), 0), im.width - w)
    y = min(max(round(im.height * f[1] - h / 2), 0), im.height - h)
    return im.crop((x, y, x + w, y + h))


def original(pid):
    CACHE.mkdir(parents=True, exist_ok=True)
    o = CACHE / f"{pid}.jpg"
    if not o.exists() or o.stat().st_size < 60000:
        url = f"https://images.unsplash.com/{pid}?w=2600&q=84&fm=jpg"
        if subprocess.run(["curl", "-sS", "-L", "-m", "180", "-o", str(o), url], capture_output=True).returncode:
            o.unlink(missing_ok=True)
            raise RuntimeError(f"下载失败：{url}")
    return Image.open(o).convert("RGB")


def work(item):
    im = grade(original(item["id"]), item["grade"])
    out = []
    for w, h in item["sizes"]:
        name = f"{item['file']}-{w}.webp" if len(item["sizes"]) > 1 else f"{item['file']}.webp"
        cover(im, w, h, item["focus"]).save(IMG / name, "WEBP", quality=70 if len(item["sizes"]) > 1 else 74, method=6)
        out.append((name, (IMG / name).stat().st_size))
    return item["file"], out


def make_mist():
    """雾气 / 蒸汽贴图：分形噪声，压扁拉长成云缕；用"错半位 + 渐变过渡"拼成左右无缝的贴图。"""
    W, H = 400, 560
    octs = [(1, 1), (2, .62), (4, .38), (8, .23), (16, .13), (32, .07)]
    tot = sum(w for _, w in octs)
    acc = Image.new("L", (W, H), 0)
    for cells, w in octs:
        o = Image.effect_noise((max(1, cells), max(2, round(cells * 2.4))), 70).resize((W, H), Image.BICUBIC).point(lambda v, w=w / tot: int(v * w))
        acc = ImageChops.add(acc, o)
    alpha = ImageOps.autocontrast(acc, cutoff=1).point(lambda v: int(255 * max(0, min(1, (v - 108) / 104)) ** 1.7))
    rolled = Image.new("L", (W, H))
    rolled.paste(alpha.crop((W // 2, 0, W, H)), (0, 0))
    rolled.paste(alpha.crop((0, 0, W // 2, H)), (W // 2, 0))
    tri = Image.new("L", (W, 1))                                   # 边缘用错位后的那张（边缘连续），中间用原图
    for x in range(W):
        tri.putpixel((x, 0), round(255 * min(1, abs(x - W / 2) / (W / 2)) ** .75))
    alpha = Image.composite(rolled, alpha, tri.resize((W, H))).resize((W * 4, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    white = Image.new("L", alpha.size, 255)
    out = Image.merge("RGBA", (white, white, white, alpha))
    out.save(IMG / "mist.webp", "WEBP", quality=82, method=6)
    return "mist.webp", (IMG / "mist.webp").stat().st_size


def main():
    only = set(sys.argv[1:])
    items = json.loads(MANIFEST.read_text(encoding="utf-8"))
    IMG.mkdir(parents=True, exist_ok=True)
    todo = [i for i in items if not only or i["file"] in only]
    if only and len(todo) != len(only):
        sys.exit("清单里没有：" + " ".join(sorted(only - {i["file"] for i in todo})))
    if not only or "mist" in only:
        n, kb = make_mist()
        print(n.ljust(18), f"{kb // 1024}k")
    total = 0
    with ThreadPoolExecutor(6) as ex:
        for name, outs in ex.map(work, todo):
            total += sum(kb for _, kb in outs)
            print(name.ljust(18), "  ".join(f"{n} {kb // 1024}k" for n, kb in outs))
    print(f"合计 {total // 1024} KB，{len(todo)} 项；原图缓存在 {CACHE}")


if __name__ == "__main__":
    main()
