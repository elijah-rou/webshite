import { audio, audio_unavailable, connected, sound, strum, toggle_guitar } from '../scripts/state';

export default function GuitarPlayer() {
    return <div class="guitar-player" data-connected={connected() ? 'true' : 'false'}>
        <div class="instrument-image">
            <img src="/images/les-paul-special.svg" width="420" height="500"
                alt="Gibson Les Paul Special with two P-90 pickups" />
            <svg class="guitar-cable" viewBox="0 0 420 500" aria-hidden="true">
                <path class="cable-disconnected" d="M393 489C339 465 368 459 358 437" />
                <path class="cable-connected" d="M393 489C302 473 352 435 301 409" />
                <g class="cable-plug">
                    <path d="M278 396l14 7" stroke-width="4" />
                    <path d="M291 402l16 8" stroke-width="8" />
                    <path d="M307 410l5 3" />
                </g>
            </svg>
        </div>
        <div class="guitar-actions">
            <p class="connection-status" role="status">
                INPUT: {connected() ? 'CONNECTED' : 'DISCONNECTED'}
            </p>
            <button type="button" class="menu-action" data-action="plug"
                aria-pressed={connected() ? 'true' : 'false'} onClick={toggle_guitar}
                onPointerEnter={audio.focus} onFocus={audio.focus}>
                &gt; {connected() ? 'Unplug guitar' : 'Plug in guitar'}
            </button>
            <button type="button" class="menu-action" data-action="strum"
                disabled={!connected()} onClick={strum}
                onPointerEnter={audio.focus} onFocus={audio.focus}>
                &gt; Strum
            </button>
            <p class="audio-note" role="status">
                {audio_unavailable() ? 'Audio unavailable in this browser.'
                    : !sound() ? 'Sound is muted.' : 'E major · synthesized'}
            </p>
        </div>
    </div>;
}
