import { render } from '@solidjs/web';
import TerminalControls from '../components/TerminalControls';
import TerminalMenu from '../components/TerminalMenu';
import GuitarPlayer from '../components/GuitarPlayer';
import { audio } from './state';

let disposers: (() => void)[] = [];
let mounted_controls: HTMLElement | null = null;

function dispose() {
    for (const cleanup of disposers) { cleanup(); }
    disposers = [];
    mounted_controls = null;
}

function mount() {
    const menu_root = document.querySelector<HTMLElement>('[data-terminal-menu]');
    const controls_root = document.querySelector<HTMLElement>('[data-terminal-controls]');
    const guitar_root = document.querySelector<HTMLElement>('[data-guitar-player]');
    if (controls_root && mounted_controls === controls_root) { return; }
    const items = menu_root ? Array.from(menu_root.querySelectorAll<HTMLAnchorElement>('a'))
        .map(link => ({ label: link.dataset.label ?? link.textContent?.trim() ?? '',
            href: link.getAttribute('href') ?? '/' })) : [];
    const label = menu_root?.getAttribute('aria-label') ?? 'Navigation';
    dispose();
    if (menu_root) {
        menu_root.replaceChildren();
        disposers.push(render(() => <TerminalMenu items={items} label={label} />, menu_root));
    }
    if (controls_root) {
        controls_root.replaceChildren();
        disposers.push(render(() => <TerminalControls />, controls_root));
        mounted_controls = controls_root;
    }
    if (guitar_root) {
        guitar_root.replaceChildren();
        disposers.push(render(() => <GuitarPlayer />, guitar_root));
    }
}

function handle_click(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target.closest('a') : null;
    if (target && !target.classList.contains('skip-link')) { void audio.play('select'); }
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
document.addEventListener('visibilitychange', handle_visibility);
mount();

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        dispose();
        audio.stop();
        document.removeEventListener('astro:page-load', mount);
        document.removeEventListener('astro:before-swap', before_swap);
        document.removeEventListener('click', handle_click);
        document.removeEventListener('keydown', handle_key);
        document.removeEventListener('visibilitychange', handle_visibility);
    });
}
