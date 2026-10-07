import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const writing = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
    schema: z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        date: z.coerce.date(),
        category: z.string().default('NOTES'),
        draft: z.boolean().default(false),
    }),
});

export const collections = { writing };
