import { createEffect } from 'solid-js';
import { audio, audio_unavailable, effects, sound, toggle_effects, toggle_sound } from '../scripts/state';

export default function TerminalControls() {
    createEffect(effects, enabled => {
        document.documentElement.dataset.effects = enabled ? 'on' : 'off';
    });

    return <div class="terminal-controls" aria-label="Terminal settings">
        <button type="button" data-action="sound" aria-pressed={sound() && !audio_unavailable() ? 'true' : 'false'}
            onClick={toggle_sound} onPointerEnter={audio.focus} onFocus={audio.focus}>
            {audio_unavailable() ? '[AUDIO UNAVAILABLE]' : sound() ? '[SOUND ON]' : '[SOUND OFF]'}
        </button>
        <button type="button" data-action="effects" aria-pressed={effects() ? 'true' : 'false'}
            onClick={toggle_effects} onPointerEnter={audio.focus} onFocus={audio.focus}>
            {effects() ? '[CRT ON]' : '[CRT OFF]'}
        </button>
    </div>;
}
