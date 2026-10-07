export type TerminalSound = 'focus' | 'select';

function check_sample_rate(sample_rate: number) {
    if (!Number.isInteger(sample_rate) || sample_rate < 8000 || sample_rate > 192000) {
        throw new RangeError('Unsupported audio sample rate');
    }
}

function noise_source(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return (state / 4294967296) * 2 - 1;
    };
}

export function terminal_samples(kind: TerminalSound, sample_rate: number): Float32Array {
    check_sample_rate(sample_rate);
    const duration = kind === 'focus' ? 0.025 : 0.095;
    const frequency = kind === 'focus' ? 1450 : 820;
    const samples = new Float32Array(Math.ceil(sample_rate * duration));
    const noise = noise_source(719);
    for (let index = 0; index < samples.length; index++) {
        const time = index / sample_rate;
        const release = Math.min((samples.length - index - 1) / (sample_rate * 0.006), 1);
        const envelope = Math.min(time / 0.002, 1) * Math.exp(-time * 55) * release;
        const tone = Math.sin(2 * Math.PI * frequency * time);
        samples[index] = (noise() * 0.045 + tone * 0.09) * envelope;
    }
    return samples;
}
