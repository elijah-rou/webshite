import { guitar_samples, terminal_samples, type TerminalSound } from './synthesis';

type Preference = 'sound' | 'effects';
const preferences: Record<Preference, boolean> = {
    sound: read_preference('sound'), effects: read_preference('effects'),
};
let audio: AudioContext | undefined;
let output: GainNode | undefined;
let audio_unavailable = false;
let connected = false;
let last_focus_ms = 0;
const active_sources = new Set<AudioBufferSourceNode>();
const buffers = new Map<string, AudioBuffer>();
const VOICES_MAX = 8;
let sound_epoch = 0;
const original_sounds = {
    focus: '/audio/ui_hacking_charscroll.wav',
    select: '/audio/ui_hacking_charenter_01.wav',
} as const;
const original_bytes = new Map<TerminalSound, Promise<ArrayBuffer | undefined>>();
const decoding = new Map<TerminalSound, Promise<void>>();
for (const [kind, path] of Object.entries(original_sounds)) {
    original_bytes.set(kind as TerminalSound, fetch(path, { cache: 'force-cache' })
        .then(response => response.ok ? response.arrayBuffer() : undefined)
        .catch(() => undefined));
}

function read_preference(key: Preference): boolean {
    try { return localStorage.getItem(`terminal-${key}`) !== 'off'; }
    catch { return true; }
}

function save_preference(key: Preference): void {
    try { localStorage.setItem(`terminal-${key}`, preferences[key] ? 'on' : 'off'); }
    catch { /* Private browsing may disallow storage; the current session still works. */ }
}

async function audio_context(): Promise<AudioContext | undefined> {
    if (!preferences.sound || audio_unavailable) { return undefined; }
    try {
        if (!audio) {
            audio = new AudioContext({ latencyHint: 'interactive' });
            output = audio.createGain();
            output.gain.value = 0.65;
            output.connect(audio.destination);
        }
        if (audio.state === 'suspended') { await audio.resume(); }
        return audio.state === 'running' ? audio : undefined;
    } catch {
        audio_unavailable = true;
        sync_controls();
        return undefined;
    }
}

