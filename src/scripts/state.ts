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

export interface Track { href: string; title: string }

export const [sound, set_sound] = createSignal(read_preference('sound'));
export const [effects, set_effects] = createSignal(read_preference('effects'));
export const [audio_unavailable, set_audio_unavailable] = createSignal(false);
export const [track, set_track] = createSignal<Track | null>(null);
export const [track_error, set_track_error] = createSignal<string | null>(null);
export const audio = create_audio_player(sound, () => set_audio_unavailable(true));

// Recordings stream through a media element; effects use the Web Audio player.
let music: HTMLAudioElement | undefined;

export function toggle_sound() {
    const enabled = !sound();
    flush(() => set_sound(enabled));
    save_preference('sound', enabled);
    if (enabled) { void audio.play('select'); } else { audio.stop(); stop_track(); }
}

export function toggle_effects() {
    const enabled = !effects();
    set_effects(enabled);
    save_preference('effects', enabled);
    void audio.play('select');
}

export function stop_track() {
    const element = music;
    music = undefined;
    set_track(null);
    if (!element) { return; }
    element.pause();
    element.removeAttribute('src');
    element.load();
}

export function toggle_track(next: Track) {
    const playing = track()?.href === next.href;
    stop_track();
    set_track_error(null);
    if (playing) { return; }
    if (!sound()) { set_track_error('Sound is off.'); return; }
    const element = new Audio(next.href);
    element.preload = 'auto';
    element.volume = 0.8;
    const fail = () => {
        if (music !== element) { return; }
        stop_track();
        set_track_error(`Cannot play ${next.title} in this browser.`);
    };
    element.addEventListener('ended', () => { if (music === element) { stop_track(); } });
    element.addEventListener('error', fail);
    music = element;
    set_track(next);
    element.play().catch(fail);
}
