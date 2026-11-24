# 山谷留宿 VALLEY STAY · 山间民宿官网落地页（演示）

> 「山谷留宿」是一家**虚构的**民宿。品牌故事、地址、价格、可订日期、路线与住客评价均为演示内容，
> 不对应任何真实商家；预约是纯前端演示，不会向任何服务器发送或存储数据。
> 页面照片来自 Unsplash（Unsplash License），仅作氛围示意，并非民宿实景。

**在线访问：https://sumomo0222.github.io/shangu-liusu/**

无框架、无构建、无外部依赖。所有图片和字体都随站点一起托管，离线也能完整运行。

## 怎么玩

- **首屏是清晨的山谷。** 一整屏电影感的照片（雾中湖畔的木屋），右下角嵌着一扇"窗"——室内的窗景小图。切换天气时，这两处会换成对应天气的另一张真实照片，缓慢地推近、交叉淡入；山间的雾贴着地面漂移。
- **切换天气：晴 / 雨 / 雪。** 首屏的切换器、滚过首屏后顶栏上的图标都能切。首屏照片、窗景（雨天是落雨的玻璃，雪天是窗外的积雪）、谷汤的大图、飘在页面上的雨丝或雪花、路线建议会一起变。
- **房型。** 照片悬停（触屏上常驻、键盘 Tab 聚焦）会显示面积、床型、可住人数和设施；点照片或"预览房型"打开带图集的详情，可以一键带入预约。
- **谷汤 · 山食 · 公共空间 · 周边路线** 依次展开。公共空间的索引可以切换照片，炉火小图上有一层闪烁的火光，谷汤大图上有升起的蒸汽。
- **路线。** 发丝线等高线地图，悬停列表或地图会互相高亮；"查看路线"打开查看器：地图、可滑动读数的高度剖面、途经点、按当前天气给出的走法。
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
index.html                 页面结构、Logo 与图标
assets/css/style.css       版式与各章节、组件、响应式
assets/css/motion.css      动效：照片缓推、雾气、蒸汽、炉火、纱帘、进场；减弱动态效果时的降级
assets/js/data.js          全部内容、照片矩阵、每种天气的调色参数、图片署名
assets/js/atmosphere.js    天气引擎：照片图层交叉淡入、雨雪粒子
assets/js/booking.js       日历、报价、房型预览、预约演示
assets/js/routes.js        等高线地图、路线列表、路线查看器
assets/js/app.js           渲染各章节、弹层、导航、进场动效，把各模块接起来
assets/fonts/              自托管字体子集与 fonts.css、LICENSE.md
assets/img/                43 项照片（WebP，部分带多种宽度）与雾气贴图
tools/build-fonts.py       按页面用字重建字体子集
tools/fetch-photos.py      按清单重新下载、调色、裁切全部照片
tools/photo-manifest.json  每张照片的来源、作者、裁切与调色参数
tools/shoot.mjs            截图自检脚本
```

## 改内容

- **文案、房型、餐食、路线、规则、评价、天气信息**：都在 `assets/js/data.js`，按区块分好组。列表类内容由脚本渲染，改完刷新即可。
- **换照片**：`data.js` 里 `SG.scenes` 是照片矩阵——首屏（`hero`）、窗景（`win`）、谷汤（`onsen`）各按天气取一张图。文件名对应 `assets/img/` 里的照片，多宽度的在文件名后带 `-1200` / `-1600` / `-2200` 等后缀。
- **压暗、色罩、雾气浓度**：`data.js` 里的 `SG.grade`，每种天气一组：`scrim` 是首屏底部压暗，`side` 是文字所在的左侧压暗（照片越亮要越大），`veil` / `veilO` 是色罩，`mist` / `steam` 是雾气与蒸汽的浓度。
- **重新生成照片**：`tools/fetch-photos.py` 按 `tools/photo-manifest.json` 下载 Unsplash 原图，统一调色（低饱和、暖调、抬黑），裁切并转成 WebP，同时生成雾气贴图。清单里每项记着裁切尺寸、焦点与调色强度，改完重跑即可（需要 `pip install pillow`）。页脚的"图片署名"由 `data.js` 里的 `SG.credits` 渲染，换图时请一并更新。
- **改了文字之后要重建字体**（字体是按页面实际用字裁的子集）：

  ```bash
  pip install fonttools brotli
  # 先按脚本开头的说明下载三款源字体到某个目录，然后：
  python3 tools/build-fonts.py <源字体目录>
  ```

## 自检

```bash
npm i --no-save playwright-core   # 仅供下面的脚本使用
node tools/shoot.mjs              # 全部：首屏、3 种天气、各章节、手机端、交互、首屏适配
node tools/shoot.mjs fit          # 只检查 12 种视口下首屏是否完整、有无横向溢出
SG_DEBUG=1 node tools/shoot.mjs mobile   # 每屏多打印一行布局诊断（横向滚动、视觉视口、时间线相位）
```

截图写到 `.shots/`，结束时报告控制台错误、失败请求和布局溢出。需要本机装有 Google Chrome。

## 照片与字体

- 照片来自 Unsplash，按 Unsplash License 使用（可免费商用、署名不强制）。页脚"图片署名"列出了全部摄影师并链到各自的图片页；每张图对应的 Unsplash 图片 ID、作者与图片页见 `tools/photo-manifest.json`。下载后统一调色并转成了 WebP。
- 字体：Noto Serif SC Light（标题与引文）、Marcellus（拉丁字标与数字）、Spline Sans Mono（时间与数据），均为 SIL OFL 1.1；正文用系统黑体，不额外下载字体。子集的来源、版权与许可见 `assets/fonts/LICENSE.md`。
- Logo、周边地图与雾气贴图由代码生成，是原创内容。

## 加载与性能

- 首屏只加载当前这一张照片（按屏幕宽度和像素比从 1200 / 1600 / 2200 三档里选），另外两种天气的照片在页面闲下来后按需准备；省流量或慢网络（2G / 3G）下不预载。
- 谷汤大图在页面很下面，滚到附近才开始加载。
- 开启系统的"减弱动态效果"时，照片缓推、雾气、蒸汽、炉火、纱帘和雨雪粒子全部关闭，照片直接切换，进场只保留淡入。

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
- 房型、路线、规则、评价等列表、全部照片和交互依赖 JavaScript；禁用脚本时只剩品牌故事等静态文字可读。
- 日历的"已订满 / 不开放"和价格一样是演示数据：由日期和房型确定地生成，刷新不变，但不代表任何真实房态。
- 照片是图库素材，不同天气用的是不同木屋的照片，并非同一栋建筑在同一机位的纪实照片。
- 需要较新的浏览器（近两年的 Chrome、Edge、Safari、Firefox）：用到了 `:has()`、`aspect-ratio`、`srcset`、`mix-blend-mode` 等特性，更老的浏览器里部分样式会退化。
