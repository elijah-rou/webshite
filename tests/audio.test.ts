import assert from 'node:assert/strict';
import test from 'node:test';
import { jack_samples, terminal_samples } from '../src/scripts/synthesis.ts';

test('sounds produce finite, audible waveforms without clipping at supported device rates', () => {
    for (const sample_rate of [8000, 44100, 48000, 192000]) {
        const waveforms = [
            terminal_samples('focus', sample_rate), terminal_samples('select', sample_rate),
            jack_samples('plug', sample_rate), jack_samples('unplug', sample_rate),
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

test('the plug-in buzz fades out after the initial thump', () => {
    const sample_rate = 48000;
    const samples = jack_samples('plug', sample_rate);
    const rms = (from_s: number, to_s: number) => {
        let sum = 0;
        const start = Math.round(from_s * sample_rate);
        const end = Math.round(to_s * sample_rate);
        for (let index = start; index < end; index++) { sum += (samples[index] ?? 0) ** 2; }
        return Math.sqrt(sum / (end - start));
    };
    assert.ok(rms(0.08, 0.3) > rms(1.1, 1.4) * 3, 'Buzz must decay');
    assert.ok(rms(1.1, 1.4) > 0.005, 'Buzz must remain audible as it settles');
});

test('synthesis rejects invalid device sample rates', () => {
    for (const invalid of [0, 7999, 192001, NaN, Infinity, 44100.5]) {
        assert.throws(() => terminal_samples('select', invalid), RangeError);
        assert.throws(() => jack_samples('plug', invalid), RangeError);
    }
});
