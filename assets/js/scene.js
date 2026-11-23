/* 山谷留宿 · 场景几何
 * 用固定随机种子生成山谷的层峦、树线、雾带、星点，以及木屋、汤池、石灯笼和前景冷杉。
 * 这里只决定"形状"：所有颜色都写成 CSS 变量，由 atmosphere.js 随天气与时刻改写，
 * 所以同一套几何可以在晴 / 雨 / 雪、晨 / 昼 / 暮 / 夜之间连续变化。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const X0 = -460, X1 = 2060; // 山体比可视区域更宽，窄屏裁切时不会露出边缘

  const RIDGES = {
    r5: { base: 700, seed: 11, amp: 7, tree: { gap: 7, h: [5, 10], dens: .92 },
      pts: [[X0, 470], [-100, 458], [120, 428], [300, 396], [430, 410], [560, 468], [672, 512], [760, 474], [880, 424], [1000, 404], [1120, 438], [1260, 470], [1400, 456], [1560, 500], [1780, 516], [X1, 520]] },
    r4: { base: 790, seed: 23, amp: 9, tree: { gap: 9, h: [9, 16], dens: .88 },
      pts: [[X0, 562], [-140, 526], [60, 502], [240, 548], [400, 590], [540, 604], [680, 592], [820, 550], [960, 520], [1120, 534], [1280, 508], [1440, 542], [1600, 562], [X1, 548]] },
    r3: { base: 960, seed: 37, amp: 11, tree: { gap: 12, h: [13, 22], dens: .82 },
      pts: [[X0, 650], [-160, 612], [40, 594], [230, 640], [400, 670], [560, 656], [700, 640], [860, 614], [1020, 588], [1180, 606], [1340, 576], [1520, 602], [1700, 622], [X1, 630]] },
    r2: { base: 1100, seed: 51, amp: 10, tree: { gap: 22, h: [20, 40], dens: .8, skip: x => x > 820 && x < 1240 },
      pts: [[X0, 748], [-160, 716], [80, 736], [260, 772], [440, 802], [600, 814], [720, 808], [820, 800], [960, 796], [1100, 798], [1220, 794], [1340, 772], [1480, 742], [1640, 716], [X1, 692]] },
    r1: { base: 2600, seed: 67, amp: 9,
      pts: [[X0, 906], [-120, 892], [140, 904], [380, 924], [600, 940], [800, 936], [1000, 928], [1200, 938], [1400, 930], [1600, 918], [X1, 912]] }
  };

  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function noise(seed, amp) { // 几个带随机相位的正弦叠加，得到起伏自然的一维噪声
    const r = rng(seed), waves = [];
    for (let i = 0; i < 4; i++) waves.push([r() * Math.PI * 2, 1 / (150 + r() * 520), amp * (0.55 - i * 0.11)]);
    return x => waves.reduce((s, w) => s + Math.sin(x * w[1] * Math.PI * 2 + w[0]) * w[2], 0);
  }
  const f = n => Math.round(n * 10) / 10 + '';
  const P = (x, y) => f(x) + ',' + f(y);

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // Catmull-Rom：把稀疏的控制点连成平滑山脊
  function crest(def) {
    const q = [def.pts[0], ...def.pts, def.pts[def.pts.length - 1]];
    const n2 = noise(def.seed, def.amp), out = [];
    for (let i = 1; i < q.length - 2; i++) {
      const p0 = q[i - 1], p1 = q[i], p2 = q[i + 1], p3 = q[i + 2];
      const n = Math.max(2, Math.ceil((p2[0] - p1[0]) / 5));
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([x, y + n2(x)]);
      }
    }
    out.push(def.pts[def.pts.length - 1]);
    const yAt = x => {
      if (x <= out[0][0]) return out[0][1];
      for (let i = 1; i < out.length; i++) if (out[i][0] >= x) {
        const a = out[i - 1], b = out[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1);
      }
      return out[out.length - 1][1];
    };
    return { pts: out, yAt, def };
  }
  const fillPath = (pts, bottom) => 'M' + pts.map(p => P(p[0], p[1])).join('L') + 'L' + P(pts[pts.length - 1][0], bottom) + 'L' + P(pts[0][0], bottom) + 'Z';

  function conifer(x, y, h, w, tiers) {
    if (!tiers) return 'M' + P(x, y - h) + 'L' + P(x + w, y) + 'L' + P(x - w, y) + 'Z';
    let left = '';
    let d = 'M' + P(x, y - h);
    for (let i = 1; i <= 3; i++) {
      const t = i / 3, ww = w * (0.3 + 0.7 * t), yy = y - h + h * t * 0.92, dh = h * 0.14;
      d += 'L' + P(x + ww, yy) + 'L' + P(x + ww * 0.42, yy - dh);
      left = 'L' + P(x - ww * 0.42, yy - dh) + 'L' + P(x - ww, yy) + left;
    }
    return d + 'L' + P(x + w * 0.6, y) + 'L' + P(x - w * 0.6, y) + left + 'Z';
  }
  function treeRow(c, opt, seed) {
    const r = rng(seed); let d = '', x = X0 - 30;
    while (x < X1 + 30) {
      x += opt.gap * (0.45 + r() * 1.1);
      if (r() > opt.dens || (opt.skip && opt.skip(x))) continue;
      const h = opt.h[0] + r() * (opt.h[1] - opt.h[0]);
      d += conifer(x, c.yAt(x) + 1.5, h, h * (0.3 + r() * 0.12), h > 8 ? 3 : 0);
    }
    return d;
  }
  // 大棵冷杉：多层枝干，可选枝上积雪
  function fir(x, y, h, w, n, r) {
    const tiers = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      tiers.push({ ww: w * (0.14 + 0.86 * Math.pow(t, 0.85)) * (0.92 + r() * 0.16), yy: y - h + h * (0.06 + 0.9 * t), dh: h * (0.035 + 0.03 * (1 - t)) });
    }
    let d = 'M' + P(x, y - h);
    tiers.forEach(o => { d += 'L' + P(x + o.ww, o.yy) + 'L' + P(x + o.ww * 0.4, o.yy - o.dh); });
    d += 'L' + P(x + w * 0.5, y) + 'L' + P(x - w * 0.5, y);
    tiers.slice().reverse().forEach(o => { d += 'L' + P(x - o.ww, o.yy) + 'L' + P(x - o.ww * 0.4, o.yy - o.dh); });
    let snow = '';
    const s = Math.max(2.2, h * 0.013);
    tiers.forEach(o => {
      snow += 'M' + P(x + o.ww * 0.4, o.yy - o.dh) + 'L' + P(x + o.ww + 1, o.yy) + 'L' + P(x + o.ww * 0.97, o.yy + s * 0.8) + 'L' + P(x + o.ww * 0.42, o.yy - o.dh + s) + 'Z';
      snow += 'M' + P(x - o.ww * 0.4, o.yy - o.dh) + 'L' + P(x - o.ww - 1, o.yy) + 'L' + P(x - o.ww * 0.97, o.yy + s * 0.8) + 'L' + P(x - o.ww * 0.42, o.yy - o.dh + s) + 'Z';
    });
    return { d: d + 'Z', snow };
  }

  // ---------- 远景：天空、星月、云、光线、飞鸟 ----------
  function sky() {
    const g = el('g');
    el('rect', { x: X0 - 800, y: -1500, width: X1 - X0 + 1600, height: 2300, fill: 'url(#skyGrad)' }, g);
    const stars = el('g', { class: 'stars' });
    const r = rng(113), groups = [el('g', { class: 'tw tw-a' }, stars), el('g', { class: 'tw tw-b' }, stars), el('g', { class: 'tw tw-c' }, stars)];
    for (let i = 0; i < 130; i++) {
      const x = X0 - 400 + r() * (X1 - X0 + 800), y = 520 - 1500 * Math.sqrt(r());
      el('circle', { cx: f(x), cy: f(y), r: f(0.7 + r() * r() * 1.9), opacity: f(0.45 + r() * 0.55) }, groups[i % 3]);
    }
    g.appendChild(stars);
    const moon = el('g', { class: 'moon' });
    el('circle', { cx: 1085, cy: 168, r: 170, fill: 'url(#moonHalo)' }, moon);
    el('circle', { cx: 1085, cy: 168, r: 27, fill: 'url(#moonCore)' }, moon);
    el('circle', { cx: 1076, cy: 160, r: 5, fill: '#b9c9e6', opacity: .35 }, moon);
    el('circle', { cx: 1094, cy: 178, r: 3.4, fill: '#b9c9e6', opacity: .3 }, moon);
    g.appendChild(moon);
    const clouds = el('g', { class: 'clouds' });
    const rc = rng(97);
    [[250, 352, 300, 9], [520, 300, 220, 6], [960, 268, 260, 7], [1230, 330, 330, 10], [760, 412, 380, 8], [1420, 410, 240, 7], [70, 432, 280, 8], [1560, 262, 180, 5], [1130, 440, 300, 6]].forEach(c => {
      el('ellipse', { cx: c[0], cy: c[1], rx: c[2], ry: c[3], class: 'cloud', style: `--o:${(0.28 + rc() * 0.3).toFixed(2)};--dur:${(90 + rc() * 70) | 0}s;--del:${(-rc() * 60) | 0}s` }, clouds);
      el('ellipse', { cx: c[0] + c[2] * 0.22, cy: c[1] - c[3] * 0.9, rx: c[2] * 0.5, ry: c[3] * 0.75, class: 'cloud', style: `--o:${(0.2 + rc() * 0.22).toFixed(2)};--dur:${(90 + rc() * 70) | 0}s;--del:${(-rc() * 60) | 0}s` }, clouds);
    });
    g.appendChild(clouds);
    const sun = el('g', { class: 'sun' });
    el('circle', { cx: 0, cy: 0, r: 250, fill: 'url(#sunHalo)' }, sun);
    const rays = el('g', { class: 'rays' });
    [96, 114, 133, 152, 171, 190, 209].forEach(a => {
      const L = 900, r1 = a * Math.PI / 180, r2 = r1 + 0.055;
      el('path', { d: 'M0,0L' + P(Math.cos(r1) * L, Math.sin(r1) * L) + 'L' + P(Math.cos(r2) * L, Math.sin(r2) * L) + 'Z' }, rays);
    });
    sun.appendChild(rays);
    el('circle', { cx: 0, cy: 0, r: 45, fill: 'url(#sunCore)' }, sun);
    g.appendChild(sun);
    const birds = el('g', { class: 'birds' });
    [[0, 268, 52], [1, 292, 47], [2, 250, 58]].forEach(b => {
      el('path', { d: 'M-7,0Q-3,-4.5 0,-0.5Q3,-4.5 7,0', class: 'bird', style: `--y:${b[1]}px;--dur:${b[2]}s;--del:${-b[0] * 17 - 4}s` }, birds);
    });
    g.appendChild(birds);
    return g;
  }

  // ---------- 山体 ----------
  const C = {};
  function ridge(name) {
    const c = C[name] || (C[name] = crest(RIDGES[name]));
    const g = el('g');
    el('path', { d: fillPath(c.pts, c.def.base), fill: `var(--${name})` }, g);
    if (c.def.tree) el('path', { d: treeRow(c, c.def.tree, c.def.seed * 7 + 3), fill: `var(--t${name.slice(1)})` }, g);
    return g;
  }
  // ---------- 雾带 ----------
  function fog(y, seed, n, spread) {
    const g = el('g', { class: 'fog' }), r = rng(seed);
    const band = el('g', { class: 'fog-band' });
    for (let i = 0; i < n; i++) {
      const x = X0 - 260 + (X1 - X0 + 520) * (i + r() * 0.9) / n;
      el('ellipse', { cx: f(x), cy: f(y + (r() - 0.5) * spread), rx: f(170 + r() * 260), ry: f(22 + r() * 46), fill: 'url(#fogPuff)' }, band);
    }
    g.appendChild(band);
    const band2 = band.cloneNode(true);
    band2.setAttribute('class', 'fog-band fog-band--b');
    g.appendChild(band2);
    return g;
  }

  // ---------- 中景：木屋、汤池、灯笼、屋旁的树 ----------
  function heroMid() {
    const g = el('g', { class: 'mid' }), c2 = C.r2 || (C.r2 = crest(RIDGES.r2));
    el('path', { d: 'M840,708L970,588L1100,708Z', fill: 'var(--roof)' }, g);
    el('path', { d: 'M866,698L970,604L1074,698Z', fill: 'var(--cabin)' }, g);
    el('path', { d: 'M866,698L970,604L970,698Z', fill: '#000', opacity: .12 }, g);
    el('path', { d: 'M836,712L970,586L1104,712', fill: 'none', stroke: 'var(--trim)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    el('rect', { x: 862, y: 692, width: 216, height: 108, fill: 'var(--cabin)' }, g);
    el('rect', { x: 862, y: 692, width: 216, height: 108, fill: 'url(#shadeV)' }, g);
    let planks = '';
    for (let y = 704; y < 800; y += 11) planks += `M862,${y}h216`;
    el('path', { d: planks, stroke: '#000', 'stroke-width': 1, opacity: .18 }, g);
    el('rect', { x: 1026, y: 572, width: 22, height: 74, fill: 'var(--trim)' }, g);
    el('rect', { x: 1020, y: 564, width: 34, height: 9, rx: 1.5, fill: 'var(--roof)' }, g);
    const win = (x, y, w, h) => {
      el('rect', { x, y, width: w, height: h, rx: 1.5, fill: 'var(--sky-2)', opacity: .5 }, g);
      el('rect', { x, y, width: w, height: h, rx: 1.5, fill: 'var(--lamp)', opacity: 'var(--lamp-o)' }, g);
      el('rect', { x, y, width: w, height: h, rx: 1.5, fill: 'url(#fireGlow)', class: 'fire' }, g);
      el('path', { d: `M${x + w / 2},${y}v${h}M${x},${y + h * 0.48}h${w}`, stroke: 'var(--trim)', 'stroke-width': 2.2 }, g);
      el('rect', { x: x - 3, y: y + h, width: w + 6, height: 3, fill: 'var(--trim)' }, g);
    };
    win(880, 714, 78, 60);
    win(1000, 724, 46, 44);
    el('rect', { x: 972, y: 730, width: 18, height: 70, rx: 1.5, fill: 'var(--trim)' }, g);
    el('circle', { cx: 981, cy: 722, r: 13, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .45)', class: 'halo' }, g);
    el('circle', { cx: 981, cy: 722, r: 2.6, fill: 'var(--lamp)', opacity: 'var(--lamp-o)' }, g);
    // 屋檐、烟囱和栏杆上的雪
    const snow = el('g', { class: 'snowcaps' });
    el('path', { d: 'M838,708L970,586L1102,708', fill: 'none', stroke: 'var(--snow)', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, snow);
    el('rect', { x: 1019, y: 560, width: 36, height: 5, rx: 2.5, fill: 'var(--snow)' }, snow);
    g.appendChild(snow);
    // 烟
    const smoke = el('g', { class: 'smoke' });
    for (let i = 0; i < 4; i++) el('ellipse', { cx: 1037, cy: 556, rx: 7, ry: 5, class: 'puff', style: `--dur:${9 + i}s;--del:${-i * 2.6}s;--dx:${(i % 2 ? 16 : 26)}px` }, smoke);
    g.appendChild(smoke);
    // 门廊
    el('rect', { x: 844, y: 800, width: 252, height: 7, fill: 'var(--trim)' }, g);
    el('rect', { x: 850, y: 807, width: 5, height: 11, fill: 'var(--trim)' }, g);
    el('rect', { x: 1085, y: 807, width: 5, height: 11, fill: 'var(--trim)' }, g);
    el('rect', { x: 844, y: 806, width: 252, height: 4, fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .9)' }, g);
    // 灯光落在地上
    el('ellipse', { cx: 919, cy: 818, rx: 76, ry: 10, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .26)' }, g);
    el('ellipse', { cx: 1024, cy: 818, rx: 44, ry: 8, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .22)' }, g);
    // 汤池
    const pool = el('g', { class: 'pool' });
    el('path', { d: 'M900,842C902,830 940,824 984,825C1034,826 1078,833 1080,845C1082,858 1038,868 986,868C938,868 898,858 900,842Z', fill: 'url(#waterGrad)' }, pool);
    for (let i = 0; i < 3; i++) el('ellipse', { cx: 960 + i * 34, cy: 846, rx: 16, ry: 3.4, class: 'ripple', style: `--dur:${6.5 + i * 1.3}s;--del:${-i * 2.1}s` }, pool);
    el('ellipse', { cx: 940, cy: 850, rx: 26, ry: 4, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .5)' }, pool);
    const rocks = ['M884,838C878,826 896,818 912,824C926,830 918,846 904,850C890,854 888,848 884,838Z', 'M1070,836C1084,828 1102,836 1098,850C1094,862 1070,862 1064,852C1060,846 1062,840 1070,836Z',
      'M930,864C936,856 956,858 958,866C960,874 936,876 930,864Z', 'M1016,868C1020,860 1042,860 1044,869C1046,877 1020,878 1016,868Z', 'M952,824C956,817 976,817 978,824C980,830 956,832 952,824Z'];
    rocks.forEach((d, i) => {
      el('path', { d, fill: 'var(--roof)' }, pool);
      const m = d.match(/M([\d.]+),([\d.]+)/);
      el('ellipse', { cx: +m[1] + [16, 15, 14, 14, 13][i], cy: +m[2] + [0, 2, -1, 0, -1][i], rx: [14, 13, 12, 12, 11][i], ry: [3.2, 3, 2.8, 2.8, 2.6][i], fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .92)' }, pool);
    });
    g.appendChild(pool);
    // 蒸汽
    const steam = el('g', { class: 'steam' }), rs = rng(167);
    for (let i = 0; i < 9; i++) {
      el('ellipse', { cx: f(918 + rs() * 134), cy: f(836 + rs() * 10), rx: f(22 + rs() * 18), ry: f(13 + rs() * 10), class: 'puff', style: `--dur:${(7 + rs() * 4).toFixed(1)}s;--del:${(-rs() * 11).toFixed(1)}s;--dx:${((rs() - 0.5) * 54) | 0}px;--rise:${(96 + rs() * 60) | 0}px` }, steam);
    }
    g.appendChild(steam);
    // 石灯笼
    const toro = el('g', { class: 'toro' });
    el('circle', { cx: 1129, cy: 803, r: 34, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .3)', class: 'halo' }, toro);
    el('rect', { x: 1114, y: 838, width: 30, height: 8, rx: 2, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1123, y: 814, width: 12, height: 25, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1112, y: 794, width: 34, height: 21, rx: 2, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1118, y: 799, width: 22, height: 12, rx: 1, fill: 'var(--lamp)', opacity: 'var(--lamp-o)' }, toro);
    el('path', { d: 'M1105,796H1153L1129,781Z', fill: 'var(--trim)' }, toro);
    el('path', { d: 'M1105,793H1153L1129,779Z', fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .92)' }, toro);
    g.appendChild(toro);
    // 门口到汤池的踏脚石
    [[862, 848, 14], [838, 840, 12], [814, 833, 11], [792, 828, 10]].forEach(s => el('ellipse', { cx: s[0], cy: s[1], rx: s[2], ry: s[2] * 0.3, fill: 'var(--trim)', opacity: .55 }, g));
    // 屋旁的树
    let d = '';
    [[700, 96], [738, 122], [772, 84], [806, 106], [660, 70], [628, 58], [1250, 100], [1288, 126], [1326, 90], [1364, 114], [1402, 76], [1440, 64], [1480, 88]].forEach(t => { d += conifer(t[0], c2.yAt(t[0]) + 2, t[1], t[1] * 0.36, 3); });
    el('path', { d, fill: 'var(--t2)' }, g);
    return g;
  }

  // ---------- 近景：地面与两棵框住画面的冷杉 ----------
  function fore() {
    const g = el('g'), c1 = C.r1 || (C.r1 = crest(RIDGES.r1)), r = rng(149);
    el('path', { d: fillPath(c1.pts, c1.def.base), fill: 'var(--r1)' }, g);
    // 近景的几棵冷杉站在地面上，从两侧纱帘的后面探出来。参数：x、树高、半宽、层数
    const trees = el('g', { class: 'firs', fill: 'var(--t1)' }), snow = el('g', { class: 'firs-snow', fill: 'var(--snow)' });
    [[70, 300, 76, 8], [196, 232, 60, 7], [296, 150, 42, 6], [1336, 166, 46, 6], [1444, 262, 68, 8], [1560, 330, 82, 9]].forEach(t => {
      const o = fir(t[0], c1.yAt(t[0]) + 8, t[1], t[2], t[3], r);
      el('path', { d: o.d }, trees);
      el('path', { d: o.snow }, snow);
    });
    g.appendChild(trees);
    g.appendChild(snow);
    // 灌木与草丛的剪影
    let bush = '';
    for (let i = 0; i < 46; i++) {
      const x = X0 + r() * (X1 - X0), y = c1.yAt(x) + 6 + r() * 10, w = 16 + r() * 44, h = 7 + r() * 16;
      bush += `M${P(x - w, y)}Q${P(x - w * 0.5, y - h * 1.5)} ${P(x - w * 0.1, y - h * 0.6)}Q${P(x + w * 0.35, y - h * 2)} ${P(x + w, y)}Z`;
    }
    el('path', { d: bush, fill: 'var(--t1)' }, g);
    return g;
  }

  // ---------- 温泉一节的近景：水面、岩石、木栏、灯笼与松枝 ----------
  function onsenFore() {
    const g = el('g'), r = rng(199);
    el('rect', { x: X0, y: 540, width: X1 - X0, height: 900, fill: 'url(#waterGrad)' }, g);
    for (let i = 0; i < 9; i++) el('ellipse', { cx: f(X0 + r() * (X1 - X0)), cy: f(566 + r() * 90), rx: f(60 + r() * 160), ry: f(1.6 + r() * 2.4), fill: 'var(--fog)', opacity: .2 }, g);
    const ripples = el('g', { class: 'rain-ripples' });
    for (let i = 0; i < 9; i++) el('ellipse', { cx: f(260 + r() * 1120), cy: f(600 + r() * 250), rx: 14, ry: 4.4, class: 'ripple', style: `--dur:${(1.8 + r() * 1.6).toFixed(1)}s;--del:${(-r() * 3).toFixed(1)}s` }, ripples);
    g.appendChild(ripples);
    const rocks = [[120, 760, 230, 96], [330, 812, 190, 74], [1180, 800, 260, 92], [1420, 748, 240, 110], [1620, 820, 220, 130], [-60, 700, 220, 96]];
    rocks.forEach(k => {
      el('ellipse', { cx: k[0], cy: k[1], rx: k[2], ry: k[3], fill: 'var(--roof)' }, g);
      el('ellipse', { cx: k[0], cy: k[1] - k[3] * 0.62, rx: k[2] * 0.9, ry: k[3] * 0.42, fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .9)' }, g);
      el('ellipse', { cx: k[0] - k[2] * 0.12, cy: k[1] - k[3] * 0.2, rx: k[2] * 0.62, ry: k[3] * 0.36, fill: '#000', opacity: .14 }, g);
    });
    // 左下角的木栏
    const fence = el('g');
    [40, 150, 260, 370].forEach((x, i) => el('rect', { x, y: 700 - i * 7, width: 12, height: 220, rx: 2, fill: 'var(--trim)' }, fence));
    el('rect', { x: 24, y: 748, width: 372, height: 9, fill: 'var(--cabin)' }, fence);
    el('rect', { x: 24, y: 824, width: 372, height: 9, fill: 'var(--cabin)' }, fence);
    el('rect', { x: 24, y: 744, width: 372, height: 4, fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .9)' }, fence);
    g.appendChild(fence);
    // 右侧石灯笼
    const toro = el('g');
    el('circle', { cx: 1250, cy: 560, r: 120, fill: 'var(--lamp)', opacity: 'calc(var(--lamp-o) * .3)', class: 'halo' }, toro);
    el('rect', { x: 1200, y: 700, width: 100, height: 26, rx: 5, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1230, y: 610, width: 40, height: 92, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1192, y: 548, width: 116, height: 66, rx: 5, fill: 'var(--roof)' }, toro);
    el('rect', { x: 1214, y: 564, width: 72, height: 36, rx: 3, fill: 'var(--lamp)', opacity: 'var(--lamp-o)' }, toro);
    el('path', { d: 'M1176,550H1324L1250,500Z', fill: 'var(--trim)' }, toro);
    el('path', { d: 'M1176,542H1324L1250,497Z', fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .92)' }, toro);
    g.appendChild(toro);
    // 小木凳与水勺
    el('rect', { x: 1090, y: 716, width: 70, height: 11, rx: 3, fill: 'var(--cabin)' }, g);
    el('rect', { x: 1100, y: 727, width: 7, height: 22, fill: 'var(--trim)' }, g);
    el('rect', { x: 1143, y: 727, width: 7, height: 22, fill: 'var(--trim)' }, g);
    // 蒸汽
    const steam = el('g', { class: 'steam steam--big' });
    for (let i = 0; i < 14; i++) {
      el('ellipse', { cx: f(300 + r() * 1000), cy: f(600 + r() * 90), rx: f(46 + r() * 54), ry: f(26 + r() * 26), class: 'puff', style: `--dur:${(9 + rs(199, i) * 7).toFixed(1)}s;--del:${(-r() * 15).toFixed(1)}s;--dx:${((r() - 0.5) * 140) | 0}px;--rise:${(200 + r() * 160) | 0}px` }, steam);
    }
    g.appendChild(steam);
    // 左上角探进来的一小截松枝
    const pine = el('g', { class: 'pine' });
    el('path', { d: 'M-30,-16C60,14 130,44 206,84', fill: 'none', stroke: 'var(--t1)', 'stroke-width': 7, 'stroke-linecap': 'round' }, pine);
    el('path', { d: 'M112,52C150,44 176,40 206,44', fill: 'none', stroke: 'var(--t1)', 'stroke-width': 3.6, 'stroke-linecap': 'round' }, pine);
    const needles = el('g', { fill: 'var(--t1)' }), ns = el('g', { fill: 'var(--snow)', opacity: 'calc(var(--snow-o) * .85)' });
    for (let i = 0; i < 24; i++) {
      const t = i / 24, x = 20 + t * 190 + (i % 2 ? 0 : -30) * (1 - t), y = -2 + t * 90 + (i % 3 - 1) * 15;
      const rot = `rotate(${(r() * 50 - 30) | 0} ${f(x)} ${f(y)})`;
      el('ellipse', { cx: f(x), cy: f(y), rx: f(11 + r() * 12), ry: f(2.2 + r() * 1.6), transform: rot }, needles);
      el('ellipse', { cx: f(x), cy: f(y - 2), rx: f(8 + r() * 7), ry: 1.6, transform: rot }, ns);
    }
    pine.appendChild(needles); pine.appendChild(ns);
    g.appendChild(pine);
    return g;
  }
  // 稳定的伪随机（只用于给动画时长取值）
  function rs(seed, i) { const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); }

  // ---------- 玻璃上的雨滴 ----------
  function glassRain() {
    const g = el('g', { class: 'glass-rain' }), r = rng(181);
    for (let i = 0; i < 30; i++) {
      el('ellipse', { cx: f(X0 + 200 + r() * (X1 - X0 - 400)), cy: f(60 + r() * 760), rx: f(1.6 + r() * 2.2), ry: f(2.4 + r() * 3.4), class: 'drop', style: `--dur:${(7 + r() * 9).toFixed(1)}s;--del:${(-r() * 16).toFixed(1)}s;--run:${(30 + r() * 150) | 0}px` }, g);
    }
    for (let i = 0; i < 9; i++) el('rect', { x: f(X0 + 100 + r() * (X1 - X0 - 200)), y: f(40 + r() * 700), width: 1.1, height: f(40 + r() * 130), rx: .5, class: 'streak', style: `--dur:${(5 + r() * 6).toFixed(1)}s;--del:${(-r() * 11).toFixed(1)}s` }, g);
    return g;
  }
  function fireflies() {
    const g = el('g', { class: 'fireflies' }), r = rng(191);
    for (let i = 0; i < 14; i++) {
      el('circle', { cx: f(700 + r() * 620), cy: f(800 + r() * 90), r: f(1.4 + r() * 1.2), class: 'fly', style: `--dur:${(3.4 + r() * 4).toFixed(1)}s;--del:${(-r() * 7).toFixed(1)}s;--dx:${((r() - 0.5) * 60) | 0}px;--dy:${((r() - 0.5) * 36) | 0}px` }, g);
    }
    return g;
  }

  const builders = { sky, r5: () => ridge('r5'), fog1: () => fog(548, 31, 16, 44), r4: () => ridge('r4'), fog2: () => fog(620, 43, 17, 50), r3: () => ridge('r3'),
    fog3: () => fog(706, 59, 19, 70), r2: () => ridge('r2'), heroMid, fog4: () => fog(836, 71, 10, 18), fore, onsenFore, glassRain, fireflies };

  SG.scene = {
    // 把指定图层填进 SVG 里对应的占位组：<g data-layer="sky" class="ly ly-sky"></g>
    mount(svg, names) {
      names.forEach(n => {
        const slot = svg.querySelector(`[data-layer="${n}"]`);
        if (slot) slot.appendChild(builders[n]());
      });
    },
    // 窄屏换成竖幅取景：保留太阳与木屋所在的中间地带
    frame(svg) {
      const a = innerWidth / innerHeight;
      // 竖幅时取景框拉高、多留天空：木屋落在文案下方、预约条上方，不被文字盖住
      if (a >= .92) svg.setAttribute('viewBox', '0 0 1600 1000');
      else { const w = Math.max(760, 1900 * a); svg.setAttribute('viewBox', `${f(760 - w / 2)} -520 ${f(w)} 1900`); }
      svg.classList.toggle('is-portrait', a < .92);
    }
  };
})();
