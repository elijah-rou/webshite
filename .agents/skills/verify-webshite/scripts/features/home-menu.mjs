// Home menu: first-visit intro and its skip, keyboard and pointer selection, the
// disabled entries, opening an entry and going back, and a phone tap.
import { at, open_home, press_times, SELECTED } from '../lib/menu.mjs';

const EXPECTED = [
    ['> About', 'A'], ['> Resume', 'A'], ['> Projects', 'A'], ['> Talks', 'A'], ['> Papers', 'A'],
    ['> Writing (in construction)', 'SPAN'], ['> Music (in construction)', 'SPAN'], ['> Photos', 'A'],
];

export default async function home_menu({ base, browser, check }) {
    // intro-skip: a first visit opens on the log-in prompt; Escape skips to the menu.
    const fresh = await browser({ fresh: true });
    await fresh.navigate(`${base}/`);
    check(await fresh.wait_for(`document.documentElement.hasAttribute('data-intro') && (document.querySelector('[data-intro-root]')?.textContent.trim().length ?? 0) > 0`),
        'intro-skip: a first visit opens the intro');
    await fresh.screenshot('01-intro');
    await fresh.press('Escape');
    check(await fresh.wait_for(`!document.documentElement.hasAttribute('data-intro') && ${SELECTED} === '> About'`),
        'intro-skip: Escape leaves the intro for the menu');
    await fresh.screenshot('02-after-intro');

    const b = await browser();
    if (!await open_home(b, base, check)) { return; }
    const entries = await b.evaluate(`[...document.querySelectorAll('#menu-results > a, #menu-results > .menu-disabled')]
        .map(e => [e.querySelector('.menu-label').textContent.trim(), e.tagName])`);
    check(JSON.stringify(entries) === JSON.stringify(EXPECTED), 'menu-entries: eight entries, Writing and Music disabled', entries);
    check(await b.evaluate(`[...document.querySelectorAll('#menu-results .menu-disabled')].every(e => e.getAttribute('aria-disabled') === 'true')`),
        'menu-entries: disabled entries are marked aria-disabled');
    await b.snapshot('03-home');
    await b.screenshot('03-home');

    // menu-keys: arrows skip the disabled entries and wrap.
    await press_times(b, 'ArrowDown', 5);
    check(await b.wait_for(`${SELECTED} === '> Photos'`), 'menu-keys: five ArrowDown presses skip Writing and Music to Photos', await b.evaluate(SELECTED));
    await b.press('ArrowDown');
    check(await b.wait_for(`${SELECTED} === '> About'`), 'menu-keys: ArrowDown from Photos wraps to About');
    await b.press('End');
    check(await b.wait_for(`${SELECTED} === '> Photos'`), 'menu-keys: End selects Photos');
    await b.press('ArrowUp');
    check(await b.wait_for(`${SELECTED} === '> Papers'`), 'menu-keys: ArrowUp from Photos selects Papers');
    await b.press('Enter');
    check(await b.wait_for(at('/papers/')), 'menu-open: Enter opens Papers');
    await b.screenshot('04-papers-by-enter');
    await b.press('Escape');
    check(await b.wait_for(at('/')), 'menu-back: Escape returns Home');

    // menu-disabled: clicking a disabled entry goes nowhere.
    await b.click('#menu-results .menu-disabled');
    await new Promise(r => setTimeout(r, 800));
    check(await b.evaluate(`location.pathname`) === '/', 'menu-disabled: clicking Writing stays on Home');

    // menu-pointer: hover moves the selection, a click opens, Back returns.
    await b.click('#menu-results a[href="/talks/"]');
    check(await b.wait_for(at('/talks/')), 'menu-pointer: clicking Talks opens Talks');
    await b.click('[data-back]');
    check(await b.wait_for(at('/')), 'menu-back: the Back link returns Home');
    await b.screenshot('05-home-again');

    // menu-phone: a tap on a phone-sized screen opens the entry.
    const phone = await browser({ viewport: 'phone' });
    if (!await open_home(phone, base, check)) { return; }
    await phone.screenshot('06-phone-home');
    await phone.click('#menu-results a[href="/projects/"]');
    check(await phone.wait_for(at('/projects/')), 'menu-phone: tapping Projects on a phone opens Projects');
    await phone.screenshot('07-phone-projects');
}
