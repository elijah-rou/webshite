import { audio } from './state';

// Fallout terminals print each screen line by line. The reveal clips elements
// without changing their text, so selection and assistive technology are unaffected.
const REVEAL_SELECTOR = [
    '.system-header > *', 'main h1', 'main h2', 'main h3', 'main p',
    'main li', 'main pre', 'main img', '.menu-search', '.terminal-menu a', '.photo-grid a', '.screen-bottom',
].join(', ');
const READING_REVEAL_SELECTOR = '.menu-search, .terminal-menu a, .photo-grid a';
const REVEAL_TOTAL_MS = 900;
const REVEAL_LINE_MS = 60;
// Pictures appear whole, one at a time, each once its image is ready (or after
// IMAGE_WAIT_MS, so an image that is slow or not yet loading cannot stall the rest).
const IMAGE_INTERVAL_MS = 100;
const IMAGE_WAIT_MS = 500;
// Bumped by each reveal and by clear_reveal, so an older picture sequence stops.
let picture_run = 0;

export function reveal() {
    const screen = document.querySelector<HTMLElement>('.screen');
    if (!screen || document.documentElement.dataset.effects === 'off'
        || matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    // Reading pages show their text at once; their menus and photo grid still print entry by entry.
    const lines = Array.from(screen.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
        .filter(line => !line.closest('[data-reading]') || line.matches(READING_REVEAL_SELECTOR));
    const text = lines.filter(line => line.querySelector('img') === null);
    const pictures = lines.filter(line => line.querySelector('img') !== null);
    const step_ms = Math.min(REVEAL_LINE_MS, REVEAL_TOTAL_MS / Math.max(text.length, 1));
    text.forEach((line, index) => {
        line.style.setProperty('--reveal-delay', `${Math.round(index * step_ms)}ms`);
        line.style.setProperty('--reveal-ms', `${Math.round(step_ms)}ms`);
        line.style.setProperty('--reveal-steps', String(Math.min(Math.max(line.textContent?.length ?? 1, 1), 40)));
        line.classList.add('reveal-line');
    });
    void show_pictures(pictures, text.length * step_ms);
}

async function show_pictures(pictures: HTMLElement[], start_ms: number) {
    const run = ++picture_run;
    for (const picture of pictures) { picture.classList.add('reveal-pending'); }
    // Each picture follows the previous one by at least IMAGE_INTERVAL_MS, even when
    // a slow image held the previous one back.
    let next_at = performance.now() + start_ms;
    for (const picture of pictures) {
        const image = picture.querySelector('img');
        await Promise.all([
            delay(next_at - performance.now()),
            Promise.race([image?.decode().catch(() => undefined), delay(IMAGE_WAIT_MS)]),
        ]);
        if (run !== picture_run) { return; }
        picture.classList.remove('reveal-pending');
        audio.focus();
        next_at = performance.now() + IMAGE_INTERVAL_MS;
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
