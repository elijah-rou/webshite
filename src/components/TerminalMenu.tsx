import { createSignal, flush, For, onCleanup, untrack } from 'solid-js';
import { audio } from '../scripts/state';

export interface MenuItem { label: string; href: string }
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

    function handle_key(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return; }
        const target = document.activeElement;
        if (target !== document.body && !menu?.contains(target)) { return; }
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

    document.addEventListener('keydown', handle_key);
    onCleanup(() => document.removeEventListener('keydown', handle_key));

    return <nav ref={menu} class="terminal-menu" aria-label={props.label}>
        <For each={props.items}>{(item, index) =>
            <a ref={element => { links[untrack(index)] = element; }}
                href={item.href} data-label={item.label} data-selected={selected() === index() ? 'true' : 'false'}
                onPointerEnter={() => select(index())} onFocus={() => select(index())}>
                <span aria-hidden="true">&gt; </span>{item.label}
            </a>
        }</For>
    </nav>;
}
