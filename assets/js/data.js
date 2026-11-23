/* 山谷留宿 · 内容数据层
 * 民宿、地址、价格、房态、路线与评价均为虚构的演示内容。 */
window.SG = window.SG || {};
(function () {
  'use strict';

  // 调色板：每种天气 × 四个时刻（dawn / day / dusk / night）
  // 颜色通道以 # 开头，其余为数值；数值里的 sunX / sunY 是 SVG 用户坐标。
  const P = {
    sunny: {
      dawn: { sky1: '#86abc7', sky2: '#e9cfb2', sky3: '#f7e4c6', sunCore: '#fff7e2', sunHalo: '#ffd59a', sunO: 1, sunX: 690, sunY: 505, moonO: 0, cloud: '#ffe9d0', cloudO: .6, rayO: .55, starO: 0,
        r5: '#b7c8cf', r4: '#93aba9', r3: '#6e8b80', r2: '#48625a', r1: '#2b3d37', t5: '#a3b9bc', t4: '#7f9a98', t3: '#5a7a6e', t2: '#334d44', t1: '#1c2b27', fog: '#f0f1ea', fogO: .9,
        cabin: '#5c4736', roof: '#392f29', trim: '#2f251f', lamp: '#ffd79a', lampO: .6, smokeO: .7,
        steam: '#ffffff', steamO: .5, snow: '#f7f9fa', snowO: 0, rainO: 0, water1: '#dfe8e6', water2: '#9fb7b4',
        curtain: '#efe2cc', curtainO: .62, heroInk: '#1c2824', scrimO: .08, birdO: .9, fireflyO: 0,
        paper: '#f3ede3', photoSat: .92, photoBri: 1, photoCon: 1, tint: '#ffcf9a', tintO: 0, frameB: 1, sway: 1 },
      day: { sky1: '#6ea2ce', sky2: '#a9cadc', sky3: '#e6eae2', sunCore: '#fffdf3', sunHalo: '#fff0c4', sunO: 1, sunX: 1010, sunY: 150, moonO: 0, cloud: '#ffffff', cloudO: .75, rayO: .18, starO: 0,
        r5: '#b3c9d3', r4: '#8daba8', r3: '#648b7b', r2: '#406653', r1: '#273f35', t5: '#9fb7c0', t4: '#799990', t3: '#507567', t2: '#2b4a3b', t1: '#17291f', fog: '#f2f5ee', fogO: .45,
        cabin: '#6a523f', roof: '#3d332c', trim: '#33281f', lamp: '#ffdca4', lampO: .18, smokeO: .35,
        steam: '#ffffff', steamO: .32, snow: '#f7f9fa', snowO: 0, rainO: 0, water1: '#e3ecea', water2: '#9db9b6',
        curtain: '#f3e8d4', curtainO: .6, heroInk: '#18261f', scrimO: 0, birdO: .8, fireflyO: 0,
        paper: '#f4efe5', photoSat: .95, photoBri: 1, photoCon: 1, tint: '#ffd9a6', tintO: 0, frameB: 1.04, sway: .8 },
      dusk: { sky1: '#4c6796', sky2: '#dc926c', sky3: '#f8c68c', sunCore: '#ffe4b4', sunHalo: '#ff9e5c', sunO: 1, sunX: 1290, sunY: 498, moonO: .1, cloud: '#ffb98a', cloudO: .7, rayO: .6, starO: .18,
        r5: '#9b92ad', r4: '#776d89', r3: '#564f6a', r2: '#3a3450', r1: '#221e38', t5: '#877e9b', t4: '#655b78', t3: '#46405b', t2: '#2c2740', t1: '#15122a', fog: '#ecbca2', fogO: .75,
        cabin: '#4c3a31', roof: '#2c2521', trim: '#241c18', lamp: '#ffbf6e', lampO: .96, smokeO: .6,
        steam: '#ffd9c2', steamO: .5, snow: '#f6e7ea', snowO: 0, rainO: 0, water1: '#f0b68e', water2: '#7f7397',
        curtain: '#eccdb0', curtainO: .66, heroInk: '#201c2c', scrimO: .3, birdO: .35, fireflyO: .25,
        paper: '#f2e6d6', photoSat: 1, photoBri: .98, photoCon: 1.02, tint: '#ff9f66', tintO: .08, frameB: .86, sway: 1 },
      night: { sky1: '#0a1324', sky2: '#16263e', sky3: '#2a405a', sunCore: '#ffe4b4', sunHalo: '#ff9e5c', sunO: 0, sunX: 1290, sunY: 900, moonO: 1, cloud: '#3f5878', cloudO: .5, rayO: 0, starO: 1,
        r5: '#1c2b3e', r4: '#15212f', r3: '#0f1922', r2: '#0a1217', r1: '#060a0d', t5: '#16232f', t4: '#111a24', t3: '#0c141a', t2: '#080e12', t1: '#04070a', fog: '#2e4257', fogO: .6,
        cabin: '#2a211d', roof: '#17120f', trim: '#120d0b', lamp: '#ffb257', lampO: 1, smokeO: .5,
        steam: '#c9d9ea', steamO: .6, snow: '#dbe7f2', snowO: 0, rainO: 0, water1: '#243a52', water2: '#0d1620',
        curtain: '#8a7a6a', curtainO: .7, heroInk: '#f1e9da', scrimO: .06, birdO: 0, fireflyO: 1,
        paper: '#ebe6de', photoSat: .9, photoBri: .94, photoCon: 1, tint: '#3b4f78', tintO: .08, frameB: .62, sway: .9 }
    },
    rainy: {
      dawn: { sky1: '#6e8291', sky2: '#93a3ab', sky3: '#b5c0c1', sunCore: '#e8ebe7', sunHalo: '#cdd4d3', sunO: .22, sunX: 690, sunY: 505, moonO: 0, cloud: '#aab7bb', cloudO: .9, rayO: 0, starO: 0,
        r5: '#9aa9ae', r4: '#7a8c91', r3: '#5e7378', r2: '#42575b', r1: '#29393c', t5: '#8b9ca1', t4: '#6b7f84', t3: '#51676b', t2: '#34494d', t1: '#1c292c', fog: '#c9d2d2', fogO: 1,
        cabin: '#4e4036', roof: '#2f2926', trim: '#271f1b', lamp: '#ffd28f', lampO: .78, smokeO: .8,
        steam: '#eef2f2', steamO: .78, snow: '#f7f9fa', snowO: 0, rainO: 1, water1: '#b9c5c6', water2: '#6d8184',
        curtain: '#dcd8cd', curtainO: .7, heroInk: '#142226', scrimO: .1, birdO: .15, fireflyO: 0,
        paper: '#efebe3', photoSat: .72, photoBri: .95, photoCon: .98, tint: '#5c7583', tintO: .16, frameB: .9, sway: 1.7 },
      day: { sky1: '#7a8e9c', sky2: '#a2b1b8', sky3: '#c5cece', sunCore: '#eef0ec', sunHalo: '#d5dbda', sunO: .2, sunX: 1010, sunY: 150, moonO: 0, cloud: '#b8c2c5', cloudO: .95, rayO: 0, starO: 0,
        r5: '#a0aeb3', r4: '#7f9196', r3: '#62777b', r2: '#465c60', r1: '#2c3d41', t5: '#91a1a6', t4: '#71868a', t3: '#576e72', t2: '#394f53', t1: '#1f2e31', fog: '#d3dbdb', fogO: .8,
        cabin: '#56463b', roof: '#322b27', trim: '#291f1b', lamp: '#ffd9a0', lampO: .42, smokeO: .5,
        steam: '#f2f5f5', steamO: .62, snow: '#f7f9fa', snowO: 0, rainO: 1, water1: '#c2cccd', water2: '#74898c',
        curtain: '#e2ded3', curtainO: .68, heroInk: '#16232a', scrimO: .05, birdO: .3, fireflyO: 0,
        paper: '#eeeae3', photoSat: .74, photoBri: .97, photoCon: .98, tint: '#5c7583', tintO: .14, frameB: .94, sway: 1.6 },
      dusk: { sky1: '#53647a', sky2: '#8c8f99', sky3: '#b49b90', sunCore: '#f3c9a6', sunHalo: '#d99c7c', sunO: .3, sunX: 1290, sunY: 498, moonO: .1, cloud: '#a89aa0', cloudO: .9, rayO: 0, starO: .08,
        r5: '#86899a', r4: '#696e80', r3: '#4f5768', r2: '#37404e', r1: '#212733', t5: '#797c8d', t4: '#5e6375', t3: '#474e5e', t2: '#2e3542', t1: '#171b24', fog: '#bab7be', fogO: .92,
        cabin: '#43362e', roof: '#28221f', trim: '#221b17', lamp: '#ffc478', lampO: .96, smokeO: .7,
        steam: '#f0d7cc', steamO: .72, snow: '#f7f9fa', snowO: 0, rainO: 1, water1: '#b7968e', water2: '#4d4f63',
        curtain: '#cfc3b7', curtainO: .72, heroInk: '#191b24', scrimO: .3, birdO: .1, fireflyO: .15,
        paper: '#efe5d9', photoSat: .8, photoBri: .94, photoCon: .98, tint: '#4e5a7a', tintO: .14, frameB: .8, sway: 1.8 },
      night: { sky1: '#0b121b', sky2: '#131d29', sky3: '#1e2b37', sunCore: '#f3c9a6', sunHalo: '#d99c7c', sunO: 0, sunX: 1290, sunY: 900, moonO: 1, cloud: '#2c3a48', cloudO: .7, rayO: 0, starO: .35,
        r5: '#19242e', r4: '#131c24', r3: '#0e151b', r2: '#090f13', r1: '#05080b', t5: '#141e27', t4: '#10181f', t3: '#0c1216', t2: '#080d10', t1: '#04070a', fog: '#24313c', fogO: .92,
        cabin: '#241d1a', roof: '#130f0d', trim: '#0f0b0a', lamp: '#ffae55', lampO: 1, smokeO: .55,
        steam: '#b9c9d6', steamO: .75, snow: '#f7f9fa', snowO: 0, rainO: 1, water1: '#1c2c3a', water2: '#081016',
        curtain: '#6f6a63', curtainO: .76, heroInk: '#edf0ee', scrimO: .06, birdO: 0, fireflyO: .5,
        paper: '#e6e3dd', photoSat: .72, photoBri: .9, photoCon: .98, tint: '#2c3c5c', tintO: .12, frameB: .58, sway: 1.7 }
    },
    snowy: {
      dawn: { sky1: '#a6bacc', sky2: '#e3d2cb', sky3: '#f7e8dc', sunCore: '#fff4e4', sunHalo: '#ffd8b2', sunO: .8, sunX: 690, sunY: 505, moonO: 0, cloud: '#fbe9e0', cloudO: .7, rayO: .3, starO: 0,
        r5: '#d8e0e7', r4: '#c5d2db', r3: '#aebec9', r2: '#97acb8', r1: '#e3eaee', t5: '#b9c8d3', t4: '#9fb2bf', t3: '#8098a7', t2: '#526a78', t1: '#22313a', fog: '#f4f6f7', fogO: .75,
        cabin: '#4f3e33', roof: '#332b27', trim: '#2a211c', lamp: '#ffcf8a', lampO: .72, smokeO: .9,
        steam: '#ffffff', steamO: .95, snow: '#f7f9fa', snowO: 1, rainO: 0, water1: '#dfe9ee', water2: '#9db6c2',
        curtain: '#f0ebe4', curtainO: .66, heroInk: '#1f2b34', scrimO: .06, birdO: .3, fireflyO: 0,
        paper: '#f3f1ee', photoSat: .8, photoBri: 1.04, photoCon: .98, tint: '#bcd0e2', tintO: .1, frameB: 1, sway: 1.5 },
      day: { sky1: '#9cbad6', sky2: '#cddcea', sky3: '#eef2f4', sunCore: '#fffdf5', sunHalo: '#eaf2fb', sunO: .9, sunX: 1010, sunY: 150, moonO: 0, cloud: '#ffffff', cloudO: .8, rayO: .12, starO: 0,
        r5: '#dee6ec', r4: '#cbd7e1', r3: '#b5c6d2', r2: '#9cb0bd', r1: '#e9eef1', t5: '#c2cfd9', t4: '#a8b9c6', t3: '#8ba2b1', t2: '#5b7381', t1: '#24343d', fog: '#f6f8f9', fogO: .5,
        cabin: '#5a4639', roof: '#382f2a', trim: '#2e241e', lamp: '#ffdba6', lampO: .25, smokeO: .5,
        steam: '#ffffff', steamO: .8, snow: '#f7f9fa', snowO: 1, rainO: 0, water1: '#e4edf1', water2: '#a3bcc8',
        curtain: '#f3efe9', curtainO: .62, heroInk: '#1a2730', scrimO: 0, birdO: .5, fireflyO: 0,
        paper: '#f4f2ef', photoSat: .82, photoBri: 1.05, photoCon: .98, tint: '#bcd0e2', tintO: .08, frameB: 1.04, sway: 1.3 },
      dusk: { sky1: '#7b8db0', sky2: '#eabaa4', sky3: '#f8d8c2', sunCore: '#ffe8c8', sunHalo: '#ffb48c', sunO: .85, sunX: 1290, sunY: 498, moonO: .12, cloud: '#ffcdb8', cloudO: .75, rayO: .4, starO: .12,
        r5: '#cbc6d7', r4: '#b4b1c7', r3: '#999bb1', r2: '#7f889f', r1: '#d5d9e3', t5: '#b1acbf', t4: '#9793ab', t3: '#7c7e95', t2: '#515a70', t1: '#1f2533', fog: '#f0d3cf', fogO: .7,
        cabin: '#46372f', roof: '#2a2421', trim: '#231b17', lamp: '#ffbe72', lampO: .96, smokeO: .8,
        steam: '#ffe2d2', steamO: .95, snow: '#f9e9ea', snowO: 1, rainO: 0, water1: '#f3c6b4', water2: '#7d829e',
        curtain: '#ecd7cc', curtainO: .7, heroInk: '#221e2a', scrimO: .26, birdO: .2, fireflyO: .1,
        paper: '#f2e8de', photoSat: .86, photoBri: 1.02, photoCon: .98, tint: '#d58aa8', tintO: .06, frameB: .86, sway: 1.5 },
      night: { sky1: '#0e192b', sky2: '#1b2a44', sky3: '#31455f', sunCore: '#ffe8c8', sunHalo: '#ffb48c', sunO: 0, sunX: 1290, sunY: 900, moonO: 1, cloud: '#44587a', cloudO: .6, rayO: 0, starO: 1,
        r5: '#27374b', r4: '#2c3d52', r3: '#34475c', r2: '#4a5f77', r1: '#a9bfd4', t5: '#1f2d3d', t4: '#192534', t3: '#121c27', t2: '#0c141c', t1: '#05090d', fog: '#4d6280', fogO: .65,
        cabin: '#241d1a', roof: '#15110f', trim: '#100c0b', lamp: '#ffb45e', lampO: 1, smokeO: .6,
        steam: '#dfe9f3', steamO: .95, snow: '#e3eef8', snowO: 1, rainO: 0, water1: '#2a405a', water2: '#0d1822',
        curtain: '#8e8c8e', curtainO: .72, heroInk: '#f2ecdf', scrimO: .06, birdO: 0, fireflyO: 0,
        paper: '#e9e6e1', photoSat: .78, photoBri: .95, photoCon: .98, tint: '#34486e', tintO: .1, frameB: .6, sway: 1.4 }
    }
  };

  SG.data = {
    lodge: {
      name: '山谷留宿', en: 'VALLEY STAY', tagline: '把时间交还给山林',
      enTagline: 'Give your time back to the mountains.',
      place: '云岭山脉 · 雾起谷 7 号（虚构地址）', altitude: '1,280', distance: '23', roomsTotal: 9, books: '3,000'
    },

    weather: {
      sunny: { label: '晴', icon: 'sun', temp: '12°C', hum: '48%', wind: '北风 2 级', feel: '看得见山脊',
        line: '适合上落日垭口，记得 17:30 前出发。', img: 'assets/img/hills-dawn.webp', imgAlt: '晨光里的层叠山峦' },
      rainy: { label: '雨', icon: 'rain', temp: '11°C', hum: '92%', wind: '东风 3 级', feel: '檐下听雨',
        line: '溪水会涨，今天推荐走林下步道，晚餐加一锅姜汤。', img: 'assets/img/rain-forest.webp', imgAlt: '雨雾中的山林' },
      snowy: { label: '雪', icon: 'snow', temp: '−4°C', hum: '76%', wind: '微风', feel: '谷汤最盛',
        line: '山路需装防滑链，我们已经把火塘生好了。', img: 'assets/img/snow-cabin.webp', imgAlt: '雪夜里亮着灯的木屋' }
    },
    timeNotes: { dawn: '雾还没散', day: '阳光落在檐廊', dusk: '灯一盏盏亮起来', night: '只剩炉火和虫鸣' },
    clockAt: { dawn: 6 * 60 + 12, day: 13 * 60 + 40, dusk: 18 * 60 + 50, night: 22 * 60 + 40 },

    rooms: [
      { id: 'jianshan', name: '见山房', en: 'FACING THE PEAK', size: 32, bed: '1.8 × 2.0 m 原木大床', sleeps: 2, floor: '二层 · 朝西', view: '正对山脊', price: 1280, weekend: 1480,
        line: '一整面墙的窗，只留给西面的山脊。', photo: 'assets/img/detail-window.webp', photoAlt: '见山房：深色墙面与朝向树林的大窗',
        desc: '床对着整面落地窗，窗帘是半透的亚麻，天亮的时候不用起身，就能看见雾从谷底往上爬。傍晚山脊会先变成金色，再变成紫色。',
        amenities: ['地暖', '落地观景窗', '手冲咖啡套装', '白茶浴品', '加湿器', '窗边坐台', '阅读灯', '耳塞与蒸汽眼罩'],
        gallery: [
          { src: 'assets/img/detail-window.webp', alt: '见山房：深色墙面与朝向树林的大窗' },
          { src: 'assets/img/room-jianshan.webp', alt: '见山房：从客房通向露台的走廊，午后有光斜进来' },
          { src: 'assets/img/detail-desk.webp', alt: '见山房：窗边的木书桌' }] },
      { id: 'tingxi', name: '听溪房', en: 'CREEK WHISPER', size: 26, bed: '1.5 × 2.0 m 实木床', sleeps: 2, floor: '一层 · 朝北', view: '溪涧与竹林', price: 980, weekend: 1180,
        line: '开一条窗缝，就能听见溪水。', photo: 'assets/img/room-tingxi.webp', photoAlt: '听溪房：深色木墙与灯下的床',
        desc: '房间最小，也最安静。窗下就是溪，夜里水声会盖过一切。墙上有一台唱机，唱片在前台，可以随便借。',
        amenities: ['地暖', '溪景小窗', '黑胶唱机', '阅读灯', '手冲咖啡套装', '白茶浴品', '加湿器', '羊毛盖毯'],
        gallery: [
          { src: 'assets/img/room-tingxi.webp', alt: '听溪房：深色木墙与灯下的床' },
          { src: 'assets/img/detail-darkwood.webp', alt: '听溪房：木格栅与暖色壁灯' },
          { src: 'assets/img/detail-linen.webp', alt: '听溪房：亚麻与陶土色的床品' }] },
      { id: 'wuqi', name: '雾起套房', en: 'MIST SUITE', size: 46, bed: '1.8 × 2.0 m 大床', sleeps: 3, floor: '二层 · 朝东南', view: '整条山谷', price: 1880, weekend: 2180,
        line: '雾从窗前经过时，房间会变成白色。', photo: 'assets/img/room-wuqi.webp', photoAlt: '雾起套房：木饰面客房与通向庭院的玻璃门',
        desc: '引了谷汤的泉水进房，室内有一只石头浴缸。有独立的起居区，可以加一张单人床。雾起的时候，整间房像浮在云上。',
        amenities: ['室内温泉石缸', '独立起居区', '地暖', '黑胶唱机', '手冲咖啡套装', '岩茶迎宾', '加湿器', '可加单人床（¥300 / 晚）'],
        gallery: [
          { src: 'assets/img/room-wuqi.webp', alt: '雾起套房：木饰面客房与通向庭院的玻璃门' },
          { src: 'assets/img/detail-tub.webp', alt: '雾起套房：引入温泉水的石浴缸' },
          { src: 'assets/img/detail-bathwin.webp', alt: '雾起套房：带窗的浴室' }] },
      { id: 'xingye', name: '星野阁楼', en: 'LOFT UNDER STARS', size: 58, bed: '1.8 × 2.0 m 大床 + 2 张 0.9 m 单人床', sleeps: 4, floor: '三层 · 复式', view: '天窗与星子', price: 2280, weekend: 2580,
        line: '屋顶开了一扇天窗，躺着就能等星星。', photo: 'assets/img/room-xingye.webp', photoAlt: '星野阁楼：带屏风与藤编家具的阁楼卧室',
        desc: '整栋最高的房间，屋顶斜着一扇天窗。楼下是两张单人床和一张长书桌，楼上是那张大床。适合一家人，或者三个很久没见的朋友。',
        amenities: ['屋顶天窗', '复式两层', '地暖', '长书桌', '黑胶唱机', '手冲咖啡套装', '儿童拖鞋与绘本', '加湿器'],
        gallery: [
          { src: 'assets/img/room-xingye.webp', alt: '星野阁楼：带屏风与藤编家具的阁楼卧室' },
          { src: 'assets/img/detail-linen.webp', alt: '星野阁楼：陶土色条纹的床品' },
          { src: 'assets/img/detail-desk.webp', alt: '星野阁楼：窗边的木书桌' }] }
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
        { src: 'assets/img/detail-tub.webp', alt: '室内石浴缸，引入谷汤泉水' },
        { src: 'assets/img/detail-bathwin.webp', alt: '带窗的浴室与浴缸' }
      ]
    },

    dining: {
      name: '山食', en: 'MOUNTAIN TABLE', title: '一日三食，跟着山里的时令',
      lead: '没有菜单可以点，每天吃什么，看后园的菜地、邻村阿婆的豆腐，和山里刚刚长出来的东西。八成食材来自三十公里内。',
      source: '后园菜地 · 邻村豆腐 · 山笋与菌子 · 溪鱼 · 土锅米饭',
      meals: [
        { id: 'breakfast', time: '07:30 – 09:30', phase: 'dawn', name: '早餐', en: 'BREAKFAST', title: '土锅白粥，和七种自家腌菜', price: '含在房费内',
          items: ['土锅白粥', '七种自家腌菜', '炭火烤吐司与山蜂蜜', '溪鸡蛋', '应季果酱', '手冲咖啡或云雾茶'],
          photo: 'assets/img/food-breakfast.webp', photoAlt: '木桌上的早餐：面包、蛋与沙拉' },
        { id: 'tea', time: '14:30 – 16:30', phase: 'day', name: '下午茶', en: 'AFTERNOON TEA', title: '蒸笼一掀，整个檐廊都是白汽', price: '¥88 / 套',
          items: ['蒸笼松茸包', '炭烤红薯', '桂花米酒', '应季水果', '一壶云雾茶'],
          photo: 'assets/img/food-tea.webp', photoAlt: '木桌上的白瓷茶壶与茶杯' },
        { id: 'dinner', time: '18:30 开席', phase: 'dusk', name: '晚餐', en: 'DINNER', title: '一桌一锅，土鸡在汤里翻滚', price: '¥288 / 位 · 需预约',
          items: ['高山土鸡锅', '山笋与腊肉', '盐烧溪鱼', '时蔬', '土锅米饭', '餐后甜点（看心情）'],
          photo: 'assets/img/food-hotpot.webp', photoAlt: '冒着热气的砂锅：鱼与青菜' }
      ],
      notes: ['忌口请在预约时备注，最晚提前 24 小时', '晚餐是一起吃的长桌，想独处的可以端回房间', '以上价格均为演示内容']
    },

    spaces: [
      { id: 'fireplace', name: '壁炉厅', en: 'FIREPLACE HALL', time: '21:10', photo: 'assets/img/space-fireplace.webp', alt: '壁炉厅：燃着火的壁炉、书架与两把扶手椅',
        desc: '三层挑高，一座石砌壁炉，三千册可以借走的书。Wi-Fi 只在这里有一格信号。' },
      { id: 'table', name: '长桌', en: 'THE LONG TABLE', time: '18:30', photo: 'assets/img/space-living.webp', alt: '拱窗下的客厅与长桌',
        desc: '一张 4.2 米长的老杉木桌，早餐和晚餐都在这里。不认识的人，常常会聊起来。' },
      { id: 'engawa', name: '檐廊', en: 'ENGAWA', time: '15:20', photo: 'assets/img/space-veranda.webp', alt: '月光下的木质檐廊与藤椅',
        desc: '沿着南面的一圈窄廊，夏天躺着吹风，冬天晒太阳。雨天从这里看雨最合适。' },
      { id: 'library', name: '书架与窗台', en: 'LIBRARY NOOK', time: '16:40', photo: 'assets/img/space-library.webp', alt: '顶到天花板的木质书架',
        desc: '书大多是住客留下的，扉页上写着他们的城市。窗台铺了垫子，可以窝一下午。' },
      { id: 'irori', name: '火塘', en: 'IRORI', time: '21:00', photo: 'assets/img/space-lounge.webp', alt: '木质空间里围成一圈的皮面沙发',
        desc: '晚上九点生火，烤糯米团子和橘子。沈树会讲那个迷路的故事，已经讲了四年。' }
    ],
    spacesMore: ['洗衣房（投币）', '小卖部 · 山货与手作', '瑜伽平台（清晨可借用）', '停车场 8 个车位', '充电桩 ×2'],

    routes: [
      { id: 'mist', no: '01', name: '雾起步道', en: 'MIST LOOP', shape: '环线', km: 3.2, hrs: '约 1.5 小时', gain: 110, diff: 1, best: '清晨 · 雨后',
        photo: 'assets/img/trail-fog.webp', photoAlt: '雾气与晨光里的森林小路',
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
        photo: 'assets/img/trail-creek.webp', photoAlt: '溪谷上的小桥与瀑布',
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
        photo: 'assets/img/trail-pines.webp', photoAlt: '松林后高耸的山峰',
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
        photo: 'assets/img/trail-forest.webp', photoAlt: '阳光穿过林间步道',
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

  SG.palettes = P;
})();
