// Projects list and its fuzzy search: typing starts it, "/" focuses it, arrows and
// Enter open a match, no matches, and Escape clearing before going back.
import { at, open_home, SELECTED } from '../lib/menu.mjs';

const SEARCH = `document.querySelector('.menu-search input[type="search"]')`;
const VISIBLE = `[...document.querySelectorAll('#menu-results a')].map(a => a.getAttribute('href'))`;

export default async function projects_search({ base, browser, check }) {
    const b = await browser();
    if (!await open_home(b, base, check)) { return; }
    await b.click('#menu-results a[href="/projects/"]');
    if (!check(await b.wait_for(`${at('/projects/')} && !!${SEARCH}`), 'search-open: Projects opens with a search box')) { return; }
    const all = await b.evaluate(VISIBLE);
    check(all.length >= 5, 'projects-list: the list shows every project', all);
    await b.screenshot('01-projects');

    // search-type: typing anywhere starts the search. The click left the pointer over
    // the list, and hovering an entry selects and focuses it; move it away first.
    await b.park_pointer();
    await b.type('zig');
    check(await b.wait_for(`${SEARCH}.value === 'zig' && document.activeElement === ${SEARCH}`), 'search-type: typing "zig" fills and focuses the search',
        await b.evaluate(`({ value: ${SEARCH}.value, active: document.activeElement?.outerHTML.slice(0, 60) })`));
    const matches = await b.wait_for(`(() => { const v = ${VISIBLE}; return v.length < ${all.length} ? v : null; })()`);
    check(matches && ['/projects/hivemind/', '/projects/turso-zig/', '/projects/advent-of-code/'].every(h => matches.includes(h)) && !matches.includes('/projects/webshite/'),
        'search-type: "zig" keeps the Zig projects and drops webshite', matches);
    check(await b.evaluate(`document.querySelector('.menu-search-count').textContent.trim()`) === `${matches?.length}/${all.length}`,
        'search-type: the count shows matches out of all', await b.evaluate(`document.querySelector('.menu-search-count').textContent`));
    await b.snapshot('02-zig');
    await b.screenshot('02-zig');

    // search-open-match: ArrowDown moves the selection, Enter opens it.
    await b.press('ArrowDown');
    const second = matches?.[1];
    check(await b.wait_for(`document.querySelector('#menu-results a[data-selected="true"]')?.getAttribute('href') === ${JSON.stringify(second)}`),
        'search-open-match: ArrowDown selects the second match', await b.evaluate(SELECTED));
    await b.press('Enter');
    check(await b.wait_for(`location.pathname === ${JSON.stringify(second)} && document.readyState === 'complete'`), 'search-open-match: Enter opens the selected project');
    await b.screenshot('03-project');
    await b.press('Escape');
    check(await b.wait_for(`${at('/projects/')} && !!${SEARCH} && ${SEARCH}.value === ''`), 'search-open-match: Escape returns to Projects with the search cleared');

    // search-slash: "/" focuses the box without typing a slash.
    await b.press('/');
    check(await b.wait_for(`document.activeElement === ${SEARCH} && ${SEARCH}.value === ''`), 'search-slash: "/" focuses the empty search');

    // search-empty: a query matching nothing says so.
    await b.type('qqxvw');
    check(await b.wait_for(`document.querySelector('#menu-results .menu-empty')?.textContent.trim() === 'No matches.'`), 'search-empty: "qqxvw" shows No matches.');
    await b.screenshot('04-no-matches');

    // search-escape: the first Escape clears, the second goes back.
    await b.press('Escape');
    check(await b.wait_for(`${SEARCH}.value === '' && (${VISIBLE}).length === ${all.length} && location.pathname === '/projects/'`),
        'search-escape: Escape clears the search and stays on Projects');
    await b.press('Escape');
    check(await b.wait_for(at('/')), 'search-escape: a second Escape returns Home');
}
