import { audio } from './state';

// Fallout terminals print each screen line by line. The reveal clips elements
// without changing their text, so selection and assistive technology are unaffected.
const REVEAL_SELECTOR = [
    '.system-header > *', 'main h1', 'main h2', 'main h3', 'main p',
    'main li', 'main pre', 'main img', '.terminal-menu a', '.command-prompt', '.screen-bottom',
].join(', ');
const REVEAL_TOTAL_MS = 900;
const REVEAL_LINE_MS = 60;

export function reveal() {
    const screen = document.querySelector<HTMLElement>('.screen');
    if (!screen || document.documentElement.dataset.effects === 'off'
        || matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    const lines = Array.from(screen.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    const step_ms = Math.min(REVEAL_LINE_MS, REVEAL_TOTAL_MS / Math.max(lines.length, 1));
    lines.forEach((line, index) => {
        line.style.setProperty('--reveal-delay', `${Math.round(index * step_ms)}ms`);
        line.style.setProperty('--reveal-ms', `${Math.round(step_ms)}ms`);
        line.style.setProperty('--reveal-steps', String(Math.min(Math.max(line.textContent?.length ?? 1, 1), 40)));
        line.classList.add('reveal-line');
    });
}

function finish(line: HTMLElement) {
    line.classList.remove('reveal-line');
    line.style.removeProperty('--reveal-delay');
    line.style.removeProperty('--reveal-ms');
    line.style.removeProperty('--reveal-steps');
}

// CRT OFF cancels the animation, and a cancelled animation fires no animationend.
export function clear_reveal() {
    for (const line of document.querySelectorAll<HTMLElement>('.reveal-line')) { finish(line); }
}

export function handle_reveal_animation(event: AnimationEvent) {
    if (event.animationName !== 'type-line' || !(event.target instanceof HTMLElement)) { return; }
    if (event.type === 'animationstart') { audio.focus(); return; }
    // A lingering clip-path would also clip focus outlines and the selection glow.
    finish(event.target);
}
