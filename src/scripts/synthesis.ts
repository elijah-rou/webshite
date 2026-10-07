export type TerminalSound = 'focus' | 'select' | 'connect';

export function terminal_samples(kind: TerminalSound, sample_rate: number): Float32Array {
    if (!Number.isInteger(sample_rate) || sample_rate < 8000 || sample_rate > 192000) {
        throw new RangeError('Unsupported audio sample rate');
    }
    const duration = kind === 'focus' ? 0.025 : kind === 'select' ? 0.095 : 0.16;
    const samples = new Float32Array(Math.ceil(sample_rate * duration));
    let seed = 719;
    for (let index = 0; index < samples.length; index++) {
        const time = index / sample_rate;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const noise = (seed / 4294967296) * 2 - 1;
        const frequency = kind === 'focus' ? 1450 : kind === 'select' ? 820 : 180;
        const release = Math.min((samples.length - index - 1) / (sample_rate * 0.006), 1);
        const envelope = Math.min(time / 0.002, 1) * Math.exp(-time * 55) * release;
        const tone = Math.sin(2 * Math.PI * frequency * time);
        samples[index] = (noise * 0.045 + tone * 0.09) * envelope;
    }
    return samples;
}

export function guitar_samples(sample_rate: number): Float32Array {
    if (!Number.isInteger(sample_rate) || sample_rate < 8000 || sample_rate > 192000) {
        throw new RangeError('Unsupported audio sample rate');
    }
    const duration = 2.8;
    const output = new Float32Array(Math.ceil(sample_rate * duration));
    const frequencies = [82.4069, 123.4708, 164.8138, 207.6523, 246.9417, 329.6276];
    let seed = 1107;
    for (let string_index = 0; string_index < frequencies.length; string_index++) {
        const frequency = frequencies[string_index];
        if (frequency === undefined) { throw new Error('Missing guitar frequency'); }
        const delay = Math.round(sample_rate / frequency);
        const ring = new Float32Array(delay);
        for (let index = 0; index < delay; index++) {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            ring[index] = ((seed / 4294967296) * 2 - 1) * 0.19;
        }
        const offset = Math.round(string_index * 0.019 * sample_rate);
        for (let index = offset; index < output.length; index++) {
            const position = (index - offset) % delay;
            const value = ring[position] ?? 0;
            const next = ring[(position + 1) % delay] ?? 0;
            ring[position] = (value + next) * 0.4975;
            const attack = Math.min((index - offset) / (sample_rate * 0.004), 1);
            const release = Math.min((output.length - index) / (sample_rate * 0.15), 1);
            output[index] = (output[index] ?? 0) + value * attack * release;
        }
    }
    return output;
}
