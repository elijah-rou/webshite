# webshite verification map

This directory is the maintained source for verifying what visitors to the site can do. Read this index before driving, then use the matching feature file as the recipe. Every drive goes through `.agents/skills/verify-webshite/scripts/verify-webshite`, run from the repository root.

## Baseline preconditions

- The site runs at the `READY` address that `verify-webshite launch` printed for this run. The default is a build of this checkout in `$TMPDIR/webshite-verify/<RUN_ID>/dist`, served by `astro preview` on a free port on 127.0.0.1. `launch --url <address>` instead targets an already deployed site, read-only.
- `verify-webshite doctor --run RUN_ID` ends with `DOCTOR PASS`.
- Content is the checked-in content: eight Home entries (Writing and Music disabled), the projects in `src/content/projects/`, one talk (`cerebrium-knative`), two papers (`neuroevolution-ant-swarms`, `implicative-bayesian-networks`), and the photo posts in `src/content/photos/`, at least one of them an album.
- Each browser is a new headless Chrome with an empty profile, at 1440×1000 unless a step says phone (390×844, touch). Except where a step says first visit, the profile is a returning visitor's: the intro has been seen (`terminal-intro` in local storage), as it is after any real first visit.
- Evidence goes to `.agents/skills/verify-webshite/evidence/<RUN_ID>/<feature>/`, which Cleanup never touches.
- Never drive a local server this run did not start.

## Driving conventions

- Every step is a real key press or pointer event sent to Chrome. Nothing calls the app's functions or sets its state, apart from the returning-visitor flag above.
- Elements are found by the app's own handles: `#menu-results` (the mounted menu), `a[data-selected="true"]` (the highlighted entry), `.menu-search input` (search), `[data-back]` (Back), `[data-video-embed]`, `[data-photo-grid]`, `[data-photo-viewer]`. Not by position or tab order.
- After any navigation, a step waits for the new path, for `document.readyState` to be `complete`, and for the page to settle: no `.reveal-line` or `.reveal-pending` (Home's line-by-line print) and no `html[data-zoom-animate]` (the zoom on opening an entry). Clicks also wait for this; before it, entries move under the pointer.
- The pointer selects whatever menu entry it rests on. Move it off the menu (the drive's `park_pointer`) before typing or using arrow keys after a click.
- Drives change nothing that persists: the site is static, and each browser profile is deleted with the run.

## Proof and skip reporting

- Each drive writes `checks.json` (every check, its result, and details on failure), screenshots `NN-<state>.png`, accessibility snapshots `NN-<state>.aria.txt` (the URL, then role and name per node), and for each browser `requests-N.json` and `errors-N.json`.
- Each drive also fails on any page error (uncaught exception or `console.error`) and on any failed or 5xx request to the site itself. Requests to YouTube are recorded but not judged.
- A drive ends with one line: `PASS <feature> (<n> checks)`, `FAIL <feature>: <first failed check>`, or `SKIP <feature>: <missing prerequisite>`. The only skip is a missing Chrome.
- An entry point a feature file lists that a drive did not reach is reported as not verified. It is never covered by a different entry point.
- The local build is `astro preview`, not Cloudflare. Response headers from `public/_headers` and Cloudflare's own 404 handling are only verified against a deployed address (`launch --url`).

## Feature file contract

Each feature file starts with an H1 title and one paragraph describing what a visitor sees. It then has exactly four H2 sections, in this order:

1. `Sub-features`: short IDs, one line each. Check names in `checks.json` start with these IDs.
2. `How to get to it (user POV)`: every entry point a visitor has.
3. `Driving it with verify-webshite`: starts with `Preconditions:`, then the drive target, then labelled bullets pairing each visitor action with the observable result.
4. `Gotchas`: traps that waste or invalidate a run.

## Features

- [Home menu](./home-menu.md): first-visit intro and its skip, arrow keys over disabled entries, Enter, Escape, pointer, Back, phone tap.
- [Projects search](./projects-search.md): the Projects list and its fuzzy search, by typing and by `/`, with matches, no matches, and Escape.
- [Talks](./talks.md): the Talks list and a talk page whose recording plays in place, with no request to YouTube before play.
- [Papers](./papers.md): the Papers list, paper pages, PDF downloads, the demo video, and search.
- [Photos](./photos.md): the photo grid and the viewer, stepping through an album and between posts.
