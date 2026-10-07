import assert from 'node:assert/strict';
import test from 'node:test';
import { guitar_samples, terminal_samples } from '../src/scripts/synthesis.ts';

test('sounds produce finite, audible waveforms without clipping at supported device rates', () => {
    for (const sample_rate of [8000, 44100, 48000, 192000]) {
        const waveforms = [
            terminal_samples('focus', sample_rate), terminal_samples('select', sample_rate),
            terminal_samples('connect', sample_rate), guitar_samples(sample_rate),
        ];
        for (const samples of waveforms) {
            let peak = 0;
            for (const sample of samples) {
                assert.ok(Number.isFinite(sample));
                peak = Math.max(peak, Math.abs(sample));
            }
            assert.ok(peak > 0.02, 'Audio must contain an audible signal');
            assert.ok(peak < 1, 'Audio must not clip');
            assert.ok(samples.length <= sample_rate * 3, 'Audio must be bounded');
            assert.ok(Math.abs(samples.at(-1) ?? 1) < 0.002, 'Release must avoid a click');
        }
    }
});

test('synthesis rejects invalid device sample rates', () => {
    for (const invalid of [0, 7999, 192001, NaN, Infinity, 44100.5]) {
        assert.throws(() => terminal_samples('select', invalid), RangeError);
        assert.throws(() => guitar_samples(invalid), RangeError);
    }
});
