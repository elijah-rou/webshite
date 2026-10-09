// Opening a page waits for its HTML; fetching it while its link is highlighted
// (hovered, focused or touched) hides that wait. Astro's own prefetch is off
// (astro.config.mjs): pages are served with max-age=0 and no validator, so the
// router's fetch() downloaded every prefetched page a second time.
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

// A prefetched page is used at most this long after it was requested.
const FRESH_MS = 30_000;
interface Prefetched { at: number; html: Promise<string | null> }
const pages = new Map<string, Prefetched>();

const page_key = (url: URL) => url.origin + url.pathname;

// Site pages end in a slash (trailingSlash: 'always'); recordings, downloads and
// other files do not, and are never prefetched.
export function is_page(target: URL, current: URL, download: boolean): boolean {
    return !download && target.origin === current.origin && target.search === ''
        && target.pathname.endsWith('/') && target.pathname !== current.pathname;
}

async function fetch_page(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { priority: 'low' });
        const type = response.headers.get('content-type') ?? '';
        // Redirects and errors are left to the router's own loader.
        if (!response.ok || response.redirected || !type.startsWith('text/html')) { return null; }
        return await response.text();
    } catch {
        return null;
    }
}

export function prefetch_link(link: HTMLAnchorElement) {
    // The photo viewer's links step in place rather than loading their pages.
    if (link.target || link.closest('[data-photo-viewer]')) { return; }
    const target = new URL(link.href);
    if (!is_page(target, new URL(location.href), link.hasAttribute('download'))) { return; }
    const key = page_key(target);
    const cached = pages.get(key);
    if (cached && performance.now() - cached.at < FRESH_MS) { return; }
    pages.set(key, { at: performance.now(), html: fetch_page(key) });
}

// The router keeps its own loader for anything unusual: a page without the client
// router (a redirect page) or one needing a stylesheet this page has not loaded.
function usable(next: Document, url: URL): boolean {
    if (!next.querySelector('[name="astro-view-transitions-enabled"]')) { return false; }
    const loaded = new Set(Array.from(document.querySelectorAll<HTMLLinkElement>('head link[rel="stylesheet"]'), link => link.href));
    return Array.from(next.querySelectorAll('head link[rel="stylesheet"]'))
        .every(link => loaded.has(new URL(link.getAttribute('href') ?? '', url).href));
}

// Handed to astro:before-preparation: a prefetched page replaces the router's fetch.
export function use_prefetched(event: TransitionBeforePreparationEvent) {
    const key = page_key(event.to);
    const page = pages.get(key);
    pages.delete(key);
    if (!page || event.formData || event.to.search || performance.now() - page.at >= FRESH_MS) { return; }
    const load_from_network = event.loader;
    event.loader = async () => {
        const html = await page.html;
        const next = html === null ? null : new DOMParser().parseFromString(html, 'text/html');
        if (!next || !usable(next, event.to)) { return load_from_network(); }
        // As the router's loader does: scripts run, so <noscript> content must not show.
        next.querySelectorAll('noscript').forEach(element => element.remove());
        event.newDocument = next;
    };
}
