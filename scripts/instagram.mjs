// Copies an Instagram professional account's posts into src/content/photos/ so the
// site builds from committed files and never needs the access token.
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const GRAPH_URL = 'https://graph.instagram.com';
const IMAGE_FIELDS = 'id,media_type,media_url,thumbnail_url';
const MEDIA_FIELDS = `${IMAGE_FIELDS},caption,permalink,timestamp,children{${IMAGE_FIELDS}}`;
const PAGE_SIZE = 50;
const MEDIA_MAX = 1000;
const REQUEST_TIMEOUT_MS = 20000;
const CAPTION_MAX = 80;
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

class InstagramError extends Error {}

// The token travels in the query string, so errors name the endpoint, never the URL.
async function request(url, what) {
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); }
    catch (error) { throw new InstagramError(`${what} failed: ${error instanceof Error ? error.name : 'network error'}`); }
    if (!response.ok) {
        let detail = '';
        try { detail = (await response.json())?.error?.message ?? ''; } catch { /* Not JSON. */ }
        throw new InstagramError(`${what} failed with HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return response;
}

export async function refresh_token(token, graph_url = GRAPH_URL) {
    const url = new URL('/refresh_access_token', graph_url);
    url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token }).toString();
    const body = await (await request(url, 'Token refresh')).json();
    if (typeof body.access_token !== 'string' || typeof body.expires_in !== 'number') {
        throw new InstagramError('Token refresh returned an unexpected response');
    }
    return { token: body.access_token, expires_in_s: body.expires_in };
}

export async function list_media(token, graph_url = GRAPH_URL) {
    const first = new URL('/me/media', graph_url);
    first.search = new URLSearchParams({ fields: MEDIA_FIELDS, limit: String(PAGE_SIZE), access_token: token }).toString();
    const media = [];
    let next = first.toString();
    while (next) {
        if (media.length >= MEDIA_MAX) { throw new InstagramError(`More than ${MEDIA_MAX} posts; raise MEDIA_MAX deliberately`); }
        const page = await (await request(next, 'Listing posts')).json();
        if (!Array.isArray(page.data)) { throw new InstagramError('Listing posts returned an unexpected response'); }
        media.push(...page.data);
        next = typeof page.paging?.next === 'string' ? page.paging.next : '';
    }
    return media;
}

// "Golden hour at the pier #sunset\n#film" becomes "Golden hour at the pier".
export function caption_title(caption, timestamp) {
    const line = (caption ?? '').split('\n').map(text => text.replace(/[#@][\p{L}\p{N}_.]+/gu, '').trim())
        .find(text => text.length > 0) ?? '';
    const title = line.length > CAPTION_MAX ? `${line.slice(0, CAPTION_MAX - 3).trimEnd()}...` : line;
    return title || timestamp.slice(0, 10);
}

function image_url(item) {
    // Videos contribute their cover frame.
    return item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
}

// An album contributes every image in it; any other post is a single image.
function post_images(item) {
    if (item.media_type !== 'CAROUSEL_ALBUM') { return [item]; }
    if (!Array.isArray(item.children?.data)) { throw new InstagramError(`Album ${item.id} came without its images`); }
    if (typeof item.children.paging?.next === 'string') { throw new InstagramError(`Album ${item.id} has more images than one page`); }
    return item.children.data;
}

async function download(url, what, path_without_extension) {
    const response = await request(url, what);
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    const extension = EXTENSIONS[type];
    if (!extension) { throw new InstagramError(`${what} is ${type || 'an unknown type'}, not a supported image`); }
    await writeFile(`${path_without_extension}.${extension}`, Buffer.from(await response.arrayBuffer()));
}

// Each post becomes a folder named <date>-ig-<id> holding its images in order
// (01.jpg, 02.jpg, ...). A folder appears only once all its images are written.
export async function sync_photos({ token, photos_dir, graph_url = GRAPH_URL, log = () => {} }) {
    await mkdir(photos_dir, { recursive: true });
    const details_path = join(photos_dir, 'photos.json');
    let details = {};
    try { details = JSON.parse(await readFile(details_path, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') { throw error; } }
    const existing = await readdir(photos_dir);
    const media = await list_media(token, graph_url);
    let added = 0;
    let images = 0;
    for (const item of media) {
        if (typeof item.id !== 'string' || !/^\d+$/.test(item.id) || typeof item.timestamp !== 'string'
            || typeof item.permalink !== 'string') {
            throw new InstagramError('A post is missing its id, timestamp or permalink');
        }
        const name = `${item.timestamp.slice(0, 10)}-ig-${item.id}`;
        if (!existing.includes(name)) {
            const urls = post_images(item).map(image_url).filter(url => typeof url === 'string');
            if (urls.length === 0) { log(`Skipped post ${item.id}: no image`); continue; }
            const partial = join(photos_dir, `.${name}.partial`);
            // A partial folder is left behind only by an interrupted run.
            await rm(partial, { recursive: true, force: true });
            await mkdir(partial);
            for (const [index, url] of urls.entries()) {
                await download(url, `Image ${index + 1} of post ${item.id}`, join(partial, String(index + 1).padStart(2, '0')));
            }
            await rename(partial, join(photos_dir, name));
            added += 1;
            images += urls.length;
        }
        // Edits made by hand in photos.json are kept.
        details[name] ??= { caption: caption_title(item.caption, item.timestamp), instagram: item.permalink };
    }
    await writeFile(details_path, `${JSON.stringify(details, null, 4)}\n`);
    return { posts: media.length, added, images };
}

export async function replace_env_value(path, name, value) {
    let text = '';
    try { text = await readFile(path, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') { throw error; } }
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    const updated = pattern.test(text) ? text.replace(pattern, line) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`;
    await writeFile(path, updated, { mode: 0o600 });
}
