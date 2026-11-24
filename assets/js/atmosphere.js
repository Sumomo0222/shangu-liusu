/* 山谷留宿 · 天气
 * 天气（晴 / 雨 / 雪）由用户切换：每个取景框（首屏、窗景、谷汤）在每种天气下各有一张照片，
 * 切换时交叉淡入；另有压暗、色罩、雾气与蒸汽的浓度，以及整页的雨雪粒子。
 * 色罩在 Oklab 空间里插值，过渡时不会发灰。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const G = SG.grade, S = SG.scenes;
  const root = document.documentElement;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const st = SG.atmo = {
    from: 'sunny', to: 'sunny', mix: 1,   // 天气，以及两次切换之间的过渡进度
    subs: [], dirty: true, reduce
  };

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

  // ---------- 取景框：每种天气一张照片，切换时交叉淡入 ----------
  // 图层按天气记；换天气时新图层淡入、旧图层淡出；图层没下载完之前旧照片顶住，取景框不会空一拍。
  const scenes = [];
  const file = (name, w) => 'assets/img/' + name + (w ? '-' + w : '') + '.webp';
  function layer(sc, w) {
    let L = sc.layers.get(w);
    if (L) return L;
    const name = S[sc.kind].tab[w] || S[sc.kind].tab.sunny;
    if (!name) return null;
    const sizes = S[sc.kind].sizes, img = new Image();
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    if (sizes.length > 1) { img.srcset = sizes.map(x => file(name, x) + ' ' + x + 'w').join(', '); img.sizes = sc.kind === 'win' ? '360px' : '100vw'; }
    else img.src = file(name);
    img.style.setProperty('--kb', (-Math.random() * 46).toFixed(1) + 's');      // 错开缓推的起点、方向，两层不会同速同向
    img.style.setProperty('--kx', (Math.random() * 3 - 1.5).toFixed(2) + '%');
    img.style.setProperty('--ky', (Math.random() * 2.4 - 2).toFixed(2) + '%');
    L = { img, id: w, o: 0, ready: false, failed: false };
    img.addEventListener('load', () => { L.ready = true; wake(); });
    img.addEventListener('error', () => { L.failed = true; wake(); });
    img.style.opacity = '0';
    sc.box.appendChild(img);
    sc.layers.set(w, L);
    return L;
  }
  function mount(el) {
    const sc = { kind: el.dataset.scene, el, box: el.querySelector('[data-layers]') || el, layers: new Map(), active: /^(hero|win)$/.test(el.dataset.scene) };
    scenes.push(sc);
    // 首屏和窗景立刻取图；谷汤在页面很下面，等滚到附近再取，免得一打开就下载
    if (!sc.active) {
      if (window.IntersectionObserver) {
        const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { sc.active = true; wake(); o.disconnect(); } }, { rootMargin: '100% 0px' });
        o.observe(el);
      } else sc.active = true;
    }
    return sc;
  }
  // 省流量或慢网络时不预先下载别的天气；否则页面闲下来后把首屏、窗景、谷汤在另外两种天气下的照片备好
  const conn = navigator.connection || {};
  const slow = !!(conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''));
  const NEAR = ['hero', 'win', 'onsen'];
  function warm(weather, kinds) {
    if (reduce || slow) return;
    scenes.forEach(sc => { if (kinds && kinds.indexOf(sc.kind) < 0) return; layer(sc, weather); });
  }
  let live = true;
  const wake = () => { live = true; };

  function render(dt) {
    const ws = st.mix >= 1 ? [[st.to, 1]] : [[st.from, 1 - smooth(st.mix)], [st.to, smooth(st.mix)]].filter(x => x[1] > .002);
    let busy = false;
    const k = reduce ? 1 : Math.min(1, dt * 4.2);
    for (const sc of scenes) {
      if (!sc.active) continue;
      const want = new Map();
      for (const [w, ww] of ws) { const L = layer(sc, w); if (L && !L.failed) want.set(L, ww); }
      const entries = [...want], ready = entries.filter(([L]) => L.ready), allReady = ready.length === entries.length;
      const step = (L, t) => {
        L.o += (t - L.o) * k;
        if (Math.abs(t - L.o) < .003) L.o = t; else busy = true;
        L.img.style.opacity = L.o.toFixed(3);
        L.img.classList.toggle('is-live', L.o > .01);
      };
      for (const [L] of entries) step(L, L.ready ? (allReady ? want.get(L) : 1 / ready.length) : 0);
      sc.layers.forEach(L => {
        if (want.has(L)) return;
        if (L.o > 0) step(L, 0);
        else { L.img.remove(); sc.layers.delete(L.id); }
      });
    }
    return busy;
  }

  // ---------- 写入 CSS 变量与界面文字 ----------
  const last = {};
  function setVar(k, v) { if (last[k] !== v) { last[k] = v; root.style.setProperty(k, v); } }
  function text(sel, str) { document.querySelectorAll(sel).forEach(n => { if (n.textContent !== str) n.textContent = str; }); }

  function apply() {
    const g = st.mix >= 1 ? G[st.to] : blend(G[st.from], G[st.to], smooth(st.mix));
    setVar('--scrim', g.scrim.toFixed(3)); setVar('--side', g.side.toFixed(3)); setVar('--veil', g.veil); setVar('--veil-o', g.veilO.toFixed(3));
    setVar('--mist', g.mist.toFixed(3)); setVar('--steam', g.steam.toFixed(3));
    if (root.dataset.weather !== st.to) root.dataset.weather = st.to;
    const c = SG.credits[S.hero.tab[st.to]];
    text('[data-credit]', c ? c[0] : '');
    document.querySelectorAll('[data-credit-link]').forEach(n => { const h = c ? c[2] : ''; if (n.getAttribute('href') !== h) n.setAttribute('href', h || '#'); });
    st.dirty = false;
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
    st.subs.forEach(fn => fn(st.to));
    setTimeout(() => warm(w, NEAR), 2200);
  }
  st.setWeather = setWeather;
  st.on = fn => st.subs.push(fn);

  function init() {
    document.querySelectorAll('[data-scene]').forEach(mount);
    resizeFx();
    apply();
    addEventListener('resize', resizeFx, { passive: true });
    addEventListener('load', () => setTimeout(() => warm(st.to, NEAR), 900), { once: true });
    requestAnimationFrame(tick);
  }
  SG.atmo.init = init;
})();
