import { createSignal, flush } from 'solid-js';
import { create_audio_player } from './audio';

type Preference = 'sound' | 'effects';

function read_preference(key: Preference): boolean {
    try { return localStorage.getItem(`terminal-${key}`) !== 'off'; }
    catch { return true; }
}

function save_preference(key: Preference, enabled: boolean) {
    try { localStorage.setItem(`terminal-${key}`, enabled ? 'on' : 'off'); }
    catch { /* The current session still works when storage is unavailable. */ }
}

export const [sound, set_sound] = createSignal(read_preference('sound'));
export const [effects, set_effects] = createSignal(read_preference('effects'));
export const [connected, set_connected] = createSignal(false);
export const [audio_unavailable, set_audio_unavailable] = createSignal(false);
export const audio = create_audio_player(sound, () => set_audio_unavailable(true));

export function toggle_sound() {
    const enabled = !sound();
    flush(() => set_sound(enabled));
    save_preference('sound', enabled);
    if (enabled) { void audio.play('select'); } else { audio.stop(); }
}

export function toggle_effects() {
    const enabled = !effects();
    set_effects(enabled);
    save_preference('effects', enabled);
    void audio.play('select');
}

export function toggle_guitar() {
    const plugged = !connected();
    set_connected(plugged);
    audio.stop();
    void audio.play(plugged ? 'guitar' : 'connect');
}

export function strum() {
    if (!connected()) { return; }
    audio.stop();
    void audio.play('guitar');
}
