import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "assets", "sources");
const imageDir = join(root, "public", "images");

// 主图任务保持分类 fallback。逐篇封面(post-*)从既有素材裁出不同区域、
// 使用不同宽高比与色调，保证与分类图和其他封面视觉可区分。
const jobs = [
  { source: "hero.jpg", output: "hero", width: 2200, height: 1320, saturation: 0.72, brightness: 0.9 },
  { source: "tech.jpg", output: "tech", width: 1600, height: 1200, saturation: 0.7, brightness: 0.86 },
  { source: "life.jpg", output: "life", width: 1600, height: 1350, saturation: 0.82, brightness: 0.96 },
  { source: "reading.jpg", output: "reading", width: 1200, height: 1500, saturation: 0.68, brightness: 0.96 },
  { source: "gaming.jpg", output: "gaming", width: 1600, height: 1350, saturation: 0.72, brightness: 0.82 },
  { source: "about.jpg", output: "about", width: 2000, height: 1200, saturation: 0.7, brightness: 0.82 },
  { source: "rainy-desk.jpg", output: "rainy-desk", width: 1800, height: 1200, saturation: 0.68, brightness: 0.88 },
  { source: "dinner.jpg", output: "dinner", width: 1800, height: 1200, saturation: 0.78, brightness: 0.94 },
  { source: "outer-wilds.jpg", output: "outer-wilds", width: 1800, height: 1200, saturation: 0.82, brightness: 0.8 },

  // why-cant-you-save-money：书页素材，暖褐调，读书氛围
  { source: "reading.jpg", output: "post-money-saving", width: 1200, height: 1500, saturation: 0.7, brightness: 0.98, hue: 15, position: "attention" },
  // litctf-widebyte-sqli：代码素材左亮区，冷青调，技术感
  { source: "tech.jpg", output: "post-ctf-sqli", width: 1600, height: 1000, saturation: 0.8, brightness: 0.95, hue: 190, position: "left" },
  // archwsl-gui-setup：工作台素材，暖金调，桌面环境感
  { source: "hero.jpg", output: "post-arch-wsl", width: 1600, height: 1000, saturation: 0.75, brightness: 0.92, hue: 45, position: "attention" },
];

const responsiveWidths = [480, 960, 1600];

function imagePipeline(job, width, height) {
  const pipeline = sharp(join(sourceDir, job.source))
    .resize(width, height, {
      fit: "cover",
      position: job.position ?? "attention",
    })
    .sharpen({ sigma: 0.7 });
  if (job.hue !== undefined) {
    pipeline.modulate({
      saturation: job.saturation,
      brightness: job.brightness,
      hue: job.hue,
    });
  } else {
    pipeline.modulate({ saturation: job.saturation, brightness: job.brightness });
  }
  return pipeline;
}

await Promise.all(
  jobs.map(async (job) => {
    await imagePipeline(job, job.width, job.height)
      .webp({ quality: 84, effort: 5 })
      .toFile(join(imageDir, `${job.output}.webp`));

    await Promise.all(
      responsiveWidths.map((width) => {
        const height = Math.round(width * (job.height / job.width));
        return imagePipeline(job, width, height)
          .webp({ quality: 78, effort: 5 })
          .toFile(join(imageDir, `${job.output}-${width}.webp`));
      }),
    );
  }),
);

console.log(`Prepared ${jobs.length} image sets with ${responsiveWidths.length} responsive variants each.`);
