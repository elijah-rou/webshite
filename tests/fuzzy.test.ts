import assert from 'node:assert/strict';
import test from 'node:test';
import { fuzzy_filter, subsequence_score, type Searchable } from '../src/scripts/fuzzy.ts';

const posts: Searchable[] = [
    { fields: ['A fixed-size ring buffer', '2026-10-08', 'Placeholder post'], body: 'modulo arithmetic and garbage collection' },
    { fields: ['Notes on Zig allocators', '2025-03-14', 'Arenas and pools'], body: 'ring of buffers' },
    { fields: ['Tuning a Les Paul', '2026-01-02', 'Guitar setup'], body: 'intonation' },
];

test('terms match in order but not necessarily adjacent', () => {
    assert.ok(subsequence_score('a fixed-size ring buffer', 'rbuf') > 0);
    assert.equal(subsequence_score('a fixed-size ring buffer', 'fubr'), 0);
});

test('contiguous and word-start matches outrank scattered ones', () => {
    assert.ok(subsequence_score('ring buffer', 'buf') > subsequence_score('about futures', 'buf'));
});

test('titles outrank bodies, and dates match by prefix or fuzzily', () => {
    assert.deepEqual(fuzzy_filter(posts, 'ring'), [0, 1]);
    assert.deepEqual(fuzzy_filter(posts, '2026-10'), [0]);
    assert.deepEqual(fuzzy_filter(posts, '2026'), [0, 2]);
});

test('every term must match somewhere', () => {
    assert.deepEqual(fuzzy_filter(posts, 'ring zig'), [1]);
    assert.deepEqual(fuzzy_filter(posts, 'garbage'), [0]);
    assert.deepEqual(fuzzy_filter(posts, 'qqq'), []);
});

test('an empty or blank query keeps every entry in order', () => {
    assert.deepEqual(fuzzy_filter(posts, ''), [0, 1, 2]);
    assert.deepEqual(fuzzy_filter(posts, '   '), [0, 1, 2]);
});

test('bodies match only exact substrings, not scattered letters', () => {
    assert.deepEqual(fuzzy_filter(posts, 'modar'), []);
});
