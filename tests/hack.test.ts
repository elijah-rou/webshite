import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ATTEMPTS, build_dump, guess_log, likeness, plan_guesses, ROW_WIDTH, ROWS_PER_COLUMN, seeded_random, WORDS,
} from '../src/scripts/hack.ts';

const SEEDS = Array.from({ length: 200 }, (_, index) => index + 1);

test('likeness counts letters in the same position', () => {
    assert.equal(likeness('ABCD', 'ABXD'), 3);
    assert.equal(likeness('ABCD', 'WXYZ'), 0);
    assert.equal(likeness('ADMINISTRATION', 'ADMINISTRATION'), 14);
    assert.throws(() => likeness('SHORT', 'ADMINISTRATION'));
});

test('the words are distinct, Very Hard length, and all the same length', () => {
    assert.equal(new Set(WORDS).size, WORDS.length);
    const length = WORDS[0].length;
    assert.ok(length >= 13 && length <= 15);
    for (const word of WORDS) { assert.equal(word.length, length, word); }
});

test('the dump fills two columns of fixed-width rows and hides each word once', () => {
    for (const seed of SEEDS) {
        const dump = build_dump(seeded_random(seed));
        assert.ok(dump.words.includes(dump.password));
        assert.equal(new Set(dump.words).size, dump.words.length);
        const rows = [...dump.columns[0], ...dump.columns[1]];
        assert.equal(dump.columns[0].length, ROWS_PER_COLUMN);
        assert.equal(dump.columns[1].length, ROWS_PER_COLUMN);
        for (const row of rows) {
            assert.match(row.address, /^0x[0-9A-F]{4}$/);
            assert.equal(row.segments.map(segment => segment.text).join('').length, ROW_WIDTH);
        }
        // Read as one stream, the word pieces spell each word exactly once, in order.
        const pieces = rows.flatMap(row => row.segments);
        const spelled: string[] = [];
        pieces.forEach((piece, index) => {
            if (piece.kind !== 'word') { return; }
            assert.ok(piece.word.includes(piece.text));
            if (pieces[index - 1]?.kind === 'word') { spelled[spelled.length - 1] += piece.text; } else { spelled.push(piece.text); }
        });
        assert.deepEqual(spelled, dump.words);
        const garbage = pieces.filter(segment => segment.kind === 'garbage').map(segment => segment.text).join('');
        assert.doesNotMatch(garbage, /[A-Z0-9]/);
    }
});

test('the same seed gives the same run; different seeds vary the password and the dump', () => {
    assert.deepEqual(build_dump(seeded_random(7)), build_dump(seeded_random(7)));
    const dumps = SEEDS.map(seed => build_dump(seeded_random(seed)));
    assert.ok(new Set(dumps.map(dump => dump.password)).size >= WORDS.length - 2, 'most words should serve as the password');
    const layouts = new Set(dumps.map(dump => dump.columns.flat().map(row => row.segments.map(segment => segment.text).join('')).join('')));
    assert.equal(layouts.size, dumps.length);
});

test('every run guesses wrong, wrong, then the password, within the attempts', () => {
    for (const seed of SEEDS) {
        const random = seeded_random(seed);
        const dump = build_dump(random);
        const guesses = plan_guesses(dump, random);
        assert.ok(guesses.length <= ATTEMPTS);
        assert.deepEqual(guesses.map(guess => guess.correct), [false, false, true]);
        assert.equal(guesses.at(-1)?.word, dump.password);
        assert.notEqual(guesses[0]?.word, guesses[1]?.word);
        for (const guess of guesses) {
            assert.ok(dump.words.includes(guess.word));
            assert.equal(guess.likeness, likeness(guess.word, dump.password));
        }
    }
});

test('the log reads like Fallout 3', () => {
    assert.deepEqual(guess_log({ word: 'CONSIDERATIONS', likeness: 3, correct: false }), ['>CONSIDERATIONS', '>Entry denied.', '>3/14 correct.']);
    assert.deepEqual(guess_log({ word: 'ADMINISTRATION', likeness: 14, correct: true }).slice(0, 2), ['>ADMINISTRATION', '>Exact match!']);
});
