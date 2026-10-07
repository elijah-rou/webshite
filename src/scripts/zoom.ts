// Fallout 3 moves the camera onto the screen while a terminal is in use. The home
// menu shows the whole terminal; every other screen is viewed close up.
const SCREEN_VIEWPORT_FRACTION = 0.94;
const ZOOMED_FONT_MAX_PX = 30;
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
    const font_px = Number.parseFloat(getComputedStyle(screen).fontSize);
    const scale = Math.max(1, Math.min(
        innerWidth * SCREEN_VIEWPORT_FRACTION / screen.offsetWidth,
        innerHeight * SCREEN_VIEWPORT_FRACTION / screen.offsetHeight,
        ZOOMED_FONT_MAX_PX / font_px,
    ));
    return {
        scale,
        origin_x: center_x,
        origin_y: center_y,
        x: innerWidth / 2 - (station.offsetLeft + center_x - scrollX),
        y: innerHeight / 2 - (station.offsetTop + center_y - scrollY),
    };
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
