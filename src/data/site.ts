export const site = {
  name: "浮光笔记",
  shortName: "浮光",
  description: "写代码，也写那些值得慢下来看的日常。",
  author: "林屿",
  role: "独立开发者 / 长期主义的记录者",
  email: "",
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
    description: "工程实践、工具实验，以及那些真正解决问题的代码。",
    cover: "/images/tech.webp",
    accent: "#72f5b1",
    share: "50%",
  },
  life: {
    label: "生活",
    moduleTitle: "城市切片",
    english: "Field Notes",
    description: "散步、食物、房间与注意力，记录生活里缓慢发生的变化。",
    cover: "/images/life.webp",
    accent: "#ff765e",
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
    accent: "#f4d73b",
    share: "10%",
  },
};

export const moments = [
  {
    date: "07.18",
    type: "项目",
    title: "把博客首页拆成四种内容语气",
    note: "技术需要密度，生活需要呼吸，书和游戏都值得拥有自己的舞台。",
  },
  {
    date: "07.14",
    type: "阅读",
    title: "重读《禅与摩托车维修艺术》",
    note: "在页边重新写下：技术质量从来不只是指标。",
  },
  {
    date: "07.09",
    type: "散步",
    title: "完成城南步行地图第一版",
    note: "标了 7 家小店、3 条树荫路和一个适合发呆的长椅。",
  },
  {
    date: "07.03",
    type: "游戏",
    title: "《Outer Wilds》航行日志归档",
    note: "最后留下的不是通关，而是一次关于好奇心的练习。",
  },
];
