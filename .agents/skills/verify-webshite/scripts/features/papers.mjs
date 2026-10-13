// Papers: the list (newest first), a paper page with its PDF download, related
// project and demo video, search, and the second paper's authors line.
import { at, open_home, press_times, SELECTED } from '../lib/menu.mjs';

const ANTS = '/papers/neuroevolution-ant-swarms/';
const IBN = '/papers/implicative-bayesian-networks/';
const LINKS = `[...document.querySelectorAll('#menu-results a')].map(a => [a.getAttribute('href'), a.hasAttribute('download')])`;

export default async function papers({ base, browser, check }) {
    const b = await browser();
    if (!await open_home(b, base, check)) { return; }
    await press_times(b, 'ArrowDown', 4);
    check(await b.wait_for(`${SELECTED} === '> Papers'`), 'papers-list: four ArrowDown presses select Papers');
    await b.press('Enter');
    check(await b.wait_for(at('/papers/')), 'papers-list: Enter opens Papers');
    const list = await b.evaluate(`[...document.querySelectorAll('#menu-results a')].map(a => a.getAttribute('href'))`);
    check(JSON.stringify(list) === JSON.stringify([ANTS, IBN]), 'papers-list: newest first, ant swarms then Bayesian networks', list);
    await b.screenshot('01-papers');

    await b.press('Enter');
    check(await b.wait_for(at(ANTS)), 'paper-page: Enter opens the ant swarm paper');
    const links = await b.evaluate(LINKS);
    check(links[0]?.[0] === '/papers/neuroevolution-ant-swarms.pdf' && links[0]?.[1] === true, 'paper-pdf: the first entry downloads the PDF', links);
    check(links[1]?.[0] === '/projects/ant-neuroevolution/', 'paper-page: the second entry opens the related project', links);
    const pdf = await b.evaluate(`fetch('/papers/neuroevolution-ant-swarms.pdf').then(async r => [r.status, r.headers.get('content-type'), (await r.arrayBuffer()).byteLength])`);
    check(pdf[0] === 200 && pdf[1]?.includes('pdf') && pdf[2] > 100000, 'paper-pdf: the PDF is served as a PDF', pdf);
    await b.snapshot('02-ant-paper');
    await b.screenshot('02-ant-paper');

    // paper-demo: the demo video plays, muted, from a click.
    await b.click('.paper-demo video');
    const video = await b.wait_for(`(() => { const v = document.querySelector('.paper-demo video'); return v && v.currentTime > 0.3 && { muted: v.muted, time: v.currentTime }; })()`);
    check(video && video.muted, 'paper-demo: clicking the demo plays it muted', video);
    await b.screenshot('03-demo-playing');

    // paper-search: typing on the list filters it; Enter opens the match. The pointer
    // is moved off the list first, since hovering an entry selects it.
    await b.press('Escape');
    check(await b.wait_for(at('/papers/')), 'papers-list: Escape returns to Papers');
    await b.park_pointer();
    await b.type('implicative');
    check(await b.wait_for(`JSON.stringify([...document.querySelectorAll('#menu-results a')].map(a => a.getAttribute('href'))) === ${JSON.stringify(JSON.stringify([IBN]))}`),
        'paper-search: "implicative" leaves only the Bayesian networks paper',
        await b.evaluate(`[...document.querySelectorAll('#menu-results a')].map(a => a.getAttribute('href'))`));
    await b.press('Enter');
    check(await b.wait_for(at(IBN)), 'paper-search: Enter opens it');
    check(await b.evaluate(`document.querySelector('.paper-authors')?.textContent.trim()`) === 'Elijah Roussos · supervised by Prof. Thomas Meyer',
        'paper-page: the honours paper names its supervisor', await b.evaluate(`document.querySelector('.paper-authors')?.textContent`));
    check(JSON.stringify(await b.evaluate(LINKS)) === JSON.stringify([['/papers/implicative-bayesian-networks.pdf', true]]), 'paper-pdf: the honours paper has only its PDF download');
    await b.screenshot('04-ibn-paper');
}
