# 山谷留宿 VALLEY STAY · 山间民宿官网落地页（演示）

> 「山谷留宿」是一家**虚构的**民宿。品牌故事、地址、价格、可订日期、路线与住客评价均为演示内容，
> 不对应任何真实商家；预约是纯前端演示，不会向任何服务器发送或存储数据。
> 页面照片来自 Unsplash（Unsplash License），仅作氛围示意，并非民宿实景。

**在线访问：https://sumomo0222.github.io/shangu-liusu/**

无框架、无构建、无外部依赖。所有图片和字体都随站点一起托管，离线也能完整运行。

## 怎么玩

- **首屏是一扇窗。** 木窗框、会摆动的纱帘、窗台上冒热气的茶杯，窗外是程序化绘制的山谷：层峦、雾带、亮着灯的木屋、冒着蒸汽的汤池。鼠标移动和滚动时各层有轻微视差。
- **切换天气：晴 / 雨 / 雪。** 首屏卡片、顶栏、路线一节的三张天气卡都能切。窗外场景、照片的调色、飘在页面上的雨丝或雪花、路线建议会一起变。
- **往下滚 = 在民宿过一天。** 顶栏的时钟跟着滚动走：清晨 → 白天 → 黄昏 → 夜里 → 次日清晨。窗外和圆窗里的天色、亮灯、星空同步变化；餐食一节会高亮"此刻"吃到的那一餐。点顶栏的时钟可以固定在某个时刻，或点"跟着页面走"恢复。
- **房型。** 卡片悬停（触屏轻点、键盘 Tab 聚焦）会展开面积、床型、可住人数和设施；"预览房型"打开带图集的详情，可以一键带入预约。
- **温泉 · 餐食 · 公共空间 · 周边路线** 依次展开。公共空间的索引可以切换照片，壁炉照片上有一层闪烁的火光。
- **路线。** 手绘等高线地图，悬停列表或地图会互相高亮；"查看路线"打开查看器：地图、可滑动读数的高度剖面、途经点、按当前天气给出的走法。
- **预约演示。** 日历区间选择（房态是按日期确定生成的演示数据）、房型、人数、加项与合计，确认后生成演示预约编号。

## 本地运行

```bash
cd shangu-liusu
python3 -m http.server 8080
# 打开 http://localhost:8080
```

也可以直接双击 `index.html`（`file://` 下同样可用）。

## 目录结构

```
index.html              页面结构、全局 SVG（渐变 / Logo / 图标）
assets/css/scene.css    场景：视差、雾、蒸汽、炉火、窗帘、木窗框、雨滴
assets/css/style.css    版式与各章节、组件、响应式
assets/js/data.js       全部内容与调色板（改文案从这里开始）
assets/js/scene.js      场景几何：用固定随机种子生成山谷、木屋、汤池、冷杉
assets/js/atmosphere.js 天气 × 时刻引擎：调色插值、滚动时钟、雨雪粒子
assets/js/booking.js    日历、报价、房型预览、预约演示
assets/js/routes.js     等高线地图、路线列表、路线查看器
assets/js/app.js        渲染各章节、弹层、导航、视差，把各模块接起来
assets/fonts/           自托管字体子集与 fonts.css、LICENSE.md
assets/img/             42 张 WebP 照片
tools/build-fonts.py    按页面用字重建字体子集
tools/shoot.mjs         截图自检脚本
tools/photo-manifest.json  照片与 Unsplash 图片 ID 的对应表
```

## 改内容

- **文案、房型、餐食、路线、规则、评价、天气信息**：都在 `assets/js/data.js`，按区块分好组。列表类内容由脚本渲染，改完刷新即可。
- **天气与时刻的颜色**：`data.js` 里的 `palettes`，每种天气 × 四个时刻各一组，共 52 个通道。颜色在 Oklab 空间里插值，改 hex 即可。
- **滚动时钟**：`atmosphere.js` 的 `TIMELINE` 列出每个章节对应一天里的哪个时刻（0–4 为一天，4 之后是次日）；每个时刻的钟点在 `data.js` 的 `clockAt`。
- **场景形状**：`scene.js` 顶部的 `RIDGES` 是各层山脊的控制点，其余几何用固定的随机种子生成，同样的代码每次画出同样的山谷。
- **改了文字之后要重建字体**（字体是按页面实际用字裁的子集）：

  ```bash
  pip install fonttools brotli
  # 先按脚本开头的说明下载四款源字体到某个目录，然后：
  python3 tools/build-fonts.py <源字体目录>
  ```

## 自检

```bash
npm i --no-save playwright-core   # 仅供下面的脚本使用
node tools/shoot.mjs              # 全部：首屏、12 种天气×时刻、各章节、手机端、交互、首屏适配
node tools/shoot.mjs fit          # 只检查 12 种视口下首屏是否完整、有无横向溢出
```

截图写到 `.shots/`，结束时报告控制台错误、失败请求和布局溢出。需要本机装有 Google Chrome。

## 照片与字体

- 照片来自 Unsplash，按 Unsplash License 使用（可免费商用、无需署名）。每张图对应的 Unsplash 图片 ID 见 `tools/photo-manifest.json`，可据此在 unsplash.com 找到原图与作者。下载后裁切并转成了 WebP。
- 字体：站酷小薇（标题）、Noto Serif SC（正文）、Marcellus（拉丁字标）、Spline Sans Mono（时间与数据），均为 SIL OFL 1.1。子集的来源、版权与许可见 `assets/fonts/LICENSE.md`。
- 首屏与温泉的场景、Logo、手绘地图都是代码绘制的原创内容，没有位图。

## 部署

纯静态站点，任意静态托管都能用。本站用的是 GitHub Pages：

```bash
git init -b main && git add -A && git commit -m "山谷留宿"
gh repo create shangu-liusu --public --source=. --push
gh api -X POST repos/<user>/shangu-liusu/pages -f "source[branch]=main" -f "source[path]=/"
```

站点挂在子路径下，所有资源都用相对路径引用，换到别的子路径不需要改代码。

## 说明与已知限制

- 页面设了 `noindex`：它是含虚构价格的演示站，不希望被搜索引擎当成真实商家收录。
- 房型、路线、规则、评价等列表和全部交互依赖 JavaScript；禁用脚本时品牌故事、温泉、餐食等静态内容仍可阅读。
- 日历的"已订满 / 不开放"和价格一样是演示数据：由日期和房型确定地生成，刷新不变，但不代表任何真实房态。
- 需要较新的浏览器（近两年的 Chrome、Edge、Safari、Firefox）：用到了 `color-mix()`、`:has()`、`aspect-ratio` 等特性，更老的浏览器里部分样式会退化。
- 开启系统的"减少动效"时，粒子、视差和循环动画全部关闭，页面以静态呈现。
