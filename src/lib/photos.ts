import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';

export const INSTAGRAM_PROFILE = 'https://www.instagram.com/eli_takes_photos/';

// A post is one image file in src/content/photos/, or a folder of images shown in
// file name order (the Instagram sync writes 01.jpg, 02.jpg, ...).
export interface Post {
    id: string; name: string; cover: ImageMetadata; images: ImageMetadata[]; title: string; alt: string; instagram?: string;
}

// The first image of a post is at /instagram/<post>/, the rest at /instagram/<post>/<n>/.
export function image_href(post: Post, index: number): string {
    return index === 0 ? `/instagram/${post.id}/` : `/instagram/${post.id}/${index + 1}/`;
}

// Instagram opens an album at a given image with img_index, counted from 1.
export function instagram_image_url(post: Post, index: number): string | undefined {
    if (!post.instagram) { return undefined; }
    if (post.images.length < 2) { return post.instagram; }
    const url = new URL(post.instagram);
    url.searchParams.set('img_index', String(index + 1));
    return url.toString();
}

const images = import.meta.glob<{ default: ImageMetadata }>(
    ['../content/photos/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
        '../content/photos/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}'], { eager: true });
const detail_files = import.meta.glob<{ default: unknown }>('../content/photos/photos.json', { eager: true });

// Optional per-post details, keyed by image file name or folder name.
const details_schema = z.record(z.string(), z.object({
    caption: z.string().min(1).optional(),
    alt: z.string().min(1).optional(),
    instagram: z.url({ protocol: /^https$/, hostname: /^www\.instagram\.com$/ }).optional(),
}).strict());

function title_from_name(name: string): string {
    // "2026-10-08-harbour-at-dusk.jpg" becomes "harbour at dusk".
    const stem = name.replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]?/, '');
    return stem.replace(/[-_]+/g, ' ').trim() || name;
}

export function read_posts(): Post[] {
    const details = details_schema.parse(Object.values(detail_files)[0]?.default ?? {});
    // Paths look like ../content/photos/<name> or ../content/photos/<name>/<file>.
    const groups = new Map<string, { file: string; image: ImageMetadata }[]>();
    for (const [path, module] of Object.entries(images)) {
        const [name, file] = path.slice('../content/photos/'.length).split('/');
        if (!name) { throw new Error(`Unexpected photo path ${path}`); }
        groups.set(name, [...groups.get(name) ?? [], { file: file ?? name, image: module.default }]);
    }
    for (const name of Object.keys(details)) {
        if (!groups.has(name)) { throw new Error(`photos.json describes ${name}, which is not in src/content/photos/`); }
    }
    const ids = new Set<string>();
    // Newest first when names start with a date.
    return [...groups.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([name, files]) => {
            const id = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (!id || ids.has(id)) { throw new Error(`Photo name ${name} does not give a unique URL`); }
            ids.add(id);
            const detail = details[name] ?? {};
            const title = detail.caption ?? title_from_name(name);
            const sorted = files.sort((a, b) => a.file.localeCompare(b.file)).map(({ image }) => image);
            const cover = sorted[0];
            if (!cover) { throw new Error(`Photo folder ${name} has no images`); }
            const post: Post = { id, name, cover, images: sorted, title, alt: detail.alt ?? title };
            if (detail.instagram) { post.instagram = detail.instagram; }
            return post;
        });
}
