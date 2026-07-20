**简体中文** | [English](./README.en.md)

# 浮光笔记

根据个人偏好定制的 Astro 中文博客原型，默认运行在
<http://127.0.0.1:4330/>。

## 环境要求

- Node.js `>=22.12.0`（Astro 7 的运行时要求）
- npm `11.6.2`（由 `packageManager` 字段声明）

依赖版本已经写入 `package.json`。网络正常时，在项目目录执行
`npm install` 安装依赖；`node_modules` 目录联接只用于当前断网预览，不能作为部署依赖。

## 页面

- 首页：主推故事、四分类模块、最近更新和时间线
- 分类：技术、生活、读书、游戏
- 文章详情、全文搜索、归档、关于、RSS
- 跟随系统的深浅主题，并支持手动切换

示例作者 `林屿` 和文案目前是占位内容，集中在 `src/data/site.ts`；邮箱默认留空，
填写后才会显示邮件入口。文章位于 `src/content/posts/`。

## 本地命令

```powershell
$env:ASTRO_TELEMETRY_DISABLED = "1"
npm run prepare:images
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4330
```

正式构建前通过环境变量设置实际域名；`.env.example` 可作为部署平台的变量清单。
该地址会用于 canonical、Open Graph、RSS、sitemap 和 `robots.txt`：

```powershell
$env:SITE_URL = "https://blog.example.com"
npm run build
```

没有配置时会回退到本地预览地址 `http://127.0.0.1:4330`，方便断网开发，但不应直接
用该回退值发布到公网。

`prepare:images` 使用开发依赖 `sharp`，从 `assets/sources/` 读取原图，生成
`public/images/` 下的主图和 480 / 960 / 1600 三档 WebP。修改原图后请重新执行该命令。
当前 `node_modules` 是到 `personal-blog-astropaper/node_modules` 的目录联接，
用于断网环境下复用本机已有的 Astro 7 和 sharp；网络恢复后应移除该联接并重新执行
`npm install`。项目源码不依赖其他模板的运行时代码。

改进审计和后续实施顺序记录在 [`IMPROVEMENTS.md`](./IMPROVEMENTS.md)。

## 图片来源

页面只引用本地 WebP，不在运行时请求远程图片。原图保存在
`assets/sources/`，由 `scripts/prepare-images.mjs` 统一裁切、调色并压缩。

全部九张摄影原图均来自 Unsplash，遵循 [Unsplash License](https://unsplash.com/license)，
归属链接可追溯：

- Hero: [Caspar Camille Rubin](https://unsplash.com/photos/two-black-flat-screen-computer-monitors-and-keyboard-0qvBNep1Y04)
- Technology: [Ilya Pavlov](https://unsplash.com/photos/monitor-showing-java-programming-OqtafYT5kTw)
- Life: [Pedro Lastra](https://unsplash.com/photos/aerial-photography-of-city-buildings-Nyvq2juw4_o)
- Reading: [Ed Robertson](https://unsplash.com/photos/assorted-title-of-books-on-shelves-eeSdJfLfx1A)
- Gaming: [Florian Olivo](https://unsplash.com/photos/man-playing-game-on-computer-Mf23RF8xArY)
- About: [Aaron Burden](https://unsplash.com/photos/fountain-pen-on-spiral-book-xG8IQMqMITM)
- Dinner: [Janesca](https://unsplash.com/photos/Usb6bGFaApI)
- Rainy desk: [Suhyeon Choi](https://unsplash.com/photos/rain-drops-on-window-glass-HCDugQDdtfc)
- Outer Wilds: [John Fowler](https://unsplash.com/photos/7Ym9rpYtSdA)

迁移期间遗留在 `public/images/source-*` 的旧素材副本已经清理；未压缩原图只保留在
`assets/sources/`，不会被复制到静态产物。

## 搜索实现

全文搜索基于索引:构建时输出唯一一份 `/search-index.json`,客户端在首次搜索时
懒加载并在内存里建倒排索引(中文 bigram + unigram,英文按词)。搜索数据不再内联到
每个页面,因此文章增多时单页体积保持恒定。

## 许可

代码以 [MIT](./LICENSE) 发布,© 2026 Wrhyija1379。文章正文与示例品牌均为占位内容;
摄影素材遵循 Unsplash License,归属见上。
