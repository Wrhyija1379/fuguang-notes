import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "assets", "sources");
const imageDir = join(root, "public", "images");

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
];

const responsiveWidths = [480, 960, 1600];

function imagePipeline(job, width, height) {
  return sharp(join(sourceDir, job.source))
    .resize(width, height, { fit: "cover", position: "attention" })
    .modulate({ saturation: job.saturation, brightness: job.brightness })
    .sharpen({ sigma: 0.7 });
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
