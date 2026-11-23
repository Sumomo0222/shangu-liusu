/* 山谷留宿 · 日期选择、房型预览与预约演示
 * 房态是按日期确定地生成的演示数据（刷新不变）；预约只在本页面内完成，不会发送到任何地方。 */
window.SG = window.SG || {};
(function () {
  'use strict';
  const D = SG.data;
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const fmt = d => (d.getMonth() + 1) + '月' + d.getDate() + '日';
  const fmtW = d => '周' + WEEK[d.getDay()];
  const money = n => '¥' + n.toLocaleString('zh-CN');
  const roomOf = id => D.rooms.find(r => r.id === id) || D.rooms[0];
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const STATE = { free: '可预订', few: '仅剩 1 间', full: '已订满', closed: '不开放' };

  const LEAD = 3;        // 最早可订：今日之后第 3 天
  const HORIZON = 120;   // 往后开放的天数

  // 演示房态：同一天同一房型的结果固定，所以刷新页面不会变
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function avail(date, roomId) {
    const diff = Math.round((date - today()) / DAY);
    if (diff < LEAD || diff > HORIZON) return 'closed';
    if (date.getMonth() === 11 && date.getDate() >= 8 && date.getDate() <= 12) return 'closed'; // 年度检修
    if (date.getDay() === 2) return 'closed';                                                 // 周二主人休息
    const h = hash(key(date) + ':' + roomId);
    return h < .14 ? 'full' : h < .34 ? 'few' : 'free';
  }
  const selectable = (date, roomId) => { const a = avail(date, roomId); return a === 'free' || a === 'few'; };

  const st = SG.booking = { checkIn: null, checkOut: null, roomId: D.rooms[0].id, guests: 2, dinner: true, pickup: false, subs: [] };
  function set(patch) { Object.assign(st, patch); st.subs.forEach(fn => fn(st)); }
  st.set = set;
  st.on = fn => st.subs.push(fn);
  st.money = money; st.fmt = fmt; st.roomOf = roomOf; st.quote = quote; st.selectable = selectable;

  function nights() {
    const out = [];
    if (!st.checkIn || !st.checkOut) return out;
    for (let d = new Date(st.checkIn); d < st.checkOut; d = new Date(+d + DAY)) out.push(new Date(d));
    return out;
  }
  function quote() {
    const room = roomOf(st.roomId), ns = nights();
    const rows = ns.map(d => { const w = d.getDay() === 5 || d.getDay() === 6; return { date: d, label: fmt(d) + ' ' + fmtW(d), amount: w ? room.weekend : room.price, w }; });
    const roomTotal = rows.reduce((s, r) => s + r.amount, 0);
    const dinner = st.dinner && ns.length ? 288 * st.guests * ns.length : 0;
    const pickup = st.pickup ? 120 : 0;
    return { room, ns, rows, roomTotal, dinner, pickup, total: roomTotal + dinner + pickup };
  }
  const datesOk = roomId => !!st.checkIn && nights().every(d => selectable(d, roomId)) && selectable(st.checkIn, roomId);

  // ---------- 日历 ----------
  let calEl = null, view = null;
  const months = () => innerWidth > 640 ? 2 : 1;
  const shift = (y, m, n) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; };

  function renderCal() {
    if (!calEl) return;
    const active = document.activeElement;
    const refocus = active && calEl.contains(active) ? (active.dataset.date ? '[data-date="' + active.dataset.date + '"]' : active.dataset.cal ? '[data-cal="' + active.dataset.cal + '"]' : null) : null;
    const n = months(), t = today();
    let html = '<div class="cal__bar"><span class="cal__hint">先选入住日，再选离店日。</span><div class="cal__nav"><button type="button" data-cal="-1" aria-label="往前翻">←</button><button type="button" data-cal="1" aria-label="往后翻">→</button></div></div><div class="cal__months">';
    for (let i = 0; i < n; i++) {
      const d = new Date(view.y, view.m + i, 1), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      html += `<section class="cal__month" aria-label="${d.getFullYear()}年${d.getMonth() + 1}月"><h4 class="cal__title">${d.getFullYear()}年${d.getMonth() + 1}月<small>${MONTHS_EN[d.getMonth()]}</small></h4><div class="cal__grid">`;
      WEEK.forEach((w, k) => { html += `<span class="cal__dow${k === 0 || k === 6 ? ' cal__dow--end' : ''}" aria-hidden="true">${w}</span>`; });
      for (let b = 0; b < d.getDay(); b++) html += '<span class="day day--blank" aria-hidden="true"></span>';
      for (let day = 1; day <= last; day++) {
        const date = new Date(d.getFullYear(), d.getMonth(), day), k = key(date), a = avail(date, st.roomId);
        const isStart = +date === +st.checkIn, isEnd = +date === +st.checkOut;
        const cls = ['day', 'day--' + a];
        if (isStart) cls.push('is-start');
        if (isEnd) cls.push('is-end');
        if (!isStart && !isEnd && st.checkIn && st.checkOut && date > st.checkIn && date < st.checkOut) cls.push('is-in');
        if (+date === +t) cls.push('is-today');
        const label = fmt(date) + ' ' + fmtW(date) + '，' + STATE[a] + (isStart ? '，入住日' : '') + (isEnd ? '，离店日' : '');
        html += `<button type="button" class="${cls.join(' ')}" data-date="${k}" aria-label="${label}" aria-pressed="${isStart || isEnd}"${a === 'closed' || a === 'full' ? ' disabled' : ''}><span>${day}</span></button>`;
      }
      html += '</div></section>';
    }
    html += '</div>';
    calEl.innerHTML = html;
    const first = new Date(view.y, view.m, 1), min = new Date(t.getFullYear(), t.getMonth(), 1);
    const lastDay = new Date(+t + HORIZON * DAY), max = new Date(lastDay.getFullYear(), lastDay.getMonth() - (n - 1), 1);
    calEl.querySelector('[data-cal="-1"]').disabled = first <= min;
    calEl.querySelector('[data-cal="1"]').disabled = first >= max;
    if (refocus) { const f = calEl.querySelector(refocus); if (f && !f.disabled) f.focus({ preventScroll: true }); }
  }

  function pick(d) {
    const say = m => { if (SG.ui) SG.ui.toast(m); };
    if (!st.checkIn || st.checkOut) { set({ checkIn: d, checkOut: null }); return; }   // 开始一次新的选择
    if (+d === +st.checkIn) {                                                          // 再点一次入住日 = 住一晚
      const next = new Date(+d + DAY);
      if (selectable(next, st.roomId)) set({ checkOut: next }); else say('第二天已经订满，换一天离店吧。');
      return;
    }
    if (d < st.checkIn) { set({ checkIn: d, checkOut: null }); return; }
    for (let x = new Date(+st.checkIn + DAY); x < d; x = new Date(+x + DAY)) {
      if (!selectable(x, st.roomId)) { set({ checkIn: d, checkOut: null }); say('这两天之间有住不了的日期，已把它设为新的入住日。'); return; }
    }
    set({ checkOut: d });
  }

  // 默认替访客选好一个周末，页面一打开就有完整的报价可看
  function preset() {
    const t = today();
    for (let i = 6; i < 45; i++) {
      const d = new Date(+t + i * DAY);
      if (d.getDay() !== 5 || !selectable(d, st.roomId)) continue;
      const a = new Date(+d + DAY), b = new Date(+d + 2 * DAY);
      if (selectable(a, st.roomId) && selectable(b, st.roomId)) { st.checkIn = d; st.checkOut = b; return; }
    }
  }

  // ---------- 右侧面板 ----------
  function renderRoompick() {
    const box = document.querySelector('[data-list="roompick"]');
    box.innerHTML = D.rooms.map(r => `<label><input type="radio" name="roompick" value="${r.id}"${r.id === st.roomId ? ' checked' : ''}><img class="ph" src="${r.photo}" alt="" loading="lazy" decoding="async"><span><b>${r.name}</b><small>${r.sleeps} 人 · ${r.size} m² · ${esc(r.bed.split('+')[0])}</small></span><i><b>${r.price.toLocaleString('zh-CN')}</b> / 晚起</i></label>`).join('');
    box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
      const ok = datesOk(inp.value), room = roomOf(inp.value);
      set(ok ? { roomId: inp.value, guests: Math.min(st.guests, room.sleeps) } : { roomId: inp.value, guests: Math.min(st.guests, room.sleeps), checkIn: null, checkOut: null });
      if (!ok && SG.ui) SG.ui.toast('这个房型在原来的日期已经订满，请重新选日期。');
      renderCal();
    }));
  }
  function renderQuote() {
    const box = document.querySelector('[data-quote]'), q = quote();
    if (!q.ns.length) { box.innerHTML = '<p class="quote__empty">先在左边选一个入住和离店日期，这里会算出演示总价。</p>'; return; }
    let html = q.rows.map(r => `<div class="quote__row"><dt>${r.label}${r.w ? ' · 周末价' : ''}</dt><dd>${money(r.amount)}</dd></div>`).join('');
    if (q.dinner) html += `<div class="quote__row"><dt>山食晚餐 × ${st.guests} 人 × ${q.ns.length} 晚</dt><dd>${money(q.dinner)}</dd></div>`;
    if (q.pickup) html += '<div class="quote__row"><dt>小镇接送 × 1 次</dt><dd>' + money(q.pickup) + '</dd></div>';
    box.innerHTML = html + `<div class="quote__total"><dt>合计<small>演示价格</small></dt><dd>${money(q.total)}</dd></div>`;
  }
  function renderSums() {
    const room = roomOf(st.roomId), q = quote();
    const dates = q.ns.length ? `${fmt(st.checkIn)} – ${fmt(st.checkOut)} · ${q.ns.length} 晚` : '选择日期';
    document.querySelectorAll('[data-sum="dates"]').forEach(n => { n.textContent = dates; });
    document.querySelectorAll('[data-sum="room"]').forEach(n => { n.textContent = room.name; });
    document.querySelectorAll('[data-sum="guests"]').forEach(n => { n.textContent = st.guests + ' 位'; });
    const btn = document.querySelector('[data-reserve]');
    if (btn) btn.disabled = !q.ns.length;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- 房型预览 ----------
  function openRoom(id) {
    const r = roomOf(id);
    const html = `<div class="roomview">
      <div class="roomview__gallery"><img class="roomview__main ph" src="${r.gallery[0].src}" alt="${esc(r.gallery[0].alt)}"><div class="roomview__thumbs">${r.gallery.map((g, i) => `<button type="button" data-thumb="${i}" aria-pressed="${i === 0}" aria-label="看第 ${i + 1} 张"><img class="ph" src="${g.src}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div></div>
      <div class="roomview__body">
        <p class="kicker"><b>房型预览</b><i>ROOM PREVIEW</i></p>
        <h3 class="modal__title" id="modalTitle">${r.name}</h3>
        <p class="roomview__en">${r.en}</p>
        <p class="roomview__line">${esc(r.line)}</p>
        <dl class="spec"><div><dt>面积</dt><dd>${r.size} m²</dd></div><div><dt>床型</dt><dd>${esc(r.bed)}</dd></div><div><dt>可住</dt><dd>${r.sleeps} 人</dd></div><div><dt>位置</dt><dd>${esc(r.floor)}</dd></div><div><dt>窗外</dt><dd>${esc(r.view)}</dd></div><div><dt>早餐</dt><dd>含双早</dd></div></dl>
        <p class="roomview__desc">${esc(r.desc)}</p>
        <ul class="chips">${r.amenities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
        <div class="roomview__foot"><p class="roomview__price"><b>${money(r.price)}</b>/ 晚起<small>周末 ${money(r.weekend)} · 演示价格</small></p><button type="button" class="btn btn--primary" data-pick-room="${r.id}">选择此房型</button></div>
      </div></div>`;
    SG.ui.openModal('room', html, card => {
      const main = card.querySelector('.roomview__main');
      card.addEventListener('click', e => {
        const t = e.target.closest('[data-thumb]');
        if (t) {
          const g = r.gallery[+t.dataset.thumb];
          main.src = g.src; main.alt = g.alt;
          card.querySelectorAll('[data-thumb]').forEach(b => b.setAttribute('aria-pressed', b === t));
          return;
        }
        const b = e.target.closest('[data-pick-room]');
        if (b) {
          const room = roomOf(b.dataset.pickRoom);
          set({ roomId: room.id, guests: Math.min(st.guests, room.sleeps) });
          SG.ui.close(); SG.ui.goTo('#book', 'room');
          SG.ui.toast('已选择' + room.name + (datesOk(room.id) ? '' : '，请再确认日期'));
        }
      });
    });
  }

  // ---------- 预约演示 ----------
  function openReserve() {
    const q = quote();
    if (!q.ns.length) { SG.ui.toast('先选一个入住日期。'); SG.ui.goTo('#book', 'calendar'); return; }
    const rows = [
      ['入住', fmt(st.checkIn) + ' ' + fmtW(st.checkIn) + ' · 15:00 后'],
      ['离店', fmt(st.checkOut) + ' ' + fmtW(st.checkOut) + ' · 11:00 前'],
      ['晚数', q.ns.length + ' 晚'],
      ['房型', q.room.name + ' · ' + st.guests + ' 位'],
      ['房费', money(q.roomTotal)],
      ['山食晚餐', q.dinner ? money(q.dinner) : '不含'],
      ['小镇接送', q.pickup ? money(q.pickup) : '不含']
    ];
    const summaryHTML = total => `<dl class="summary">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}<div class="is-total"><dt>合计<small> · 演示价格</small></dt><dd>${money(total)}</dd></div></dl>`;
    const html = `<div class="reserve">
      <p class="kicker"><b>09</b><span>预约入住</span><i>DEMO BOOKING</i></p>
      <h3 class="modal__title" id="modalTitle">确认这几天的山谷</h3>
      <div class="reserve__grid">
        ${summaryHTML(q.total)}
        <form class="reserve__form" novalidate>
          <label>称呼（选填）<input name="name" type="text" autocomplete="off" maxlength="20" placeholder="怎么称呼你"></label>
          <label>手机（选填）<input name="phone" type="tel" autocomplete="off" inputmode="tel" maxlength="20" placeholder="演示，请勿填写真实号码"></label>
          <label class="check"><input type="checkbox" name="agree" required><span></span>我知道这是演示预约，不会产生真实预订</label>
          <button type="submit" class="btn btn--primary btn--wide">确认预约<em>演示</em></button>
        </form>
      </div></div>`;
    SG.ui.openModal('reserve', html, (card, rerender) => {
      const form = card.querySelector('form');
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (!form.agree.checked) { form.agree.focus(); SG.ui.toast('请先勾选"我知道这是演示预约"。'); return; }
        const code = 'DEMO-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
        const name = form.name.value.trim();
        rerender(`<div class="reserve__done">
          <div class="done__seal">已登记</div>
          <h3 class="modal__title" id="modalTitle">${name ? esc(name) + '，' : ''}预约已登记</h3>
          <p class="code">${code}</p>
          ${summaryHTML(q.total)}
          <p class="note">这是一次演示预约：信息只留在这个页面里，没有发送到任何服务器，也不会产生真实预订。关掉页面后就不会再保留。</p>
          <button type="button" class="btn btn--ink" data-close>好的</button></div>`);
      });
    });
  }

  function init() {
    calEl = document.querySelector('[data-calendar]');
    preset();
    view = (() => { const d = st.checkIn || new Date(+today() + 9 * DAY); return { y: d.getFullYear(), m: d.getMonth() }; })();
    renderRoompick(); renderCal(); renderQuote(); renderSums();
    st.on(() => { renderCal(); renderQuote(); renderSums(); });

    calEl.addEventListener('click', e => {
      const nav = e.target.closest('[data-cal]');
      if (nav && !nav.disabled) { view = shift(view.y, view.m, +nav.dataset.cal * months()); renderCal(); return; }
      const b = e.target.closest('.day[data-date]');
      if (b && !b.disabled) pick(fromKey(b.dataset.date));
    });
    document.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const max = roomOf(st.roomId).sleeps;
      set({ guests: Math.min(max, Math.max(1, st.guests + +b.dataset.step)) });
    }));
    document.querySelectorAll('[data-addon]').forEach(c => c.addEventListener('change', () => set({ [c.dataset.addon]: c.checked })));
    document.querySelector('[data-reserve]').addEventListener('click', openReserve);
  }
  SG.booking.init = init;
  SG.booking.openRoom = openRoom;
})();
