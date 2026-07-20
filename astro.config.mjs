import { defineConfig } from "astro/config";

const LOCAL_SITE_URL = "http://127.0.0.1:4330";
const configuredSiteUrl = process.env.SITE_URL?.trim() || LOCAL_SITE_URL;

let siteUrl;
try {
  const parsedSiteUrl = new URL(configuredSiteUrl);
  if (!["http:", "https:"].includes(parsedSiteUrl.protocol)) {
    throw new Error("unsupported protocol");
  }
  siteUrl = parsedSiteUrl.toString();
} catch {
  throw new Error(`SITE_URL must be an absolute HTTP(S) URL, received: ${configuredSiteUrl}`);
}

export default defineConfig({
  site: siteUrl,
  server: {
    host: "127.0.0.1",
    port: 4330,
  },
});
