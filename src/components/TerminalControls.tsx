import { createEffect } from 'solid-js';
import { clear_reveal } from '../scripts/reveal';
import { audio, audio_unavailable, effects, log_out, sound, toggle_effects, toggle_sound } from '../scripts/state';

export default function TerminalControls() {
    createEffect(effects, enabled => {
        document.documentElement.dataset.effects = enabled ? 'on' : 'off';
        if (!enabled) { clear_reveal(); }
    });

    return <div class="terminal-controls" role="group" aria-label="Terminal settings">
        <button type="button" data-action="logout"
            onClick={log_out} onPointerEnter={audio.focus} onFocus={audio.focus}>[LOGOUT]</button>
        <button type="button" data-action="sound" disabled={audio_unavailable()}
            onClick={toggle_sound} onPointerEnter={audio.focus} onFocus={audio.focus}>
            {audio_unavailable() ? '[AUDIO UNAVAILABLE]' : sound() ? '[SOUND ON]' : '[SOUND OFF]'}
        </button>
        <button type="button" data-action="effects"
            onClick={toggle_effects} onPointerEnter={audio.focus} onFocus={audio.focus}>
            {effects() ? '[CRT ON]' : '[CRT OFF]'}
        </button>
    </div>;
}
