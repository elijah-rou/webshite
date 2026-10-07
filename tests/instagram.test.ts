import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { caption_title, refresh_token, replace_env_value, sync_photos } from '../scripts/instagram.mjs';

const TOKEN = 'secret-token-value';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

async function graph(handler: (path: string, query: URLSearchParams) => { status?: number; type?: string; body: unknown }) {
    const server: Server = createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        const reply = handler(url.pathname, url.searchParams);
        response.writeHead(reply.status ?? 200, { 'content-type': reply.type ?? 'application/json' });
        response.end(Buffer.isBuffer(reply.body) ? reply.body : JSON.stringify(reply.body));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') { throw new Error('No server address'); }
    return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

test('captions keep the first line without hashtags, falling back to the date', () => {
    assert.equal(caption_title('Golden hour at the pier #sunset\n#film #35mm', '2026-10-08T10:00:00+0000'), 'Golden hour at the pier');
    assert.equal(caption_title('#nofilter', '2026-10-08T10:00:00+0000'), '2026-10-08');
    assert.equal(caption_title(undefined, '2026-10-08T10:00:00+0000'), '2026-10-08');
    assert.equal(caption_title('x'.repeat(200), '2026-10-08T10:00:00+0000').length, 80);
});

test('sync downloads new posts across pages, keeps edits, and is idempotent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'photos-'));
    let downloads = 0;
    const server = await graph((path, query) => {
        if (path === '/me/media') {
            assert.equal(query.get('access_token'), TOKEN);
            return query.get('after')
                ? { body: { data: [{ id: '2', media_type: 'VIDEO', thumbnail_url: `${server.url}/img/2`, permalink: 'https://www.instagram.com/p/B/', timestamp: '2026-09-01T08:00:00+0000' }] } }
                : { body: { data: [
                    { id: '1', media_type: 'IMAGE', media_url: `${server.url}/img/1`, caption: 'Harbour #boats', permalink: 'https://www.instagram.com/p/A/', timestamp: '2026-10-02T08:00:00+0000' },
                    { id: '3', media_type: 'VIDEO', permalink: 'https://www.instagram.com/p/C/', timestamp: '2026-08-01T08:00:00+0000' },
                ], paging: { next: `${server.url}/me/media?after=x&access_token=${TOKEN}` } } };
        }
        if (path.startsWith('/img/')) { downloads += 1; return { type: 'image/jpeg', body: JPEG }; }
        return { status: 404, body: {} };
    });
    try {
        await writeFile(join(dir, 'photos.json'), JSON.stringify({}));
        const first = await sync_photos({ token: TOKEN, photos_dir: dir, graph_url: server.url });
        assert.deepEqual(first, { posts: 3, added: 2 });
        assert.deepEqual((await readdir(dir)).sort(), ['2026-09-01-ig-2.jpg', '2026-10-02-ig-1.jpg', 'photos.json']);
        const details = JSON.parse(await readFile(join(dir, 'photos.json'), 'utf8'));
        assert.deepEqual(details['2026-10-02-ig-1.jpg'], { caption: 'Harbour', instagram: 'https://www.instagram.com/p/A/' });
        details['2026-10-02-ig-1.jpg'].caption = 'Edited by hand';
        await writeFile(join(dir, 'photos.json'), JSON.stringify(details));
        const second = await sync_photos({ token: TOKEN, photos_dir: dir, graph_url: server.url });
        assert.deepEqual(second, { posts: 3, added: 0 });
        assert.equal(downloads, 2);
        const kept = JSON.parse(await readFile(join(dir, 'photos.json'), 'utf8'));
        assert.equal(kept['2026-10-02-ig-1.jpg'].caption, 'Edited by hand');
    } finally {
        await server.close();
        await rm(dir, { recursive: true });
    }
});

test('API errors report the endpoint and message without leaking the token', async () => {
    const server = await graph(() => ({ status: 400, body: { error: { message: 'Invalid OAuth access token' } } }));
    try {
        await assert.rejects(refresh_token(TOKEN, server.url), (error: Error) =>
            error.message === 'Token refresh failed with HTTP 400: Invalid OAuth access token' && !error.message.includes(TOKEN));
    } finally { await server.close(); }
});

test('the refreshed token replaces only its own line in the env file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'env-'));
    const path = join(dir, '.env.local');
    try {
        await writeFile(path, 'OTHER=1\nINSTAGRAM_ACCESS_TOKEN=old\n');
        await replace_env_value(path, 'INSTAGRAM_ACCESS_TOKEN', 'new');
        assert.equal(await readFile(path, 'utf8'), 'OTHER=1\nINSTAGRAM_ACCESS_TOKEN=new\n');
    } finally { await rm(dir, { recursive: true }); }
});
