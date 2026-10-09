import { terminal_samples, type TerminalSound } from './synthesis';
const VOICES_MAX = 8;
const paths: Record<TerminalSound, string> = {
    focus: '/audio/ui_hacking_charscroll.wav',
    select: '/audio/ui_hacking_charenter_01.wav',
    granted: '/audio/ui_hacking_passgood.wav',
};

export function create_audio_player(enabled: () => boolean, unavailable: () => void) {
    let context: AudioContext | undefined;
    let output: GainNode | undefined;
    let failed = false;
    let epoch = 0;
    let last_focus_ms = 0;
    const sources = new Set<AudioBufferSourceNode>();
    const buffers = new Map<TerminalSound, AudioBuffer>();
    const decoding = new Map<TerminalSound, Promise<void>>();

    // Building a context takes about 110 ms of the main thread.
    function create_context(): AudioContext {
        if (context) { return context; }
        context = new AudioContext({ latencyHint: 'interactive' });
        output = context.createGain();
        output.gain.value = 0.65;
        output.connect(context.destination);
        return context;
    }

    async function get_context(): Promise<AudioContext | undefined> {
        if (!enabled() || failed) { return; }
        try {
            const audio = create_context();
            // Resumed synchronously, within the key press or tap that allows sound.
            // Safari can also report 'interrupted'.
            if (audio.state !== 'running') { await audio.resume(); }
            return audio.state === 'running' ? audio : undefined;
        } catch {
            failed = true;
            unavailable();
            return;
        }
    }

    async function decode_original(audio: AudioContext, kind: TerminalSound) {
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

    function play_buffer(audio: AudioContext, kind: TerminalSound) {
        if (!enabled() || !output || sources.size >= VOICES_MAX) { return; }
        let buffer = buffers.get(kind);
        if (!buffer) {
            const samples = terminal_samples(kind, audio.sampleRate);
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

    async function play(kind: TerminalSound) {
        const started_epoch = epoch;
        const audio = await get_context();
        if (!audio) { return; }
        if (!buffers.has(kind)) {
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

    // Browsers allow sound only from a key press or tap; call this from one.
    function unlock() { void get_context(); }

    // Builds the context ahead of the first key press or tap, which then only has
    // to resume it. Browsers keep it suspended until then, so nothing can sound.
    function prepare() {
        if (!enabled() || failed) { return; }
        try { create_context(); } catch { failed = true; unavailable(); }
    }

    function running(): boolean { return context?.state === 'running'; }

    return { play, stop, focus, unlock, prepare, running };
}
