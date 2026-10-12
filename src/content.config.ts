import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const writing = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
    schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        date: z.coerce.date(),
        category: z.string().min(1).optional(),
        draft: z.boolean().default(false),
    }),
});

// One file per project; the body is a short summary drawn from the repository's README.
const projects = defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/projects' }),
    schema: z.object({
        name: z.string().min(1),
        repo: z.url({ protocol: /^https$/, hostname: /^github\.com$/ }),
        language: z.string().min(1),
        summary: z.string().min(1),
        order: z.number().int(),
    }),
});

// One file per talk; the body summarises it and the list shows the event.
const talks = defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/talks' }),
    schema: z.object({
        title: z.string().min(1),
        event: z.string().min(1),
        date: z.coerce.date(),
        video: z.url({ protocol: /^https$/, hostname: /^www\.youtube\.com$/ }),
    }),
});

export const collections = { writing, projects, talks };
