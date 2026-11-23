/* 山谷留宿 · 周边路线：等高线手绘地图、路线列表与路线查看器
 * 地图与路线都是虚构的示意，只表达相对位置和氛围。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data, NS = 'http://www.w3.org/2000/svg';
  const COLORS = { mist: '#6f8378', creek: '#5f7f94', ridge: '#b07a55', villages: '#8a6a7c' };
  const LODGE = [404, 424];
  const f = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hrsOf = r => parseFloat(r.hrs.replace(/[^\d.]/g, ''));

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  // Catmull-Rom 转三次贝塞尔：把稀疏的点连成顺滑的线
  function smooth(pts) {
    const n = pts.length, closed = pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1];
    const P = closed ? [pts[n - 2], ...pts, pts[1]] : [pts[0], ...pts, pts[n - 1]];
    let d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
    for (let i = 0; i < n - 1; i++) {
      const p0 = P[i], p1 = P[i + 1], p2 = P[i + 2], p3 = P[i + 3];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ',' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ',' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ',' + f(p2[1]);
    }
    return d;
  }

  // ---------- 地图 ----------
  function buildMap(svg) {
    const W = 760, H = 620;
    el('rect', { x: 0, y: 0, width: W, height: H, class: 'map-bg' }, svg);
    // 几座山头的等高线；数值为 中心 x、y、外圈半径、圈数、峰顶海拔、相位种子
    // 最后一个数是标高文字的纵向偏移，用来避开附近的途经点标签
    const PEAKS = [[250, 210, 200, 6, 1780, 1, 0], [600, 190, 150, 5, 1640, 2, 0], [650, 510, 125, 4, 1480, 3, -44], [110, 540, 110, 3, 1420, 4, 0]];
    const cg = el('g', { 'aria-hidden': 'true' }, svg);
    PEAKS.forEach(pk => {
      for (let k = 1; k <= pk[3]; k++) {
        const rad = pk[2] * k / pk[3];
        let d = '';
        for (let i = 0; i <= 88; i++) {
          const a = i / 88 * Math.PI * 2;
          const m = 1 + .14 * Math.sin(a * 3 + pk[5] * 1.7) + .08 * Math.sin(a * 5 + pk[5] * 2.9) + .05 * Math.sin(a * 7 + pk[5] * .9);
          d += (i ? 'L' : 'M') + f(pk[0] + Math.cos(a) * rad * m * 1.18) + ',' + f(pk[1] + Math.sin(a) * rad * m);
        }
        const major = k % 2 === 0;
        el('path', { d: d + 'Z', class: 'map-contour' + (major ? ' map-contour--major' : '') }, cg);
        if (major && k < pk[3]) { // 标高写在山头右侧；靠右边缘的山头右对齐，免得被裁掉
          const right = pk[0] < 380, x = right ? pk[0] + rad * 1.2 : Math.min(pk[0] + rad * 1.2, 738);
          el('text', { x: f(x), y: f(pk[1] + 4 + pk[6]), class: 'map-ele', 'text-anchor': right ? 'start' : 'end' }, cg).textContent = (Math.round((1280 + (pk[4] - 1280) * k / pk[3]) / 10) * 10).toLocaleString('en-US') + ' m';
        }
      }
    });
    // 溪
    el('path', { d: 'M560,92C520,150 480,200 500,250C520,300 548,330 548,380C548,430 600,470 640,520C668,556 688,580 700,604', class: 'map-water' }, svg);
    // 路线
    const rg = el('g', {}, svg);
    D.routes.forEach(r => { el('path', { d: smooth(r.map), class: 'map-route', stroke: COLORS[r.id], 'data-route': r.id }, rg); });
    // 民宿
    const lodge = el('g', { class: 'map-lodge-g' }, svg);
    el('circle', { cx: LODGE[0], cy: LODGE[1], r: 15, fill: '#b0492f', opacity: .22, class: 'map-pulse' }, lodge);
    el('circle', { cx: LODGE[0], cy: LODGE[1], r: 7, class: 'map-lodge' }, lodge);
    el('circle', { cx: LODGE[0], cy: LODGE[1], r: 2.2, fill: '#fbf6ec' }, lodge);
    el('text', { x: LODGE[0], y: LODGE[1] + 26, 'text-anchor': 'middle', class: 'map-label map-label--lodge' }, svg).textContent = '山谷留宿 · 1,280 m';
    // 途经点
    const wg = el('g', {}, svg);
    D.routes.forEach(r => r.waypoints.forEach((w, i) => {
      if (!i) return; // 第一个点就是民宿门口
      const p = r.map[w.at], left = p[0] > 590 || w.name === '二叠瀑'; // 挨得太近的标签写到左侧
      const g = el('g', { 'data-route': r.id, class: 'map-wp-g' }, wg);
      el('circle', { cx: p[0], cy: p[1], r: 5, class: 'map-wp', style: `--rc:${COLORS[r.id]}` }, g);
      el('text', { x: p[0] + (left ? -11 : 11), y: p[1] + 4.5, 'text-anchor': left ? 'end' : 'start', class: 'map-wp-label' }, g).textContent = w.name;
    }));
    // 更宽的透明描边，方便点中
    const hits = el('g', {}, svg);
    D.routes.forEach(r => el('path', { d: smooth(r.map), class: 'map-route-hit', 'data-route': r.id }, hits));
    // 指北针与比例尺
    el('circle', { cx: 700, cy: 76, r: 22, class: 'map-compass' }, svg);
    el('path', { d: 'M700,60L706,84L700,79L694,84Z', fill: '#6b6053' }, svg);
    el('text', { x: 700, y: 46, 'text-anchor': 'middle', class: 'map-compass-t' }, svg).textContent = 'N';
    el('path', { d: 'M40,592h84M40,587v10M124,587v10', class: 'map-compass' }, svg);
    el('text', { x: 82, y: 582, 'text-anchor': 'middle', class: 'map-ele' }, svg).textContent = '1 km';
  }

  // ---------- 高度剖面 ----------
  function elevAt(r, k) {
    const e = r.ele;
    for (let i = 1; i < e.length; i++) if (e[i][0] >= k) { const a = e[i - 1], b = e[i]; return a[1] + (b[1] - a[1]) * (k - a[0]) / (b[0] - a[0] || 1); }
    return e[e.length - 1][1];
  }
  function elevSVG(r) {
    const W = 520, H = 210, L = 46, R = 14, T = 22, B = 28;
    const es = r.ele.map(p => p[1]), min = Math.min(...es) - 40, max = Math.max(...es) + 40;
    const X = k => L + (W - L - R) * k / r.km, Y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
    const pts = r.ele.map(p => [X(p[0]), Y(p[1])]);
    const line = smooth(pts), area = line + `L${f(X(r.km))},${H - B}L${L},${H - B}Z`;
    let grid = '';
    for (let i = 0; i <= 2; i++) {
      const v = Math.round((min + (max - min) * i / 2) / 10) * 10, y = f(Y(v));
      grid += `<path d="M${L},${y}H${W - R}" stroke="#2a2723" stroke-opacity=".1" stroke-dasharray="2 5"/><text class="elev-axis" x="${L - 8}" y="${+y + 3.5}" text-anchor="end">${v.toLocaleString('en-US')} m</text>`;
    }
    const wps = r.waypoints.map(w => `<circle class="elev-wp" cx="${f(X(w.km))}" cy="${f(Y(w.ele))}" r="4.5"/>`).join('');
    return `<svg class="elev" viewBox="0 0 ${W} ${H}" data-x0="${L}" data-x1="${W - R}" data-w="${W}" role="img" aria-label="${esc(r.name)}的高度剖面">
      ${grid}<path class="elev-area" d="${area}"/><path class="elev-line" d="${line}"/>${wps}
      <line class="elev-cursor" x1="${L}" x2="${L}" y1="${T - 6}" y2="${H - B}"/><circle class="elev-wp elev-dot" cx="${L}" cy="${T}" r="4" style="opacity:0"/>
      <text class="elev-read" x="${L}" y="13" text-anchor="middle" opacity="0"> </text>
      <text class="elev-axis" x="${L}" y="${H - 8}">0 km</text><text class="elev-axis" x="${W - R}" y="${H - 8}" text-anchor="end">${r.km} km</text></svg>`;
  }
  function elevHover(svg, r) {
    const cursor = svg.querySelector('.elev-cursor'), read = svg.querySelector('.elev-read'), dot = svg.querySelector('.elev-dot');
    const X0 = +svg.dataset.x0, X1 = +svg.dataset.x1, W = +svg.dataset.w;
    const move = e => {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      const k = Math.max(0, Math.min(r.km, (q.x - X0) / (X1 - X0) * r.km));
      const ele = elevAt(r, k), es = r.ele.map(v => v[1]);
      const x = X0 + (X1 - X0) * k / r.km, min = Math.min(...es) - 40, max = Math.max(...es) + 40;
      const y = 22 + (210 - 22 - 28) * (1 - (ele - min) / (max - min));
      cursor.setAttribute('x1', x); cursor.setAttribute('x2', x);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      cursor.style.opacity = ''; dot.style.opacity = ''; read.setAttribute('opacity', '1');
      read.setAttribute('x', Math.max(44, Math.min(W - 44, x)));
      read.textContent = k.toFixed(1) + ' km · ' + Math.round(ele).toLocaleString('en-US') + ' m';
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', () => { cursor.style.opacity = '0'; dot.style.opacity = '0'; read.setAttribute('opacity', '0'); });
  }

  // ---------- 列表与地图联动 ----------
  let mapEl = null, listEl = null;
  function setFocus(id) {
    if (!mapEl) return;
    mapEl.classList.toggle('has-focus', !!id);
    mapEl.querySelectorAll('[data-route]').forEach(n => n.classList.toggle('is-focus', !!id && n.dataset.route === id));
    if (listEl) {
      listEl.classList.toggle('is-focus', !!id);
      listEl.querySelectorAll('.route').forEach(n => n.classList.toggle('is-focus', !!id && n.dataset.routeItem === id));
    }
  }
  function renderList() {
    listEl = document.querySelector('[data-list="routes"]');
    listEl.innerHTML = D.routes.map(r => `<article class="route" data-route-item="${r.id}">
      <header class="route__head"><span class="route__no">${r.no}</span><div><h3>${r.name}</h3><p>${r.en} · ${r.shape}</p></div><button type="button" class="linkbtn" data-route="${r.id}">查看路线<svg class="ic"><use href="#i-arrow"/></svg></button></header>
      <p class="route__stats"><span><b>${r.km}</b> km</span><span><b>${hrsOf(r)}</b> 小时</span><span><b>${r.gain}</b> 爬升</span><span class="route__diff" aria-label="难度 ${r.diff} / 3">${[1, 2, 3].map(k => `<i${k <= r.diff ? ' class="on"' : ''}></i>`).join('')}</span><span>${r.best}</span></p>
      <p class="route__summary">${esc(r.summary)}</p>
      <p class="route__advice" data-advice></p>
    </article>`).join('');
    listEl.addEventListener('pointerover', e => { const n = e.target.closest('.route'); setFocus(n ? n.dataset.routeItem : null); });
    listEl.addEventListener('pointerleave', () => setFocus(null));
    listEl.addEventListener('focusin', e => { const n = e.target.closest('.route'); setFocus(n ? n.dataset.routeItem : null); });
    listEl.addEventListener('focusout', () => setFocus(null));
  }
  function setWeather(w) {
    document.querySelectorAll('.route').forEach(n => {
      const r = D.routes.find(x => x.id === n.dataset.routeItem), a = n.querySelector('[data-advice]');
      if (r && a) a.innerHTML = SG.ui.icon(w) + `<span><b>今天：</b>${esc(r.weather[w])}</span>`;
    });
  }

  // ---------- 路线查看器 ----------
  function open(id) {
    const list = D.routes, i = Math.max(0, list.findIndex(r => r.id === id)), r = list[i], w = SG.atmo.to;
    const prev = list[(i + list.length - 1) % list.length], next = list[(i + 1) % list.length];
    const html = `<div class="routeview" style="--rc:${COLORS[r.id]}">
      <div class="routeview__hero" style="background-image:url(${r.photo})"><div>
        <p class="kicker"><b>路线 ${r.no}</b><span>${r.en}</span><i>${r.shape.toUpperCase()}</i></p>
        <h3 class="modal__title" id="modalTitle">${r.name}</h3>
        <p class="routeview__meta">${r.km} km · 约 ${hrsOf(r)} 小时 · 爬升 ${r.gain} m · 适合 ${r.best}</p>
      </div></div>
      <div class="routeview__body">
        <div class="routeview__map"></div>
        <div class="routeview__side">
          <p class="routeview__h">高度剖面 · 左右滑动读数</p>${elevSVG(r)}
          <p class="routeview__h">途经</p>
          <ol class="waypoints">${r.waypoints.map(p => `<li><b>${p.name}</b><span>${p.km} km · ${p.ele.toLocaleString('en-US')} m</span><p>${esc(p.note)}</p></li>`).join('')}</ol>
          <p class="routeview__advice">${SG.ui.icon(w)}<span><b>今天这样走</b>${esc(r.weather[w])}</span></p>
          <p class="routeview__gear"><b>带什么</b> ${esc(r.gear)}<br><b>出发前</b> 在壁炉厅的地图上写下预计返回时间；需要便当请提前一晚说。</p>
          <p class="note">路线、里程与海拔均为虚构的演示内容。</p>
        </div>
      </div>
      <div class="routeview__nav"><button type="button" data-rv="${prev.id}">← ${prev.name}</button><button type="button" data-rv="${next.id}">${next.name} →</button></div>
    </div>`;
    SG.ui.openModal('route', html, card => {
      const src = document.getElementById('routeMap'), clone = src.cloneNode(true);
      clone.removeAttribute('id'); clone.removeAttribute('role'); clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('.map-route-hit').forEach(n => n.remove());
      clone.classList.add('has-focus');
      clone.querySelectorAll('[data-route]').forEach(n => n.classList.toggle('is-focus', n.dataset.route === r.id));
      card.querySelector('.routeview__map').appendChild(clone);
      elevHover(card.querySelector('.elev'), r);
      card.querySelectorAll('[data-rv]').forEach(b => b.addEventListener('click', () => open(b.dataset.rv)));
    });
  }

  SG.routes = {
    renderList, setWeather, open,
    init() {
      mapEl = document.getElementById('routeMap');
      buildMap(mapEl);
      mapEl.addEventListener('pointerover', e => { const n = e.target.closest('[data-route]'); setFocus(n ? n.dataset.route : null); });
      mapEl.addEventListener('pointerleave', () => setFocus(null));
      mapEl.addEventListener('click', e => { const n = e.target.closest('[data-route]'); if (n) open(n.dataset.route); });
    }
  };
})();
