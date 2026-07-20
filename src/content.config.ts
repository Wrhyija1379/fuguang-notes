import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    category: z.enum(["tech", "life", "reading", "gaming"]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()),
    readingMinutes: z.number().int().positive().optional(),
    cover: z.string(),
    coverAlt: z.string(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    issue: z.string().optional(),
    season: z.string().optional(),
    seriesNo: z.number().int().positive().optional(),
    location: z.string().optional(),
    quote: z.string().optional(),
    gameStatus: z.string().optional(),
    playtime: z.string().optional(),
    rating: z.number().min(0).max(10).optional(),
    kicker: z.string().optional(),
  }),
});

export const collections = { posts };
