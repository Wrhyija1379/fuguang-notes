import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site, url }) => {
  const baseUrl = site ?? new URL(url.origin);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const sitemapUrl = new URL(`${basePath}/sitemap.xml`, baseUrl).toString();

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
