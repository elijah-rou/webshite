---
name: verify-webshite
description: Verify webshite (Elijah Roussos's Fallout 3 terminal personal site, an Astro and Solid static site) in a real headless Chrome. It builds the checkout, serves it locally, and drives the Home menu, Projects search, Talks, Papers and the Photos viewer with real key and pointer events. Use it after changes to src/, public/ or astro.config.mjs, or to prove a fix on the actual pages; with --url it checks a deployed address such as https://eliroussos.com or a branch preview.
---

# Verify webshite

Read [features/README.md](features/README.md) before driving, then the feature file you are proving. Run every command from the repository root. The CLI is `.agents/skills/verify-webshite/scripts/verify-webshite`; call it by that literal path.

## Repository interview

- **Surface:** the website in a browser. Primary: the static pages and the Solid client that runs the terminal menu, search, intro, video embed and photo viewer. Secondary: the deployed Cloudflare Worker (static assets plus `public/_headers`), reachable only with `launch --url`. The audio (`pnpm test` covers its synthesis) and the Instagram sync script (`pnpm photos:sync`, which needs a token) are not driven.
- **Run:** `package.json` has `build` (`astro check && astro build`) and `preview` (`astro preview --host 127.0.0.1`). Launch uses the same Astro binary, building with `--outDir` into the run's own directory and serving that with `--port` and `--ignore-lock`. The site needs no environment variables, data, or credentials: content is checked in under `src/content/`. Dependencies come from `npx -y pnpm@12.10.1 install --frozen-lockfile`. pnpm is not on `PATH` here, and the repo pins 12.10.1.
- **Drive:** the repository has no browser test suite. `pnpm test` runs unit tests only, and the past CDP scripts in `.scratch/perf/` are git-ignored and not shipped. This skill carries its own small driver over the Chrome DevTools Protocol (`scripts/lib/cdp.mjs`), using Playwright's Chrome for Testing build, which is installed on this machine. No browser dependency is added to the project.
- **Observe:** screenshots, accessibility trees, the DOM through the app's own handles, console errors and exceptions, and every network request with its status.
- **Isolate:** each run has its own build directory, port, server process group and Chrome profiles, so runs can coexist. `npx wrangler dev` (the README's route to deployed behaviour) is not used. Under this machine's Bun-backed `node` it starts but never answers a request.
- **Recipe:** `create-verification/references/web.md`.

## Launch

```sh
.agents/skills/verify-webshite/scripts/verify-webshite launch
```

It prints `RUN_ID=ws-<date>-<time>-<pid>` and `EVIDENCE_DIR=...`, then builds with `astro build --outDir $TMPDIR/webshite-verify/<RUN_ID>/dist`. The build takes about 15 seconds; its log goes to `launch/build.log`. It then starts `astro preview` on a free port of 127.0.0.1 in its own process group. Readiness is `GET /` answering 200 with `<title>Home | Elijah Roussos</title>`, printed as `READY http://127.0.0.1:<port> (server process group <pgid>)`. Pass that `RUN_ID` to every later command. `--port N` picks the port, and `--run ID` names the run.

To check a deployed site instead, nothing is built or started:

```sh
.agents/skills/verify-webshite/scripts/verify-webshite launch --url https://eliroussos.com
```

If launch fails, run Cleanup with the printed `RUN_ID`. Teardown is always Cleanup.

## Doctor

Read-only; it answers whether this run's instance is worth driving:

```sh
.agents/skills/verify-webshite/scripts/verify-webshite doctor --run RUN_ID
```

It checks that:

- the server's process group is alive;
- the port is held only by that process group;
- the checkout's HEAD, tracked changes (binary files included) and untracked files' contents, everything outside `.agents/`, still match the build, so a stale build is not driven;
- `/` answers 200 with the Home title and an unknown address answers 404;
It also reports whether Chrome is found. A missing Chrome is a `skip` line, not a failure: the instance is fine, and every drive will SKIP.

For a `--url` run, only the HTTP checks and the Chrome line apply. It ends with `DOCTOR PASS <run> <address>` or `DOCTOR FAIL`, exits 1 on failure, and writes `doctor.txt`. Run it before the first drive and after any failure. After editing product files, launch a new run rather than driving the stale one.

## Drive

One target per mapped feature. Each opens new headless Chrome browsers, drives the feature file's steps, closes them, and ends with `PASS <feature> (<n> checks)`, `FAIL <feature>: <first failed check>`, or `SKIP <feature>: <missing prerequisite>`:

```sh
.agents/skills/verify-webshite/scripts/verify-webshite home-menu --run RUN_ID
.agents/skills/verify-webshite/scripts/verify-webshite projects-search --run RUN_ID
.agents/skills/verify-webshite/scripts/verify-webshite talks --run RUN_ID
.agents/skills/verify-webshite/scripts/verify-webshite papers --run RUN_ID
.agents/skills/verify-webshite/scripts/verify-webshite photos --run RUN_ID
```

The browser is found from `--chrome PATH`, then `WEBSHITE_CHROME`, then Playwright's `chromium-1234` Chrome for Testing, then system Chrome or Chromium. Without one, every feature reports `SKIP <feature>: Chrome not found`. Drives can be repeated in the same run; each browser gets a new profile.

For an unattended full pass, `all` launches a new run, runs Doctor and every feature, and cleans up even after a failure. It ends with `SUMMARY pass=N fail=N skip=N` and exits 0 only if nothing failed:

```sh
.agents/skills/verify-webshite/scripts/verify-webshite all
.agents/skills/verify-webshite/scripts/verify-webshite all --url https://eliroussos.com
```

To diagnose by hand against a run's server, use the `READY` address with `curl`; for example, `curl -sI http://127.0.0.1:<port>/papers/` shows the served headers. Open a new browser through the drive's own library rather than a second Chrome on the shared profile.

## Evidence

Each run has one evidence directory, `.agents/skills/verify-webshite/evidence/<RUN_ID>/`. The skill's `.gitignore` ignores it, and Cleanup never removes it. It holds:

- `launch/`: `revision.txt` (HEAD, whether uncommitted changes existed, and their digest), `build.log`, `preview.log`, or `target.txt` for a `--url` run;
- `doctor.txt`;
- `<feature>/`: `checks.json` (every check, pass or fail, with details), `NN-<state>.png` screenshots, `NN-<state>.aria.txt` accessibility snapshots, and `requests-N.json` and `errors-N.json` for each browser;
- `surviving-evidence.txt`, written by Cleanup.

Proof standards:

- Drive the real visitor path: key presses and pointer events through Chrome, starting from Home where the feature file says so. Never call the app's functions or set its state. The one exception is the returning-visitor flag (`terminal-intro` in local storage), which a real first visit sets. The intro itself is driven from a new profile.
- Capture the action and the resulting state: the address, the highlighted entry, the element that appeared or went away, plus a screenshot and an accessibility snapshot of each proved state.
- Check side effects as well as what is visible. For example: the PDF is fetched and its type and size checked; no YouTube request is made before play; stepping photos adds no history entries; the address follows the image.
- Every drive also fails on page errors and on failed, 4xx or 5xx requests to the site.
- A DevTools command that gets no reply in 20 seconds (a hung page) or a browser that closes or crashes fails the drive, which still prints its result line and closes its browsers.
- No mocks. The local server is the repo's own build and `astro preview`. Neither `_headers` nor Cloudflare's 404 handling runs there; prove those against a deployed address with `--url`, and say which target the proof used.
- An entry point a feature file lists that a drive did not reach is reported as not verified, never covered by another entry point.

## Cleanup

```sh
.agents/skills/verify-webshite/scripts/verify-webshite cleanup --run RUN_ID
```

It stops only what the run recorded: any Chrome process group still listed, then the server's process group (SIGTERM, then SIGKILL after 5 seconds). It never stops anything by name. It checks that the port is no longer held by that group and that no recorded group is alive, removes `$TMPDIR/webshite-verify/<RUN_ID>/` (the build and the profiles), and lists what remains in the evidence directory. It fails if that list is empty. It ends with `CLEANUP PASS <run>: stopped server <pgid>; <n> evidence files kept in <dir>`. Evidence directories accumulate; delete old ones yourself when no longer needed.

## Control CLI

`.agents/skills/verify-webshite/scripts/verify-webshite` is the only entry point: `launch`, `doctor`, `cleanup`, the five feature targets and `all`. Every input is a flag; it never prompts. `--help` on any subcommand shows real examples. A usage error exits 2 and says what to run instead. No subcommand changes anything it did not create. The deployed site is only read, and the local build lives in the run's own directory.

The implementation is in `scripts/lib/` (`cli.mjs` dispatch, `run.mjs` launch, doctor, cleanup and the drive wrapper, `cdp.mjs` the browser, `menu.mjs` the shared page handles) and `scripts/features/<feature>.mjs`, one per feature file. Add a feature by writing `features/<id>.md`, then `scripts/features/<id>.mjs`, and registering it in `FEATURES` in `cli.mjs`.
