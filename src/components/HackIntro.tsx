import { createSignal, flush, For, onCleanup, onSettled, Show } from 'solid-js';
import {
    ATTEMPTS, build_dump, guess_log, plan_guesses, ROW_WIDTH, ROWS_PER_COLUMN, seeded_random, type DumpRow,
} from '../scripts/hack';
import { print_line, REVEAL_LINE_MS } from '../scripts/reveal';
import { audio } from '../scripts/state';

interface Props { seed: number; on_done: () => void }

// Width in characters: two dump columns ("0xF4F0 " + row) with gaps, then the log.
const DUMP_CHARS = 2 * (7 + ROW_WIDTH) + 2;
// Room for ">" and a 15-letter word.
const LOG_CHARS = 16;
// Header (with its blank lines), the dump, a blank line and the skip hint.
const LINES = 5 + ROWS_PER_COLUMN + 2;
const STACKED_LOG_LINES = 5;
const LINE_HEIGHT = 1.22;
const BOOT_MS = 150;
const AFTER_PRINT_MS = 250;
const SELECT_MS = 350;
// The cursor rests a little longer on the password before it is entered.
const FOUND_MS = 650;
const AFTER_WRONG_MS = 250;
const AFTER_MATCH_MS = 750;
const GRANTED_MS = 700;

function Row(props: { left: DumpRow; right: DumpRow; selected: string | null }) {
    const column = (row: DumpRow) => <>
        <span class="hack-address">{row.address}</span>{' '}
        <For each={row.segments}>{segment => segment.kind === 'word'
            ? <span class="hack-word" data-selected={props.selected === segment.word ? 'true' : 'false'}>{segment.text}</span>
            : segment.text}</For>
    </>;
    return <p class="hack-line hack-row">{column(props.left)}{'  '}{column(props.right)}</p>;
}

