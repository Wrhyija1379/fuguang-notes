import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { site } from "@/data/site";
import { postHref, sortPosts } from "@/lib/posts";

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);

export const GET: APIRoute = async ({ site: configuredSite, url }) => {
  const baseUrl = configuredSite ?? new URL(url.origin);
  const posts = sortPosts(await getCollection("posts", ({ data }) => !data.draft));
  const channelUrl = new URL("/", baseUrl).toString();
  const feedUrl = new URL("/rss.xml", baseUrl).toString();
  const lastBuildDate = posts.reduce((latest, post) => {
    const changedAt = post.data.updatedAt ?? post.data.publishedAt;
    return changedAt > latest ? changedAt : latest;
  }, posts[0]?.data.updatedAt ?? posts[0]?.data.publishedAt ?? new Date());

  const items = posts.map((post) => {
    const postUrl = new URL(postHref(post), baseUrl).toString();
    return `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <description>${escapeXml(post.data.summary)}</description>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${post.data.publishedAt.toUTCString()}</pubDate>
      <dc:creator>${escapeXml(site.author)}</dc:creator>
      <category>${escapeXml(post.data.category)}</category>
      ${post.data.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("\n      ")}
    </item>`;
  }).join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <description>${escapeXml(site.description)}</description>
    <link>${escapeXml(channelUrl)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>
    <generator>Astro</generator>${items}
  </channel>
</rss>`, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
