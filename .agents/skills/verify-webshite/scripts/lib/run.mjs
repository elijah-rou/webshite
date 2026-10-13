// A run is one build served by one `astro preview` this run started (or a deployed
// address given with --url), its state in $TMPDIR/webshite-verify/<run>/, and its
// evidence in the skill's evidence/<run>/, which Cleanup never removes.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { find_chrome, open_browser } from './cdp.mjs';
import { SETTLED } from './menu.mjs';

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const REPO = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: SKILL_DIR, encoding: 'utf8' }).trim();
const STATE_ROOT = join(tmpdir(), 'webshite-verify');
const HOME_TITLE = '<title>Home | Elijah Roussos</title>';
const wait = ms => new Promise(r => setTimeout(r, ms));

export class UsageError extends Error {}

const run_dir = run => join(STATE_ROOT, run);
export const evidence_dir = run => join(SKILL_DIR, 'evidence', run);
const state_path = run => join(run_dir(run), 'state.json');
export const has_state = run => existsSync(state_path(run));

export function read_state(run) {
    if (!run) { throw new UsageError('Pass the run ID that launch printed, as --run RUN_ID.'); }
    if (!existsSync(state_path(run))) {
        throw new UsageError(`No state for run ${run} at ${state_path(run)}. Start one with: launch`);
    }
    return JSON.parse(readFileSync(state_path(run), 'utf8'));
}
const write_state = state => writeFileSync(state_path(state.run), JSON.stringify(state, null, 2));
function update_state(run, change) { const state = read_state(run); change(state); write_state(state); return state; }

// The checkout's product files: HEAD, every change to tracked files (binary ones
// included), and the contents of untracked files, all outside .agents/.
function revision() {
    const git = (args, input) => execFileSync('git', args, { cwd: REPO, encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 });
    const head = git(['rev-parse', 'HEAD']).trim();
    const status = git(['status', '--porcelain', '--untracked-files=all', '--', '.', ':!.agents']);
    const diff = git(['diff', '--binary', 'HEAD', '--', '.', ':!.agents']);
    const hash = createHash('sha256').update(status).update(diff);
    // A link counts by its target; a nested repository ("dir/") only by its status line.
    const untracked = git(['ls-files', '-z', '--others', '--exclude-standard', '--', '.', ':!.agents']).split('\0').filter(Boolean);
    for (const path of untracked) {
        const full = join(REPO, path);
        const info = lstatSync(full);
        hash.update(`\0${path}\0`);
        if (info.isSymbolicLink()) { hash.update(`-> ${readlinkSync(full)}`); } else if (info.isFile()) { hash.update(readFileSync(full)); }
    }
    return { head, dirty: status.trim() !== '', digest: hash.digest('hex').slice(0, 16) };
}

export function free_port() {
    return new Promise((resolve_port, reject) => {
        const server = createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve_port(port)); });
    });
}

// Only real process groups: -0 or -1 would signal this CLI's own group or every process.
function group(pgid) {
    if (!Number.isInteger(pgid) || pgid <= 1) { throw new Error(`Refusing to signal process group ${pgid}`); }
    return -pgid;
}

function alive(pgid) {
    if (!Number.isInteger(pgid) || pgid <= 1) { return false; }
    try { process.kill(group(pgid), 0); return true; } catch { return false; }
}

// PIDs listening on the port, with their process groups.
function listeners(port) {
    let pids = [];
    try { pids = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean); } catch { /* none */ }
    return pids.map(pid => ({ pid: Number(pid), pgid: Number(execFileSync('ps', ['-o', 'pgid=', '-p', pid], { encoding: 'utf8' }).trim()) }));
}

async function get(url) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    return { status: response.status, body: await response.text() };
}

async function stop_group(pgid) {
    if (!alive(pgid)) { return; }
    process.kill(group(pgid), 'SIGTERM');
    for (let i = 0; i < 50 && alive(pgid); i++) { await wait(100); }
    if (alive(pgid)) { process.kill(group(pgid), 'SIGKILL'); }
}

export const new_run_id = () => `ws-${new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)}-${process.pid}`;

export async function launch({ run = new_run_id(), port, url }) {
    if (existsSync(run_dir(run))) { throw new UsageError(`Run ${run} already exists; pick another --run or clean it up first.`); }
    try {
        return await start(run, port, url);
    } catch (error) {
        // Kept as evidence, so a failed launch can still be cleaned up and explained.
        if (existsSync(join(evidence_dir(run), 'launch'))) { writeFileSync(join(evidence_dir(run), 'launch', 'error.txt'), `${error.stack ?? error}\n`); }
        throw error;
    }
}

