import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { categories, type CategoryKey } from "@/data/site";
import { getReadingMinutes, postHref, sortPosts } from "@/lib/posts";

// 把 markdown 正文压成可检索的纯文本(与 estimateReadingMinutes 的清洗一致)。
const toPlainText = (value: string) =>
  value
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1") // 图片/链接 → 保留可读文字
    .replace(/```[\s\S]*?```/g, " ") // 代码块
    .replace(/<[^>]+>/g, " ") // HTML 标签
    .replace(/https?:\/\/\S+/g, " ") // 裸链接
    .replace(/[`*_#>~|]+/g, " ") // 残留 md 符号
    .replace(/\s+/g, " ")
    .trim();

// 单份索引:全站只输出一次,首次搜索时懒加载。取代原先每页内联全文的 O(N^2) 方案。
export type SearchDoc = {
  h: string; // href
  t: string; // 标题(展示 + 检索)
  c: CategoryKey; // 分类 key(data-category)
  l: string; // 分类中文标签(展示)
  m: number; // 阅读分钟(展示)
  s: string; // 摘要(检索)
  g: string[]; // 标签(检索)
  b: string; // 正文纯文本(检索)
};

export const GET: APIRoute = async () => {
  const posts = sortPosts(await getCollection("posts", ({ data }) => !data.draft));

  const docs: SearchDoc[] = posts.map((post) => ({
    h: postHref(post),
    t: post.data.title,
    c: post.data.category,
    l: categories[post.data.category].label,
    m: getReadingMinutes(post),
    s: post.data.summary,
    g: post.data.tags,
    b: toPlainText(post.body ?? ""),
  }));

  return new Response(JSON.stringify(docs), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // 内容变更即换构建,可长缓存;文件名不带 hash,故用 must-revalidate 折中。
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
