[简体中文](./README.md) | **English**

# Fuguang Notes

A hand-built Astro blog template with a Chinese-first design, developed to
personal taste. It runs at <http://127.0.0.1:4330/> by default.

The name 浮光笔记 ("Fuguang Notes") is the demo brand; author `林屿` and all
copy are placeholders you are meant to replace.

## Requirements

- Node.js `>=22.12.0` (Astro 7 runtime requirement)
- npm `11.6.2` (declared via the `packageManager` field)

Dependency versions are pinned in `package.json`. With a working network,
run `npm install` in the project directory. This project has a single runtime
dependency (`astro`); everything else is dev-only.

## Features

- Home: featured story, four category modules, recent updates, and a timeline
- Categories: Tech, Life, Reading, Gaming
- Article detail, full-text search, archive, about page, RSS
- System-following light/dark theme with a manual three-state toggle
- Local-only responsive WebP images (480 / 960 / 1600) — no runtime remote requests
- SEO built in: canonical, Open Graph, Twitter Card, `BlogPosting` JSON-LD,
  sitemap, and RSS auto-discovery

Search is index-based: the build emits a single `/search-index.json`, and the
client lazily fetches it once and builds an in-memory inverted index
(CJK bigram + unigram, Latin word tokens). Search data is **not** inlined into
every page, so per-page weight stays flat as the number of articles grows.

## Local commands

```bash
export ASTRO_TELEMETRY_DISABLED=1   # PowerShell: $env:ASTRO_TELEMETRY_DISABLED = "1"
npm run prepare:images
npm run check
npm run build
npm run preview -- --host 127.0.0.1 --port 4330
```

Set the real origin via an environment variable before a production build;
`.env.example` lists the variables for a hosting platform. The value feeds
canonical URLs, Open Graph, RSS, sitemap, and `robots.txt`:

```bash
export SITE_URL="https://blog.example.com"   # PowerShell: $env:SITE_URL = "..."
npm run build
```

Without it, the build falls back to `http://127.0.0.1:4330` for offline
development — do not publish with that fallback.

`prepare:images` uses the dev dependency `sharp` to read originals from
`assets/sources/` and generate the main image plus 480 / 960 / 1600 WebP
variants under `public/images/`. Re-run it after changing any original.

Content lives in `src/content/posts/`; site-wide config (name, author, email,
categories) is centralized in `src/data/site.ts`. The email entry is empty by
default, and the mail link only appears once you fill it in.

Improvement audit and roadmap are tracked in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md).

## Image credits

Pages reference local WebP only and never request remote images at runtime.
All nine photography originals come from Unsplash under the
[Unsplash License](https://unsplash.com/license), with traceable attribution:

- Hero: [Caspar Camille Rubin](https://unsplash.com/photos/two-black-flat-screen-computer-monitors-and-keyboard-0qvBNep1Y04)
- Technology: [Ilya Pavlov](https://unsplash.com/photos/monitor-showing-java-programming-OqtafYT5kTw)
- Life: [Pedro Lastra](https://unsplash.com/photos/aerial-photography-of-city-buildings-Nyvq2juw4_o)
- Reading: [Ed Robertson](https://unsplash.com/photos/assorted-title-of-books-on-shelves-eeSdJfLfx1A)
- Gaming: [Florian Olivo](https://unsplash.com/photos/man-playing-game-on-computer-Mf23RF8xArY)
- About: [Aaron Burden](https://unsplash.com/photos/fountain-pen-on-spiral-book-xG8IQMqMITM)
- Dinner: [Janesca](https://unsplash.com/photos/Usb6bGFaApI)
- Rainy desk: [Suhyeon Choi](https://unsplash.com/photos/rain-drops-on-window-glass-HCDugQDdtfc)
- Outer Wilds: [John Fowler](https://unsplash.com/photos/7Ym9rpYtSdA)

Uncompressed originals stay in `assets/sources/` and are never copied into the
static output.

## License

[MIT](./LICENSE) © 2026 Wrhyija1379. Article text and the demo brand are
placeholder content; the photography is under the Unsplash License as credited
above.
