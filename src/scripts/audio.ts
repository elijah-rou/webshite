import { jack_samples, terminal_samples, type JackSound, type TerminalSound } from './synthesis';

type Sound = TerminalSound | JackSound;
const VOICES_MAX = 8;
const paths = {
    focus: '/audio/ui_hacking_charscroll.wav',
    select: '/audio/ui_hacking_charenter_01.wav',
} as const;

export function create_audio_player(enabled: () => boolean, unavailable: () => void) {
    let context: AudioContext | undefined;
    let output: GainNode | undefined;
    let failed = false;
    let epoch = 0;
    let last_focus_ms = 0;
    const sources = new Set<AudioBufferSourceNode>();
    const buffers = new Map<Sound, AudioBuffer>();
    const decoding = new Map<Sound, Promise<void>>();

    async function get_context(): Promise<AudioContext | undefined> {
        if (!enabled() || failed) { return; }
        try {
            if (!context) {
                context = new AudioContext({ latencyHint: 'interactive' });
                output = context.createGain();
                output.gain.value = 0.65;
                output.connect(context.destination);
            }
            if (context.state === 'suspended') { await context.resume(); }
            return context.state === 'running' ? context : undefined;
        } catch {
            failed = true;
            unavailable();
            return;
        }
    }

    async function decode_original(audio: AudioContext, kind: 'focus' | 'select') {
        try {
            const response = await fetch(paths[kind], {
                cache: 'force-cache', signal: AbortSignal.timeout(4000),
            });
            if (!response.ok) { return; }
            const bytes = await response.arrayBuffer();
            buffers.set(kind, await audio.decodeAudioData(bytes));
        } catch {
            // A missing or undecodable WAV falls back to the local synthesizer.
        }
    }

    function play_buffer(audio: AudioContext, kind: Sound) {
        if (!enabled() || !output || sources.size >= VOICES_MAX) { return; }
        let buffer = buffers.get(kind);
        if (!buffer) {
            const samples = kind === 'plug' || kind === 'unplug' ? jack_samples(kind, audio.sampleRate)
                : terminal_samples(kind, audio.sampleRate);
            buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
            buffer.getChannelData(0).set(samples);
            buffers.set(kind, buffer);
        }
        const source = audio.createBufferSource();
        source.buffer = buffer;
        source.connect(output);
        sources.add(source);
        source.onended = () => { source.disconnect(); sources.delete(source); };
        source.start();
    }

    async function play(kind: Sound) {
        const started_epoch = epoch;
        const audio = await get_context();
        if (!audio) { return; }
        if ((kind === 'focus' || kind === 'select') && !buffers.has(kind)) {
            let pending = decoding.get(kind);
            if (!pending) {
                pending = decode_original(audio, kind);
                decoding.set(kind, pending);
            }
            await pending;
        }
        if (started_epoch === epoch && audio.state === 'running') {
            play_buffer(audio, kind);
        }
    }

    function stop() {
        epoch++;
        for (const source of sources) { source.stop(); source.disconnect(); }
        sources.clear();
    }

    function focus() {
        // Hover alone must never unlock audio.
        if (context?.state !== 'running' || performance.now() - last_focus_ms < 90) { return; }
        last_focus_ms = performance.now();
        void play('focus');
    }

    return { play, stop, focus };
}
