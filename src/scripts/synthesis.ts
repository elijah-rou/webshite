export type TerminalSound = 'focus' | 'select';
export type JackSound = 'plug' | 'unplug';

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

const MAINS_HZ = 50;
const BUZZ_HARMONICS = 15;
const JACK_PEAK = 0.8;

// A guitar lead meeting a live amp input: contact crackle while the tip scrapes
// the jack's springs, a thump as the circuit closes, then mains buzz that fades.
export function jack_samples(kind: JackSound, sample_rate: number): Float32Array {
    check_sample_rate(sample_rate);
    const plug = kind === 'plug';
    const samples = new Float32Array(Math.ceil(sample_rate * (plug ? 1.6 : 0.7)));
    const noise = noise_source(plug ? 4021 : 977);
    const thump_at = plug ? 0.07 : 0.035;
    const buzz_level = plug ? 0.7 : 1;
    const buzz_decay = plug ? 2.6 : 9;
    const crackle_decay = Math.exp(-1 / (sample_rate * 0.0015));
    let crackle = 0;
    for (let index = 0; index < samples.length; index++) {
        const time = index / sample_rate;
        if (time < thump_at + 0.03 && noise() > 0.985) { crackle = noise() * 0.6; }
        crackle *= crackle_decay;
        let value = crackle;
        if (time >= thump_at) {
            const elapsed = time - thump_at;
            // The thump's pitch falls from 85 Hz to 45 Hz as it decays.
            const phase = 2 * Math.PI * (45 * elapsed + (40 / 30) * (1 - Math.exp(-30 * elapsed)));
            value += Math.sin(phase) * Math.exp(-elapsed * 22) * Math.min(elapsed / 0.001, 1);
            let buzz = 0;
            for (let harmonic = 1; harmonic <= BUZZ_HARMONICS; harmonic++) {
                if (MAINS_HZ * harmonic >= sample_rate / 2) { break; }
                const weight = (harmonic % 2 === 1 ? 1 : 0.45) / harmonic;
                buzz += Math.sin(2 * Math.PI * MAINS_HZ * harmonic * elapsed) * weight;
            }
            value += buzz * buzz_level * Math.exp(-elapsed * buzz_decay) * Math.min(elapsed / 0.01, 1);
        }
        const release = Math.min((samples.length - index - 1) / (sample_rate * 0.05), 1);
        samples[index] = value * release;
    }
    let peak = 0;
    for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); }
    if (peak === 0) { throw new Error('Jack synthesis produced silence'); }
    const gain = JACK_PEAK / peak;
    for (let index = 0; index < samples.length; index++) { samples[index] = (samples[index] ?? 0) * gain; }
    return samples;
}