function play_buffer(context: AudioContext, key: TerminalSound | 'guitar'): void {
    if (!preferences.sound || !output || active_sources.size >= VOICES_MAX) { return; }
    let buffer = buffers.get(key);
    if (!buffer) {
        const samples = key === 'guitar' ? guitar_samples(context.sampleRate)
            : terminal_samples(key, context.sampleRate);
        buffer = context.createBuffer(1, samples.length, context.sampleRate);
        buffer.getChannelData(0).set(samples);
        buffers.set(key, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(output);
    active_sources.add(source);
    source.onended = () => { source.disconnect(); active_sources.delete(source); };
    source.start();
}

async function play_sound(key: TerminalSound | 'guitar'): Promise<void> {
    const epoch = sound_epoch;
    const context = await audio_context();
    if (!context) { return; }
    if (key !== 'guitar' && original_bytes.has(key) && !buffers.has(key)) {
        let pending = decoding.get(key);
        if (!pending) {
            pending = decode_original(context, key);
            decoding.set(key, pending);
        }
        await pending;
    }
    if (epoch === sound_epoch && context.state === 'running') { play_buffer(context, key); }
}

async function decode_original(context: AudioContext, key: TerminalSound): Promise<void> {
    const bytes = await original_bytes.get(key);
    if (!bytes) { return; }
    try { buffers.set(key, await context.decodeAudioData(bytes)); }
    catch { /* The synthesizer remains available if the browser cannot decode the WAV. */ }
}

function stop_sounds(): void {
    sound_epoch++;
    for (const source of active_sources) { source.stop(); source.disconnect(); }
    active_sources.clear();
}

function sync_controls(): void {
    const sound_button = document.querySelector<HTMLButtonElement>('[data-action="sound"]');
    const effects_button = document.querySelector<HTMLButtonElement>('[data-action="effects"]');
    if (!sound_button || !effects_button) { throw new Error('Terminal controls are missing'); }
    sound_button.textContent = audio_unavailable ? 'AUDIO UNAVAILABLE'
        : preferences.sound ? 'SOUND ON' : 'SOUND OFF';
    sound_button.setAttribute('aria-pressed', String(preferences.sound && !audio_unavailable));
    effects_button.textContent = preferences.effects ? 'CRT ON' : 'CRT OFF';
    effects_button.setAttribute('aria-pressed', String(preferences.effects));
    document.documentElement.dataset.effects = preferences.effects ? 'on' : 'off';
    const sound_hint = document.querySelector('[data-sound-hint]');
    if (sound_hint) {
        sound_hint.textContent = audio_unavailable ? 'Audio is unavailable in this browser.'
            : preferences.sound ? 'A synthesized preview. Your recordings come next.'
            : 'Sound is muted. Turn SOUND ON to hear the guitar.';
    }
}

function sync_guitar(): void {
    const display = document.querySelector<HTMLElement>('[data-guitar-display]');
    const plug = document.querySelector<HTMLButtonElement>('[data-action="plug"]');
    const strum = document.querySelector<HTMLButtonElement>('[data-action="strum"]');
    const status = document.querySelector<HTMLElement>('[data-connection-status]');
    if (!display || !plug || !strum || !status) { return; }
    display.dataset.connected = String(connected);
    plug.setAttribute('aria-pressed', String(connected));
    plug.innerHTML = connected ? '[ UNPLUG GUITAR ] ↙' : '[ PLUG IN GUITAR ] ↗';
    strum.disabled = !connected;
    status.classList.toggle('is-connected', connected);
    status.innerHTML = `<span class="status-dot"></span>${connected ? 'INPUT CONNECTED / E STANDARD' : 'INPUT DISCONNECTED'}`;
}

function handle_action(action: string): void {
    switch (action) {
        case 'sound':
            preferences.sound = !preferences.sound;
            save_preference('sound');
            sync_controls();
            if (preferences.sound) { void play_sound('select'); } else { stop_sounds(); }
            return;
        case 'effects':
            preferences.effects = !preferences.effects;
            save_preference('effects');
            sync_controls();
            void play_sound('select');
            return;
        case 'plug':
            connected = !connected;
            sync_guitar();
            stop_sounds();
            void play_sound(connected ? 'guitar' : 'connect');
            return;
        case 'strum':
            if (connected) { stop_sounds(); void play_sound('guitar'); }
            return;
        default: throw new Error(`Unknown terminal action: ${action}`);
    }
}

document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a, button') : null;
    if (!target || target instanceof HTMLButtonElement && target.disabled) { return; }
    const action = target.getAttribute('data-action');
    if (action) { handle_action(action); return; }
    if (target instanceof HTMLAnchorElement && !target.classList.contains('skip-link')) {
        void play_sound('select');
    }
});

function handle_focus(target: EventTarget | null): void {
    if (!(target instanceof Element) || !target.closest('a, button')) { return; }
    if (!audio || audio.state !== 'running' || performance.now() - last_focus_ms < 90) { return; }
    last_focus_ms = performance.now();
    void play_sound('focus');
}

document.addEventListener('pointerover', event => {
    if (event.pointerType === 'mouse') { handle_focus(event.target); }
});
document.addEventListener('focusin', event => { handle_focus(event.target); });
document.addEventListener('astro:page-load', () => { sync_controls(); sync_guitar(); });
document.addEventListener('astro:before-swap', event => {
    // Rapid navigation may cancel the animation after the new document has loaded.
    // Astro owns the swap; handle the animation's separate ready promise as well.
    void event.viewTransition.ready.catch((error: unknown) => {
        if (error instanceof DOMException) {
            if (error.name === 'AbortError') { return; }
            if (error.name === 'InvalidStateError' && error.message.startsWith('Transition was aborted')) {
                return;
            }
        }
        throw error;
    });
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop_sounds(); }
});
