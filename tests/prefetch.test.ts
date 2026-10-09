import assert from 'node:assert/strict';
import test from 'node:test';
import { is_page } from '../src/scripts/prefetch.ts';

const home = new URL('https://example.test/');
const page = (href: string, download = false) => is_page(new URL(href, home), home, download);

test('other pages of the site are prefetched', () => {
    assert.ok(page('/projects/'));
    assert.ok(page('/instagram/2023-04-13-ig-18042014458441146/2/'));
});

test('recordings, downloads, files and other sites are not', () => {
    assert.equal(page('/music/song.flac'), false);
    assert.equal(page('/music/project.flp', true), false);
    assert.equal(page('/projects/', true), false);
    assert.equal(page('/favicon.svg'), false);
    assert.equal(page('https://github.com/elijah-rou/'), false);
});

test('the current page and addresses with a query are not', () => {
    assert.equal(page('/'), false);
    assert.equal(page('/?intro'), false);
});
