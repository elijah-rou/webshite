// Talks: the list, a talk page whose poster is a link to YouTube, and playing it in
// place with Enter or a click, with no request to YouTube before play.
import { at, open_home, press_times, SELECTED } from '../lib/menu.mjs';

const TALK = '/talks/cerebrium-knative/';
const POSTER = `document.querySelector('.talk-video a[data-video-embed]')`;
const PLAYER = `document.querySelector('.talk-video iframe')`;
const youtube_requests = b => [...b.requests.values()].filter(r => /youtube|ytimg|googlevideo/.test(new URL(r.url).hostname)).map(r => r.url);

export default async function talks({ base, browser, check }) {
    const b = await browser();
    if (!await open_home(b, base, check)) { return; }
    await press_times(b, 'ArrowDown', 3);
    check(await b.wait_for(`${SELECTED} === '> Talks'`), 'talks-list: three ArrowDown presses select Talks');
    await b.press('Enter');
    check(await b.wait_for(at('/talks/')), 'talks-list: Enter opens Talks');
    const list = await b.evaluate(`[...document.querySelectorAll('#menu-results a')].map(a => a.getAttribute('href'))`);
    check(list[0] === TALK, 'talks-list: the KubeCon talk is listed first', list);
    await b.screenshot('01-talks');
    await b.press('Enter');
    check(await b.wait_for(`${at(TALK, 'true')} && !!${POSTER}`), 'talk-page: Enter opens the talk with its poster');
    check(await b.wait_for(`(() => { const i = document.querySelector('.talk-video img'); return i && i.complete && i.naturalWidth > 0; })()`),
        'talk-page: the poster image loaded');
    check(await b.evaluate(`${POSTER}.getAttribute('href')`) === 'https://www.youtube.com/watch?v=QqApwTinlUk', 'talk-page: the poster links to the YouTube recording');
    check(youtube_requests(b).length === 0, 'talk-privacy: no request reached YouTube before play', youtube_requests(b));
    await b.snapshot('02-talk');
    await b.screenshot('02-talk');

    // talk-play-key: Enter swaps the poster for the privacy-enhanced player.
    await b.press('Enter');
    const src = await b.wait_for(`${PLAYER}?.getAttribute('src')`);
    check(src?.startsWith('https://www.youtube-nocookie.com/embed/QqApwTinlUk') && src.includes('autoplay=1'), 'talk-play-key: Enter swaps in the youtube-nocookie player', src);
    check(await b.evaluate(`!${POSTER}`), 'talk-play-key: the poster link is gone');
    // The player itself comes from YouTube; give it time so the screenshot shows it.
    // Its absence (no network) is not the site's failure, so it is not a check.
    const embed = () => [...b.requests.values()].find(r => r.url.startsWith('https://www.youtube-nocookie.com/embed/') && r.status);
    for (let i = 0; i < 100 && !embed(); i++) { await new Promise(r => setTimeout(r, 100)); }
    if (embed()) { await new Promise(r => setTimeout(r, 3000)); }
    await b.screenshot('03-playing');

    // talk-play-click: a plain click does the same on a fresh load.
    await b.navigate(`${base}${TALK}`);
    await b.wait_for(`${at(TALK, 'true')} && !!${POSTER}`);
    await b.click('.talk-video a[data-video-embed]');
    check((await b.wait_for(`${PLAYER}?.getAttribute('src')`))?.startsWith('https://www.youtube-nocookie.com/embed/QqApwTinlUk'), 'talk-play-click: clicking the poster swaps in the player');
    await b.click('[data-back]');
    check(await b.wait_for(at('/talks/')), 'talk-page: Back returns to Talks');
}
