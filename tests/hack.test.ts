import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ATTEMPTS, build_dump, DECOYS, guess_log, likeness, PASSWORD, plan_guesses, ROW_WIDTH, ROWS_PER_COLUMN, seeded_random,
} from '../src/scripts/hack.ts';

test('likeness counts letters in the same position', () => {
    assert.equal(likeness('CONSOLE', PASSWORD), 2);
    assert.equal(likeness('GATEWAY', PASSWORD), 0);
    assert.equal(likeness(PASSWORD, PASSWORD), 7);
    assert.throws(() => likeness('SHORT', PASSWORD));
});

test('every decoy has the password length and is not the password', () => {
    for (const word of DECOYS) {
        assert.equal(word.length, PASSWORD.length);
        assert.ok(likeness(word, PASSWORD) < PASSWORD.length);
    }
});

test('the dump fills two columns of fixed-width rows and hides each word once', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
        const dump = build_dump(seeded_random(seed));
        assert.ok(dump.words.includes(PASSWORD));
        assert.equal(new Set(dump.words).size, dump.words.length);
        const rows = [...dump.columns[0], ...dump.columns[1]];
        assert.equal(dump.columns[0].length, ROWS_PER_COLUMN);
        assert.equal(dump.columns[1].length, ROWS_PER_COLUMN);
        for (const row of rows) {
            assert.match(row.address, /^0x[0-9A-F]{4}$/);
            assert.equal(row.segments.map(segment => segment.text).join('').length, ROW_WIDTH);
        }
        const shown = rows.flatMap(row => row.segments.filter(segment => segment.kind === 'word').map(segment => segment.text));
        assert.deepEqual([...shown].sort(), [...dump.words].sort());
        const garbage = rows.flatMap(row => row.segments.filter(segment => segment.kind === 'garbage')).map(segment => segment.text).join('');
        assert.doesNotMatch(garbage, /[A-Z0-9]/);
    }
});

test('the same seed gives the same screen', () => {
    assert.deepEqual(build_dump(seeded_random(7)), build_dump(seeded_random(7)));
});

test('two wrong guesses from the dump, then the password, within the attempts', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
        const random = seeded_random(seed);
        const dump = build_dump(random);
        const guesses = plan_guesses(dump.words, random);
        assert.ok(guesses.length <= ATTEMPTS);
        assert.deepEqual(guesses.map(guess => guess.correct), [false, false, true]);
        assert.equal(guesses.at(-1)?.word, PASSWORD);
        assert.notEqual(guesses[0]?.word, guesses[1]?.word);
        for (const guess of guesses) {
            assert.ok(dump.words.includes(guess.word));
            assert.equal(guess.likeness, likeness(guess.word, PASSWORD));
        }
    }
});

test('the log reads like Fallout 3', () => {
    assert.deepEqual(guess_log({ word: 'CONSOLE', likeness: 2, correct: false }), ['>CONSOLE', '>Entry denied.', '>2/7 correct.']);
    assert.deepEqual(guess_log({ word: PASSWORD, likeness: 7, correct: true }).slice(0, 2), ['>ROUSSOS', '>Exact match!']);
});
