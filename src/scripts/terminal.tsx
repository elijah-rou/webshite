import { render } from '@solidjs/web';
import TerminalControls from '../components/TerminalControls';
import TerminalMenu, { MENU_KINDS, type MenuKind } from '../components/TerminalMenu';
import MusicStatus from '../components/MusicStatus';
import { audio, stop_track } from './state';
import { handle_reveal_animation, reveal } from './reveal';
import { update_zoom } from './zoom';

let disposers: (() => void)[] = [];
let mounted_controls: HTMLElement | null = null;

function menu_kind(value: string | undefined): MenuKind {
    const kind = MENU_KINDS.find(candidate => candidate === (value ?? 'link'));
    if (!kind) { throw new Error(`Unknown menu item kind: ${value}`); }
    return kind;
}

function dispose() {
    for (const cleanup of disposers) { cleanup(); }
    disposers = [];
    mounted_controls = null;
}

function mount() {
    const menu_root = document.querySelector<HTMLElement>('[data-terminal-menu]');
    const controls_root = document.querySelector<HTMLElement>('[data-terminal-controls]');
    const status_root = document.querySelector<HTMLElement>('[data-music-status]');
    if (controls_root && mounted_controls === controls_root) { return; }
    const items = menu_root ? Array.from(menu_root.querySelectorAll<HTMLAnchorElement>('a'))
        .map(link => ({
            label: link.dataset.label ?? link.textContent?.trim() ?? '',
            href: link.getAttribute('href') ?? '/',
            kind: menu_kind(link.dataset.kind),
            detail: link.dataset.detail ?? '',
            note: link.dataset.note ?? '',
            body: link.dataset.body ?? '',
        })) : [];
    const searchable = menu_root?.hasAttribute('data-searchable') ?? false;
    const label = menu_root?.querySelector('nav')?.getAttribute('aria-label') ?? 'Navigation';
    dispose();
    if (menu_root) {
        menu_root.replaceChildren();
        disposers.push(render(() => <TerminalMenu items={items} label={label} searchable={searchable} />, menu_root));
    }
    if (controls_root) {
        controls_root.replaceChildren();
        disposers.push(render(() => <TerminalControls />, controls_root));
        mounted_controls = controls_root;
    }
    if (status_root) {
        status_root.replaceChildren();
        disposers.push(render(() => <MusicStatus />, status_root));
    }
    update_zoom(true);
    reveal();
    // The window cannot scroll, so keyboard scrolling needs focus inside the screen.
    if (document.activeElement === document.body) {
        document.querySelector<HTMLElement>('#content')?.focus({ preventScroll: true });
    }
}

// Astro replaces <html> attributes with the incoming document's, which would
// reset CRT OFF and the zoom until the page mounts.
const ROOT_STATE_ATTRIBUTES = ['data-effects', 'data-zoom', 'style'];

function handle_resize() { update_zoom(false); }

function handle_click(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target.closest('a') : null;
    if (target && !target.classList.contains('skip-link')) { void audio.play('select'); }
}

// Arrow keys move between photo thumbnails by their on-screen position.
function handle_grid_key(event: KeyboardEvent) {
    const grid = document.querySelector<HTMLElement>('[data-photo-grid]');
    if (!grid || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { return; }
    const tiles = Array.from(grid.querySelectorAll<HTMLAnchorElement>('a'));
    const active = document.activeElement;
    const current = tiles.findIndex(tile => tile === active);
    let target: HTMLAnchorElement | undefined;
    if (current < 0) {
        if (active !== document.body && active?.id !== 'content') { return; }
        target = tiles[0];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        target = tiles[current + (event.key === 'ArrowRight' ? 1 : -1)];
    } else {
        const from = tiles[current];
        if (!from) { return; }
        const below = event.key === 'ArrowDown';
        const rows = tiles.filter(tile => below ? tile.offsetTop > from.offsetTop : tile.offsetTop < from.offsetTop);
        const row_top = below ? Math.min(...rows.map(tile => tile.offsetTop)) : Math.max(...rows.map(tile => tile.offsetTop));
        target = rows.filter(tile => tile.offsetTop === row_top)
            .sort((a, b) => Math.abs(a.offsetLeft - from.offsetLeft) - Math.abs(b.offsetLeft - from.offsetLeft))[0];
    }
    event.preventDefault();
    if (!target) { return; }
    target.focus();
    void audio.play('focus');
}

// As in the menus, the pointer moves focus so one thumbnail is ever highlighted.
function handle_grid_pointer(event: PointerEvent) {
    const tile = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('[data-photo-grid] a') : null;
    if (tile && tile !== document.activeElement) { tile.focus({ preventScroll: true }); audio.focus(); }
}

function handle_key(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.altKey || event.ctrlKey || event.metaKey) { return; }
    const back = document.querySelector<HTMLAnchorElement>('[data-back]');
    if (back) { event.preventDefault(); back.click(); }
}

function handle_visibility() {
    if (document.hidden) { audio.stop(); }
}

function before_swap(event: Event) {
    dispose();
    const incoming = (event as Event & { newDocument: Document }).newDocument.documentElement;
    for (const name of ROOT_STATE_ATTRIBUTES) {
        const value = document.documentElement.getAttribute(name);
        if (value === null) { incoming.removeAttribute(name); } else { incoming.setAttribute(name, value); }
    }
    // Recordings are controlled from the Music screen, so they stop when it is left.
    stop_track();
    // The native transition may be cancelled by a second navigation.
    const transition = (event as Event & { viewTransition: ViewTransition }).viewTransition;
    void transition.ready.catch((error: unknown) => {
        if (error instanceof DOMException) {
            if (error.name === 'AbortError') { return; }
            if (error.name === 'InvalidStateError' && error.message.startsWith('Transition was aborted')) {
                return;
            }
        }
        throw error;
    });
}

document.addEventListener('astro:page-load', mount);
document.addEventListener('astro:before-swap', before_swap);
document.addEventListener('click', handle_click);
document.addEventListener('keydown', handle_key);
document.addEventListener('keydown', handle_grid_key);
document.addEventListener('pointerover', handle_grid_pointer);
document.addEventListener('visibilitychange', handle_visibility);
document.addEventListener('animationstart', handle_reveal_animation);
document.addEventListener('animationend', handle_reveal_animation);
window.addEventListener('resize', handle_resize);
mount();

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        dispose();
        audio.stop();
        document.removeEventListener('astro:page-load', mount);
        document.removeEventListener('astro:before-swap', before_swap);
        document.removeEventListener('click', handle_click);
        document.removeEventListener('keydown', handle_key);
        document.removeEventListener('keydown', handle_grid_key);
        document.removeEventListener('pointerover', handle_grid_pointer);
        document.removeEventListener('visibilitychange', handle_visibility);
        document.removeEventListener('animationstart', handle_reveal_animation);
        document.removeEventListener('animationend', handle_reveal_animation);
        window.removeEventListener('resize', handle_resize);
    });
}
