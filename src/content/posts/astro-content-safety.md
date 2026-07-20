---
title: "Astro 内容集合的类型安全实践"
summary: "让文章元数据在构建阶段就暴露错误，并让首页、分类页和 RSS 共用同一份可信内容。"
category: tech
publishedAt: 2026-07-11
tags: ["Astro", "TypeScript", "内容系统"]
cover: "/images/tech.webp"
coverAlt: "电脑屏幕上的代码界面"
featured: false
---

博客很容易从几个 Markdown 文件长成一套小型内容系统。分类名称不一致、日期格式写错、封面遗漏，都会在页面数量增加后变成难查的细小故障。

Astro 内容集合最实用的地方，是把这些约定变成构建阶段的检查。分类使用枚举，日期统一转换，摘要和封面设置为必填，草稿则有明确的默认值。

```ts
const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    category: z.enum(["tech", "life", "reading", "gaming"]),
    publishedAt: z.coerce.date(),
  }),
});
```

这样一来，首页、分类页、归档和 RSS 都只消费同一份经过验证的数据。类型安全不是为了让配置看起来专业，而是为了把内容维护中最无聊的错误提前消灭。
