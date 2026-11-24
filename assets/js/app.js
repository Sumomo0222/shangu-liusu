/* 山谷留宿 · 页面逻辑
 * 渲染各章节与顶栏工具、弹层与提示、进场动效，并把天气 / 时刻引擎和各模块接起来。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data, reduce = SG.atmo.reduce;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const ICONS = { sunny: 'i-sun', rainy: 'i-rain', snowy: 'i-snow' };

  // ---------- 弹层与提示 ----------
  const ui = SG.ui = {};
  const modal = $('#modal'), card = $('#modalCard'), toastEl = $('#toast');
  let lastFocus = null, toastT = 0;
  card.setAttribute('tabindex', '-1');
  ui.icon = w => `<svg class="ic" aria-hidden="true"><use href="#${ICONS[w] || 'i-sun'}"/></svg>`;
  function fill(html) {
    card.innerHTML = html;
    card.insertAdjacentHTML('afterbegin', '<button type="button" class="modal__x" data-close aria-label="关闭"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>');
    card.scrollTop = 0;
  }
  function focusIn() {
    const f = card.querySelector('.btn, button:not(.modal__x), [href], input, [tabindex]:not([tabindex="-1"])');
    (f || card).focus({ preventScroll: true });
  }
  ui.openModal = (kind, html, bind) => {
    if (modal.hidden) lastFocus = document.activeElement;
    card.className = 'modal__card modal__card--' + kind;
    fill(html);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    if (bind) bind(card, next => { fill(next); focusIn(); });
    focusIn();
  };
  ui.close = () => {
    modal.hidden = true;
    card.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* 元素已不存在 */ } }
    lastFocus = null;
  };
  card.addEventListener('click', e => { if (e.target.closest('[data-close]')) ui.close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!modal.hidden) ui.close(); else if (!sheet.hidden) toggleSheet(false); return; }
    if (e.key !== 'Tab' || modal.hidden) return;
    const f = $$('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', card).filter(n => n.offsetParent !== null || n.getClientRects().length);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  ui.toast = msg => { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 3000); };
  ui.goTo = (sel, focus) => {
    const n = $(sel);
    if (!n) return;
    n.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (focus) {
      const t = $(`[data-book-focus="${focus}"]`);
      if (t) { t.classList.add('is-focus'); setTimeout(() => t.classList.remove('is-focus'), 2800); }
    }
  };

  // ---------- 渲染各章节 ----------
  function renderWx() {
    $('[data-list="wx"]').innerHTML = ['sunny', 'rainy', 'snowy'].map(w => {
      const m = D.weather[w];
      return `<button type="button" data-weather-btn="${w}" aria-pressed="${w === SG.atmo.to}"><svg class="ic" aria-hidden="true"><use href="#${ICONS[w]}"/></svg><b>${m.label}天</b><small>${m.temp} · ${m.feel}</small></button>`;
    }).join('');
  }
  function renderRooms() {
    $('[data-list="rooms"]').innerHTML = D.rooms.map((r, i) => `
      <article class="room" data-anim style="--d:${i}">
        <figure class="room__media" tabindex="0" role="button" data-room="${r.id}" aria-label="预览${esc(r.name)}：${r.size} 平方米，${esc(r.bed)}，可住 ${r.sleeps} 人">
          <img src="${r.photo}" alt="${esc(r.photoAlt)}" loading="lazy" decoding="async">
          <div class="room__panel">
            <dl class="spec"><div><dt>面积</dt><dd>${r.size} m²</dd></div><div><dt>床型</dt><dd>${esc(r.bed.split(' + ')[0])}</dd></div><div><dt>可住</dt><dd>${r.sleeps} 人</dd></div></dl>
            <ul class="chips">${r.amenities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          </div>
        </figure>
        <div class="room__body">
          <p class="eyebrow"><b>${pad2(i + 1)}</b><i>${esc(r.en)}</i></p>
          <h3 class="room__name">${r.name}</h3>
          <p class="room__line">${esc(r.line)}</p>
          <p class="room__desc">${esc(r.desc)}</p>
          <p class="room__meta"><span>${esc(r.floor)}</span><span>窗外 · ${esc(r.view)}</span><span>含双早</span></p>
          <p class="room__price"><b>¥${r.price.toLocaleString('en-US')}</b><span>/ 晚起 · 演示价格</span></p>
          <div class="room__actions"><button type="button" class="btn" data-preview="${r.id}">预览房型</button><button type="button" class="linkbtn" data-pick="${r.id}">选它入住<svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></button></div>
        </div>
      </article>`).join('');
    const list = $('[data-list="rooms"]');
    list.addEventListener('click', e => { const m = e.target.closest('.room__media'); if (m) SG.booking.openRoom(m.dataset.room); });
    list.addEventListener('keydown', e => { const m = e.target.closest('.room__media'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); SG.booking.openRoom(m.dataset.room); } });
  }
  function renderMeals() {
    $('[data-list="meals"]').innerHTML = D.dining.meals.map((m, i) => `
      <article class="meal" data-meal="${m.id}" data-anim style="--d:${i}">
        <figure class="meal__media frame"><img src="${m.photo}" alt="${esc(m.photoAlt)}" loading="lazy" decoding="async"></figure>
        <div class="meal__head">
          <p class="meal__time"><em>${m.name}</em><span>${m.en}</span><b>${m.time}</b></p>
        </div>
        <h3 class="meal__title">${esc(m.title)}</h3>
        <ul class="meal__items">${m.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="meal__price">${esc(m.price)}</p>
      </article>`).join('');
  }
  function renderSpaces() {
    $('[data-list="spaces"]').innerHTML = D.spaces.map((s, i) => `<li><button type="button" data-space="${s.id}" aria-pressed="false"><b>${pad2(i + 1)}</b><span>${s.name}<small>${s.en}</small></span><i>${s.time}</i></button></li>`).join('');
    $('[data-list="spaces"]').addEventListener('click', e => { const b = e.target.closest('[data-space]'); if (b) setSpace(b.dataset.space); });
    setSpace('fireplace', true);
  }
  function setSpace(id, instant) {
    const s = D.spaces.find(x => x.id === id) || D.spaces[0];
    $$('[data-space]').forEach(b => { const on = b.dataset.space === s.id; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    const img = $('#spaceImg'), stage = $('[data-space-stage]'), desc = $('[data-space-desc]');
    const swap = () => {
      img.onload = () => stage.classList.remove('is-switching');
      img.src = s.photo; img.alt = s.alt;
      if (img.complete) stage.classList.remove('is-switching');
      desc.textContent = s.desc; desc.style.opacity = '';
    };
    if (instant || reduce) swap();
    else { stage.classList.add('is-switching'); desc.style.opacity = '0'; setTimeout(swap, 240); }
    $('[data-space-name]').textContent = s.name;
    $('[data-space-time]').textContent = s.time;
  }
  function renderReviews() {
    $('[data-list="reviews"]').innerHTML = D.reviews.map((r, i) => `<article class="review" data-anim style="--d:${i % 3}"><p class="review__text">${esc(r.text)}</p><footer><b>${esc(r.name)}</b><span>${esc(r.city)} · ${r.date} · ${esc(r.room)}</span><em class="review__weather">那天的天气：${esc(r.weather)}</em></footer></article>`).join('');
  }
  function renderRules() {
    $('[data-list="rules"]').innerHTML = D.rules.map((r, i) => `<li class="rule" data-anim style="--d:${i % 2}"><b>${pad2(i + 1)}</b><div><h3>${esc(r.q)}</h3><p>${esc(r.a)}</p></div></li>`).join('');
  }
  function renderCredits() {
    const box = $('[data-list="credits"]');
    if (!box) return;
    const by = new Map(), all = Object.values(SG.credits);
    all.forEach(c => { if (!by.has(c[0])) by.set(c[0], c[2]); });
    box.innerHTML = [...by].map(([name, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a><span>Unsplash</span></li>`).join('');
    const sum = box.parentElement.querySelector('summary');
    if (sum) sum.textContent = `图片署名 · ${all.length} 张来自 ${by.size} 位摄影师（Unsplash）`;
  }

  // ---------- 天气 / 时刻的界面同步 ----------
  function syncWeather(w) {
    const m = D.weather[w];
    $$('[data-weather-btn]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.weatherBtn === w)));
    [['feel', m.feel], ['line', m.line]].forEach(p => { $$(`[data-wx="${p[0]}"]`).forEach(n => { n.textContent = p[1]; }); });
    $$('[data-wx="onsen"]').forEach(n => { n.innerHTML = `<b>今天</b><span>${esc(D.onsen.byWeather[w])}</span>`; });
    $$('.ic--wx use').forEach(n => n.setAttribute('href', '#' + ICONS[w]));
    SG.routes.setWeather(w);
  }

  // ---------- 全屏菜单 ----------
  const sheet = $('#menuSheet'), menuBtn = $('#menuBtn');
  function toggleSheet(open) {
    sheet.hidden = !open;
    document.body.classList.toggle('sheet-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  }
  menuBtn.addEventListener('click', () => toggleSheet(sheet.hidden));

  // ---------- 全局点击 ----------
  document.addEventListener('click', e => {
    const t = sel => e.target.closest(sel);
    let n;
    if ((n = t('[data-weather-btn]'))) { SG.atmo.setWeather(n.dataset.weatherBtn); return; }
    if ((n = t('[data-preview]'))) { SG.booking.openRoom(n.dataset.preview); return; }
    if ((n = t('[data-pick]'))) {
      const room = SG.booking.roomOf(n.dataset.pick);
      SG.booking.set({ roomId: room.id, guests: Math.min(SG.booking.guests, room.sleeps) });
      ui.goTo('#book', 'room'); ui.toast('已选择' + room.name); return;
    }
    if ((n = t('[data-route]')) && !n.closest('#routeMap')) { SG.routes.open(n.dataset.route); return; }
    if ((n = t('[data-goto]'))) { ui.goTo('#' + n.dataset.goto, n.dataset.focus); return; }
    if ((n = t('a[href^="#"]'))) {
      const id = n.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); toggleSheet(false); ui.goTo(id); }
    }
  });

  // ---------- 滚动：顶栏、时钟图标 ----------
  const topbar = $('#topbar');
  let raf = 0;
  function onScroll() {
    topbar.classList.toggle('is-solid', scrollY > innerHeight - 96);
    raf = 0;
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true });

  // ---------- 进场与章节高亮 ----------
  // 阈值取 0：照片的隐藏态是 clip-path 全裁，浏览器会把裁剪算进"可见比例"，阈值大于 0 就永远触发不了
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
  function observeAnims() {
    $$('[data-anim]:not(.in), [data-reveal]:not(.in)').forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.top < innerHeight * .94 && r.bottom > 0) n.classList.add('in');   // 已经在视口里的直接进场，不依赖监听回调
      else io.observe(n);
    });
  }
  const so = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) {
    $$('.nav a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  } }), { rootMargin: '-42% 0px -52% 0px' });
  function observeSections() { $$('main > section[id]').forEach(s => so.observe(s)); }

  // ---------- 启动 ----------
  function boot() {
    renderWx(); renderRooms(); renderMeals(); renderSpaces(); renderReviews(); renderRules(); renderCredits();
    SG.routes.init();
    SG.routes.renderList();
    SG.booking.init();
    SG.atmo.init();
    syncWeather(SG.atmo.to); onScroll();
    SG.atmo.on(syncWeather);
    observeAnims(); observeSections();
    // 首屏之后才出现的图片加载完，时间线锚点要重新量一次，进场动效也要补上
    addEventListener('load', observeAnims, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
