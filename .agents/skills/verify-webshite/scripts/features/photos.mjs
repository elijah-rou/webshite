// Photos: the grid, opening an album, stepping images with the < > links and the
// arrow keys (in place, address following without new history entries), moving
// to the next post, and Escape back to the grid.
import { at, open_home } from '../lib/menu.mjs';

const VIEWER = `!!document.querySelector('[data-photo-viewer]')`;
const COUNT = `document.querySelector('.photo-count')?.textContent.trim()`;
const IMAGE_READY = `(() => { const i = document.querySelector('.photo-link img'); return !!i && i.complete && i.naturalWidth > 0 && !document.querySelector('.photo-frame[data-loading]') && i.currentSrc; })()`;

export default async function photos({ base, browser, check }) {
    const b = await browser();
    if (!await open_home(b, base, check)) { return; }
    await b.click('#menu-results a[href="/instagram/"]');
    check(await b.wait_for(at('/instagram/', `document.querySelectorAll('[data-photo-grid] a').length > 0`)), 'photo-grid: Photos opens the grid');
    const tiles = await b.evaluate(`[...document.querySelectorAll('[data-photo-grid] a')].map(a => [a.getAttribute('href'), a.getAttribute('aria-label')])`);
    check(tiles.length >= 2, 'photo-grid: the grid has posts', tiles.length);
    check(await b.wait_for(`[...document.querySelectorAll('[data-photo-grid] img')].slice(0, 6).every(i => i.complete && i.naturalWidth > 0)`),
        'photo-grid: the first thumbnails loaded');
    await b.snapshot('01-grid');
    await b.screenshot('01-grid');

    // photo-open: an album tile opens the viewer at its first image.
    const album = tiles.find(([, label]) => /, \d+ images$/.test(label ?? ''));
    if (!check(album, 'photo-open: an album tile exists', tiles)) { return; }
    const size = Number(album[1].match(/, (\d+) images$/)[1]);
    await b.click(`[data-photo-grid] a[href="${album[0]}"]`);
    check(await b.wait_for(`location.pathname.startsWith(${JSON.stringify(album[0])}) && ${VIEWER} && ${COUNT} === '1/${size}'`), `photo-open: the album opens at 1/${size}`);
    const first_src = await b.wait_for(IMAGE_READY, 15000);
    check(first_src, 'photo-open: the first image loaded');
    const history_length = await b.evaluate('history.length');
    await b.screenshot('02-album-1');

    // photo-step-link: the > link steps in place.
    const first_path = await b.evaluate('location.pathname');
    await b.click('.photo-step.next');
    check(await b.wait_for(`${COUNT} === '2/${size}'`), 'photo-step-link: > shows image 2');
    const second_src = await b.wait_for(`(() => { const s = ${IMAGE_READY}; return s && s !== ${JSON.stringify(first_src)} ? s : null; })()`, 15000);
    check(second_src, 'photo-step-link: a different image loaded');
    check(await b.evaluate('location.pathname') !== first_path, 'photo-step-link: the address follows the image', await b.evaluate('location.pathname'));

    // photo-step-keys: the arrow keys step too.
    await b.press('ArrowRight');
    check(await b.wait_for(`${COUNT} === '3/${size}'`), 'photo-step-keys: ArrowRight shows image 3');
    await b.press('ArrowLeft');
    check(await b.wait_for(`${COUNT} === '2/${size}'`), 'photo-step-keys: ArrowLeft returns to image 2');
    check(await b.evaluate('history.length') === history_length, 'photo-step-keys: stepping adds no history entries');
    await b.screenshot('03-album-2');

    // photo-next-post: the post buttons move between posts.
    const title = await b.evaluate(`document.querySelector('.photo-title').textContent`);
    if (await b.evaluate(`document.querySelector('.photo-posts .next').getAttribute('aria-disabled') !== 'true'`)) {
        await b.click('.photo-posts .next');
        check(await b.wait_for(`document.querySelector('.photo-title').textContent !== ${JSON.stringify(title)}`), 'photo-next-post: the next-post button opens another post');
        check(await b.wait_for(IMAGE_READY, 15000), 'photo-next-post: its image loaded');
    } else {
        await b.click('.photo-posts .previous');
        check(await b.wait_for(`document.querySelector('.photo-title').textContent !== ${JSON.stringify(title)}`), 'photo-next-post: the previous-post button opens another post (the album was last)');
    }
    await b.screenshot('04-other-post');

    await b.press('Escape');
    check(await b.wait_for(at('/instagram/', `document.querySelectorAll('[data-photo-grid] a').length > 0`)), 'photo-grid: Escape returns to the grid');
}
