**简体中文** | [English](./README.en.md)

# 浮光note

根据个人偏好定制的 Astro 中文博客原型，默认运行在
<http://127.0.0.1:4330/>。

## 环境要求

- Node.js `>=22.12.0`（Astro 7 的运行时要求）
- npm `11.6.2`（由 `packageManager` 字段声明）

依赖版本已经写入 `package.json` 和 `package-lock.json`。网络正常时，在项目目录执行
`npm ci`（或 `npm install`）安装依赖；`npm ci` 会使用 lockfile 做可复现安装。

## 页面

- 首页：主推故事、四分类模块、最近更新和时间线
- 分类：技术、生活、读书、游戏
- 文章详情、全文搜索、归档、关于、RSS
- 跟随系统的深浅主题，并支持手动切换

作者资料集中在 `src/data/site.ts`（署名 `Theologian25 · 愚者`、邮箱与简介），
邮箱留空时页脚和关于页不显示邮件入口。文章位于 `src/content/posts/`。

内容定位为"安全技术、CTF 复盘与读书笔记"。文章改写自个人 Obsidian 笔记库
（`E:\BaiduSyncdisk\Notes`）；发布前请检查是否包含靶场路径、真实口令、内部
信息等不宜公开的内容。

## 本地命令

```powershell
$env:ASTRO_TELEMETRY_DISABLED = "1"
npm run prepare:images
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4330
```

## 正式部署

构建产物在 `dist/`，可部署到任意静态托管或 CDN。部署前设置实际域名：

```powershell
$env:SITE_URL = "https://blog.example.com"
npm run build
```

该地址会用于 canonical、Open Graph、RSS、sitemap 和 `robots.txt`；没有配置时回退到
本地预览地址 `http://127.0.0.1:4330`，方便断网开发，但不应直接用该回退值发布到公网。

### GitHub Pages 子路径部署

当前站点部署在 `https://wrhyija1379.github.io/fuguang-notes/`。子路径部署需同时设置
`SITE_URL`（站点绝对地址）与 `SITE_BASE`（资源前缀）：

```powershell
$env:SITE_URL = "https://wrhyija1379.github.io/fuguang-notes"
$env:SITE_BASE = "/fuguang-notes"
npm run build
```

`SITE_BASE` 会用于资源路径、canonical、og:image、RSS、sitemap、robots 与搜索链接，
避免子路径部署时全部指向域名根。部署时把 `dist/` 内容发布到仓库 `gh-pages` 分支
（GitHub 仓库 Settings → Pages → Source 选择 `Deploy from a branch` → `gh-pages`）。

`public/_headers` 内置了 Netlify / Cloudflare Pages 通用的缓存策略：
HTML 不缓存（发布即时可见）、`_astro/` 带哈希资源长缓存（`immutable`）、图片短缓存、
feed / sitemap / robots 一小时缓存。部署平台未读取 `_headers` 时，请把同名规则
配置到平台的响应头设置里。

`prepare:images` 使用开发依赖 `sharp`，从 `assets/sources/` 读取原图，生成
`public/images/` 下的主图和 480 / 960 / 1600 三档 WebP。主图用于分类 fallback，
逐篇封面（`post-*`）从既有素材按语义裁切不同区域、宽高比与色调生成。修改原图或
封面任务后请重新执行该命令。

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

代码以 [MIT](./LICENSE) 发布,© 2026 Theologian25。文章正文与示例品牌均为占位内容;
摄影素材遵循 Unsplash License,归属见上。
