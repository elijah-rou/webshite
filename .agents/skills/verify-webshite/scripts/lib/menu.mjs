// Handles shared by the drives: the client menu mounts as #menu-results once the
// page has loaded, and its highlighted entry carries data-selected="true".
export const MENU_READY = `!!document.querySelector('#menu-results')`;
export const SELECTED = `(document.querySelector('#menu-results a[data-selected="true"] .menu-label')?.textContent.trim() ?? null)`;

// Home prints its lines one by one (.reveal-line, .reveal-pending) and opening an
// entry zooms the screen (html[data-zoom-animate]); targets move until both end.
export const SETTLED = `(!document.querySelector('.reveal-line, .reveal-pending') && !document.documentElement.hasAttribute('data-zoom-animate'))`;

// True once the router has landed on the path, the page has settled, and its menu (if any) is mounted.
export const at = (path, ready = MENU_READY) => `location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && ${SETTLED} && (${ready})`;

export async function open_home(b, base, check) {
    await b.navigate(`${base}/`);
    return check(await b.wait_for(`${at('/')} && ${SELECTED} === '> About'`), 'Home shows the menu with About selected');
}

export async function press_times(b, key, times) { for (let i = 0; i < times; i++) { await b.press(key); } }
