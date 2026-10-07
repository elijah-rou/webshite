import { createEffect, createSignal, onCleanup } from 'solid-js';
import { audio, connected, set_jack } from '../scripts/state';

// Position of the plug's insertion point, and the direction its tip points, in layer pixels.
interface Pose { x: number; y: number; angle: number }
interface Layout { width: number; height: number; scale: number; plugged: Pose; rest: Pose }

const SETTLE_MS = 260;
const DRAG_THRESHOLD_PX = 5;
const SNAP_RADIUS_PX = 42;
// Plug geometry in its own frame: the tip points along +x from the jack face at 0.
const TAIL_X = -74;
const GRIP_X = -34;

function radians(degrees: number) { return degrees * Math.PI / 180; }

function along(pose: Pose, distance: number) {
    return {
        x: pose.x + Math.cos(radians(pose.angle)) * distance,
        y: pose.y + Math.sin(radians(pose.angle)) * distance,
    };
}

// Plug sizes and offsets in CSS are for a monitor this wide; they scale with it.
const MONITOR_REFERENCE_PX = 980;

function read_layout(layer: HTMLElement, socket: HTMLElement, monitor: HTMLElement): Layout {
    const style = getComputedStyle(socket);
    const number = (name: string) => {
        const value = Number.parseFloat(style.getPropertyValue(name));
        if (!Number.isFinite(value)) { throw new Error(`The jack socket needs a numeric ${name}`); }
        return value;
    };
    const box = layer.getBoundingClientRect();
    const face = socket.getBoundingClientRect();
    const size = monitor.getBoundingClientRect().width / MONITOR_REFERENCE_PX;
    const x = face.left + face.width / 2 - box.left;
    const y = face.top + face.height / 2 - box.top;
    return {
        width: box.width,
        height: box.height,
        scale: number('--plug-scale') * size,
        plugged: { x, y, angle: number('--jack-angle') },
        rest: { x: x + number('--rest-x') * size, y: y + number('--rest-y') * size, angle: number('--rest-angle') },
    };
}

