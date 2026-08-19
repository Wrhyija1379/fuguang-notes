export const site = {
  name: "浮光note",
  shortName: "浮光",
  description: "安全技术、CTF 复盘与读书笔记，记录那些值得再想一遍的问题。",
  author: "Theologian25 · 愚者",
  role: "无可失去的使人变成勇者",
  email: "theologian25@qq.com",
  monogram: "T25",
};

export const categoryOrder = ["tech", "life", "reading", "gaming"] as const;
export type CategoryKey = (typeof categoryOrder)[number];

export const categories: Record<
  CategoryKey,
  {
    label: string;
    moduleTitle: string;
    english: string;
    description: string;
    cover: string;
    accent: string;
    share: string;
  }
> = {
  tech: {
    label: "技术",
    moduleTitle: "编译现场",
    english: "Build Log",
    description: "渗透测试、CTF 复盘与安全原理，把每一次尝试整理成可复用的经验。",
    cover: "/images/tech.webp",
    accent: "#3ecf8e",
    share: "50%",
  },
  life: {
    label: "生活",
    moduleTitle: "城市切片",
    english: "Field Notes",
    description: "散步、食物、房间与注意力，记录生活里缓慢发生的变化。",
    cover: "/images/life.webp",
    accent: "#d8a73e",
    share: "30%",
  },
  reading: {
    label: "读书",
    moduleTitle: "页边留白",
    english: "Marginalia",
    description: "一本书，一段摘录，以及读完之后仍然留下的问题。",
    cover: "/images/reading.webp",
    accent: "#e3342f",
    share: "10%",
  },
  gaming: {
    label: "游戏",
    moduleTitle: "存档时刻",
    english: "Save Point",
    description: "不做流水账，只保存那些真正改变体验的瞬间。",
    cover: "/images/gaming.webp",
    accent: "#9b6bff",
    share: "10%",
  },
};

export const moments = [
  {
    date: "08.19",
    type: "学习",
    title: "整理安全测试分析笔记",
    note: "把 151 篇 Obsidian 笔记梳理成可检索的知识库，沉淀到浮光note。",
  },
  {
    date: "08.12",
    type: "阅读",
    title: "批注《为什么你攒不下钱？》",
    note: "最值得留下的不是公式，而是把金钱放回日常生活资产负债表的方法。",
  },
  {
    date: "07.28",
    type: "CTF",
    title: "LitCTF EasySql 复盘",
    note: "字符串型判断、debug 泄露、宽字节绕过到 UNION 取数，链路完整。",
  },
  {
    date: "07.20",
    type: "环境",
    title: "ArchWSL 图形化配置完成",
    note: "密钥环、KDE Plasma、fcitx5 与一键启动脚本，全程记录在案。",
  },
];
