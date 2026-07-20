import { chromium } from "file:///C:/Users/theologician/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.argv[2] ?? "./visual-checks");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});

const results = [];
const cases = [
  { name: "desktop", viewport: { width: 1440, height: 1000 } },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true },
];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    isMobile: testCase.isMobile,
    colorScheme: "light",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("http://127.0.0.1:4330/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${outputDir}/light-${testCase.name}.png`, fullPage: false });
  const imageCount = await page.locator("img").count();
  for (let index = 0; index < imageCount; index += 1) {
    await page.locator("img").nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(60);
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: `${outputDir}/home-${testCase.name}.png`, fullPage: true });

  const audit = await page.evaluate(() => {
    const images = [...document.images];
    const invalidImages = images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    const viewportOverflow = document.documentElement.scrollWidth - window.innerWidth;
    const overflowingText = [...document.querySelectorAll("h1,h2,h3,a,button")]
      .filter((element) => {
        const node = element;
        return node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflow === "visible";
      })
      .slice(0, 20)
      .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 60) }));
    return { invalidImages, viewportOverflow, overflowingText };
  });

  await page.evaluate(() => scrollTo(0, 0));
  if (testCase.isMobile) {
    await page.locator("[data-menu-toggle]").click();
    const mobileMenuLinks = await page.locator("[data-mobile-nav] a:visible").count();
    results.push({ name: "mobile-menu", mobileMenuLinks });
    await page.locator("[data-menu-toggle]").click();
  }

  await page.locator("[data-search-open]").click();
  await page.locator("[data-search-input]").fill("Astro");
  const searchResults = await page.locator("[data-search-item]:visible").count();
  await page.screenshot({ path: `${outputDir}/search-${testCase.name}.png` });
  await page.locator("[data-search-close]").click();

  await page.locator("[data-theme-toggle]").click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outputDir}/dark-${testCase.name}.png`, fullPage: false });

  results.push({ name: testCase.name, ...audit, searchResults, theme, consoleErrors });
  await context.close();
}

const articleContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
const articlePage = await articleContext.newPage();
await articlePage.goto("http://127.0.0.1:4330/posts/slow-query-checkup/", { waitUntil: "networkidle" });
await articlePage.screenshot({ path: `${outputDir}/article-desktop.png`, fullPage: true });
results.push({
  name: "article",
  h1: await articlePage.locator("h1").innerText(),
  hasCodeBlock: await articlePage.locator("pre").count(),
  viewportOverflow: await articlePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
});
await articleContext.close();

const categoryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, colorScheme: "light" });
const categoryPage = await categoryContext.newPage();
await categoryPage.goto("http://127.0.0.1:4330/category/life/", { waitUntil: "networkidle" });
await categoryPage.screenshot({ path: `${outputDir}/category-life-mobile.png`, fullPage: true });
results.push({
  name: "category-life-mobile",
  viewportOverflow: await categoryPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  articles: await categoryPage.locator(".category-lead, .category-list .post-row").count(),
});
await categoryContext.close();

const galleryContext = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: "light" });
const galleryPage = await galleryContext.newPage();
await galleryPage.goto("http://127.0.0.1:4320/", { waitUntil: "networkidle" });
await galleryPage.waitForFunction(() => [...document.querySelectorAll(".status")].every((item) => item.classList.contains("online")));
await galleryPage.screenshot({ path: `${outputDir}/template-gallery.png`, fullPage: true });
results.push({
  name: "template-gallery",
  cards: await galleryPage.locator(".template").count(),
  online: await galleryPage.locator(".status.online").count(),
  viewportOverflow: await galleryPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
});
await galleryContext.close();

await browser.close();
console.log(JSON.stringify(results, null, 2));
