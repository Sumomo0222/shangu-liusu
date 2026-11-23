/* 山谷留宿 · 天气与时刻
 * 页面只有一个"此刻"：天气（晴 / 雨 / 雪）由用户切换，时刻（晨 / 昼 / 暮 / 夜）默认跟随滚动——
 * 往下滚，就是在民宿过一天。两者共同决定一组 CSS 变量：场景、木窗框、照片调色和纸色都从这里取。
 * 颜色在 Oklab 空间里插值，天气和时刻过渡时不会发灰。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data, P = SG.palettes, KEYS = ['dawn', 'day', 'dusk', 'night'];
  const root = document.documentElement;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const st = SG.atmo = {
    from: 'sunny', to: 'sunny', mix: 1,   // 天气，以及两次切换之间的过渡进度
    mode: 'auto', fixed: 'dawn',          // 时刻：auto = 跟随滚动
    phase: 0, anchors: [], subs: [], dirty: true, reduce
  };

  // 滚动时间线：每个章节的顶部走到屏幕中部时，对应到一天里的哪个时刻（0–4 为一天，4 之后是次日清晨）
  const TIMELINE = [['#top', 0], ['#story', .62], ['#rooms', 1.02], ['#onsen', 1.44], ['#dining', 1.86], ['#spaces', 2.8],
    ['#routes', 4.06], ['#reviews', 4.16], ['#rules', 4.24], ['#book', 4.3], ['[data-footer]', 4.4]];

  // ---------- 颜色 ----------
  const labCache = new Map();
  function lab(h) {
    let v = labCache.get(h);
    if (v) return v;
    const n = parseInt(h.slice(1), 16);
    const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(x => { x /= 255; return x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    const l = Math.cbrt(.4122214708 * c[0] + .5363325363 * c[1] + .0514459929 * c[2]);
    const m = Math.cbrt(.2119034982 * c[0] + .6806995451 * c[1] + .1073969566 * c[2]);
    const s = Math.cbrt(.0883024619 * c[0] + .2817188376 * c[1] + .6299787005 * c[2]);
    v = [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
    labCache.set(h, v);
    return v;
  }
  function hex(L, a, b) {
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    const g = x => Math.round(255 * clamp(x <= .0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - .055, 0, 1));
    return '#' + [g(4.0767416621 * l - 3.3077115913 * m + .2309699292 * s), g(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), g(-.0041960863 * l - .7034186147 * m + 1.707614701 * s)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function blend(a, b, t) {
    const out = {};
    for (const k in a) {
      const x = a[k];
      if (typeof x === 'string') { const u = lab(x), v = lab(b[k]); out[k] = hex(u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t, u[2] + (v[2] - u[2]) * t); }
      else out[k] = x + (b[k] - x) * t;
    }
    return out;
  }
  // 某种天气在某个时刻的调色板：在相邻两个时刻之间插值
  function at(weather, phase) {
    const set = P[weather], p = ((phase % 4) + 4) % 4, i = Math.floor(p);
    return blend(set[KEYS[i]], set[KEYS[(i + 1) % 4]], smooth(p - i));
  }
  function clockAt(phase) { // 一天里的分钟数；超过 24 小时表示次日
    const p = ((phase % 4) + 4) % 4, i = Math.floor(p);
    const a = D.clockAt[KEYS[i]], b = i === 3 ? D.clockAt.dawn + 1440 : D.clockAt[KEYS[i + 1]];
    return a + (b - a) * (p - i) + Math.floor(phase / 4) * 1440;
  }

  // ---------- 写入 CSS 变量与界面文字 ----------
  const last = {};
  const kebab = s => /^r\d$|^t\d$/.test(s) ? '--' + s : '--' + s.replace(/[A-Z0-9]/g, m => '-' + m.toLowerCase());
  function setVar(k, v) { if (last[k] !== v) { last[k] = v; root.style.setProperty(k, v); } }
  function text(sel, str) { document.querySelectorAll(sel).forEach(n => { if (n.textContent !== str) n.textContent = str; }); }
  const mealOf = { dawn: 'breakfast', day: 'tea', dusk: 'dinner', night: 'dinner' };

  function apply() {
    const pal = st.mix >= 1 ? at(st.to, st.phase) : blend(at(st.from, st.phase), at(st.to, st.phase), smooth(st.mix));
    for (const k in pal) setVar(kebab(k), typeof pal[k] === 'number' ? pal[k].toFixed(3) : pal[k]);
    const key = KEYS[Math.round(((st.phase % 4) + 4) % 4) % 4];
    if (root.dataset.time !== key) root.dataset.time = key;
    if (root.dataset.weather !== st.to) root.dataset.weather = st.to;
    const m = Math.round(clockAt(st.phase)), next = m >= 1440;
    const hm = String(Math.floor((m % 1440) / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    text('[data-clock]', hm);
    text('[data-day]', next ? '次日 ' : '');
    text('[data-time-note]', D.timeNotes[key]);
    document.querySelectorAll('[data-meal]').forEach(n => n.classList.toggle('is-now', n.dataset.meal === mealOf[key]));
    st.dirty = false;
  }

  // ---------- 滚动 → 时刻 ----------
  function measure() {
    const vh = innerHeight;
    st.anchors = TIMELINE.map(a => {
      const n = document.querySelector(a[0]);
      return n ? { y: Math.max(0, n.getBoundingClientRect().top + scrollY - vh * .52), ph: a[1] } : null;
    }).filter(Boolean);
    st.dirty = true;
  }
  function scrollPhase() {
    const y = scrollY, A = st.anchors;
    if (!A.length) return 0;
    if (y <= A[0].y) return A[0].ph;
    for (let i = 1; i < A.length; i++) if (y < A[i].y) {
      const a = A[i - 1], b = A[i];
      return a.ph + (b.ph - a.ph) * (y - a.y) / Math.max(1, b.y - a.y);
    }
    return A[A.length - 1].ph;
  }

  // ---------- 雨 / 雪：一块固定在视口上的画布 ----------
  const cv = document.getElementById('fx');
  let cx = null, flakes = [], drops = [], sprite = null, alpha = 0;
  function spriteOf() {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    return c;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function seedFx() {
    const area = innerWidth * innerHeight;
    flakes = Array.from({ length: Math.round(area / 12000) }, () => ({ x: rnd(0, innerWidth), y: rnd(0, innerHeight), r: rnd(1.3, 4.2), v: rnd(22, 52), ph: rnd(0, 6.28), sw: rnd(10, 30), o: rnd(.35, .85) }));
    drops = Array.from({ length: Math.round(area / 6400) }, () => ({ x: rnd(0, innerWidth), y: rnd(0, innerHeight), len: rnd(13, 30), v: rnd(620, 980), o: rnd(.12, .3) }));
  }
  function resizeFx() {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!sprite) sprite = spriteOf();
    seedFx();
  }
  let fxKind = null; // 画布上正在落的粒子；切回晴天时让它们落完再停
  function drawFx(dt) {
    if (!cx) return;
    if (st.to !== 'sunny') fxKind = st.to;
    if (!fxKind) return;
    const target = st.to === 'sunny' ? 0 : 1;
    if (target === 0 && alpha <= .004) { if (cv.style.opacity !== '0') cv.style.opacity = '0'; return; }
    alpha += (target - alpha) * Math.min(1, dt * 2.6);
    cv.style.opacity = alpha.toFixed(3);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    if (fxKind === 'snowy') {
      flakes.forEach(f => {
        f.y += f.v * dt; f.ph += dt * .7; f.x += Math.sin(f.ph) * f.sw * dt;
        if (f.y > innerHeight + 8) { f.y = -8; f.x = Math.random() * innerWidth; }
        const s = f.r * 5.2;
        cx.globalAlpha = f.o * (f.r > 3.4 ? .5 : 1);
        cx.drawImage(sprite, f.x - s / 2, f.y - s / 2, s, s);
      });
    } else { // 雨滴：细长的斜线，速度很快
      cx.lineWidth = 1; cx.lineCap = 'round';
      drops.forEach(d => {
        d.y += d.v * dt; d.x -= d.v * dt * .13;
        if (d.y > innerHeight + 30) { d.y = -30; d.x = Math.random() * (innerWidth + 120); }
        cx.strokeStyle = `rgba(214,228,238,${(d.o * alpha).toFixed(3)})`;
        cx.beginPath(); cx.moveTo(d.x, d.y); cx.lineTo(d.x + d.len * .13, d.y - d.len); cx.stroke();
      });
    }
    cx.globalAlpha = 1;
  }

  // ---------- 主循环 ----------
  let lastT = 0;
  function tick(t) {
    const dt = Math.min(.05, lastT ? (t - lastT) / 1000 : .016);
    lastT = t;
    if (st.mix < 1) { st.mix = reduce ? 1 : Math.min(1, st.mix + dt / 1.5); st.dirty = true; }
    const target = st.mode === 'auto' ? scrollPhase() : KEYS.indexOf(st.fixed);
    if (Math.abs(st.phase - target) > .0004) {
      st.phase = reduce || Math.abs(st.phase - target) < .01 ? target : st.phase + (target - st.phase) * Math.min(1, dt * 7.5);
      st.dirty = true;
    }
    if (st.dirty) apply();
    if (!reduce) drawFx(dt);
    requestAnimationFrame(tick);
  }

  // ---------- 对外 ----------
  function setWeather(w) {
    if (!P[w] || w === st.to) return;
    st.from = st.mix >= 1 ? st.to : st.from; st.to = w; st.mix = reduce ? 1 : 0;
    st.dirty = true;
    st.subs.forEach(fn => fn(st.to, st.mode === 'auto' ? 'auto' : st.fixed));
  }
  function setTime(mode) {
    if (mode !== 'auto' && KEYS.indexOf(mode) < 0) return;
    st.mode = mode === 'auto' ? 'auto' : 'fixed';
    if (st.mode === 'fixed') st.fixed = mode;
    st.subs.forEach(fn => fn(st.to, mode));
  }
  st.setWeather = setWeather;
  st.setTime = setTime;
  st.measure = measure; // 图片等加载完后，章节位置变了要重新量
  st.on = fn => st.subs.push(fn);

  function init() {
    resizeFx();
    measure();
    apply();
    addEventListener('resize', () => { resizeFx(); SG.scene && document.querySelectorAll('svg[data-frame]').forEach(s => SG.scene.frame(s)); measure(); }, { passive: true });
    addEventListener('scroll', () => { st.dirty = true; }, { passive: true });
    addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    requestAnimationFrame(tick);
  }
  SG.atmo.init = init;
})();
