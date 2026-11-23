/* 山谷留宿 · 页面逻辑
 * 渲染各章节、顶栏、时间线侧栏、弹层与提示、首屏视差，并把天气 / 时刻引擎和各模块接起来。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data, reduce = SG.atmo.reduce;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const TIMES = ['dawn', 'day', 'dusk', 'night'];
  const ICONS = { sunny: 'i-sun', rainy: 'i-rain', snowy: 'i-snow' };
  const timeKey = () => TIMES[Math.round(((SG.atmo.phase % 4) + 4) % 4) % 4];

  // ---------- 弹层与提示 ----------
  const ui = SG.ui = {};
  const modal = $('#modal'), card = $('#modalCard'), toastEl = $('#toast');
  let lastFocus = null, toastT = 0;
  card.setAttribute('tabindex', '-1');
  ui.icon = w => `<svg class="ic" aria-hidden="true"><use href="#${ICONS[w] || 'i-sun'}"/></svg>`;
  function fill(html) {
    card.innerHTML = html;
    card.insertAdjacentHTML('afterbegin', '<button type="button" class="modal__x" data-close aria-label="关闭"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>');
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
    if (e.key === 'Escape') { if (!modal.hidden) ui.close(); else if (!pop.hidden) togglePop(false); else if (!sheet.hidden) toggleSheet(false); return; }
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
  function renderRooms() {
    $('[data-list="rooms"]').innerHTML = D.rooms.map((r, i) => `
      <article class="room" tabindex="0" data-room="${r.id}" data-anim style="--d:${i}" aria-label="${esc(r.name)}，${r.size} 平方米，${esc(r.bed)}，可住 ${r.sleeps} 人">
        <figure class="room__media ph-tint"><img class="ph" src="${r.photo}" alt="${esc(r.photoAlt)}" loading="lazy" decoding="async"><span class="room__no">${pad2(i + 1)}</span>
          <div class="room__panel" role="group" aria-label="${esc(r.name)}的面积、床型与设施">
            <dl class="spec"><div><dt>面积</dt><dd>${r.size} m²</dd></div><div><dt>床型</dt><dd>${esc(r.bed)}</dd></div><div><dt>可住</dt><dd>${r.sleeps} 人</dd></div></dl>
            <ul class="chips">${r.amenities.slice(0, 6).map(a => `<li>${esc(a)}</li>`).join('')}</ul>
            <button type="button" class="linkbtn" data-preview="${r.id}">预览房型<svg class="ic"><use href="#i-arrow"/></svg></button>
          </div>
        </figure>
        <div class="room__foot"><h3 class="room__name">${r.name}</h3><p class="room__price"><b>${r.price.toLocaleString('zh-CN')}</b>元 / 晚起</p><p class="room__en">${r.en}</p><p class="room__line">${esc(r.line)}</p></div>
      </article>`).join('');
    // 触屏没有悬停：第一下点开详情，第二下再点"预览房型"
    if (matchMedia('(hover: none)').matches) {
      $('[data-list="rooms"]').addEventListener('click', e => {
        const c = e.target.closest('.room');
        if (!c) return;
        $$('.room.is-open').forEach(o => { if (o !== c) o.classList.remove('is-open'); });
        c.classList.add('is-open');
      });
    }
  }
  function renderMeals() {
    $('[data-list="meals"]').innerHTML = D.dining.meals.map((m, i) => `
      <article class="meal" data-meal="${m.id}" data-anim style="--d:${i}">
        <figure class="meal__media ph-tint"><img class="ph" src="${m.photo}" alt="${esc(m.photoAlt)}" loading="lazy" decoding="async"></figure>
        <div class="meal__body">
          <p class="meal__time"><svg class="ic" aria-hidden="true"><use href="#i-clock"/></svg>${m.time}<em>${m.name}</em><span>${m.en}</span><b class="meal__now">此刻</b></p>
          <h3 class="meal__title">${esc(m.title)}</h3>
          <ul class="meal__items">${m.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
          <p class="meal__price">${m.price}</p>
        </div>
      </article>`).join('');
  }
  const SPACE_CAP = { fireplace: '炉火正旺', table: '长桌开席', engawa: '檐下有风', library: '适合窝一下午', irori: '火塘生起来了' };
  function renderSpaces() {
    $('[data-list="spaces"]').innerHTML = D.spaces.map((s, i) => `<li><button type="button" class="space" data-space="${s.id}" aria-pressed="false"><b>${pad2(i + 1)}</b><span>${s.name}<small>${s.en}</small></span><i>${s.time}</i></button></li>`).join('');
    $('[data-list="spaces"]').addEventListener('click', e => { const b = e.target.closest('.space'); if (b) setSpace(b.dataset.space); });
    setSpace('fireplace', true);
  }
  function setSpace(id, instant) {
    const s = D.spaces.find(x => x.id === id) || D.spaces[0];
    $$('.space').forEach(b => { const on = b.dataset.space === s.id; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    const img = $('#spaceImg'), stage = $('[data-space-stage]');
    const swap = () => {
      img.onload = () => stage.classList.remove('is-switching');
      img.src = s.photo; img.alt = s.alt;
      if (img.complete) stage.classList.remove('is-switching');
    };
    if (instant || reduce) swap(); else { stage.classList.add('is-switching'); setTimeout(swap, 240); }
    $('[data-space-name]').textContent = s.name;
    $('[data-space-title]').textContent = s.name;
    $('[data-space-desc]').textContent = s.desc;
    $('[data-space-time]').textContent = s.time;
    $('[data-space-cap]').textContent = SPACE_CAP[s.id] || '';
    stage.dataset.glow = s.id === 'fireplace' ? 'hearth' : s.id === 'irori' ? 'irori' : 'off';
  }
  function renderWx() {
    $('[data-list="wx"]').innerHTML = ['sunny', 'rainy', 'snowy'].map(w => {
      const m = D.weather[w];
      return `<button type="button" class="wxcard" data-weather-btn="${w}" aria-label="切换到${m.label}天"><img class="ph" src="${m.img}" alt="${esc(m.imgAlt)}" loading="lazy" decoding="async"><span class="wxcard__on">此刻</span><b>${m.label}</b><small>${m.temp} · ${m.feel}</small></button>`;
    }).join('');
  }
  function renderReviews() {
    $('[data-list="reviews"]').innerHTML = D.reviews.map((r, i) => `<article class="review" data-anim style="--d:${i}"><span class="review__pin" aria-hidden="true"></span><p class="review__text">${esc(r.text)}</p><footer><b>${esc(r.name)}</b><span>${esc(r.city)} · ${r.date} · ${esc(r.room)}</span><em class="review__weather">那天的天气：${esc(r.weather)}</em></footer></article>`).join('');
  }
  function renderRules() {
    $('[data-list="rules"]').innerHTML = D.rules.map(r => `<details><summary>${esc(r.q)}</summary><p>${esc(r.a)}</p></details>`).join('');
    const first = $('[data-list="rules"] details');
    if (first) first.open = true;
  }

  // ---------- 天气 / 时刻的界面同步 ----------
  function syncWeather(w) {
    const m = D.weather[w];
    $$('[data-weather-btn]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.weatherBtn === w)));
    [['temp', m.temp], ['hum', m.hum], ['wind', m.wind], ['feel', m.feel], ['line', m.line], ['label', m.label]].forEach(p => { $$(`[data-wx="${p[0]}"]`).forEach(n => { n.textContent = p[1]; }); });
    $$('[data-wx="onsen"]').forEach(n => { n.innerHTML = `<b>今天</b><span>${esc(D.onsen.byWeather[w])}</span>`; });
    SG.routes.setWeather(w);
    $$('.wxcard').forEach(c => c.classList.toggle('is-current', c.dataset.weatherBtn === w));
  }
  function syncTime() {
    const a = SG.atmo;
    $$('[data-time-btn]').forEach(b => b.setAttribute('aria-checked', String(a.mode === 'auto' ? b.dataset.timeBtn === 'auto' : b.dataset.timeBtn === a.fixed)));
  }
  function syncClockIcon() {
    const k = timeKey(), href = k === 'night' || k === 'dusk' ? '#i-moon' : '#i-sun';
    $$('.ic--time use').forEach(n => n.setAttribute('href', href));
  }

  // ---------- 时刻弹层、全屏菜单 ----------
  const pop = $('#timePop'), clockBtn = $('#clockBtn'), sheet = $('#menuSheet'), menuBtn = $('#menuBtn');
  function togglePop(open) { pop.hidden = !open; clockBtn.setAttribute('aria-expanded', String(open)); }
  function toggleSheet(open) {
    sheet.hidden = !open;
    document.body.classList.toggle('sheet-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  }
  clockBtn.addEventListener('click', e => { e.stopPropagation(); toggleSheet(false); togglePop(pop.hidden); });
  document.addEventListener('click', e => { if (!pop.hidden && !e.target.closest('#timePop') && !e.target.closest('#clockBtn')) togglePop(false); });

  // ---------- 全局点击 ----------
  document.addEventListener('click', e => {
    const t = sel => e.target.closest(sel);
    let n;
    if ((n = t('[data-weather-btn]'))) { SG.atmo.setWeather(n.dataset.weatherBtn); return; }
    if ((n = t('[data-time-btn]'))) { SG.atmo.setTime(n.dataset.timeBtn); syncTime(); return; }
    if ((n = t('[data-preview]'))) { SG.booking.openRoom(n.dataset.preview); return; }
    if ((n = t('[data-route]')) && !n.closest('#routeMap')) { SG.routes.open(n.dataset.route); return; }
    if ((n = t('[data-goto]'))) { ui.goTo('#' + n.dataset.goto, n.dataset.focus); return; }
    if ((n = t('a[href^="#"]'))) {
      const id = n.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); toggleSheet(false); ui.goTo(id); }
    }
  });

  // ---------- 滚动：顶栏、时间线、首屏视差 ----------
  const topbar = $('#topbar'), rail = $('#rail'), hero = $('.hero');
  let sy = -1, lastKey = '';
  function onScroll() {
    const y = scrollY, h = innerHeight;
    topbar.classList.toggle('is-solid', y > h - 96);
    rail.classList.toggle('is-on', y > h * .9);
    hero.classList.toggle('is-off', y > h * 1.05);
    if (y !== sy) { sy = y; hero.style.setProperty('--sy', Math.min(y, h) + 'px'); }
    const k = timeKey();
    if (k !== lastKey) { lastKey = k; syncClockIcon(); }
  }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  if (matchMedia('(pointer: fine)').matches && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => {
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      hero.style.setProperty('--mx', cx.toFixed(4)); hero.style.setProperty('--my', cy.toFixed(4));
      raf = Math.abs(tx - cx) > .001 || Math.abs(ty - cy) > .001 ? requestAnimationFrame(loop) : 0;
    };
    hero.addEventListener('pointermove', e => { const b = hero.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width * 2 - 1; ty = (e.clientY - b.top) / b.height * 2 - 1; if (!raf) raf = requestAnimationFrame(loop); });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  }
  menuBtn.addEventListener('click', () => toggleSheet(sheet.hidden));

  // ---------- 进场与章节高亮 ----------
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .06 });
  function observeAnims() {
    $$('[data-anim]').forEach(n => {
      if (!n.style.getPropertyValue('--d')) { const sib = $$('[data-anim]', n.parentElement); n.style.setProperty('--d', sib.indexOf(n)); }
      io.observe(n);
    });
  }
  const so = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) {
    $$('.nav a, .rail a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
  } }), { rootMargin: '-42% 0px -52% 0px' });
  function observeSections() { $$('main > section[id]').forEach(s => so.observe(s)); }

  // ---------- 启动 ----------
  function boot() {
    const HERO = ['sky', 'r5', 'fog1', 'r4', 'fog2', 'r3', 'fog3', 'r2', 'heroMid', 'fog4', 'fore', 'fireflies', 'glassRain'];
    SG.scene.mount($('#heroSvg'), HERO);
    SG.scene.mount($('.porthole .vista'), HERO.filter(n => n !== 'glassRain'));
    SG.scene.mount($('.onsen__scene .vista'), ['sky', 'r5', 'fog1', 'r4', 'fog2', 'r3', 'fog3', 'onsenFore']);
    SG.scene.frame($('#heroSvg'));

    renderRooms(); renderMeals(); renderSpaces(); renderWx(); renderReviews(); renderRules();
    SG.routes.init();
    SG.routes.renderList();
    SG.booking.init();
    SG.atmo.init();
    syncWeather(SG.atmo.to); syncTime(); onScroll();
    SG.atmo.on(syncWeather);
    observeAnims(); observeSections();
    // 首屏之后才出现的图片加载完，时间线锚点要重新量一次
    addEventListener('load', () => { SG.atmo.measure(); observeAnims(); }, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