async function start(run, port, url) {
    const evidence = evidence_dir(run);
    mkdirSync(join(evidence, 'launch'), { recursive: true });
    mkdirSync(run_dir(run), { recursive: true });
    // Written first, so Cleanup works however far launch gets.
    write_state({ run, mode: url ? 'remote' : 'local', base: null, server: null, browsers: [] });
    console.log(`RUN_ID=${run}`);
    console.log(`EVIDENCE_DIR=${relative(REPO, evidence)}`);

    if (url) {
        const base = url.replace(/\/$/, '');
        write_state({ run, mode: 'remote', base, browsers: [] });
        const home = await get(`${base}/`);
        writeFileSync(join(evidence, 'launch', 'target.txt'), `remote ${base}\nGET / ${home.status}\n`);
        if (home.status !== 200 || !home.body.includes(HOME_TITLE)) { throw new Error(`${base}/ answered ${home.status} without the Home title`); }
        console.log(`READY remote ${base}`);
        return run;
    }

    const rev = revision();
    writeFileSync(join(evidence, 'launch', 'revision.txt'), `${rev.head}${rev.dirty ? ' (uncommitted changes)' : ''}\ndigest ${rev.digest}\n`);
    const astro = join(REPO, 'node_modules/.bin/astro');
    if (!existsSync(astro)) { throw new UsageError(`No ${relative(REPO, astro)}. Install first: npx -y pnpm@12.10.1 install --frozen-lockfile`); }
    port ??= await free_port();
    if (listeners(port).length > 0) { throw new UsageError(`Port ${port} is already in use; omit --port to pick a free one.`); }
    const dist = join(run_dir(run), 'dist');
    write_state({ run, mode: 'local', base: `http://127.0.0.1:${port}`, port, dist, revision: rev, server: null, browsers: [] });

    console.log(`BUILD astro build --outDir ${dist}`);
    const build_log = join(evidence, 'launch', 'build.log');
    try {
        execFileSync(astro, ['build', '--outDir', dist], { cwd: REPO, stdio: ['ignore', openSync(build_log, 'w'), 'pipe'] });
    } catch (error) {
        throw new Error(`Build failed; see ${relative(REPO, build_log)}\n${String(error.stderr ?? '').slice(-2000)}`);
    }

    const preview_log = openSync(join(evidence, 'launch', 'preview.log'), 'w');
    const server = spawn(astro, ['preview', '--host', '127.0.0.1', '--port', String(port), '--outDir', dist, '--ignore-lock'],
        { cwd: REPO, stdio: ['ignore', preview_log, preview_log], detached: true });
    update_state(run, state => { state.server = server.pid; });
    server.unref();

    const base = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 120; i++) {
        try {
            const home = await get(`${base}/`);
            if (home.status === 200 && home.body.includes(HOME_TITLE)) {
                console.log(`READY ${base} (server process group ${server.pid})`);
                return run;
            }
        } catch { /* not listening yet */ }
        if (!alive(server.pid)) { throw new Error(`astro preview exited; see ${relative(REPO, join(evidence, 'launch', 'preview.log'))}`); }
        await wait(500);
    }
    throw new Error(`${base}/ did not answer with the Home page within 60 s`);
}

export async function doctor({ run, chrome }) {
    const state = read_state(run);
    const lines = [];
    const check = (ok, what) => { lines.push(`${ok ? 'ok  ' : 'FAIL'} ${what}`); return ok; };
    if (!state.base || (state.mode === 'local' && !state.server)) {
        check(false, `launch completed (see launch/error.txt); clean up and launch a new run`);
    } else if (state.mode === 'local') {
        check(state.server !== null && alive(state.server), `server process group ${state.server} is running`);
        const owners = listeners(state.port);
        check(owners.length > 0 && owners.every(owner => owner.pgid === state.server),
            `port ${state.port} is held only by this run's server (${owners.map(o => `${o.pid}/pgid ${o.pgid}`).join(', ') || 'nothing listening'})`);
        const now = revision();
        check(now.digest === state.revision.digest && now.head === state.revision.head,
            `build matches the checkout (launched ${state.revision.head.slice(0, 7)} ${state.revision.digest}, now ${now.head.slice(0, 7)} ${now.digest})`);
    } else {
        lines.push(`info remote target ${state.base}; no process to check`);
    }
    if (state.base) {
        try {
            const home = await get(`${state.base}/`);
            check(home.status === 200 && home.body.includes(HOME_TITLE), `GET / answers 200 with the Home title (${home.status})`);
            const missing = await get(`${state.base}/verify-no-such-page/`);
            check(missing.status === 404, `an unknown address answers 404 (${missing.status})`);
        } catch (error) {
            check(false, `${state.base} answers HTTP (${error.message})`);
        }
    }
    // Chrome is a prerequisite of the drives, not of the instance: without it they SKIP.
    const browser = find_chrome(chrome);
    lines.push(browser ? `ok   Chrome found (${browser})` : 'skip Chrome not found, so every drive will SKIP; pass --chrome PATH or set WEBSHITE_CHROME');
    const failed = lines.filter(line => line.startsWith('FAIL')).length;
    lines.push(failed ? `DOCTOR FAIL ${run}: ${failed} check(s) failed` : `DOCTOR PASS ${run} ${state.base}`);
    writeFileSync(join(evidence_dir(run), 'doctor.txt'), `${lines.join('\n')}\n`);
    console.log(lines.join('\n'));
    return failed === 0;
}

