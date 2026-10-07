import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';

export const INSTAGRAM_PROFILE = 'https://www.instagram.com/eli_takes_photos/';

export interface Photo { id: string; file: string; image: ImageMetadata; title: string; alt: string; instagram?: string }

const images = import.meta.glob<{ default: ImageMetadata }>(
    '../content/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', { eager: true });
const detail_files = import.meta.glob<{ default: unknown }>('../content/photos/photos.json', { eager: true });

// Optional per-photo details, keyed by image file name.
const details_schema = z.record(z.string(), z.object({
    caption: z.string().min(1).optional(),
    alt: z.string().min(1).optional(),
    instagram: z.url({ protocol: /^https$/, hostname: /^www\.instagram\.com$/ }).optional(),
}).strict());

function title_from_file(file: string): string {
    // "2026-10-08-harbour-at-dusk.jpg" becomes "harbour at dusk".
    const stem = file.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]?/, '');
    return stem.replace(/[-_]+/g, ' ').trim() || file;
}

export function read_photos(): Photo[] {
    const details = details_schema.parse(Object.values(detail_files)[0]?.default ?? {});
    const files = Object.keys(images).map(path => path.slice(path.lastIndexOf('/') + 1));
    for (const name of Object.keys(details)) {
        if (!files.includes(name)) { throw new Error(`photos.json describes ${name}, which is not in src/content/photos/`); }
    }
    const ids = new Set<string>();
    // Newest first when files are named with a leading date.
    return Object.entries(images)
        .map(([path, module]) => ({ file: path.slice(path.lastIndexOf('/') + 1), image: module.default }))
        .sort((a, b) => b.file.localeCompare(a.file))
        .map(({ file, image }) => {
            const id = file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (!id || ids.has(id)) { throw new Error(`Photo file name ${file} does not give a unique URL`); }
            ids.add(id);
            const detail = details[file] ?? {};
            const title = detail.caption ?? title_from_file(file);
            const photo: Photo = { id, file, image, title, alt: detail.alt ?? title };
            if (detail.instagram) { photo.instagram = detail.instagram; }
            return photo;
        });
}
