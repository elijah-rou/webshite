// The photo screen steps between images in place: the page, its header and footer
// stay put, the frame keeps its size, and only the image, caption and links change.
// Each image still has its own page; the address follows along without adding
// history entries, so Back leaves the viewer.
import { audio } from './state';
import { zoom_scale } from './zoom';

export interface ViewerImage {
    src: string; srcset: string; width: number; height: number; alt: string; href: string; instagram: string | null;
}
export interface ViewerPost { title: string; images: ViewerImage[] }
export interface ViewerManifest { posts: ViewerPost[]; post: number; image: number }

interface Position { post: number; image: number }

function element<T extends Element>(root: Element, selector: string): T {
    const found = root.querySelector<T>(selector);
    if (!found) { throw new Error(`Photo viewer is missing ${selector}`); }
    return found;
}

function set_link(link: HTMLAnchorElement, href: string | null | undefined) {
    if (href) { link.href = href; } else { link.removeAttribute('href'); }
}

export function mount_photo_viewer(): (() => void) | null {
    const root = document.querySelector<HTMLElement>('[data-photo-viewer]');
    if (!root) { return null; }
    const manifest = JSON.parse(element(root, '[data-photo-manifest]').textContent ?? '') as ViewerManifest;
    const frame = element<HTMLElement>(root, '.photo-frame');
    const link = element<HTMLAnchorElement>(root, '.photo-link');
    const loading = element<HTMLElement>(root, '.photo-loading');
    const title = element<HTMLElement>(root, '.photo-title');
    const count = element<HTMLElement>(root, '.photo-count');
    const previous_image = element<HTMLAnchorElement>(root, '.photo-step.previous');
    const next_image = element<HTMLAnchorElement>(root, '.photo-step.next');
    const previous_post = element<HTMLAnchorElement>(root, '.photo-posts .previous');
    const next_post = element<HTMLAnchorElement>(root, '.photo-posts .next');
    const title_suffix = document.title.slice(document.title.lastIndexOf(' | '));
    let current: Position = { post: manifest.post, image: manifest.image };
    let request = 0;
    // Neighbours being fetched ahead of time; kept so their downloads are not dropped.
    const preloading = new Set<HTMLImageElement>();

    const image_at = ({ post, image }: Position) => manifest.posts[post]?.images[image];

    // The width the image will take on screen, magnified by the zoom, so the file
    // picked from its srcset is sharp without being larger than needed. Every image
    // fits the same box: the shown image's max size, which does not depend on its file.
    function screen_width({ width, height }: { width: number; height: number }): number {
        const style = getComputedStyle(element<HTMLImageElement>(link, 'img'));
        const layout = Math.min(parseFloat(style.maxWidth), parseFloat(style.maxHeight) * width / height);
        const on_screen = Math.ceil(layout * zoom_scale());
        if (!Number.isFinite(on_screen)) { throw new Error(`Photo viewer measured an image width of ${on_screen}`); }
        // A window too small for the frame leaves no room; any file will do.
        return Math.max(1, on_screen);
    }

    function load(view: ViewerImage): HTMLImageElement {
        const image = new Image();
        image.sizes = `${screen_width(view)}px`;
        image.srcset = view.srcset;
        image.src = view.src;
        image.width = view.width;
        image.height = view.height;
        image.alt = view.alt;
        return image;
    }

    // Left and right run through every image, crossing into the neighbouring posts.
    function neighbour(from: Position, direction: 1 | -1): Position | undefined {
        const post = manifest.posts[from.post];
        if (!post) { return undefined; }
        const image = from.image + direction;
        if (image >= 0 && image < post.images.length) { return { post: from.post, image }; }
        const other = manifest.posts[from.post + direction];
        if (!other) { return undefined; }
        return { post: from.post + direction, image: direction === 1 ? 0 : other.images.length - 1 };
    }

    // The frame's size depends on the terminal font, so images are sized once it has
    // loaded; measured before, they get the fallback font's smaller frame.
    function once_fonts_load(this_request: number, then: () => void) {
        void document.fonts.ready.then(() => { if (this_request === request) { then(); } });
    }

    function preload_neighbours() {
        once_fonts_load(request, () => {
            for (const position of [neighbour(current, 1), neighbour(current, -1)]) {
                const view = position && image_at(position);
                if (!view) { continue; }
                const image = load(view);
                preloading.add(image);
                const done = () => preloading.delete(image);
                image.decode().then(done, done);
            }
        });
    }

    function set_loading(text: string | null) {
        frame.toggleAttribute('data-loading', text !== null);
        loading.hidden = text === null;
        if (text !== null) { loading.textContent = text; }
    }

    function show(position: Position) {
        const post = manifest.posts[position.post];
        const view = image_at(position);
        if (!post || !view) { throw new Error(`No image ${position.image + 1} in post ${position.post + 1}`); }
        current = position;
        const this_request = ++request;
        title.textContent = post.title;
        title.title = post.title;
        count.textContent = `${position.image + 1}/${post.images.length}`;
        count.hidden = post.images.length < 2;
        set_link(link, view.instagram);
        set_link(previous_image, post.images[position.image - 1]?.href);
        set_link(next_image, post.images[position.image + 1]?.href);
        previous_image.hidden = !previous_image.hasAttribute('href');
        next_image.hidden = !next_image.hasAttribute('href');
        for (const [button, other] of [[previous_post, manifest.posts[position.post - 1]], [next_post, manifest.posts[position.post + 1]]] as const) {
            set_link(button, other?.images[0]?.href);
            if (other) { button.removeAttribute('aria-disabled'); } else { button.setAttribute('aria-disabled', 'true'); }
        }
        document.title = `${post.title}${title_suffix}`;
        history.replaceState(history.state, '', view.href);

        once_fonts_load(this_request, () => {
            const image = load(view);
            const place = () => {
                if (this_request !== request) { return; }
                element<HTMLImageElement>(link, 'img').replaceWith(image);
                set_loading(null);
                preload_neighbours();
            };
            if (image.complete && image.naturalWidth > 0) { place(); return; }
            set_loading('Loading...');
            image.decode().then(place, () => {
                if (this_request === request) { set_loading('Image failed to load.'); }
            });
        });
    }

    // Each link's own page is the fallback; clicks are handled here so the router does not load it.
    const targets = new Map<HTMLAnchorElement, () => Position>([
        [previous_image, () => ({ post: current.post, image: current.image - 1 })],
        [next_image, () => ({ post: current.post, image: current.image + 1 })],
        [previous_post, () => ({ post: current.post - 1, image: 0 })],
        [next_post, () => ({ post: current.post + 1, image: 0 })],
    ]);
    const on_click = (event: MouseEvent) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) { return; }
        const target = targets.get(event.currentTarget as HTMLAnchorElement)?.();
        if (!target || !image_at(target)) { return; }
        event.preventDefault();
        show(target);
    };
    for (const step_link of targets.keys()) { step_link.addEventListener('click', on_click); }

    const on_key = (event: KeyboardEvent) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') { return; }
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) { return; }
        if (document.activeElement instanceof HTMLInputElement) { return; }
        const position = neighbour(current, event.key === 'ArrowRight' ? 1 : -1);
        event.preventDefault();
        if (!position) { return; }
        void audio.play('select');
        show(position);
    };
    document.addEventListener('keydown', on_key);

    // A resize changes the zoom and the frame, so the shown image is sized again
    // (after terminal.tsx's own resize handler has updated the zoom).
    const on_resize = () => {
        const shown = element<HTMLImageElement>(link, 'img');
        shown.sizes = `${screen_width(shown)}px`;
    };
    window.addEventListener('resize', on_resize);

    const first = element<HTMLImageElement>(link, 'img');
    if (first.complete && first.naturalWidth > 0) {
        preload_neighbours();
    } else {
        set_loading('Loading...');
        const this_request = request;
        first.decode().then(() => {
            if (this_request !== request) { return; }
            set_loading(null);
            preload_neighbours();
        }, () => { if (this_request === request) { set_loading('Image failed to load.'); } });
    }

    return () => {
        request += 1;
        document.removeEventListener('keydown', on_key);
        window.removeEventListener('resize', on_resize);
        for (const step_link of targets.keys()) { step_link.removeEventListener('click', on_click); }
        preloading.clear();
    };
}
