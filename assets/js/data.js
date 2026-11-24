/* 山谷留宿 · 内容数据层
 * 民宿、地址、价格、房态、路线与评价均为虚构的演示内容。 */
window.SG = window.SG || {};
(function () {
  'use strict';

  // 照片矩阵：首屏（hero）与"入夜"过场（mid）按 天气 × 时刻 取图；窗景小图（win）按时刻取图，
  // 雨天 / 雪天有实景窗景就替换，缺的回退到同一天气的相邻时刻，再回退到晴天；谷汤只按天气换图。
  const KEYS = ['dawn', 'day', 'dusk', 'night'];
  const full = pre => { const o = {}; ['sunny', 'rainy', 'snowy'].forEach(w => { o[w] = {}; KEYS.forEach(t => { o[w][t] = pre + w + '-' + t; }); }); return o; };
  SG.scenes = {
    hero: { sizes: [1200, 1600, 2200], tab: full('hero-') },
    win: { sizes: [640], tab: {
      sunny: { dawn: 'win-dawn', day: 'win-day', dusk: 'win-dusk', night: 'win-night' },
      rainy: { dawn: 'win-rain-dawn', day: 'win-rain-day', night: 'win-rain-night' },
      snowy: { dawn: 'win-snow-dawn', day: 'win-snow-day', dusk: 'win-snow-dusk' }
    } },
    onsen: { sizes: [1200, 2000], tab: { sunny: { all: 'onsen-sunny' }, rainy: { all: 'onsen-rainy' }, snowy: { all: 'onsen-snowy' } } }
  };

  // 每种天气 × 时刻的"调色"：scrim 是首屏底部压暗、side 是文字所在的左侧压暗（都为了保证文字可读），
  // veil / veilO 是色罩，mist / steam 是雾气与蒸汽的浓度。
  const G = {
    sunny: {
      dawn: { scrim: .74, side: .72, veil: '#1a2233', veilO: .1, mist: .5, steam: .4 },
      day: { scrim: .6, side: .9, veil: '#141a24', veilO: 0, mist: .2, steam: .3 },
      dusk: { scrim: .7, side: .66, veil: '#150e14', veilO: .1, mist: .28, steam: .45 },
      night: { scrim: .78, side: .6, veil: '#070a14', veilO: .24, mist: .12, steam: .4 }
    },
    rainy: {
      dawn: { scrim: .8, side: .78, veil: '#1d262e', veilO: .16, mist: .68, steam: .6 },
      day: { scrim: .72, side: .82, veil: '#161d24', veilO: .16, mist: .58, steam: .55 },
      dusk: { scrim: .78, side: .78, veil: '#12161d', veilO: .18, mist: .58, steam: .6 },
      night: { scrim: .8, side: .68, veil: '#080b12', veilO: .26, mist: .34, steam: .6 }
    },
    snowy: {
      dawn: { scrim: .82, side: .86, veil: '#27303f', veilO: .1, mist: .46, steam: .55 },
      day: { scrim: .84, side: .95, veil: '#1c2430', veilO: .12, mist: .38, steam: .5 },
      dusk: { scrim: .76, side: .78, veil: '#141a2a', veilO: .14, mist: .4, steam: .6 },
      night: { scrim: .78, side: .68, veil: '#080c18', veilO: .2, mist: .22, steam: .6 }
    }
  };

  // 图片署名：文件名 → [作者, 中文说明, 图片页]；全部来自 Unsplash（Unsplash License），只是氛围示意
  SG.credits = {
    'hero-sunny-dawn': ['Istvan Gyimesi', '清晨湖畔，雾中的木屋', 'https://unsplash.com/photos/brown-house-near-body-of-water-during-daytime-wfKCxFTQ7L0'],
    'hero-sunny-day': ['Ruben Hanssen', '草坡上的原木小屋，远处是雾中的山脊', 'https://unsplash.com/photos/brown-wooden-house-on-green-grass-field-near-green-trees-and-mountains-during-daytime-D3GYSD-eHUw'],
    'hero-sunny-dusk': ['Derek Sears', '暮色里亮着灯的木屋', 'https://unsplash.com/photos/lighted-brown-wooden-cabin-near-pine-tree-during-night-time-AZAF_lVud64'],
    'hero-sunny-night': ['Jake Hinds', '银河下亮着灯的木屋', 'https://unsplash.com/photos/silhouette-of-house-near-trees-during-nighttime-43-QgSVp1tk'],
    'hero-rainy-dawn': ['m c', '浓雾里的木屋', 'https://unsplash.com/photos/small-wooden-cabin-on-a-grassy-hill-in-fog-hCCIYRuteg8'],
    'hero-rainy-day': ['Chris Jones', '阴天里整面玻璃的木屋', 'https://unsplash.com/photos/a-group-of-benches-sitting-on-top-of-a-lush-green-field-lMbHT44KRi4'],
    'hero-rainy-dusk': ['Jacob Granneman', '雨雾中亮着窗的木屋', 'https://unsplash.com/photos/a-house-with-a-green-roof-surrounded-by-trees-oxm7rLpGwEk'],
    'hero-rainy-night': ['Niko Saparilas', '雨夜里亮着灯的长屋', 'https://unsplash.com/photos/a-house-on-a-dock-surrounded-by-water-uzn2rV3D3_o'],
    'hero-snowy-dawn': ['Yuhan Du', '晨光里的雪中小屋', 'https://unsplash.com/photos/a-cabin-in-the-middle-of-a-snowy-forest-aCH6-PTLZUs'],
    'hero-snowy-day': ['Ahmet Yüksek', '深雪里的木屋与挂雪的杉树', 'https://unsplash.com/photos/a-small-wooden-cabin-in-a-snowy-forest-RLrcAlok7WQ'],
    'hero-snowy-dusk': ['Sean C Davis', '蓝调时分亮着灯的雪中木屋', 'https://unsplash.com/photos/cozy-cabin-glowing-in-the-snowy-woods-at-night-EwwVAaxZ4DM'],
    'hero-snowy-night': ['Dennis Haug', '雪松间亮着灯的木屋', 'https://unsplash.com/photos/a-house-in-the-middle-of-a-snow-covered-forest-QJ2nHy1YGFY'],
    'win-dawn': ['Andrew Ridley', '卧室整面窗外的清晨山谷', 'https://unsplash.com/photos/brown-and-white-blanket-beside-with-framed-glass-window-9sTuZHhYyMw'],
    'win-day': ['Clay Banks', '木屋客厅与望向树林的大窗', 'https://unsplash.com/photos/a-living-room-with-a-couch-and-a-fireplace-DNt5A4T0-Rs'],
    'win-dusk': ['Michael McKay', '夕阳斜进来的窗边', 'https://unsplash.com/photos/sunlight-streams-into-a-camper-window-overlooking-a-lake-vVNYP1NgPDY'],
    'win-night': ['Michal Balog', '夜里的卧室与窗', 'https://unsplash.com/photos/grey-bedspreads-inside-room-J0nae5nkmbw'],
    'onsen-sunny': ['Barnabas Davoti', '山谷里的木质温泉桶，蒸汽升腾', 'https://unsplash.com/photos/a-wooden-deck-overlooking-a-forest-TZ06vlXk9W0'],
    'onsen-rainy': ['Momo Kim', '雾气蒸腾的温泉池面', 'https://unsplash.com/photos/a-body-of-water-with-a-rock-in-the-middle-of-it-8FE4YIoycF0'],
    'onsen-snowy': ['Greta Schölderle Möller', '面朝雪山的露天温泉', 'https://unsplash.com/photos/woman-swimming-on-river-2Zo36HIiAls'],
    'onsen-indoor': ['Clay Banks', '带窗的室内汤屋与木质浴池', 'https://unsplash.com/photos/a-wooden-room-with-a-tiled-hot-tub-and-windows-xa2Q7-KkRjY'],
    'room-jianshan': ['Clay Banks', '见山房：木饰面客房，阳光落在床上', 'https://unsplash.com/photos/cozy-bedroom-with-wood-paneled-walls-and-a-view-0v7DOW9cT_o'],
    'detail-seat': ['Steve Adams', '窗边的木质坐台', 'https://unsplash.com/photos/a-wooden-bench-sitting-in-front-of-a-window-6pR1UB6ihsQ'],
    'detail-window-dawn': ['Andrew Ridley', '整面落地窗与清晨的山谷', 'https://unsplash.com/photos/brown-and-white-blanket-beside-with-framed-glass-window-9sTuZHhYyMw'],
    'room-tingxi': ['Clay Banks', '听溪房：斜顶木墙与拱窗', 'https://unsplash.com/photos/a-bedroom-with-two-beds-and-a-desk-rP0OTFdVaak'],
    'detail-curtain': ['Pix Tresa', '木窗与纱帘', 'https://unsplash.com/photos/a-rustic-wooden-wall-with-a-window-and-white-curtains-7Iy7M3fn5-0'],
    'detail-linen': ['Hans', '原木墙前的亚麻床品', 'https://unsplash.com/photos/a-bed-with-a-white-comforter-and-a-wooden-headboard-rp-szRaARvQ'],
    'room-wuqi': ['Clay Banks', '雾起套房：整面玻璃转角的起居区', 'https://unsplash.com/photos/a-living-room-with-a-wood-burning-stove-in-it-kNFOoORtrys'],
    'detail-tub': ['Rod Long', '临窗的深色浴缸', 'https://unsplash.com/photos/a-bath-tub-sitting-in-a-bathroom-next-to-a-window-iD1GObFLsOs'],
    'detail-lounge': ['Nick Martin', '深色木起居室与整面窗', 'https://unsplash.com/photos/rustic-wooden-cabin-interior-with-furniture-1KxGA-jf2Os'],
    'room-xingye': ['Clay Banks', '星野阁楼：斜顶下的卧室与大窗', 'https://unsplash.com/photos/a-living-room-with-a-fire-place-inside-of-it-f_6yPIgDxxs'],
    'detail-skylight': ['Christopher Farrugia', '夜里亮着的屋顶天窗', 'https://unsplash.com/photos/bed-near-window-during-day-FqOMlLb5o7Y'],
    'detail-loft': ['Clay Banks', '木结构夹层', 'https://unsplash.com/photos/a-view-of-a-living-room-and-dining-room-from-above-KOfl23hSkFM'],
    'space-fireplace': ['Clay Banks', '壁炉厅：挑高的木屋客厅与悬空的柴炉', 'https://unsplash.com/photos/a-living-room-with-a-fire-place-inside-of-it-f_6yPIgDxxs'],
    'space-table': ['Clay Banks', '木墙餐厅里的长桌', 'https://unsplash.com/photos/a-dining-room-with-wood-paneling-and-windows-DBJ0GcEM_Bg'],
    'space-engawa': ['Andrew Swarga', '黄昏木廊上的摇椅', 'https://unsplash.com/photos/wooden-folding-chairs-on-cabin-deck-D2lnMKsNaAE'],
    'space-library': ['Clay Banks', '书架与窗台：书墙之间的靠窗座位', 'https://unsplash.com/photos/library-interior-z_DkoUqgx6M'],
    'space-irori': ['Hans', '火塘：串灯下的悬空柴炉与两把椅子', 'https://unsplash.com/photos/a-living-room-with-a-fire-place-and-a-chair-_k0Pyd1uMEc'],
    'detail-fire': ['Scott Greer', '壁炉里的火焰', 'https://unsplash.com/photos/a-fire-burning-in-a-fireplace-in-a-dark-room-Ht_exjZdm24'],
    'food-breakfast': ['Erick Palacio', '木桌上的早餐与茶', 'https://unsplash.com/photos/baked-pastries-on-brow-table-PkuYeKOGZYA'],
    'trail-mist': ['Lacie Cueto', '雾中森林小路上的行人', 'https://unsplash.com/photos/woman-standing-on-focus-photography-8G0a4ya7WfM'],
    'trail-creek': ['pine  watt', '雾气弥漫的溪谷', 'https://unsplash.com/photos/aerial-shot-of-forest-2Hzmz15wGik'],
    'trail-ridge': ['Gabriel Francesco', '金色山坡步道上的徒步者', 'https://unsplash.com/photos/hiker-on-a-steep-golden-lit-mountain-path-with-misty-valley-3hD1VIDhIlw'],
    'trail-villages': ['Yang', '云雾中的梯田', 'https://unsplash.com/photos/banaue-rice-terraces-h7KEJngNrk0'],
    'story-house': ['Adrian Eperjessy', '秋树与薄雾里升起炊烟的屋子', 'https://unsplash.com/photos/a-small-house-sitting-on-top-of-a-lake-surrounded-by-trees-mysUTgf61cM'],
    'story-tree': ['Casper van Battum', '浓雾里的一棵树', 'https://unsplash.com/photos/a-lone-tree-on-a-foggy-mountain-side-27RYgiRRF38'],
    'story-onsen': ['Vivu Vietnam', '山石围起的露天温泉', 'https://unsplash.com/photos/outdoor-hot-spring-pool-with-rocky-waterfall-and-pavilion-XInQQX8gTe0'],
    'food-dinner': ['Tadahiro Higuchi', '冒着热气的砂锅', 'https://unsplash.com/photos/steaming-nabe-hot-pot-with-vegetables-ra0WmT5QlKQ'],
    'food-steamer': ['Charles Chen', '竹蒸笼里的包子', 'https://unsplash.com/photos/fish-balls-in-bamboo-steamer-yne3SZalUuQ'],
    'food-coffee': ['Krists Luhaers', '手冲咖啡', 'https://unsplash.com/photos/person-pouring-coffee-on-brown-ceramic-mug-BQcLZoUGc1g'],
    'food-pickles': ['Letícia Fracalossi', '玻璃罐里的腌菜', 'https://unsplash.com/photos/a-couple-of-jars-filled-with-lots-of-veggies-tYPz1gSur9o'],
    'win-rain-dawn': ['Aumi', '落雨的窗与天光', 'https://unsplash.com/photos/water-drops-on-clear-glass-surfacew-h851i8hQWcM'],
    'win-rain-day': ['C. G.', '挂满雨滴的窗玻璃', 'https://unsplash.com/photos/a-wet-window-with-a-traffic-light-on-it-JgDUVGAXsso'],
    'win-rain-night': ['Ning Shi', '雨夜窗外的灯', 'https://unsplash.com/photos/water-droplets-on-glass-window-_cqRjq4rp0M'],
    'win-snow-dawn': ['Maarten Zuidhoorn', '窗帘外是雪', 'https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-window-U6Vig7xxbuA'],
    'win-snow-day': ['Ozgu Ozden', '窗外挂雪的树枝', 'https://unsplash.com/photos/white-and-black-tree-covered-with-snow-DQEZzyCSNaI'],
    'win-snow-dusk': ['Mike Petrucci', '结霜的窗与雪林', 'https://unsplash.com/photos/brown-wooden-pull-wagon-near-trees-covered-by-snow-yqXTfgU8OB4'],
  };

  SG.data = {
    lodge: {
      name: '山谷留宿', en: 'VALLEY STAY', tagline: '把时间交还给山林',
      enTagline: 'Give your time back to the mountains.',
      place: '云岭山脉 · 雾起谷 7 号（虚构地址）', altitude: '1,280', distance: '23', roomsTotal: 9, books: '3,000'
    },

    weather: {
      sunny: { label: '晴', icon: 'sun', temp: '12°C', hum: '48%', wind: '北风 2 级', feel: '看得见山脊',
        line: '适合上落日垭口，记得 17:30 前出发。' },
      rainy: { label: '雨', icon: 'rain', temp: '11°C', hum: '92%', wind: '东风 3 级', feel: '檐下听雨',
        line: '溪水会涨，今天推荐走林下步道，晚餐加一锅姜汤。' },
      snowy: { label: '雪', icon: 'snow', temp: '−4°C', hum: '76%', wind: '微风', feel: '谷汤最盛',
        line: '山路需装防滑链，我们已经把火塘生好了。' }
    },
    timeNotes: { dawn: '雾还没散', day: '阳光落在檐廊', dusk: '灯一盏盏亮起来', night: '只剩炉火和虫鸣' },
    timeNames: { dawn: '清晨', day: '白天', dusk: '黄昏', night: '夜晚' },
    clockAt: { dawn: 6 * 60 + 12, day: 13 * 60 + 40, dusk: 18 * 60 + 50, night: 22 * 60 + 40 },

    rooms: [
      { id: 'jianshan', name: '见山房', en: 'FACING THE PEAK', size: 32, bed: '1.8 × 2.0 m 原木大床', sleeps: 2, floor: '二层 · 朝西', view: '正对山脊', price: 1280, weekend: 1480,
        line: '一整面墙的窗，只留给西面的山脊。', photo: 'assets/img/room-jianshan.webp', photoAlt: '见山房：木饰面客房，阳光落在床上',
        desc: '床对着整面落地窗，窗帘是半透的亚麻，天亮的时候不用起身，就能看见雾从谷底往上爬。傍晚山脊会先变成金色，再变成紫色。',
        amenities: ['地暖', '落地观景窗', '手冲咖啡套装', '白茶浴品', '加湿器', '窗边坐台', '阅读灯', '耳塞与蒸汽眼罩'],
        gallery: [
          { src: 'assets/img/room-jianshan.webp', alt: '见山房：木饰面客房，阳光落在床上' },
          { src: 'assets/img/detail-seat.webp', alt: '见山房：窗边的木质坐台' },
          { src: 'assets/img/detail-window-dawn.webp', alt: '见山房：整面落地窗与清晨的山谷' }] },
      { id: 'tingxi', name: '听溪房', en: 'CREEK WHISPER', size: 26, bed: '1.5 × 2.0 m 实木床', sleeps: 2, floor: '一层 · 朝北', view: '溪涧与竹林', price: 980, weekend: 1180,
        line: '开一条窗缝，就能听见溪水。', photo: 'assets/img/room-tingxi.webp', photoAlt: '听溪房：斜顶木墙与拱窗',
        desc: '房间最小，也最安静。窗下就是溪，夜里水声会盖过一切。墙上有一台唱机，唱片在前台，可以随便借。',
        amenities: ['地暖', '溪景小窗', '黑胶唱机', '阅读灯', '手冲咖啡套装', '白茶浴品', '加湿器', '羊毛盖毯'],
        gallery: [
          { src: 'assets/img/room-tingxi.webp', alt: '听溪房：斜顶木墙与拱窗' },
          { src: 'assets/img/detail-curtain.webp', alt: '听溪房：木窗与纱帘' },
          { src: 'assets/img/detail-linen.webp', alt: '听溪房：原木墙前的床品' }] },
      { id: 'wuqi', name: '雾起套房', en: 'MIST SUITE', size: 46, bed: '1.8 × 2.0 m 大床', sleeps: 3, floor: '二层 · 朝东南', view: '整条山谷', price: 1880, weekend: 2180,
        line: '雾从窗前经过时，房间会变成白色。', photo: 'assets/img/room-wuqi.webp', photoAlt: '雾起套房：整面玻璃转角的起居区',
        desc: '引了谷汤的泉水进房，室内有一只石头浴缸。有独立的起居区，可以加一张单人床。雾起的时候，整间房像浮在云上。',
        amenities: ['室内温泉石缸', '独立起居区', '地暖', '黑胶唱机', '手冲咖啡套装', '岩茶迎宾', '加湿器', '可加单人床（¥300 / 晚）'],
        gallery: [
          { src: 'assets/img/room-wuqi.webp', alt: '雾起套房：整面玻璃转角的起居区' },
          { src: 'assets/img/detail-tub.webp', alt: '雾起套房：临窗的深色浴缸' },
          { src: 'assets/img/detail-lounge.webp', alt: '雾起套房：深色木起居室与整面窗' }] },
      { id: 'xingye', name: '星野阁楼', en: 'LOFT UNDER STARS', size: 58, bed: '1.8 × 2.0 m 大床 + 2 张 0.9 m 单人床', sleeps: 4, floor: '三层 · 复式', view: '天窗与星子', price: 2280, weekend: 2580,
        line: '屋顶开了一扇天窗，躺着就能等星星。', photo: 'assets/img/room-xingye.webp', photoAlt: '星野阁楼：斜顶下的卧室与大窗',
        desc: '整栋最高的房间，屋顶斜着一扇天窗。楼下是两张单人床和一张长书桌，楼上是那张大床。适合一家人，或者三个很久没见的朋友。',
        amenities: ['屋顶天窗', '复式两层', '地暖', '长书桌', '黑胶唱机', '手冲咖啡套装', '儿童拖鞋与绘本', '加湿器'],
        gallery: [
          { src: 'assets/img/room-xingye.webp', alt: '星野阁楼：斜顶下的卧室与大窗' },
          { src: 'assets/img/detail-skylight.webp', alt: '星野阁楼：夜里亮着的屋顶天窗' },
          { src: 'assets/img/detail-loft.webp', alt: '星野阁楼：木结构夹层' }] }
    ],

    onsen: {
      name: '谷汤', en: 'THE VALLEY BATH', title: '把身体交给 41.5°C 的山泉',
      lead: '屋后那眼温泉是阿岚挖出来的。我们没有把它围起来，只是让池子贴着山崖，泡下去的时候，眼前就是整条山谷。',
      facts: [
        { k: '泉质', v: '单纯温泉 · 弱碱性 pH 8.2' },
        { k: '温度', v: '出水 58°C · 池内 41.5°C' },
        { k: '池型', v: '露天 ×2 · 室内汤屋 ×1' },
        { k: '时间', v: '07:00–10:00 · 15:00–23:00' }
      ],
      tips: ['入浴前先冲淋', '不穿泳衣', '长发请束起', '刺青可入浴', '一次 15 分钟为宜', '池边有凉茶'],
      byWeather: {
        sunny: '晴天傍晚最抢手：泡在露天池里，能看见山脊从金色变成紫色。',
        rainy: '雨天是谷汤最好的时候。雨打在池面上，蒸汽不散，听不见别的。',
        snowy: '雪天蒸汽最盛，头发会结霜。我们在池边放了热姜茶。'
      },
      photos: [
        { src: 'assets/img/onsen-indoor.webp', alt: '室内汤屋：带窗的木质浴池' },
        { src: 'assets/img/story-onsen.webp', alt: '山石围起的露天温泉' }
      ]
    },

    dining: {
      name: '山食', en: 'MOUNTAIN TABLE', title: '一日三食，跟着山里的时令',
      lead: '没有菜单可以点，每天吃什么，看后园的菜地、邻村阿婆的豆腐，和山里刚刚长出来的东西。八成食材来自三十公里内。',
      source: '后园菜地 · 邻村豆腐 · 山笋与菌子 · 溪鱼 · 土锅米饭',
      meals: [
        { id: 'breakfast', time: '07:30 – 09:30', phase: 'dawn', name: '早餐', en: 'BREAKFAST', title: '土锅白粥，和七种自家腌菜', price: '含在房费内',
          items: ['土锅白粥', '七种自家腌菜', '炭火烤吐司与山蜂蜜', '溪鸡蛋', '应季果酱', '手冲咖啡或云雾茶'],
          photo: 'assets/img/food-breakfast.webp', photoAlt: '木桌上的早餐与茶' },
        { id: 'tea', time: '14:30 – 16:30', phase: 'day', name: '下午茶', en: 'AFTERNOON TEA', title: '蒸笼一掀，整个檐廊都是白汽', price: '¥88 / 套',
          items: ['蒸笼松茸包', '炭烤红薯', '桂花米酒', '应季水果', '一壶云雾茶'],
          photo: 'assets/img/food-steamer.webp', photoAlt: '竹蒸笼里的包子' },
        { id: 'dinner', time: '18:30 开席', phase: 'dusk', name: '晚餐', en: 'DINNER', title: '一桌一锅，土鸡在汤里翻滚', price: '¥288 / 位 · 需预约',
          items: ['高山土鸡锅', '山笋与腊肉', '盐烧溪鱼', '时蔬', '土锅米饭', '餐后甜点（看心情）'],
          photo: 'assets/img/food-dinner.webp', photoAlt: '冒着热气的砂锅' }
      ],
      notes: ['忌口请在预约时备注，最晚提前 24 小时', '晚餐是一起吃的长桌，想独处的可以端回房间', '以上价格均为演示内容']
    },

    spaces: [
      { id: 'fireplace', name: '壁炉厅', en: 'FIREPLACE HALL', time: '21:10', photo: 'assets/img/space-fireplace.webp', alt: '壁炉厅：挑高的木屋客厅与悬空的柴炉',
        desc: '屋顶一直斜到三层楼高，梁上吊着一只铸铁柴炉，墙边是三千册可以借走的书。Wi-Fi 只在这里有一格信号。' },
      { id: 'table', name: '长桌', en: 'THE LONG TABLE', time: '18:30', photo: 'assets/img/space-table.webp', alt: '木墙餐厅里的长桌',
        desc: '一张 4.2 米长的老杉木桌，早餐和晚餐都在这里。不认识的人，常常会聊起来。' },
      { id: 'engawa', name: '檐廊', en: 'ENGAWA', time: '15:20', photo: 'assets/img/space-engawa.webp', alt: '黄昏木廊上的摇椅',
        desc: '沿着南面的一圈窄廊，夏天躺着吹风，冬天晒太阳。雨天从这里看雨最合适。' },
      { id: 'library', name: '书架与窗台', en: 'LIBRARY NOOK', time: '16:40', photo: 'assets/img/space-library.webp', alt: '书架与窗台：书墙之间的靠窗座位',
        desc: '书大多是住客留下的，扉页上写着他们的城市。窗台铺了垫子，可以窝一下午。' },
      { id: 'irori', name: '火塘', en: 'IRORI', time: '21:00', photo: 'assets/img/space-irori.webp', alt: '火塘：串灯下的悬空柴炉与两把椅子',
        desc: '晚上九点生火，烤糯米团子和橘子。沈树会讲那个迷路的故事，已经讲了四年。' }
    ],
    spacesMore: ['洗衣房（投币）', '小卖部 · 山货与手作', '瑜伽平台（清晨可借用）', '停车场 8 个车位', '充电桩 ×2'],

    routes: [
      { id: 'mist', no: '01', name: '雾起步道', en: 'MIST LOOP', shape: '环线', km: 3.2, hrs: '约 1.5 小时', gain: 110, diff: 1, best: '清晨 · 雨后',
        photo: 'assets/img/trail-mist.webp', photoAlt: '雾中森林小路上的行人',
        summary: '从门口出发，绕过杉木林上到观雾台，再从旧林场遗址下来。路缓，走完正好回去吃早餐。',
        ele: [[0, 1280], [0.4, 1302], [0.8, 1330], [1.2, 1366], [1.6, 1390], [2.0, 1362], [2.4, 1320], [2.8, 1298], [3.2, 1280]],
        map: [[404, 424], [356, 380], [318, 336], [318, 286], [366, 248], [426, 262], [456, 318], [440, 380], [404, 424]],
        waypoints: [
          { at: 0, name: '民宿门口', km: 0, ele: 1280, note: '出发前在壁炉厅写下预计返回时间。' },
          { at: 2, name: '杉木林', km: 0.8, ele: 1330, note: '二十米高的柳杉，早上七点光会斜着进来。' },
          { at: 4, name: '观雾台', km: 1.6, ele: 1390, note: '整条山谷最好看的雾在这里。' },
          { at: 6, name: '旧林场遗址', km: 2.4, ele: 1320, note: '留着一台生锈的绞盘机，是沈树找到这里的地方。' }],
        weather: { sunny: '雾散得快，日出后半小时出发最合适。', rainy: '雨后是这条路最好看的时候：整条路都是雾。', snowy: '平缓好走，雪停后一小时内来，脚印只有你的。' },
        gear: '防滑鞋 · 一壶热水（前台可接）' },
      { id: 'creek', no: '02', name: '溪谷溯行', en: 'CREEK WALK', shape: '折返', km: 5.6, hrs: '约 2.5 小时', gain: 180, diff: 2, best: '上午 · 阴天',
        photo: 'assets/img/trail-creek.webp', photoAlt: '雾气弥漫的溪谷',
        summary: '顺着门前的溪往下游走，经过三叠瀑布。路有时在石头上，有时在树根上，鞋子一定会湿。',
        ele: [[0, 1280], [0.6, 1256], [1.2, 1240], [1.8, 1272], [2.3, 1300], [3.0, 1348], [3.6, 1390], [4.1, 1410], [4.6, 1420], [5.6, 1420]],
        map: [[404, 424], [458, 438], [500, 474], [548, 470], [594, 512], [640, 506], [676, 556]],
        waypoints: [
          { at: 1, name: '溪边石桥', km: 1.2, ele: 1240, note: '桥面有青苔，雨后特别滑。' },
          { at: 3, name: '一叠瀑', km: 2.3, ele: 1300, note: '水最小，但可以走到后面去。' },
          { at: 4, name: '二叠瀑', km: 3.6, ele: 1390, note: '正午会有彩虹。' },
          { at: 5, name: '三叠瀑', km: 4.6, ele: 1420, note: '最高的一叠，前面有个可以坐的大石头。' }],
        weather: { sunny: '上午去，瀑布前的石头可以坐很久。', rainy: '溪水会涨，只到石桥。', snowy: '步道结冰，需要冰爪，前台可以借。' },
        gear: '防滑鞋 · 备一双袜子 · 登山杖' },
      { id: 'ridge', no: '03', name: '山脊日落线', en: 'RIDGE SUNSET', shape: '环线', km: 4.8, hrs: '约 3 小时', gain: 340, diff: 3, best: '傍晚 · 晴',
        photo: 'assets/img/trail-ridge.webp', photoAlt: '金色山坡步道上的徒步者',
        summary: '从竹林垭口上山脊，到落日垭口看整条山谷变金色。是四条路里最累的，也是最值得的。',
        ele: [[0, 1280], [0.5, 1320], [1.1, 1420], [1.7, 1500], [2.4, 1620], [2.9, 1610], [3.4, 1560], [4.1, 1420], [4.8, 1280]],
        map: [[404, 424], [366, 452], [322, 472], [284, 452], [248, 416], [206, 384], [168, 362], [132, 352], [150, 430], [214, 500], [300, 530], [380, 486], [404, 424]],
        waypoints: [
          { at: 2, name: '竹林垭口', km: 1.1, ele: 1420, note: '风会突然变大，帽子拿好。' },
          { at: 4, name: '落日垭口', km: 2.4, ele: 1620, note: '整条山谷的日落都在这里。17:30 前到。' },
          { at: 7, name: '鹰岩', km: 3.4, ele: 1560, note: '春天能看到鹰从下面飞过去。' }],
        weather: { sunny: '17:30 前到落日垭口，可以看见整条山谷变金色。', rainy: '垭口风大路滑，今天不建议。', snowy: '需要雪鞋与向导，请提前一天登记。' },
        gear: '登山鞋 · 风壳 · 头灯（回程天黑）' },
      { id: 'villages', no: '04', name: '古道村落线', en: 'OLD TRAIL', shape: '环线', km: 8.2, hrs: '约 4.5 小时', gain: 260, diff: 3, best: '全天 · 需带便当',
        photo: 'assets/img/trail-villages.webp', photoAlt: '云雾中的梯田',
        summary: '沿着石板古道翻到上村和下村，两个加起来不到四十个人的村子。茶亭有热水，阿婆的豆腐要赶早。',
        ele: [[0, 1280], [0.8, 1310], [1.5, 1360], [2.4, 1392], [3.2, 1410], [4.0, 1400], [4.8, 1390], [5.6, 1340], [6.4, 1300], [7.3, 1288], [8.2, 1280]],
        map: [[404, 424], [426, 378], [414, 332], [436, 286], [430, 236], [414, 186], [434, 136], [486, 104], [556, 120], [596, 196], [580, 290], [534, 362], [474, 404], [404, 424]],
        waypoints: [
          { at: 2, name: '石板古道', km: 1.5, ele: 1360, note: '一百多年的石阶，下坡比上坡难走。' },
          { at: 4, name: '上村', km: 3.2, ele: 1410, note: '十七个人，一间杂货铺，可以补给。' },
          { at: 6, name: '茶亭', km: 4.8, ele: 1390, note: '有热水和长凳，墙上写着各年第一朵樱花的日子。' },
          { at: 8, name: '下村', km: 6.4, ele: 1300, note: '阿婆的豆腐坊，下午两点以后就卖完了。' }],
        weather: { sunny: '全天可走，带一份我们准备的便当。', rainy: '古道石板滑，穿防滑鞋。', snowy: '村落线路积雪清理慢，出发前先问我们。' },
        gear: '登山鞋 · 便当与水 · 防晒' }
    ],

    rules: [
      { q: '入住与退房', a: '入住 15:00 – 21:00，退房 11:00 前。22:00 之后抵达请提前告知，我们会在檐廊留一盏灯。' },
      { q: '安静时间', a: '22:30 – 次日 07:00。请把说话声放轻，公共区域不外放音乐。房间的隔音是老木头的隔音，隔壁翻书都听得见。' },
      { q: '吸烟与明火', a: '全栋禁烟（含电子烟）。蜡烛、酒精炉请不要带进房间。吸烟点在停车场边的木亭。' },
      { q: '温泉', a: '入浴前先冲淋，不穿泳衣。儿童须由成人陪同，饮酒后请不要入浴。刺青可以入浴。' },
      { q: '孩子与宠物', a: '欢迎 6 岁以上的孩子。暂时不接待宠物——我们已经有两条狗了：板栗和栗子。' },
      { q: '食物', a: '请不要在房间内食用气味强烈的食物。晚餐 18:30 开席，忌口请提前 24 小时告知。' },
      { q: '取消政策', a: '入住前 7 天免费取消；3 – 6 天取消收首晚房费；72 小时内取消收全额。（演示条款）' },
      { q: '天气与道路', a: '雨雪天气山路可能临时封闭。我们会提前 12 小时联系你，可以免费改期一次。' },
      { q: '我们借给你的', a: '雨衣、登山杖、热水壶、手电和书都可以免费借用。室内拖鞋已备，请自己带防滑鞋。' },
      { q: '离开时', a: '把借走的书放回原来的位置就好。不用叠被子。' }
    ],

    reviews: [
      { name: '林予', city: '上海', date: '2026.10', room: '雾起套房', weather: '小雨',
        text: '住了两晚，手机没拿出来几次。雨下了一整天，我们就窝在壁炉厅读书。晚饭的土鸡锅，是这一年的高光。' },
      { name: '周南 & 阿澈', city: '杭州', date: '2026.01', room: '星野阁楼', weather: '雪',
        text: '下雪的那晚，阿岚敲开我们的门说“快出来看”。露天池子冒着白汽，头发结了霜，但没有人愿意先起来。' },
      { name: '何笑', city: '深圳', date: '2026.05', room: '见山房', weather: '晴',
        text: '床正对着一整面窗，早上不用起身就能看见雾从山谷里往上爬。早上的粥和腌菜，简单得让人想哭。' },
      { name: '苏晴', city: '成都', date: '2026.08', room: '听溪房', weather: '雨转晴',
        text: '带着六岁的女儿走了雾起步道，回来在檐廊躺了一下午。这里最奢侈的是：没有人催你做任何事。' },
      { name: '老徐', city: '北京', date: '2026.03', room: '见山房', weather: '晴',
        text: '没有电视的第一晚有点不习惯，第二晚就明白了。沈树讲了他迷路的故事，炉火噼啪响。会再来。' },
      { name: 'Mika', city: '京都', date: '2025.12', room: '雾起套房', weather: '雪',
        text: '房间的石缸引的是同一眼泉水。我一直泡到手指发皱，窗外的雪没有停过。' }
    ]
  };

  SG.grade = G;
})();
