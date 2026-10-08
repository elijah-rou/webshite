// Renders a photo as a dithered phosphor-green portrait for the About screen.
// Usage: node scripts/portrait.mjs [source image, default src/assets/portrait-source.jpg]
// Writes src/assets/portrait.png: 144×144 pixels in eight phosphor shades, using
// 4×4 ordered (Bayer) dithering so it reads like an image drawn by the terminal.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SIZE = Number(process.env.PORTRAIT_SIZE ?? 144);
const SHADE_COUNT = Number(process.env.PORTRAIT_SHADES ?? 8);
// Evenly spaced phosphor shades from the screen background to the brightest glow.
const DARK = [6, 17, 10];
const BRIGHT = [176, 255, 196];
const SHADES = Array.from({ length: SHADE_COUNT }, (_, index) => {
    const t = index / (SHADE_COUNT - 1);
    return DARK.map((channel, c) => Math.round(channel + ((BRIGHT[c] ?? 0) - channel) * t));
});
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// sharp is installed by Astro and is not a direct dependency; resolve it from pnpm's store.
const store = join(import.meta.dirname, '..', 'node_modules', '.pnpm');
const entry = readdirSync(store).find(name => name.startsWith('sharp@'));
if (!entry) { throw new Error('sharp is not installed; run pnpm install'); }
const sharp = createRequire(import.meta.url)(join(store, entry, 'node_modules', 'sharp'));

const source = process.argv[2] ?? join(import.meta.dirname, '..', 'src', 'assets', 'portrait-source.jpg');
// Square crop around the face, as fractions of the source's width and height.
const CROP = { left: 0.2, top: 0, size: 0.72 };
const meta = await sharp(source).metadata();
if (!meta.width || !meta.height) { throw new Error('Cannot read the source image size'); }
const crop_size = Math.round(Math.min(meta.width, meta.height) * CROP.size);
const { data, info } = await sharp(source)
    .extract({ left: Math.round(meta.width * CROP.left), top: Math.round(meta.height * CROP.top), width: crop_size, height: crop_size })
    .resize(SIZE, SIZE, { kernel: 'lanczos3' })
    .grayscale()
    .normalise({ lower: 2, upper: 96 })
    .gamma(2.2, 1.6)
    .linear(1.15, -12)
    .raw()
    .toBuffer({ resolveWithObject: true });
if (info.channels !== 1) { throw new Error(`Expected one channel, got ${info.channels}`); }

const levels = SHADES.length - 1;
const output = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        const value = (data[y * SIZE + x] ?? 0) / 255;
        const threshold = ((BAYER[y % 4]?.[x % 4] ?? 0) + 0.5) / 16;
        const level = Math.min(levels, Math.floor(value * levels + threshold));
        const shade = SHADES[level] ?? SHADES[0];
        output.set(shade, (y * SIZE + x) * 3);
    }
}
const target = process.env.PORTRAIT_OUT ?? join(import.meta.dirname, '..', 'src', 'assets', 'portrait.png');
await sharp(output, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png({ palette: true }).toFile(target);
console.log(`Wrote ${target}`);