export default function GuitarJack() {
    const [layout, set_layout] = createSignal<Layout | null>(null);
    const [pose, set_pose] = createSignal<Pose | null>(null);
    let layer: HTMLDivElement | undefined;
    let handle: HTMLButtonElement | undefined;
    let frame = 0;
    let drag: { pointer: number; dx: number; dy: number; x: number; y: number; moved: boolean } | null = null;
    let suppress_click = false;

    function target(plugged: boolean): Pose | null {
        const current = layout();
        return current ? (plugged ? current.plugged : current.rest) : null;
    }

    function animate_to(goal: Pose) {
        cancelAnimationFrame(frame);
        frame = 0;
        const start = pose();
        if (!start || matchMedia('(prefers-reduced-motion: reduce)').matches) { set_pose(goal); return; }
        const turn = ((goal.angle - start.angle) % 360 + 540) % 360 - 180;
        const began = performance.now();
        const step = (now: number) => {
            const progress = Math.min((now - began) / SETTLE_MS, 1);
            const eased = 1 - (1 - progress) ** 3;
            set_pose({
                x: start.x + (goal.x - start.x) * eased,
                y: start.y + (goal.y - start.y) * eased,
                angle: start.angle + turn * eased,
            });
            frame = progress < 1 ? requestAnimationFrame(step) : 0;
        };
        frame = requestAnimationFrame(step);
    }

    function settle(plugged: boolean) {
        set_jack(plugged);
        const goal = target(plugged);
        if (goal) { animate_to(goal); }
    }

    function measure() {
        const socket = document.querySelector<HTMLElement>('[data-jack-socket]');
        const monitor = document.querySelector<HTMLElement>('.monitor');
        if (!layer || !socket || !monitor) { return; }
        set_layout(read_layout(layer, socket, monitor));
    }

    createEffect(layout, current => {
        if (!current || drag) { return; }
        cancelAnimationFrame(frame);
        frame = 0;
        set_pose(connected() ? current.plugged : current.rest);
    });

    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    const monitor = document.querySelector('.monitor');
    if (monitor) { resize.observe(monitor); }
    onCleanup(() => { resize.disconnect(); cancelAnimationFrame(frame); });

    function layer_point(event: PointerEvent) {
        const box = layer?.getBoundingClientRect();
        return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
    }

    function pointer_down(event: PointerEvent) {
        const current = pose();
        suppress_click = false;
        if (event.button !== 0 || !current) { return; }
        handle?.setPointerCapture(event.pointerId);
        const point = layer_point(event);
        drag = { pointer: event.pointerId, dx: current.x - point.x, dy: current.y - point.y,
            x: event.clientX, y: event.clientY, moved: false };
    }

    function pointer_move(event: PointerEvent) {
        const current = layout();
        if (!drag || event.pointerId !== drag.pointer || !current) { return; }
        if (!drag.moved) {
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_THRESHOLD_PX) { return; }
            drag.moved = true;
            cancelAnimationFrame(frame);
            frame = 0;
            set_jack(false);
        }
        const point = layer_point(event);
        const x = point.x + drag.dx;
        const y = point.y + drag.dy;
        const socket = current.plugged;
        // The tip follows the jack while carried, so it lines up for insertion.
        const angle = Math.hypot(socket.x - x, socket.y - y) < 4 ? socket.angle
            : Math.atan2(socket.y - y, socket.x - x) * 180 / Math.PI;
        set_pose({ x, y, angle });
    }

    function pointer_up(event: PointerEvent) {
        if (!drag || event.pointerId !== drag.pointer) { return; }
        const moved = drag.moved;
        drag = null;
        if (!moved) { return; }
        suppress_click = true;
        const current = pose();
        const socket = layout()?.plugged;
        const scale = layout()?.scale ?? 1;
        settle(Boolean(current && socket
            && Math.hypot(current.x - socket.x, current.y - socket.y) <= SNAP_RADIUS_PX * scale));
    }

    function pointer_cancel(event: PointerEvent) {
        if (!drag || event.pointerId !== drag.pointer) { return; }
        drag = null;
        settle(connected());
    }

    function click(event: MouseEvent) {
        // A drag ends in a click on the handle; keyboard activation reports detail 0.
        if (suppress_click && event.detail !== 0) { suppress_click = false; return; }
        settle(!connected());
    }

    const cable = () => {
        const current = pose();
        const box = layout();
        if (!current || !box) { return ''; }
        const tail = along(current, TAIL_X * box.scale);
        const out = along({ ...tail, angle: current.angle }, -60 * box.scale);
        const end = { x: box.width + 30, y: box.height - 24 };
        return `M${tail.x} ${tail.y}C${out.x} ${out.y + 40} ${end.x - 160} ${end.y + 30} ${end.x} ${end.y}`;
    };

    const plug_transform = () => {
        const current = pose();
        const scale = layout()?.scale ?? 1;
        return current ? `translate(${current.x}px, ${current.y}px) rotate(${current.angle}deg) scale(${scale})` : 'none';
    };

    const handle_position = () => {
        const current = pose();
        const scale = layout()?.scale ?? 1;
        if (!current) { return { display: 'none' }; }
        const grip = along(current, GRIP_X * scale);
        return { left: `${grip.x}px`, top: `${grip.y}px` };
    };

    return <div ref={layer} class="cable-layer" data-connected={connected() ? 'true' : 'false'}>
        <svg class="cable" width={layout()?.width ?? 0} height={layout()?.height ?? 0} aria-hidden="true">
            <defs>
                <linearGradient id="plug-chrome" x1="0" y1="-1" x2="0" y2="1" gradientUnits="objectBoundingBox">
                    <stop offset="0" stop-color="#5d5f5a" /><stop offset=".35" stop-color="#e8e6dc" />
                    <stop offset=".6" stop-color="#9c9a90" /><stop offset="1" stop-color="#3b3c38" />
                </linearGradient>
                <linearGradient id="plug-rubber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#3a3a36" /><stop offset=".3" stop-color="#1d1d1b" />
                    <stop offset="1" stop-color="#090909" />
                </linearGradient>
            </defs>
            <path class="cable-line" d={cable()} stroke-width={7 * (layout()?.scale ?? 1)} />
            <path class="cable-shine" d={cable()} stroke-width={1.4 * (layout()?.scale ?? 1)} />
            <g class="plug" style={{ transform: plug_transform() }}>
                <g class="plug-tip">
                    <rect x="0" y="-3.5" width="19" height="7" fill="url(#plug-chrome)" />
                    <rect x="19" y="-3.5" width="2.5" height="7" fill="#111" />
                    <path d="M21.5-3.5h3.5q3.5 0 3.5 3.5t-3.5 3.5h-3.5z" fill="url(#plug-chrome)" />
                </g>
                <rect x="-7" y="-6.5" width="7" height="13" rx="1" fill="url(#plug-chrome)" />
                <rect x="-50" y="-9" width="43" height="18" rx="3" fill="url(#plug-rubber)" />
                <path d="M-44-9v18M-39-9v18M-34-9v18M-29-9v18M-24-9v18" stroke="#000" stroke-width="1.4" opacity=".6" />
                <path d="M-50-7.5 -74-4v8l24 3.5z" fill="url(#plug-rubber)" />
            </g>
        </svg>
        <button ref={handle} type="button" class="plug-handle" style={handle_position()}
            aria-label={connected() ? 'Unplug guitar cable' : 'Plug guitar cable into the input jack'}
            onPointerDown={pointer_down} onPointerMove={pointer_move} onPointerUp={pointer_up}
            onPointerCancel={pointer_cancel} onClick={click}
            onPointerEnter={audio.focus} onFocus={audio.focus} />
        <span class="visually-hidden" role="status">{connected() ? 'Guitar cable plugged in.' : ''}</span>
    </div>;
}
