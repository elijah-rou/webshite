import { createMemo, createSignal, flush, For, onCleanup, Show } from 'solid-js';
import { fuzzy_filter } from '../scripts/fuzzy';
import { audio, toggle_track, track } from '../scripts/state';

export const MENU_KINDS = ['link', 'recording', 'download'] as const;
export type MenuKind = typeof MENU_KINDS[number];
export interface MenuItem { label: string; href: string; kind: MenuKind; detail: string; note: string; body: string }
interface Props { items: MenuItem[]; label: string; searchable: boolean }

export default function TerminalMenu(props: Props) {
    const [selected, set_selected] = createSignal(0);
    const [query, set_query] = createSignal('');
    let menu: HTMLElement | undefined;
    let search: HTMLInputElement | undefined;

    const visible = createMemo(() => {
        const items = props.items;
        return fuzzy_filter(items.map(item => ({ fields: [item.label, item.detail, item.note], body: item.body })), query())
            .map(index => items[index])
            .filter((item): item is MenuItem => item !== undefined);
    });

    const links = () => Array.from(menu?.querySelectorAll<HTMLAnchorElement>('a') ?? []);

    function select(index: number, keyboard = false) {
        if (selected() === index) { return; }
        flush(() => set_selected(index));
        if (keyboard) { void audio.play('focus'); } else { audio.focus(); }
    }

    // The selection bar is the only indicator, so the pointer moves keyboard focus
    // with it; otherwise Enter would open an entry other than the highlighted one.
    function hover(index: number) {
        select(index);
        links()[index]?.focus({ preventScroll: true });
    }

    function move(key: string, from: number): number | null {
        const count = visible().length;
        if (count === 0) { return null; }
        switch (key) {
            case 'ArrowDown': return (from + 1) % count;
            case 'ArrowUp': return (from + count - 1) % count;
            case 'Home': return 0;
            case 'End': return count - 1;
            default: return null;
        }
    }

    function handle_key(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) { return; }
        const target = document.activeElement;
        // The skip link and Astro navigation leave focus on the body or <main>.
        if (target !== document.body && target?.id !== 'content' && !menu?.contains(target)) { return; }
        // Typing starts a search, as in a fuzzy finder; "/" only opens the box.
        if (props.searchable && search && event.key.length === 1 && event.key !== ' ') {
            if (event.key === '/') { event.preventDefault(); }
            search.focus({ preventScroll: true });
            return;
        }
        if (event.shiftKey) { return; }
        const all = links();
        const focused_index = all.findIndex(link => link === target);
        if (event.key === 'Enter') {
            if (focused_index >= 0) { return; }
            event.preventDefault();
            all[selected()]?.click();
            return;
        }
        const index = move(event.key, focused_index >= 0 ? focused_index : selected());
        if (index === null) { return; }
        event.preventDefault();
        select(index, true);
        all[index]?.focus();
    }

    // The search box keeps focus while arrows move the selection, so typing can continue.
    function search_key(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault();
            links()[selected()]?.click();
            return;
        }
        if (event.key === 'Escape') {
            if (query() === '') { return; }
            // Clearing the search comes before going back.
            event.preventDefault();
            event.stopPropagation();
            update_query('');
            return;
        }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') { return; }
        const index = move(event.key, selected());
        if (index === null) { return; }
        event.preventDefault();
        select(index, true);
        links()[index]?.scrollIntoView({ block: 'nearest' });
    }

    function update_query(value: string) {
        flush(() => { set_query(value); set_selected(0); });
        if (search && search.value !== value) { search.value = value; }
        menu?.scrollTo?.({ top: 0 });
    }

    function activate(item: MenuItem, event: MouseEvent) {
        if (item.kind !== 'recording') { return; }
        event.preventDefault();
        toggle_track({ href: item.href, title: item.label });
    }

    document.addEventListener('keydown', handle_key);
    onCleanup(() => document.removeEventListener('keydown', handle_key));

    return <>
        <Show when={props.searchable}>
            <label class="menu-search">
                <span aria-hidden="true">SEARCH&gt; </span>
                <input ref={search} type="search" autocomplete="off" spellcheck={false}
                    aria-label={`Search ${props.label.toLowerCase()}`} aria-controls="menu-results"
                    onInput={event => update_query(event.currentTarget.value)} onKeyDown={search_key} />
                <span class="menu-search-count" aria-live="polite">
                    {query() ? `${visible().length}/${props.items.length}` : ''}
                </span>
            </label>
        </Show>
        <nav ref={menu} id="menu-results" class="terminal-menu" aria-label={props.label}>
            <For each={visible()}>{(item, index) =>
                <a href={item.href} download={item.kind === 'download' ? '' : undefined}
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
            <Show when={visible().length === 0}>
                <p class="menu-empty">No matches.</p>
            </Show>
        </nav>
    </>;
}
