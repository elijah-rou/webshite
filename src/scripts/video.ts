// A talk's recording is a link to YouTube until it is played, so the page loads no
// player and makes no request to YouTube before then. Playing swaps in the player;
// Enter plays it from anywhere outside a control, as Enter opens the entry in menus.

function play(link: HTMLAnchorElement) {
    const src = link.dataset.videoEmbed;
    if (!src) { throw new Error('Video link is missing data-video-embed'); }
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = link.dataset.videoTitle ?? 'Recording';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    // YouTube's player refuses to play without the embedding page's origin.
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    link.replaceWith(frame);
    frame.focus();
}

export function mount_video_embeds(): (() => void) | null {
    const link = document.querySelector<HTMLAnchorElement>('[data-video-embed]');
    if (!link) { return null; }
    const click = (event: MouseEvent) => {
        // A modified or middle click still opens YouTube, like any link.
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
        event.preventDefault();
        play(link);
    };
    const key = (event: KeyboardEvent) => {
        if (event.key !== 'Enter' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return; }
        const active = document.activeElement;
        if (active !== document.body && active?.id !== 'content') { return; }
        if (!link.isConnected) { return; }
        event.preventDefault();
        link.click();
    };
    link.addEventListener('click', click);
    document.addEventListener('keydown', key);
    return () => {
        link.removeEventListener('click', click);
        document.removeEventListener('keydown', key);
    };
}