export async function cleanup({ run }) {
    const state = read_state(run);
    for (const pid of state.browsers) { await stop_group(pid); }
    if (state.mode === 'local' && state.server) {
        await stop_group(state.server);
        const left = listeners(state.port).filter(owner => owner.pgid === state.server);
        if (left.length > 0) { throw new Error(`port ${state.port} is still held by ${left.map(o => o.pid).join(', ')}`); }
    }
    const remaining = [state.server, ...state.browsers].filter(pid => pid && alive(pid));
    if (remaining.length > 0) { throw new Error(`process groups still running: ${remaining.join(', ')}`); }
    rmSync(run_dir(run), { recursive: true, force: true });
    const evidence = evidence_dir(run);
    const files = list_files(evidence);
    writeFileSync(join(evidence, 'surviving-evidence.txt'), `${files.map(file => relative(evidence, file)).join('\n')}\n`);
    if (files.length === 0) { throw new Error(`no evidence survived in ${evidence}`); }
    console.log(`CLEANUP PASS ${run}: stopped ${state.server ? `server ${state.server}` : `no server (${state.mode === 'local' ? 'launch did not start one' : 'remote'})`}${state.browsers.length ? ` and browsers ${state.browsers.join(', ')}` : ''}; ${files.length} evidence files kept in ${relative(REPO, evidence)}`);
}

function list_files(dir) {
    if (!existsSync(dir)) { return []; }
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? list_files(path) : [path];
    });
}

// Runs one feature: opens browsers on request, records every check, closes them, and
// prints one PASS, FAIL or SKIP line. Returns 'pass', 'fail' or 'skip'.
export async function drive({ run, feature, chrome, steps }) {
    const state = read_state(run);
    const browser_path = find_chrome(chrome);
    if (!browser_path) {
        console.log(`SKIP ${feature}: Chrome not found; pass --chrome PATH or set WEBSHITE_CHROME`);
        return 'skip';
    }
    if (!state.base || (state.mode === 'local' && !alive(state.server))) {
        console.log(`FAIL ${feature}: this run's server is not running; run doctor, or launch a new run`);
        return 'fail';
    }
    const evidence = join(evidence_dir(run), feature);
    mkdirSync(evidence, { recursive: true });
    const checks = [];
    const opened = [];
    const check = (ok, what, detail) => {
        checks.push({ ok: Boolean(ok), what, ...(detail === undefined ? {} : { detail }) });
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}${ok || detail === undefined ? '' : ` (${JSON.stringify(detail)})`}`);
        return Boolean(ok);
    };
    // fresh: no earlier visit, so Home plays the intro; otherwise a returning visitor.
    const browser = async ({ viewport = 'desktop', fresh = false } = {}) => {
        // A new profile every time: no storage or cache carries over between browsers.
        const profile = mkdtempSync(join(run_dir(run), `chrome-${feature}-`));
        const b = await open_browser({
            chrome: browser_path, profile, port: await free_port(), evidence, viewport, settled: SETTLED,
            on_pid: pid => update_state(run, s => { s.browsers.push(pid); }),
        });
        opened.push(b);
        if (!fresh) {
            await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('terminal-intro', 'seen'); } catch {}` });
        }
        return b;
    };
    let crash = null;
    try {
        await steps({ base: state.base, browser, check, evidence });
    } catch (error) {
        crash = error;
        check(false, `drive ran to the end`, error.stack ?? String(error));
    } finally {
        for (const b of opened) {
            check(b.errors.length === 0, `no page errors in a ${b === opened[0] ? 'first' : 'later'} browser`, b.errors);
            // The site's own requests only; YouTube's player makes its own, some blocked.
            const failed = [...b.requests.values()].filter(r => r.url.startsWith(state.base)
                && ((r.failed && !r.failed.includes('ERR_ABORTED')) || (r.status ?? 0) >= 400));
            writeFileSync(join(evidence, `requests-${opened.indexOf(b)}.json`), JSON.stringify([...b.requests.values()], null, 2));
            writeFileSync(join(evidence, `errors-${opened.indexOf(b)}.json`), JSON.stringify(b.errors, null, 2));
            check(failed.length === 0, 'no failed or 4xx/5xx requests to the site', failed.map(r => `${r.status ?? r.failed} ${r.url}`));
            await b.close();
            update_state(run, s => { s.browsers = s.browsers.filter(pid => pid !== b.pid); });
        }
        writeFileSync(join(evidence, 'checks.json'), JSON.stringify({ feature, run, base: state.base, checks }, null, 2));
    }
    const first_failure = checks.find(c => !c.ok);
    if (first_failure || crash) {
        console.log(`FAIL ${feature}: ${first_failure?.what ?? crash.message}`);
        return 'fail';
    }
    console.log(`PASS ${feature} (${checks.length} checks)`);
    return 'pass';
}
