#!/usr/bin/env node
/**
 * 从 Obsidian 笔记库导入一篇文章到博客。
 *
 * 用法:
 *   node scripts/import-post.mjs                # 交互选择笔记
 *   node scripts/import-post.mjs <笔记路径>      # 直接指定笔记文件
 *
 * 可选环境变量:
 *   OBSIDIAN_VAULT  笔记库根目录(默认 /mnt/e/BaiduSyncdisk/Notes)
 *   GH_TOKEN        GitHub token(仅部署时必需)
 *   NO_COLOR        1 时禁用颜色
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readdir, readFile, writeFile, stat, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, extname } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const VAULT = process.env.OBSIDIAN_VAULT || "/mnt/e/BaiduSyncdisk/Notes";
const POSTS_DIR = join(ROOT, "src", "content", "posts");

const CATEGORIES = ["tech", "life", "reading", "gaming"];
const CATEGORY_LABEL = { tech: "技术", life: "生活", reading: "读书", gaming: "游戏" };
const CATEGORY_COVER = {
  tech: "post-ctf-sqli",
  life: "post-neighborhood",
  reading: "post-money-saving",
  gaming: "post-arch-wsl",
};

const rl = createInterface({ input: stdin, output: stdout });
const color = (c, s) => (process.env.NO_COLOR ? s : `\x1b[${c}m${s}\x1b[0m`);
const dim = (s) => color("2", s);
const green = (s) => color("32", s);
const yellow = (s) => color("33", s);
const red = (s) => color("31", s);

async function ask(prompt, fallback = "") {
  const answer = (await rl.question(`${prompt}${fallback ? ` ${dim(`[${fallback}]`)}` : ""} `)).trim();
  return answer || fallback;
}

async function confirm(prompt) {
  const answer = (await rl.question(`${prompt} ${dim("(y/N)")} `)).trim().toLowerCase();
  return answer === "y" || answer === "yes";
}

async function listMarkdown(root, depth = 0) {
  if (depth > 3) return [];
  const out = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (["assets", "attachments", ".obsidian"].includes(entry.name)) continue;
    if (entry.isDirectory() && ["Draft", "草稿"].includes(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listMarkdown(full, depth + 1)));
    } else if (extname(entry.name) === ".md") {
      out.push(full);
    }
  }
  return out;
}

function slugify(text) {
  const ascii = text.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  if (ascii) return ascii.slice(0, 60);
  // 全中文标题:用原始文件名作后备
  return "";
}

function stripMarkdown(line) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>~|]/g, "")
    .replace(/\[\[([^\]|]*)(\|[^\]]*)?\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeading(content) {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? stripMarkdown(match[1]) : null;
}

function firstParagraph(content) {
  for (const line of content.split("\n")) {
    const cleaned = stripMarkdown(line);
    if (cleaned.length >= 12) return cleaned.slice(0, 140);
  }
  return "";
}

function sanitizeBody(content, title) {
  // 去掉笔记里的 H1(与 frontmatter title 重复),保留其余
  return content
    .split("\n")
    .filter((line) => !/^#\s+.+/.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function frontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "tags") {
      lines.push(`tags: ${JSON.stringify(value)}`);
    } else if (key === "featured") {
      lines.push(`featured: ${value}`);
    } else if (typeof value === "string" && /[:#[\]]/.test(value)) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

async function pickCover(category) {
  // 询问是否复制一张现有封面作为新封面(复用素材,改名避免覆盖)
  if (!(await confirm(`为该文章从现有素材复制一张封面? ${dim("(生成 post-<slug>.webp)")}`))) {
    return CATEGORY_COVER[category] ?? "tech";
  }
  const sources = await readdir(join(ROOT, "public", "images"));
  const webps = sources.filter((f) => f.endsWith(".webp") && !/\d{3}\.webp$/.test(f));
  console.log(dim("可用封面素材:"));
  webps.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  const pick = await ask(`选择素材编号(1-${webps.length})`, "1");
  const index = Math.max(0, Math.min(webps.length - 1, parseInt(pick, 10) - 1));
  return webps[index].replace(/\.webp$/, "");
}

async function copyCover(sourceStem, slug) {
  const imageDir = join(ROOT, "public", "images");
  const widths = [480, 960, 1600];
  const copy = async (w) => {
    const src = join(imageDir, `${sourceStem}${w ? `-${w}` : ""}.webp`);
    const dst = join(imageDir, `post-${slug}${w ? `-${w}` : ""}.webp`);
    if (existsSync(src)) await copyFile(src, dst);
  };
  await copy(0);
  for (const w of widths) await copy(w);
  return `/images/post-${slug}.webp`;
}

async function main() {
  console.log(dim(`笔记库: ${VAULT}\n`));
  let chosen;
  const argFile = process.argv[2];
  if (argFile) {
    chosen = argFile;
    if (!existsSync(chosen)) {
      // 尝试按笔记库相对路径解析
      const alt = join(VAULT, argFile);
      if (existsSync(alt)) chosen = alt;
      else {
        console.error(red(`找不到文件: ${argFile}`));
        process.exit(1);
      }
    }
  } else {
    const all = (await listMarkdown(VAULT)).sort();
    if (all.length === 0) {
      console.error(red(`笔记库为空: ${VAULT}`));
      process.exit(1);
    }
    console.log(dim("可选笔记(输入编号, 或输入关键词过滤):"));
    let filtered = all;
    while (true) {
      filtered.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)} ${dim(f.slice(VAULT.length + 1))}`));
      const input = await ask(`\n选择(1-${filtered.length})或输入关键词`, "");
      const num = parseInt(input, 10);
      if (num >= 1 && num <= filtered.length) {
        chosen = filtered[num - 1];
        break;
      }
      if (input) {
        filtered = all.filter((f) => f.toLowerCase().includes(input.toLowerCase()));
        if (filtered.length === 0) filtered = all;
        console.log();
      }
    }
  }

  const content = await readFile(chosen, "utf8");
  const rawName = basename(chosen, extname(chosen));

  // 非交互参数: --title --summary --category --tags --date --yes --deploy
  const args = process.argv.slice(2);
  const arg = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const flag = (name) => args.includes(name);
  const autoYes = flag("--yes");
  const autoDeploy = flag("--deploy");

  console.log(`\n导入: ${green(basename(chosen))}`);
  const title = arg("--title") ?? (autoYes ? firstHeading(content) || rawName : await ask("标题", firstHeading(content) || rawName));
  const summary = arg("--summary") ?? (autoYes ? firstParagraph(content) : await ask("摘要", firstParagraph(content)));
  const catInput = arg("--category") ?? (autoYes ? "tech" : await ask(`分类(${CATEGORIES.join("/")})`, "tech"));
  const category = CATEGORIES.includes(catInput) ? catInput : "tech";
  const tagsInput = arg("--tags") ?? (autoYes ? "" : await ask("标签(逗号分隔)", ""));
  const tags = tagsInput
    ? tagsInput.split(/[,，]/).map((t) => t.trim()).filter(Boolean).slice(0, 5)
    : [CATEGORY_LABEL[category]];
  const publishedAt = arg("--date") ?? (autoYes ? today() : await ask("发布日期(YYYY-MM-DD)", today()));

  const slug = slugify(title) || slugify(rawName) || `post-${Date.now()}`;
  const dest = join(POSTS_DIR, `${slug}.md`);
  if (existsSync(dest)) {
    console.log(red(`已存在: ${dest}`));
    if (!(autoYes || (await confirm("覆盖?")))) process.exit(0);
  }

  const coverStem = autoYes ? CATEGORY_COVER[category] : await pickCover(category);
  const cover = await copyCover(coverStem, slug);
  const body = sanitizeBody(content, title);

  const fm = frontmatter({
    title,
    summary,
    category,
    publishedAt,
    tags,
    cover,
    coverAlt: summary,
    featured: false,
  });
  const output = `${fm}\n${body}`;
  await writeFile(dest, output);
  console.log(green(`\n已写入: ${dest}\n`));

  // 更新 ResponsiveImage 尺寸表(如果新封面不在表内)
  const imageCmp = join(ROOT, "src", "components", "ResponsiveImage.astro");
  if (existsSync(imageCmp)) {
    const cmp = await readFile(imageCmp, "utf8");
    if (!cmp.includes(`"post-${slug}"`)) {
      // 在 dimensions 表的收尾 "};" 前插入新条目(dimensions 表唯一以 "};" 结束)
      const dimsEnd = cmp.lastIndexOf("\n};");
      if (dimsEnd === -1) {
        console.warn(yellow("未找到 dimensions 表结尾,跳过尺寸登记"));
      } else {
        const updated = `${cmp.slice(0, dimsEnd)}\n  "post-${slug}": [1600, 1000],\n};${cmp.slice(dimsEnd + 3)}`;
        await writeFile(imageCmp, updated);
        console.log(dim("已在 ResponsiveImage.astro 登记尺寸"));
      }
    }
  }

  console.log(dim("建议执行:"));
  console.log(`  npm run prepare:images   ${dim("# 如需要重新生成图片")}`);
  console.log(`  npm run build            ${dim("# 本地验证")}`);

  const shouldDeploy = autoDeploy || (!autoYes && (await confirm("\n构建并部署到 GitHub Pages?")));
  if (shouldDeploy) {
    const siteUrl = "https://wrhyija1379.github.io/fuguang-notes";
    console.log(dim("\n构建中(带 SITE_BASE)..."));
    execSync(`npm run build`, { cwd: ROOT, stdio: "inherit", env: { ...process.env, SITE_URL: siteUrl, SITE_BASE: "/fuguang-notes" } });
    console.log(dim("部署 gh-pages..."));
    execSync(`python3 scripts/deploy-ghpages.py`, { cwd: ROOT, stdio: "inherit", env: process.env });
    if (autoYes || (await confirm("同步 main 分支源码?"))) {
      execSync(`python3 scripts/deploy-main.py`, { cwd: ROOT, stdio: "inherit", env: process.env });
    }
    console.log(green("部署完成"));
  }

  rl.close();
}

main().catch((error) => {
  console.error(red(String(error)));
  process.exit(1);
});
