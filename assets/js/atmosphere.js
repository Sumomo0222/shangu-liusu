/* 山谷留宿 · 天气与时刻
 * 页面只有一个"此刻"：天气（晴 / 雨 / 雪）由用户切换，时刻（晨 / 昼 / 暮 / 夜）默认跟随滚动——
 * 往下滚，就是在民宿过一天。两者共同决定每个取景框（首屏、入夜过场、窗景、谷汤）里叠哪几张照片、各占多少，
 * 以及压暗、色罩、雾气和蒸汽的浓度。颜色在 Oklab 空间里插值，过渡时不会发灰。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data, G = SG.grade, S = SG.scenes, KEYS = ['dawn', 'day', 'dusk', 'night'];
  const root = document.documentElement;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const st = SG.atmo = {
    from: 'sunny', to: 'sunny', mix: 1,   // 天气，以及两次切换之间的过渡进度
    mode: 'auto', fixed: 'dawn',          // 时刻：auto = 跟随滚动
    phase: 0, timeKey: 'dawn', anchors: [], subs: [], dirty: true, reduce
  };

  // 滚动时间线：每个章节的顶部走到屏幕中部时，对应到一天里的哪个时刻（0–4 为一天，4 之后是次日清晨）
  const TIMELINE = [['#top', 0], ['#story', .62], ['#rooms', 1.02], ['#onsen', 1.44], ['#dining', 1.86], ['#spaces', 2.6],
    ['#routes', 4.02], ['#reviews', 4.12], ['#rules', 4.2], ['#book', 4.26], ['[data-footer]', 4.36]];

  // ---------- 颜色 ----------
  const labCache = new Map();
  function lab(h) {
    let v = labCache.get(h);
    if (v) return v;
    const n = parseInt(h.slice(1), 16);
    const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(x => { x /= 255; return x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); });
    const l = Math.cbrt(.4122214708 * c[0] + .5363325363 * c[1] + .0514459929 * c[2]);
    const m = Math.cbrt(.2119034982 * c[0] + .6806995451 * c[1] + .1073969566 * c[2]);
    const s = Math.cbrt(.0883024619 * c[0] + .2817188371 * c[1] + .6299787005 * c[2]);
    v = [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
    labCache.set(h, v);
    return v;
  }
  function hex(L, a, b) {
    const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    const g = x => Math.round(255 * clamp(x <= .0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - .055, 0, 1));
    return '#' + [g(4.0767416621 * l - 3.307711591 * m + .2309699292 * s), g(-1.2684380046 * l + 2.6097574011 * m - .3413193965 * s), g(-.0041960863 * l - .7034186143 * m + 1.707614701 * s)].map(x => x.toString(16).padStart(2, '0')).join('');
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
  // 某种天气在某个时刻的调色：在相邻两个时刻之间插值
  function at(weather, phase) {
    const set = G[weather], p = ((phase % 4) + 4) % 4, i = Math.floor(p);
    return blend(set[KEYS[i]], set[KEYS[(i + 1) % 4]], smooth(p - i));
  }
  function clockAt(phase) { // 一天里的分钟数；超过 24 小时表示次日
    const p = ((phase % 4) + 4) % 4, i = Math.floor(p);
    const a = D.clockAt[KEYS[i]], b = i === 3 ? D.clockAt.dawn + 1440 : D.clockAt[KEYS[i + 1]];
    return a + (b - a) * (p - i) + Math.floor(phase / 4) * 1440;
  }

  // ---------- 取景框：一叠照片图层 ----------
  // 图层按 "天气:时刻" 记。换天气或滚动改变时刻时，新图层淡入、旧图层淡出；图层没下载完之前不算数。
  const scenes = [];
  function pick(kind, w, t) { // 这个取景框在天气 w、时刻 t 该用哪张照片；没有就回退
    const tab = S[kind].tab, row = tab[w] || tab.sunny;
    return row[t] || (t === 'dusk' ? row.day : 0) || row.all || tab.sunny[t] || 0;
  }
  const file = (name, w) => 'assets/img/' + name + (w ? '-' + w : '') + '.webp';
  function layer(sc, w, t) {
    const id = w + ':' + t;
    let L = sc.layers.get(id);
    if (L) return L;
    const name = pick(sc.kind, w, t);
    if (!name) return null;
    const sizes = S[sc.kind].sizes, img = new Image();
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    if (sizes.length > 1) { img.srcset = sizes.map(x => file(name, x) + ' ' + x + 'w').join(', '); img.sizes = sc.kind === 'win' ? '360px' : '100vw'; }
    else img.src = file(name);
    img.style.setProperty('--kb', (-Math.random() * 46).toFixed(1) + 's');      // 错开缓推的起点、方向，两层不会同速同向
    img.style.setProperty('--kx', (Math.random() * 3 - 1.5).toFixed(2) + '%');
    img.style.setProperty('--ky', (Math.random() * 2.4 - 2).toFixed(2) + '%');
    L = { img, id, o: 0, ready: false, failed: false };
    img.addEventListener('load', () => { L.ready = true; wake(); });
    img.addEventListener('error', () => { L.failed = true; wake(); });
    img.style.opacity = '0';
    sc.box.appendChild(img);
    sc.layers.set(id, L);
    return L;
  }
  function mount(el) {
    const sc = { kind: el.dataset.scene, el, box: el.querySelector('[data-layers]') || el, layers: new Map(), active: /^(hero|win)$/.test(el.dataset.scene) };
    scenes.push(sc);
    // 首屏和窗景立刻取图；谷汤、入夜过场在页面很下面，等滚到附近再取，免得一打开就下载
    if (!sc.active) {
      if (window.IntersectionObserver) {
        const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { sc.active = true; wake(); o.disconnect(); } }, { rootMargin: '100% 0px' });
        o.observe(el);
      } else sc.active = true;
    }
    return sc;
  }
  // 省流量或慢网络时不预先下载别的时刻；否则页面闲下来后先把首屏、窗景、谷汤在其余时刻的照片备好，切换时才不会等
  const conn = navigator.connection || {};
  const slow = !!(conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''));
  const NEAR = ['hero', 'win', 'onsen'];
  function warm(weather, kinds) { // 把这种天气在各时刻的照片都先建好图层，浏览器就会去下载
    if (reduce || slow) return;
    scenes.forEach(sc => { if (kinds && kinds.indexOf(sc.kind) < 0) return; layer(sc, weather, 'all') || KEYS.forEach(t => layer(sc, weather, t)); });
  }
  let live = true;
  const wake = () => { live = true; };

  function render(dt) {
    const p = ((st.phase % 4) + 4) % 4, i = Math.floor(p), m = smooth(p - i), a = KEYS[i], b = KEYS[(i + 1) % 4];
    const ws = st.mix >= 1 ? [[st.to, 1]] : [[st.from, 1 - smooth(st.mix)], [st.to, smooth(st.mix)]].filter(x => x[1] > .002);
    let busy = false;
    const k = reduce ? 1 : Math.min(1, dt * 4.2);
    for (const sc of scenes) {
      if (!sc.active) continue;
      const want = new Map();
      let sum = 0;
      for (const [w, ww] of ws) {
        if (sc.kind === 'onsen') { const L = layer(sc, w, 'all'); if (L && !L.failed) { want.set(L, ww); sum += ww; } continue; }
        for (const [t, tw] of [[a, 1 - m], [b, m]]) {
          if (tw < .004) continue;
          const L = layer(sc, w, t);
          if (L && !L.failed) { want.set(L, (want.get(L) || 0) + ww * tw); sum += ww * tw; }
        }
      }
      let pending = 0, oldSum = 0;
      want.forEach((v, L) => { if (!L.ready) pending += v; });
      sc.layers.forEach(L => { if (!want.has(L) && L.o > .004) oldSum += L.o; });
      const hold = pending > 0 && oldSum > .01;          // 新照片还没到：旧照片先顶住它那一份，取景框不会空一拍
      const step = (L, t) => {
        L.o += (t - L.o) * k;
        if (Math.abs(t - L.o) < .003) L.o = t; else busy = true;
        L.img.style.opacity = L.o.toFixed(3);
        L.img.classList.toggle('is-live', L.o > .01);
      };
      want.forEach((v, L) => step(L, L.ready ? (hold ? v : v / Math.max(sum, .001)) : 0));   // 全部就绪后按权重归一，加起来正好是 1
      sc.layers.forEach(L => {
        if (want.has(L)) return;
        if (hold && L.o > .004) step(L, pending * L.o / oldSum);
        else if (L.o > 0) step(L, 0);
        else { L.img.remove(); sc.layers.delete(L.id); }
      });
    }
    return busy;
  }

  // ---------- 写入 CSS 变量与界面文字 ----------
  const last = {};
  function setVar(k, v) { if (last[k] !== v) { last[k] = v; root.style.setProperty(k, v); } }
  function text(sel, str) { document.querySelectorAll(sel).forEach(n => { if (n.textContent !== str) n.textContent = str; }); }
  const mealOf = { dawn: 'breakfast', day: 'tea', dusk: 'dinner', night: 'dinner' };

  function apply() {
    const pal = st.mix >= 1 ? at(st.to, st.phase) : blend(at(st.from, st.phase), at(st.to, st.phase), smooth(st.mix));
    setVar('--scrim', pal.scrim.toFixed(3)); setVar('--side', pal.side.toFixed(3)); setVar('--veil', pal.veil); setVar('--veil-o', pal.veilO.toFixed(3));
    setVar('--mist', pal.mist.toFixed(3)); setVar('--steam', pal.steam.toFixed(3));
    const key = KEYS[Math.round(((st.phase % 4) + 4) % 4) % 4];
    st.timeKey = key;
    if (root.dataset.time !== key) root.dataset.time = key;
    if (root.dataset.weather !== st.to) root.dataset.weather = st.to;
    const m = Math.round(clockAt(st.phase)), next = m >= 1440;
    text('[data-clock]', String(Math.floor((m % 1440) / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    text('[data-day]', next ? '次日 ' : '');
    text('[data-time-note]', D.timeNotes[key]);
    text('[data-time-name]', D.timeNames[key]);
    const c = SG.credits[pick('hero', st.to, key)];
    text('[data-credit]', c ? c[0] : '');
    document.querySelectorAll('[data-credit-link]').forEach(n => { const h = c ? c[2] : ''; if (n.getAttribute('href') !== h) n.setAttribute('href', h || '#'); });
    document.querySelectorAll('[data-meal]').forEach(n => n.classList.toggle('is-now', n.dataset.meal === mealOf[key]));
    st.dirty = false;
  }

  // ---------- 滚动 → 时刻 ----------
  function measure() {
    const vh = innerHeight;
    st.anchors = TIMELINE.map(a => {
      const n = document.querySelector(a[0]);
      return n ? { y: Math.max(0, n.getBoundingClientRect().top + scrollY + vh * (a[2] || 0) - vh * .52), ph: a[1] } : null;
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
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    return c;
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function seedFx() {
    const area = innerWidth * innerHeight;
    flakes = Array.from({ length: Math.round(area / 15000) }, () => ({ x: rnd(0, innerWidth), y: rnd(0, innerHeight), r: rnd(1, 3.2), v: rnd(16, 42), ph: rnd(0, 6.28), sw: rnd(8, 24), o: rnd(.3, .8) }));
    drops = Array.from({ length: Math.round(area / 9500) }, () => ({ x: rnd(0, innerWidth), y: rnd(0, innerHeight), len: rnd(16, 34), v: rnd(560, 880), o: rnd(.07, .17) }));
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
    alpha += (target - alpha) * Math.min(1, dt * 2.2);
    cv.style.opacity = alpha.toFixed(3);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    if (fxKind === 'snowy') {
      flakes.forEach(f => {
        f.y += f.v * dt; f.ph += dt * .6; f.x += Math.sin(f.ph) * f.sw * dt;
        if (f.y > innerHeight + 8) { f.y = -8; f.x = Math.random() * innerWidth; }
        const s = f.r * 5.2;
        cx.globalAlpha = f.o * (f.r > 2.6 ? .55 : 1);
        cx.drawImage(sprite, f.x - s / 2, f.y - s / 2, s, s);
      });
    } else { // 雨滴：细长的斜线，速度很快
      cx.lineWidth = 1; cx.lineCap = 'round';
      drops.forEach(d => {
        d.y += d.v * dt; d.x -= d.v * dt * .12;
        if (d.y > innerHeight + 30) { d.y = -30; d.x = Math.random() * (innerWidth + 120); }
        cx.strokeStyle = `rgba(255,255,255,${d.o.toFixed(3)})`;
        cx.beginPath(); cx.moveTo(d.x, d.y); cx.lineTo(d.x + d.len * .12, d.y - d.len); cx.stroke();
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
    if (st.dirty) { apply(); live = true; }
    if (live) live = render(dt);
    if (!reduce) drawFx(dt);
    requestAnimationFrame(tick);
  }

  // ---------- 对外 ----------
  function setWeather(w) {
    if (!G[w] || w === st.to) return;
    st.from = st.mix >= 1 ? st.to : st.from; st.to = w; st.mix = reduce ? 1 : 0;
    st.dirty = true;
    st.subs.forEach(fn => fn(st.to, st.mode === 'auto' ? 'auto' : st.fixed));
    setTimeout(() => warm(w, NEAR), 2200);
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
  st.pick = pick;

  function init() {
    document.querySelectorAll('[data-scene]').forEach(mount);
    resizeFx();
    measure();
    apply();
    addEventListener('resize', () => { resizeFx(); measure(); }, { passive: true });
    addEventListener('scroll', () => { st.dirty = true; }, { passive: true });
    addEventListener('load', () => { measure(); setTimeout(() => warm(st.to, NEAR), 900); }, { once: true });
    // 图片懒加载、字体替换都会让后面的章节挪位置：页面总高度一变就重新量一遍
    if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(document.body);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    requestAnimationFrame(tick);
  }
  SG.atmo.init = init;
})();
