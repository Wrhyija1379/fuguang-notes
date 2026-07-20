import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { categoryOrder } from "@/data/site";
import { postHref, sortPosts } from "@/lib/posts";

const escapeXml = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);

export const GET: APIRoute = async ({ site, url }) => {
  const baseUrl = site ?? new URL(url.origin);
  const posts = sortPosts(await getCollection("posts", ({ data }) => !data.draft));
  const staticPaths = [
    "/",
    "/about/",
    "/archive/",
    ...categoryOrder.map((category) => `/category/${category}/`),
  ];

  const staticEntries = staticPaths.map((path) => `  <url>
    <loc>${escapeXml(new URL(path, baseUrl).toString())}</loc>
  </url>`);
  const postEntries = posts.map((post) => `  <url>
    <loc>${escapeXml(new URL(postHref(post), baseUrl).toString())}</loc>
    <lastmod>${(post.data.updatedAt ?? post.data.publishedAt).toISOString()}</lastmod>
  </url>`);

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...postEntries].join("\n")}
</urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
