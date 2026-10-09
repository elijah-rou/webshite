// The first-visit intro replays a Fallout 3 terminal hack: a memory dump hiding
// candidate passwords, two wrong guesses scored by likeness, then the password.
// Everything here is pure and seeded, so the layout and guesses are testable.

export const PASSWORD = 'ROUSSOS';
export const DECOYS = ['CLUSTER', 'CONSOLE', 'GATEWAY', 'KERNELS', 'PROCESS', 'RUNTIME', 'SIGNALS', 'VECTORS'] as const;
export const ROWS_PER_COLUMN = 12;
export const ROW_WIDTH = 12;
export const ATTEMPTS = 4;
const WRONG_GUESSES = 2;
const WORDS_SHOWN = 8;
const GARBAGE = '!"#$%&\'()*+,-./:;<=>?@[\\]^_{|}';
const ADDRESS_STEP = ROW_WIDTH;

export type Random = () => number;

// mulberry32: small, fast and good enough for shuffling a screen of characters.
export function seeded_random(seed: number): Random {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(items: readonly T[], random: Random): T {
    const item = items[Math.floor(random() * items.length)];
    if (item === undefined) { throw new Error('Cannot pick from an empty list'); }
    return item;
}

function shuffled<T>(items: readonly T[], random: Random): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other] as T, result[index] as T];
    }
    return result;
}

// Fallout's score: letters that match in the same position.
export function likeness(guess: string, password: string): number {
    if (guess.length !== password.length) { throw new Error(`${guess} and ${password} differ in length`); }
    let count = 0;
    for (let index = 0; index < guess.length; index += 1) { if (guess[index] === password[index]) { count += 1; } }
    return count;
}

export type Segment = { kind: 'garbage'; text: string } | { kind: 'word'; text: string };
export interface DumpRow { address: string; segments: Segment[] }
export interface Dump { columns: [DumpRow[], DumpRow[]]; words: string[] }

// Two columns of ROWS_PER_COLUMN rows, each ROW_WIDTH characters of garbage with
// at most one word, so a word never wraps between rows.
export function build_dump(random: Random): Dump {
    const words = shuffled([PASSWORD, ...shuffled(DECOYS, random).slice(0, WORDS_SHOWN - 1)], random);
    const total_rows = ROWS_PER_COLUMN * 2;
    const word_rows = shuffled([...Array(total_rows).keys()], random).slice(0, words.length);
    const start = 0xf000 + Math.floor(random() * 0x80) * ADDRESS_STEP;
    const rows: DumpRow[] = [];
    for (let row = 0; row < total_rows; row += 1) {
        const address = `0x${(start + row * ADDRESS_STEP).toString(16).toUpperCase().padStart(4, '0')}`;
        const garbage = (length: number) => Array.from({ length }, () => pick([...GARBAGE], random)).join('');
        const word_index = word_rows.indexOf(row);
        const word = words[word_index];
        if (word === undefined) {
            rows.push({ address, segments: [{ kind: 'garbage', text: garbage(ROW_WIDTH) }] });
            continue;
        }
        const offset = Math.floor(random() * (ROW_WIDTH - word.length + 1));
        rows.push({ address, segments: [
            { kind: 'garbage', text: garbage(offset) },
            { kind: 'word', text: word },
            { kind: 'garbage', text: garbage(ROW_WIDTH - word.length - offset) },
        ] });
    }
    return { columns: [rows.slice(0, ROWS_PER_COLUMN), rows.slice(ROWS_PER_COLUMN)], words };
}

export interface Guess { word: string; likeness: number; correct: boolean }

// Two distinct wrong words from the dump, then the password.
export function plan_guesses(words: readonly string[], random: Random): Guess[] {
    if (!words.includes(PASSWORD)) { throw new Error('The dump must contain the password'); }
    const wrong = shuffled(words.filter(word => word !== PASSWORD), random).slice(0, WRONG_GUESSES);
    if (wrong.length !== WRONG_GUESSES) { throw new Error(`Need ${WRONG_GUESSES} decoys in the dump`); }
    return [
        ...wrong.map(word => ({ word, likeness: likeness(word, PASSWORD), correct: false })),
        { word: PASSWORD, likeness: PASSWORD.length, correct: true },
    ];
}

// The lines a guess adds to the log on the right, as Fallout 3 prints them.
export function guess_log(guess: Guess): string[] {
    if (guess.correct) { return [`>${guess.word}`, '>Exact match!', '>Please wait', '>while system', '>is accessed.']; }
    return [`>${guess.word}`, '>Entry denied.', `>${guess.likeness}/${PASSWORD.length} correct.`];
}
