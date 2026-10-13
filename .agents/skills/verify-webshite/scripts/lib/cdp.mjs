// A headless Chrome driven over the DevTools protocol: one browser and one fresh
// profile per drive, input sent as real key and mouse events, and evidence
// (screenshots, accessibility snapshots, console errors, requests) written as it goes.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Playwright's Chrome for Testing is the browser the repository's past runs used.
const CHROME_CANDIDATES = [
    process.env.WEBSHITE_CHROME,
    join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
];

export function find_chrome(explicit) {
    if (explicit) { return existsSync(explicit) ? explicit : null; }
    return CHROME_CANDIDATES.find(path => path && existsSync(path)) ?? null;
}

export const VIEWPORTS = {
    desktop: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
    phone: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
};

const KEY_CODES = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35, '/': 191 };

// on_pid records the browser's PID before anything can fail, so Cleanup can stop it.
// settled: an expression that is true when nothing on the page is moving; clicks wait for it.
export async function open_browser({ chrome, profile, port, evidence, viewport, settled = 'true', on_pid }) {
    mkdirSync(evidence, { recursive: true });
    const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', 'about:blank'],
        { stdio: 'ignore', detached: true });
    on_pid(proc.pid);
    let socket;
    for (let attempt = 0; attempt < 150 && !socket; attempt++) {
        try {
            const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            const page = targets.find(target => target.type === 'page');
            if (page) { socket = new WebSocket(page.webSocketDebuggerUrl); }
        } catch { /* Chrome is still starting. */ }
        if (!socket) { await wait(100); }
    }
    if (!socket) { process.kill(-proc.pid, 'SIGKILL'); throw new Error(`Chrome did not open its debug port ${port}`); }
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });

    let next_id = 0;
    const pending = new Map();
    const listeners = new Map();
    const errors = [];
    const requests = new Map();
    socket.addEventListener('message', message => {
        const data = JSON.parse(message.data);
        if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
        if (data.method === 'Runtime.exceptionThrown') {
            errors.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
        }
        if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
            errors.push(data.params.args.map(arg => arg.value ?? arg.description).join(' '));
        }
        for (const listener of listeners.get(data.method) ?? []) { listener(data.params); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++next_id;
        pending.set(id, reply => reply.error ? reject(new Error(`${method}: ${reply.error.message}`)) : resolve(reply.result));
        socket.send(JSON.stringify({ id, method, params }));
    });
    const on = (method, listener) => {
        if (!listeners.has(method)) { listeners.set(method, []); }
        listeners.get(method).push(listener);
    };
    on('Network.requestWillBeSent', params => {
        requests.set(params.requestId, { url: params.request.url, type: params.type, status: null });
    });
    on('Network.responseReceived', params => {
        const request = requests.get(params.requestId);
        if (request) { request.status = params.response.status; request.mime = params.response.mimeType; }
    });
    on('Network.loadingFailed', params => {
        const request = requests.get(params.requestId);
        if (request) { request.failed = params.errorText; }
    });

    await send('Runtime.enable');
    await send('Network.enable');
    await send('Page.enable');
    await send('Accessibility.enable');
    await send('Emulation.setDeviceMetricsOverride', VIEWPORTS[viewport]);
    if (VIEWPORTS[viewport].mobile) { await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); }

    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
        }
        return result.result?.value;
    };

    // Polls until the expression is truthy; returns its last value either way.
    const wait_for = async (expression, timeout_ms = 10000) => {
        const start = Date.now();
        let value;
        while (Date.now() - start < timeout_ms) {
            try {
                value = await evaluate(expression);
            } catch (error) {
                // A broken expression never becomes true; only page state may be pending.
                if (/^SyntaxError/.test(error.message)) { throw new Error(`${error.message} in: ${expression}`); }
                value = undefined;
            }
            if (value) { return value; }
            await wait(100);
        }
        return value;
    };

    const press = async key => {
        const text = key.length === 1 ? key : undefined;
        const code = KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: code, text });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: code });
    };

    const type = async text => { for (const character of text) { await press(character); } };

    // A real pointer click at the centre of the element the selector names, measured
    // after the page has settled and the element is scrolled into view.
    const click = async selector => {
        if (!await wait_for(settled)) { throw new Error(`The page did not settle before clicking ${selector}`); }
        const box = await evaluate(`(() => {
            const element = document.querySelector(${JSON.stringify(selector)});
            if (!element) { return null; }
            element.scrollIntoView({ block: 'center', inline: 'center' });
            const rect = element.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()`);
        if (!box) { throw new Error(`Nothing matches ${selector} to click`); }
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    };

    // Moves the pointer to the top-left corner, off any menu: hovering an entry selects it.
    const park_pointer = () => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });

    const navigate = async url => {
        const loaded = new Promise(resolve => on('Page.loadEventFired', resolve));
        await send('Page.navigate', { url });
        await Promise.race([loaded, wait(30000)]);
    };

    const screenshot = async name => {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(evidence, `${name}.png`), Buffer.from(data, 'base64'));
    };

    // Role and name of every node that has a name, indented by depth.
    const snapshot = async name => {
        const { nodes } = await send('Accessibility.getFullAXTree');
        const by_id = new Map(nodes.map(node => [node.nodeId, node]));
        const depth = node => { let d = 0; for (let n = node; n?.parentId; n = by_id.get(n.parentId)) { d++; } return d; };
        const lines = nodes
            .filter(node => !node.ignored && (node.name?.value || ['link', 'button', 'heading', 'textbox', 'searchbox'].includes(node.role?.value)))
            .map(node => `${'  '.repeat(Math.min(depth(node), 20))}${node.role?.value} "${node.name?.value ?? ''}"`);
        writeFileSync(join(evidence, `${name}.aria.txt`), `${await evaluate('location.href')}\n${lines.join('\n')}\n`);
    };

    const close = async () => {
        try { socket.close(); } catch { /* already closed */ }
        try { process.kill(-proc.pid, 'SIGTERM'); } catch { /* already gone */ }
        await Promise.race([new Promise(resolve => proc.once('exit', resolve)), wait(5000)]);
        try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* already gone */ }
    };

    return { pid: proc.pid, send, evaluate, wait_for, press, type, click, park_pointer, navigate, screenshot, snapshot, errors, requests, close };
}
