import type { CollectionEntry } from "astro:content";
import { categories, type CategoryKey } from "@/data/site";

export type Post = CollectionEntry<"posts">;

export const sortPosts = (posts: Post[]) =>
  [...posts].sort(
    (a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
  );

export const formatDate = (date: Date, withYear = true) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: withYear ? "numeric" : undefined,
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const getCategory = (key: string) =>
  categories[key as CategoryKey] ?? categories.tech;

export const postHref = (post: Post) => {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${basePath}/posts/${post.id}/`;
};

const CHINESE_CHARACTER = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export const estimateReadingMinutes = (content: string) => {
  const readableText = content
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const chineseCharacters = readableText.match(CHINESE_CHARACTER)?.length ?? 0;
  const latinWords = readableText.match(LATIN_WORD)?.length ?? 0;

  return Math.max(1, Math.ceil(chineseCharacters / 300 + latinWords / 200));
};

export const getReadingMinutes = (post: Post) =>
  post.data.readingMinutes ?? estimateReadingMinutes(post.body ?? "");
