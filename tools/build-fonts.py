#!/usr/bin/env python3
"""按页面实际用字生成自托管字体子集。

用法：
    python3 tools/build-fonts.py <字体源文件目录>

源文件（都不入库，体积太大）需要事先下载，均为 SIL OFL 1.1 许可：
    ZCOOLXiaoWei-Regular.ttf   https://github.com/google/fonts/raw/main/ofl/zcoolxiaowei/ZCOOLXiaoWei-Regular.ttf
    NotoSerifSC-Regular.otf    https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf
    Marcellus-Regular.ttf      https://github.com/google/fonts/raw/main/ofl/marcellus/Marcellus-Regular.ttf
    SplineSansMono[wght].ttf   https://github.com/google/fonts/raw/main/ofl/splinesansmono/SplineSansMono%5Bwght%5D.ttf
依赖：pip install fonttools brotli
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"

# 除了源码里出现的字，这些标点和符号无论何时都该有
EXTRA = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "·×÷±−—…“”‘’「」『』《》〈〉（）)、，。：；？！【】→←↑↓°²³¥€£"
)


def harvest():
    """收集页面源码里所有非 ASCII 字符。"""
    chars = set(EXTRA)
    files = [ROOT / "index.html", *sorted((ROOT / "assets" / "js").glob("*.js")), *sorted((ROOT / "assets" / "css").glob("*.css"))]
    for f in files:
        chars |= {c for c in f.read_text(encoding="utf-8") if ord(c) > 0x7E}
    return "".join(sorted(chars)), [f.relative_to(ROOT) for f in files]


def rename(font, family, ps):
    """给子集换一个内部名称。原字体若声明了保留字体名称（Reserved Font Name），按 OFL 的要求，修改版不能再沿用。"""
    for rec in font["name"].names:
        if rec.nameID in (1, 4, 16):
            rec.string = family
        elif rec.nameID == 6:
            rec.string = ps
        elif rec.nameID == 3:
            rec.string = ps + ";subset"
    if "CFF " in font:
        font["CFF "].cff.fontNames[0] = ps


def build(src, name, text, out, weight, family, wght=None, latin_only=False, new_name=None):
    font = TTFont(src)
    if wght is not None:  # 可变字体先定到一个字重
        font = instancer.instantiateVariableFont(font, {"wght": wght})
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    if new_name:
        rename(font, new_name, new_name.replace(" ", "") + "-Regular")
    font.flavor = "woff2"
    font.save(OUT / out)
    have = set(TTFont(OUT / out).getBestCmap())
    want = {ord(c) for c in text if not latin_only or ord(c) < 0x250}
    missing = [chr(c) for c in sorted(want) if c not in have]
    note = "" if latin_only else f"  缺字 {len(missing)}" + ("".join(" " + m for m in missing) if missing else "")
    print(f"  {out:22s} {(OUT / out).stat().st_size / 1024:7.1f} KB  字形 {len(have):5d}{note}")
    return missing, f'@font-face{{font-family:"{family}";font-style:normal;font-weight:{weight};font-display:swap;src:url("{out}") format("woff2");}}\n'


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1]).expanduser()
    for f in ["ZCOOLXiaoWei-Regular.ttf", "NotoSerifSC-Regular.otf", "Marcellus-Regular.ttf", "SplineSansMono[wght].ttf"]:
        if not (src / f).exists():
            sys.exit(f"缺少源文件：{src / f}\n\n{__doc__}")
    OUT.mkdir(parents=True, exist_ok=True)
    text, files = harvest()
    print(f"从 {len(files)} 个文件收集到 {len(text)} 个字符（其中汉字 {sum(1 for c in text if 0x4E00 <= ord(c) <= 0x9FFF)} 个）")
    print("生成子集：")
    css = ["/* 由 tools/build-fonts.py 生成，请勿手改。来源与许可见同目录 LICENSE.md。 */\n"]
    # 正文只带常规字重：页面里的 500 字重会落到它上面，更粗的字号由浏览器合成，省下三分之一的字体体积
    miss_x, r = build(src / "ZCOOLXiaoWei-Regular.ttf", "xiaowei", text, "xiaowei.woff2", "400", "Xiaowei"); css.append(r)
    miss_a, r = build(src / "NotoSerifSC-Regular.otf", "noto", text, "noto-serif-400.woff2", "400", "Noto Serif SC"); css.append(r)
    latin = "".join(chr(c) for c in range(0x20, 0x250)) + "−…“”‘’·←→↑↓"
    # Marcellus 声明了保留字体名称，子集必须改名
    _, r = build(src / "Marcellus-Regular.ttf", "marcellus", latin, "marcellus.woff2", "400", "Marcellus Valley", latin_only=True, new_name="Marcellus Valley"); css.append(r)
    _, r = build(src / "SplineSansMono[wght].ttf", "spline", latin, "spline-mono.woff2", "400 600", "Spline Sans Mono", wght=420, latin_only=True); css.append(r)
    (OUT / "fonts.css").write_text("".join(css), encoding="utf-8")
    # 站酷小薇缺的字只要 Noto Serif SC 有，就会顺着字体回退链补上；两边都没有的才会落到系统字体
    if miss_a:
        print("注意：Noto Serif SC 没有这些字，将回退到系统字体：", " ".join(miss_a))
    both = [c for c in miss_x if c in miss_a]
    if both:
        print("注意：两款中文字体都没有的字：", " ".join(both))
    total = sum(p.stat().st_size for p in OUT.glob("*.woff2"))
    print(f"fonts.css 已写入，字体合计 {total / 1024:.0f} KB")


if __name__ == "__main__":
    main()
