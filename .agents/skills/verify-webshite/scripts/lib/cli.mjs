// verify-webshite: launch, doctor, one drive per mapped feature, cleanup, and all.
import { parseArgs } from 'node:util';
import { cleanup, doctor, drive, has_state, launch, new_run_id, UsageError } from './run.mjs';
import home_menu from '../features/home-menu.mjs';
import projects_search from '../features/projects-search.mjs';
import talks from '../features/talks.mjs';
import papers from '../features/papers.mjs';
import photos from '../features/photos.mjs';

const CLI = '.agents/skills/verify-webshite/scripts/verify-webshite';
// One drive target per file in features/.
const FEATURES = {
    'home-menu': { steps: home_menu, about: 'Home menu: intro skip, arrow keys, disabled entries, Enter, Escape, Back, phone tap' },
    'projects-search': { steps: projects_search, about: 'Projects list and fuzzy search: typing, "/", arrows and Enter, no matches, Escape' },
    talks: { steps: talks, about: 'Talks list and talk page: poster, no YouTube before play, play by Enter and by click' },
    papers: { steps: papers, about: 'Papers list, paper pages, PDF download, demo video, search' },
    photos: { steps: photos, about: 'Photos grid and viewer: album stepping by link and arrows, next post, Escape' },
};

const HELP = {
    main: `Usage: ${CLI} <command> [flags]

Commands:
  launch            Build into a per-run directory and serve it with astro preview
  doctor            Check this run's server, port, build revision and Chrome
  cleanup           Stop what this run started and remove its scratch state (never evidence)
${Object.entries(FEATURES).map(([name, f]) => `  ${name.padEnd(18)}${f.about}`).join('\n')}
  all               launch, doctor, every feature, then cleanup (even after a failure)

Run "${CLI} <command> --help" for flags and examples.`,
    launch: `Usage: ${CLI} launch [--run ID] [--port N] [--url URL]

Builds the checkout with "astro build --outDir $TMPDIR/webshite-verify/<run>/dist" and serves it
with "astro preview" on 127.0.0.1. Prints RUN_ID=, EVIDENCE_DIR= and a READY line.
  --run ID    Run ID to use (default: ws-<date>-<time>-<pid>)
  --port N    Port to serve on (default: a free port)
  --url URL   Drive an already deployed site instead (read-only); nothing is built or started

Examples:
  ${CLI} launch
  ${CLI} launch --url https://eliroussos.com`,
    doctor: `Usage: ${CLI} doctor --run ID [--chrome PATH]

Read-only. Prints ok/FAIL lines and ends with DOCTOR PASS or DOCTOR FAIL; exits 1 on failure.

Example:
  ${CLI} doctor --run ws-20261013-140000-123`,
    cleanup: `Usage: ${CLI} cleanup --run ID

Stops the server and any browser this run recorded (by process group), removes
$TMPDIR/webshite-verify/<run>/, and keeps the evidence directory. Ends with CLEANUP PASS.

Example:
  ${CLI} cleanup --run ws-20261013-140000-123`,
    all: `Usage: ${CLI} all [--port N] [--url URL] [--chrome PATH]

Launches a new run, runs doctor and every feature, then cleans up even after a failure.
Ends with "SUMMARY pass=N fail=N skip=N"; exits 0 only if no feature failed.

Examples:
  ${CLI} all
  ${CLI} all --url https://eliroussos.com`,
};
const feature_help = name => `Usage: ${CLI} ${name} --run ID [--chrome PATH]

${FEATURES[name].about}. The recipe is features/${name}.md.
Ends with "PASS ${name}", "FAIL ${name}: <check>" or "SKIP ${name}: <missing prerequisite>".
  --chrome PATH   Chrome or Chromium binary (default: WEBSHITE_CHROME, then Playwright's Chrome for Testing)

Example:
  ${CLI} ${name} --run ws-20261013-140000-123`;

const OPTIONS = {
    run: { type: 'string' }, port: { type: 'string' }, url: { type: 'string' },
    chrome: { type: 'string' }, help: { type: 'boolean', short: 'h' },
};

async function main(argv) {
    const [command, ...rest] = argv;
    if (!command || command === '--help' || command === '-h' || command === 'help') { console.log(HELP.main); return 0; }
    if (!(command in HELP) && !(command in FEATURES)) { throw new UsageError(`Unknown command "${command}".\n\n${HELP.main}`); }
    const { values } = parseArgs({ args: rest, options: OPTIONS, strict: true });
    if (values.help) { console.log(HELP[command] ?? feature_help(command)); return 0; }
    const port = values.port === undefined ? undefined : Number(values.port);
    if (port !== undefined && !Number.isInteger(port)) { throw new UsageError(`--port takes a number, not "${values.port}"`); }

    switch (command) {
        case 'launch': await launch({ run: values.run, port, url: values.url }); return 0;
        case 'doctor': return await doctor({ run: values.run, chrome: values.chrome }) ? 0 : 1;
        case 'cleanup': await cleanup({ run: values.run }); return 0;
        case 'all': return await all({ port, url: values.url, chrome: values.chrome });
        default: {
            const result = await drive({ run: values.run, feature: command, chrome: values.chrome, steps: FEATURES[command].steps });
            return result === 'fail' ? 1 : 0;
        }
    }
}

async function all({ port, url, chrome }) {
    const counts = { pass: 0, fail: 0, skip: 0 };
    const run = new_run_id();
    let launched = false;
    try {
        await launch({ run, port, url });
        launched = true;
        if (!await doctor({ run, chrome })) {
            console.log('FAIL doctor: see doctor.txt; no feature was driven');
            counts.fail += Object.keys(FEATURES).length;
        } else {
            for (const [name, { steps }] of Object.entries(FEATURES)) {
                console.log(`== ${name}`);
                counts[await drive({ run, feature: name, chrome, steps })] += 1;
            }
        }
    } catch (error) {
        console.log(`FAIL launch: ${error.message}`);
        counts.fail += 1;
    } finally {
        if (launched || has_state(run)) {
            try { await cleanup({ run }); } catch (error) { console.log(`FAIL cleanup: ${error.message}`); counts.fail += 1; }
        }
    }
    console.log(`SUMMARY pass=${counts.pass} fail=${counts.fail} skip=${counts.skip}`);
    return counts.fail === 0 ? 0 : 1;
}

main(process.argv.slice(2)).then(code => process.exit(code), error => {
    console.error(error instanceof UsageError ? `error: ${error.message}` : error.stack);
    process.exit(error instanceof UsageError ? 2 : 1);
});