// A Fallout 3 hack, played out on its own once the visitor logs in: the dump
// prints, two wrong guesses are scored, the password matches and access is granted.
export default function HackIntro(props: Props) {
    const random = seeded_random(props.seed);
    const dump = build_dump(random);
    const guesses = plan_guesses(dump, random);
    const rows = dump.columns[0].map((left, index) => ({ left, right: dump.columns[1][index] as DumpRow }));
    const [attempts, set_attempts] = createSignal(ATTEMPTS);
    const [selected, set_selected] = createSignal<string | null>(null);
    const [log, set_log] = createSignal<string[]>([]);
    // Browsers allow sound only after a key press or tap, so the hack waits for one.
    const [phase, set_phase] = createSignal<'waiting' | 'hacking' | 'granted'>('waiting');
    const [font_px, set_font_px] = createSignal<number | null>(null);
    const [stacked, set_stacked] = createSignal(false);
    const controller = new AbortController();
    let root: HTMLDivElement | undefined;
    let finished = false;

    function finish() {
        if (finished) { return; }
        finished = true;
        controller.abort();
        props.on_done();
    }

    function sleep(ms: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (controller.signal.aborted) { reject(controller.signal.reason); return; }
            const timer = setTimeout(resolve, ms);
            controller.signal.addEventListener('abort', () => { clearTimeout(timer); reject(controller.signal.reason); }, { once: true });
        });
    }

    // The dump is a fixed grid of characters, so the font shrinks until it fits
    // the screen; narrow screens put the log under the dump instead of beside it.
    function fit() {
        const scroller = root?.closest<HTMLElement>('.screen-scroll');
        if (!root || !scroller) { return; }
        const probe = document.createElement('span');
        probe.textContent = 'X'.repeat(100);
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:100px';
        root.append(probe);
        // Layout width, unaffected by the zoom transform on the monitor.
        const char_ratio = probe.offsetWidth / 100 / 100;
        probe.remove();
        const style = getComputedStyle(scroller);
        const base = parseFloat(style.fontSize);
        const width = scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = scroller.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const size = (chars: number, lines: number) => Math.min(base, width / (chars * char_ratio), height / (lines * LINE_HEIGHT));
        const beside = size(DUMP_CHARS + LOG_CHARS, LINES);
        const below = size(DUMP_CHARS, LINES + STACKED_LOG_LINES);
        set_stacked(below > beside);
        set_font_px(Math.floor(Math.max(beside, below) * 10) / 10);
    }

    async function play() {
        flush(() => set_phase('hacking'));
        // Scheduled in the same task that draws the lines, so they start hidden
        // instead of showing whole for a moment before they print.
        const lines = Array.from(root?.querySelectorAll<HTMLElement>('.hack-line') ?? []);
        lines.forEach((line, index) => print_line(line, BOOT_MS + index * REVEAL_LINE_MS));
        await sleep(BOOT_MS + lines.length * REVEAL_LINE_MS + AFTER_PRINT_MS);
        for (const guess of guesses) {
            set_selected(guess.word);
            void audio.play('focus');
            await sleep(guess.correct ? FOUND_MS : SELECT_MS);
            // The password plays the game's successful-hack sound instead of the key press.
            void audio.play(guess.correct ? 'granted' : 'select');
            for (const line of guess_log(guess)) {
                set_log(current => [...current, line]);
                await sleep(REVEAL_LINE_MS);
            }
            if (guess.correct) { break; }
            set_attempts(current => current - 1);
            set_selected(null);
            await sleep(AFTER_WRONG_MS);
        }
        await sleep(AFTER_MATCH_MS);
        flush(() => set_phase('granted'));
        // The same sound that entered the password marks access granted.
        void audio.play('select');
        const line = root?.querySelector<HTMLElement>('.hack-granted');
        if (line) { print_line(line, 0); }
        await sleep(GRANTED_MS);
        finish();
    }

    // At the prompt, a key press or tap logs in and allows sound (Escape, which
    // browsers do not count as permission for sound, skips the intro instead).
    // Afterwards any key or tap skips. Taps are taken on click, the event that
    // permits sound on phones, and stopped so they cannot reach the menu beneath.
    const respond = (event: Event) => {
        if (event instanceof KeyboardEvent && ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) { return; }
        event.preventDefault();
        event.stopPropagation();
        if (phase() !== 'waiting' || (event instanceof KeyboardEvent && event.key === 'Escape')) { finish(); return; }
        void audio.play('select');
        play().catch((error: unknown) => { if (!controller.signal.aborted) { throw error; } });
    };
    window.addEventListener('keydown', respond, { capture: true });
    window.addEventListener('click', respond, { capture: true });
    window.addEventListener('resize', fit);
    onCleanup(() => {
        controller.abort();
        window.removeEventListener('keydown', respond, { capture: true });
        window.removeEventListener('click', respond, { capture: true });
        window.removeEventListener('resize', fit);
    });
    onSettled(() => {
        fit();
        // The first fit may measure a fallback font; measure again once VT323 is in.
        void document.fonts.ready.then(() => { if (!controller.signal.aborted) { fit(); } });
        root?.querySelectorAll<HTMLElement>('.hack-gate').forEach((line, index) => print_line(line, index * REVEAL_LINE_MS));
    });

    return <div ref={root} class="hack" data-stacked={stacked() ? 'true' : 'false'}
        style={{ 'font-size': font_px() === null ? undefined : `${font_px()}px` }} aria-label="Terminal login">
        <Show when={phase() === 'waiting'}>
            <p class="hack-gate">ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL</p>
            <p class="hack-gate hack-blank" aria-hidden="true">{' '}</p>
            <p class="hack-gate">&gt;PRESS ANY KEY OR TAP TO LOG IN<span class="hack-cursor" aria-hidden="true">█</span></p>
        </Show>
        <Show when={phase() === 'granted'}>
            <p class="hack-granted">ACCESS GRANTED</p>
        </Show>
        <Show when={phase() === 'hacking'}>
            <p class="hack-line">ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL</p>
            <p class="hack-line">ENTER PASSWORD NOW</p>
            <p class="hack-line hack-blank" aria-hidden="true">{' '}</p>
            <p class="hack-line">{attempts()} ATTEMPT(S) LEFT:{' ■'.repeat(attempts())}</p>
            <p class="hack-line hack-blank" aria-hidden="true">{' '}</p>
            <div class="hack-body">
                <div class="hack-dump">
                    <For each={rows}>{row => <Row left={row.left} right={row.right} selected={selected()} />}</For>
                </div>
                <div class="hack-log" aria-live="polite">
                    <For each={log()}>{line => <p ref={element => queueMicrotask(() => print_line(element, 0))}>{line}</p>}</For>
                    <p class="hack-prompt">&gt;<span class="hack-cursor" aria-hidden="true">█</span></p>
                </div>
            </div>
            <p class="hack-line hack-skip">[ANY KEY OR TAP TO SKIP]</p>
        </Show>
    </div>;
}
