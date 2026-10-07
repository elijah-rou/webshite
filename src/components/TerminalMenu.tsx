import { createSignal, flush, For, onCleanup, untrack } from 'solid-js';
import { audio, toggle_track, track } from '../scripts/state';

export const MENU_KINDS = ['link', 'recording', 'download'] as const;
export type MenuKind = typeof MENU_KINDS[number];
export interface MenuItem { label: string; href: string; kind: MenuKind; detail: string; note: string }
interface Props { items: MenuItem[]; label: string }

export default function TerminalMenu(props: Props) {
    const [selected, set_selected] = createSignal(0);
    const links: HTMLAnchorElement[] = [];
    let menu: HTMLElement | undefined;

    function select(index: number, keyboard = false) {
        if (selected() === index) { return; }
        flush(() => set_selected(index));
        if (keyboard) { void audio.play('focus'); } else { audio.focus(); }
    }

    // The selection bar is the only indicator, so the pointer moves keyboard focus
    // with it; otherwise Enter would open an entry other than the highlighted one.
    function hover(index: number) {
        select(index);
        links[index]?.focus({ preventScroll: true });
    }

    function handle_key(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return; }
        const target = document.activeElement;
        // The skip link and Astro navigation leave focus on the body or <main>.
        if (target !== document.body && target?.id !== 'content' && !menu?.contains(target)) { return; }
        const count = props.items.length;
        if (count === 0) { return; }
        const focused_index = links.findIndex(link => link === target);
        let index = focused_index >= 0 ? focused_index : selected();
        switch (event.key) {
            case 'ArrowDown': index = (index + 1) % count; break;
            case 'ArrowUp': index = (index + count - 1) % count; break;
            case 'Home': index = 0; break;
            case 'End': index = count - 1; break;
            case 'Enter':
                if (focused_index >= 0) { return; }
                event.preventDefault();
                links[index]?.click();
                return;
            default: return;
        }
        event.preventDefault();
        select(index, true);
        links[index]?.focus();
    }

    function activate(item: MenuItem, event: MouseEvent) {
        if (item.kind !== 'recording') { return; }
        event.preventDefault();
        toggle_track({ href: item.href, title: item.label });
    }

    document.addEventListener('keydown', handle_key);
    onCleanup(() => document.removeEventListener('keydown', handle_key));

    return <nav ref={menu} class="terminal-menu" aria-label={props.label}>
        <For each={props.items}>{(item, index) =>
            <a ref={element => { links[untrack(index)] = element; }}
                href={item.href} download={item.kind === 'download' ? '' : undefined}
                data-label={item.label} data-selected={selected() === index() ? 'true' : 'false'}
                onPointerEnter={() => hover(index())} onFocus={() => select(index())}
                onClick={event => activate(item, event)}>
                <span class="menu-label"><span aria-hidden="true">&gt; </span>{item.label}</span>
                {item.detail && <span class="menu-detail">
                    {item.kind === 'recording' && track()?.href === item.href ? 'PLAYING' : item.detail}
                </span>}
                {item.note && <span class="menu-note">{item.note}</span>}
            </a>
        }</For>
    </nav>;
}
