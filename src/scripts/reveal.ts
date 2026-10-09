import { audio } from './state';

// Fallout terminals print each screen line by line. The reveal clips elements
// without changing their text, so selection and assistive technology are unaffected.
const REVEAL_SELECTOR = [
    '.system-header > *', 'main h1', 'main h2', 'main h3', 'main p',
    'main li', 'main pre', 'main img', '.menu-search', '.terminal-menu a', '.photo-grid a', '.screen-bottom',
].join(', ');
const READING_REVEAL_SELECTOR = '.menu-search, .terminal-menu a, .photo-grid a';
// Every screen prints at the same rate: one line, menu entry or picture per step.
export const REVEAL_LINE_MS = 60;
// A picture appears whole once its image is ready, waiting at most this long so an
// image that is slow or not yet loading cannot stall the rest.
const IMAGE_WAIT_MS = 500;
// Bumped by each reveal and by clear_reveal, so an older picture sequence stops.
let picture_run = 0;

export function reveal() {
    const screen = document.querySelector<HTMLElement>('.screen');
    const scroller = document.querySelector<HTMLElement>('.screen-scroll');
    if (!screen || !scroller || document.documentElement.dataset.effects === 'off'
        || matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    // Reading pages show their text at once; their menus and photo grid still print entry by entry.
    const lines = Array.from(screen.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
        .filter(line => !line.closest('[data-reading]') || line.matches(READING_REVEAL_SELECTOR));
    // Lines below the visible screen print with the last visible one, so a long list
    // keeps the same rate without making the footer wait.
    const visible_bottom = scroller.getBoundingClientRect().bottom;
    const pictures: { picture: HTMLElement; at_ms: number }[] = [];
    let step = 0;
    for (const line of lines) {
        const below = scroller.contains(line) && line.getBoundingClientRect().top >= visible_bottom;
        const at_ms = (below ? Math.max(step - 1, 0) : step) * REVEAL_LINE_MS;
        if (!below) { step += 1; }
        if (line.querySelector('img')) { pictures.push({ picture: line, at_ms }); continue; }
        print_line(line, at_ms);
    }
    void show_pictures(pictures);
}

// Types one line out over a step, starting at_ms from now.
export function print_line(line: HTMLElement, at_ms: number) {
    line.style.setProperty('--reveal-delay', `${Math.round(at_ms)}ms`);
    line.style.setProperty('--reveal-ms', `${REVEAL_LINE_MS}ms`);
    line.style.setProperty('--reveal-steps', String(Math.min(Math.max(line.textContent?.length ?? 1, 1), 40)));
    line.classList.add('reveal-line');
}

async function show_pictures(pictures: { picture: HTMLElement; at_ms: number }[]) {
    const run = ++picture_run;
    for (const { picture } of pictures) { picture.classList.add('reveal-pending'); }
    const start = performance.now();
    let last_shown = -Infinity;
    for (const { picture, at_ms } of pictures) {
        const image = picture.querySelector('img');
        // On schedule, but never sooner than a step after the previous picture, even
        // when a slow image held that one back.
        const due = Math.max(start + at_ms, last_shown + REVEAL_LINE_MS);
        await Promise.all([
            delay(due - performance.now()),
            Promise.race([image?.decode().catch(() => undefined), delay(IMAGE_WAIT_MS)]),
        ]);
        if (run !== picture_run) { return; }
        picture.classList.remove('reveal-pending');
        audio.focus();
        last_shown = performance.now();
    }
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)));
}

function finish(line: HTMLElement) {
    line.classList.remove('reveal-line');
    line.style.removeProperty('--reveal-delay');
    line.style.removeProperty('--reveal-ms');
    line.style.removeProperty('--reveal-steps');
}

// CRT OFF cancels the animation, and a cancelled animation fires no animationend;
// it also shows any pictures still waiting.
export function clear_reveal() {
    picture_run += 1;
    for (const line of document.querySelectorAll<HTMLElement>('.reveal-line')) { finish(line); }
    for (const picture of document.querySelectorAll<HTMLElement>('.reveal-pending')) { picture.classList.remove('reveal-pending'); }
}

export function handle_reveal_animation(event: AnimationEvent) {
    if (event.animationName !== 'type-line' || !(event.target instanceof HTMLElement)) { return; }
    if (event.type === 'animationstart') { audio.focus(); return; }
    // A lingering clip-path would also clip focus outlines and the selection glow.
    finish(event.target);
}
