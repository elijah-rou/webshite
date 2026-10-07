// Usage: pnpm photos:sync
// Reads INSTAGRAM_ACCESS_TOKEN from the environment or .env.local (ignored by Git),
// refreshes it so it stays valid, and downloads new posts into src/content/photos/.
import { readFile } from 'node:fs/promises';
import { refresh_token, replace_env_value, sync_photos } from './instagram.mjs';

const ENV_FILE = '.env.local';
const NAME = 'INSTAGRAM_ACCESS_TOKEN';

async function read_token() {
    if (process.env[NAME]) { return process.env[NAME]; }
    try {
        const match = /^INSTAGRAM_ACCESS_TOKEN=(.+)$/m.exec(await readFile(ENV_FILE, 'utf8'));
        if (match?.[1]) { return match[1].trim(); }
    } catch (error) { if (error.code !== 'ENOENT') { throw error; } }
    throw new Error(`Set ${NAME} in ${ENV_FILE}. See README.md, Photos from Instagram.`);
}

let token = await read_token();
try {
    const refreshed = await refresh_token(token);
    token = refreshed.token;
    await replace_env_value(ENV_FILE, NAME, token);
    console.log(`Token refreshed; valid for ${Math.floor(refreshed.expires_in_s / 86400)} days.`);
} catch (error) {
    // A token under a day old cannot be refreshed yet; it is still usable.
    console.log(`Token not refreshed (${error.message}). Continuing with the current token.`);
}
const result = await sync_photos({ token, photos_dir: 'src/content/photos', log: message => console.log(message) });
console.log(`${result.posts} posts on Instagram; ${result.added} new photos in src/content/photos/.`);
if (result.added > 0) { console.log('Review src/content/photos/photos.json, then commit the new files.'); }
