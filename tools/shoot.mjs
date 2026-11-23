// 截图自检：起一个本地静态服务器，用无头 Chrome 把页面的各种状态截下来，并报告控制台错误。
// 用法：
//   npm i --no-save playwright-core        （只用于本脚本，不属于站点）
//   node tools/shoot.mjs                   （默认 all）
//   node tools/shoot.mjs hero|weather|sections|mobile|interact|fit
// 截图输出到 .shots/（已在 .gitignore 里）。需要本机装有 Google Chrome。
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { mkdirSync } from 'fs';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..')); // 先规范化，下面的路径检查才不会被 tools/.. 绊倒
const OUT = join(ROOT, '.shots');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(body); }
  catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/index.html`;

const which = process.argv[2] || 'all';
const run = name => which === 'all' || which === name;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const problems = [];

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: opts.dpr || 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await ctx.newPage();
  page.on('pageerror', e => problems.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('CONSOLE ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => problems.push('REQFAIL ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) problems.push('HTTP ' + r.status() + ' ' + r.url()); });
  const resp = await page.goto(URL_, { waitUntil: 'networkidle' });
  if (!resp.ok() || !(await page.locator('.hero').count())) throw new Error(`页面没有正常加载：HTTP ${resp.status()} ${await page.title()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, name + '.png') });
const instant = (page, y) => page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
const at = async (page, sel, offset = 0) => {
  await page.evaluate(([s, o]) => { const n = document.querySelector(s); window.scrollTo({ top: n.getBoundingClientRect().top + scrollY - 76 + o, behavior: 'instant' }); }, [sel, offset]);
  await page.waitForTimeout(1100);
};
async function sweep(page) { // 逐屏滚一遍，触发所有进场动画
  const h = await page.evaluate(() => document.documentElement.scrollHeight), vh = page.viewportSize().height;
  for (let y = 0; y < h; y += Math.round(vh * .7)) { await instant(page, y); await page.waitForTimeout(220); }
}
// 从固定在顶栏的控件切换，页面不会被滚回顶部
const weather = async (page, w) => { await page.click(`.topbar [data-weather-btn="${w}"]`); await page.waitForTimeout(2100); };
const time = async (page, t) => { await page.click('#clockBtn'); await page.waitForTimeout(250); await page.click(`#timePop [data-time-btn="${t}"]`); await page.keyboard.press('Escape'); await page.waitForTimeout(1600); };
const state = page => page.evaluate(() => ({ 天气: document.documentElement.dataset.weather, 时刻: document.documentElement.dataset.time, 时钟: document.querySelector('.atmo [data-clock]').textContent }));
const SECTIONS = ['story', 'rooms', 'onsen', 'dining', 'spaces', 'routes', 'reviews', 'rules', 'book'];

if (run('hero')) {
  for (const [name, vp] of [['desk', { width: 1440, height: 900 }], ['wide', { width: 1920, height: 1080 }], ['laptop', { width: 1280, height: 660 }]]) {
    const p = await open(vp); await shot(p, `hero-${name}`); await p.close();
  }
  const p = await open({ width: 390, height: 844 }, { mobile: true, dpr: 2 }); await shot(p, 'hero-mobile'); await p.close();
  const t = await open({ width: 768, height: 1024 }, { mobile: true }); await shot(t, 'hero-tablet'); await t.close();
}
if (run('weather')) {
  const p = await open({ width: 1440, height: 900 });
  for (const w of ['sunny', 'rainy', 'snowy']) {
    await weather(p, w);
    for (const t of ['dawn', 'day', 'dusk', 'night']) { await time(p, t); await shot(p, `hero-${w}-${t}`); }
  }
  await p.close();
}
if (run('sections')) {
  const p = await open({ width: 1440, height: 900 });
  await sweep(p);
  for (const id of SECTIONS) { await at(p, '#' + id); await shot(p, `section-${id}`); console.log(id.padEnd(9), JSON.stringify(await state(p))); }
  await p.close();
}
if (run('mobile')) {
  const p = await open({ width: 390, height: 844 }, { mobile: true, dpr: 2 });
  await sweep(p);
  for (const id of SECTIONS) { await at(p, '#' + id); await shot(p, `mobile-${id}`); }
  await p.close();
}
if (run('interact')) {
  const p = await open({ width: 1440, height: 900 });
  await sweep(p);
  await at(p, '#rooms', 430); await p.hover('.room[data-room="wuqi"]'); await p.waitForTimeout(900); await shot(p, 'interact-room-hover');
  await p.click('.room[data-room="wuqi"] [data-preview]'); await p.waitForTimeout(900); await shot(p, 'interact-room-preview'); await p.keyboard.press('Escape');
  await at(p, '#routes', 470); await p.hover('.route[data-route-item="ridge"]'); await p.waitForTimeout(700); await shot(p, 'interact-route-focus');
  await p.click('.route[data-route-item="ridge"] [data-route]'); await p.waitForTimeout(1000); await shot(p, 'interact-route-viewer'); await p.keyboard.press('Escape');
  await at(p, '#book'); await p.click('[data-reserve]'); await p.waitForTimeout(800); await shot(p, 'interact-reserve');
  await p.click('.reserve form .check'); await p.click('.reserve form button[type="submit"]'); await p.waitForTimeout(1000); await shot(p, 'interact-reserve-done'); await p.keyboard.press('Escape');
  await weather(p, 'snowy'); await time(p, 'night'); await at(p, '#onsen'); await shot(p, 'interact-onsen-snow-night');
  await p.close();
}
if (run('fit')) {
  // 首屏的预约条要完整落在首屏内，页面不能有横向滚动
  for (const [w, h] of [[320, 568], [360, 640], [360, 780], [390, 844], [414, 896], [667, 375], [768, 1024], [844, 390], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]]) {
    const p = await open({ width: w, height: h }, { mobile: w < 900 });
    const r = await p.evaluate(() => { const b = document.querySelector('.bookbar').getBoundingClientRect(); return { vh: innerHeight, bar: Math.round(b.bottom), sw: document.documentElement.scrollWidth }; });
    const ok = r.bar <= r.vh && r.sw <= w;
    if (!ok) problems.push(`LAYOUT ${w}x${h}: 预约条底 ${r.bar}/${r.vh}, scrollWidth ${r.sw}`);
    console.log(`${String(w).padStart(4)}×${h}`.padEnd(11), ok ? '首屏完整，无横向溢出' : `预约条超出 ${r.bar - r.vh}px，scrollWidth ${r.sw}`);
    await p.close();
  }
}
await browser.close();
server.close();
console.log(problems.length ? '发现问题：\n' + [...new Set(problems)].join('\n') : '自检通过：没有控制台错误、失败请求或布局溢出');
