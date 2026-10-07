import { track, track_error } from '../scripts/state';

export default function MusicStatus() {
    const message = () => {
        const playing = track();
        return playing ? `PLAYING: ${playing.title}` : track_error() ?? '';
    };
    return <p class="music-status" role="status">{message()}</p>;
}
