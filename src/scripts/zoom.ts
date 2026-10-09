// Fallout 3 moves the camera onto the screen while a terminal is in use. The home
// menu shows the whole terminal; every other screen is magnified until its content
// fills the window, cropping part of the glass margin and the housing, and its text
// is laid out smaller so that, once magnified, it reads at a comfortable size.
// Fraction of the screen's inner padding that stays in view around the content.
const PADDING_KEPT = 0.4;
const ZOOMED_TEXT_MIN_PX = 20;
const ZOOMED_TEXT_MAX_PX = 28;
const ZOOM_MS = 550;

let settle_timer = 0;

function measure(station: HTMLElement, screen: HTMLElement) {
    // Offsets are layout positions, so an applied zoom transform does not affect them.
    // They start inside the monitor's border, which holds the housing on phones.
    const monitor = screen.offsetParent;
    if (!(monitor instanceof HTMLElement) || monitor.offsetParent !== station) {
        throw new Error('The screen must sit in a positioned monitor inside the positioned station');
    }
    const center_x = monitor.offsetLeft + monitor.clientLeft + screen.offsetLeft + screen.offsetWidth / 2;
    const center_y = monitor.offsetTop + monitor.clientTop + screen.offsetTop + screen.offsetHeight / 2;
    const padding = getComputedStyle(screen);
    const crop = (sides: number) => (1 - PADDING_KEPT) * sides;
    const visible_width = screen.offsetWidth - crop(parseFloat(padding.paddingLeft) + parseFloat(padding.paddingRight));
    const visible_height = screen.offsetHeight - crop(parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom));
    const scale = Math.max(1, Math.min(innerWidth / visible_width, innerHeight / visible_height));
    // Roughly 36 lines tall and 45 characters wide at minimum, within the limits.
    const text_px = Math.min(ZOOMED_TEXT_MAX_PX,
        Math.max(ZOOMED_TEXT_MIN_PX, Math.min(innerWidth / 45, innerHeight / 36)));
    return {
        scale,
        font_px: text_px / scale,
        origin_x: center_x,
        origin_y: center_y,
        x: innerWidth / 2 - (station.offsetLeft + center_x - scrollX),
        y: innerHeight / 2 - (station.offsetTop + center_y - scrollY),
    };
}

// The magnification once any zoom animation settles: 1 on the home menu.
export function zoom_scale(): number {
    const root = document.documentElement;
    if (root.dataset.zoom !== 'in') { return 1; }
    const scale = parseFloat(root.style.getPropertyValue('--zoom-scale'));
    if (!(scale >= 1)) { throw new Error(`Zoomed in with a scale of ${scale}`); }
    return scale;
}

export function update_zoom(animate: boolean) {
    const root = document.documentElement;
    const station = document.querySelector<HTMLElement>('.terminal-station');
    const screen = document.querySelector<HTMLElement>('.screen');
    const section = document.querySelector<HTMLElement>('#content')?.dataset.section;
    if (!station || !screen || !section) { return; }
    const zoom = section === 'home' ? 'out' : 'in';
    const view = measure(station, screen);
    root.style.setProperty('--zoom-scale', String(view.scale));
    root.style.setProperty('--zoom-font', `${view.font_px}px`);
    root.style.setProperty('--zoom-x', `${view.x}px`);
    root.style.setProperty('--zoom-y', `${view.y}px`);
    root.style.setProperty('--zoom-origin', `${view.origin_x}px ${view.origin_y}px`);
    if (root.dataset.zoom === zoom) { return; }
    clearTimeout(settle_timer);
    if (animate && root.dataset.zoom) {
        // Commit the incoming page at the previous zoom so the change transitions.
        station.getBoundingClientRect();
        root.dataset.zoomAnimate = '';
        settle_timer = window.setTimeout(() => { delete root.dataset.zoomAnimate; }, ZOOM_MS + 100);
    } else {
        delete root.dataset.zoomAnimate;
    }
    root.dataset.zoom = zoom;
}
