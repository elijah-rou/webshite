# Personal terminal

## Performance benchmark

Goal: faster loads with no change in look or behaviour. Measured first, then each
change is re-measured with the identical method. Owner approved items 1-4, then 5-6.

- [x] 1. Housing as Astro-built AVIF (159 KB), WebP fallback (294 KB). The phone copy
      was built, then dropped: the phone layout's border image stretches the sides
      vertically, so a 3/4-width copy was visibly softer on the rails at 2x (review
      finding); it saved 58 KB on 2x phones only.
- [x] 2. `public/_headers`: `/_astro/*` immutable for a year, `/audio/*` a day. Pages
      keep `max-age=0` so a deploy shows at once. `/images/` no longer exists.
- [x] 3. `src/scripts/prefetch.ts`: Chrome reused neither Astro's `<link rel=prefetch>`
      nor a prefetch `fetch()` (pages have `max-age=0` and no ETag), so the router
      downloaded each page twice. Pages are now fetched on hover, focus or touch and
      on menu mount for the highlighted entry, and handed to the router through
      `astro:before-preparation`'s loader; anything unusual falls back to the
      router's loader. Astro's prefetch is off. Never recordings, downloads, other
      sites or the viewer's in-place steps. A prefetched page is used for 30 s.
- [x] 4. Viewer `sizes`: a static per-photo bound in the page (45vw per unit of aspect
      ratio, 76vw on phones; measured across 14 windows) and the exact on-screen
      width (layout max size × settled zoom scale, after fonts load, again on resize)
      for photos the viewer loads. srcset gains 480-1200 px steps.
- [x] 5. Profiled: 110-120 ms in `new AudioContext()` inside the first gesture. The
      context is built while idle after the reveal; the first press only resumes it.
      Sound still needs a press even where the browser allows autoplay (review finding).
- [x] 6. VT323 latin woff2 preloaded. IBM Plex Mono is kept: the key hints under the
      monitor use it (`terminal.css` `.keyboard-hint`).

### Method

Headless Chromium (Playwright's chromium-1234 build) driven over CDP by
`.scratch/perf/bench.mjs` (git-ignored; `summarize.mjs` prints the tables) against
the branch preview, https://agent-fallout-terminal-webshite.elijah-rou.workers.dev.
Before each benchmark, one unrecorded pass loads every address used (desktop and
phone) to warm Cloudflare's edge cache. Each scenario runs 5 times, each run in a
fresh browser profile, with `terminal-intro = seen` set before any page script, once
unthrottled and once throttled (CDP network emulation: 150 ms latency, 1,000,000
bytes/s down, 500,000 up). Figures are median (min-max). Desktop is 1440×1000 at 1x;
phone is 390×844 at 3x with touch.

- Home: bytes are CDP `encodedDataLength`; times are from navigation start (load
  event, first contentful paint, housing `responseEnd`, VT323 file `responseEnd` and
  its `document.fonts` loadingdone). "Fallback drawn" means first paint came before
  VT323 was ready (the fonts use `font-display: swap`).
- Repeat visit: Chrome restarted on the same profile (disk cache only), then Home
  again; 304s are counted from the raw response status.
- Navigation: from Home after its reveal, to About, Writing, Projects and Photos,
  each in a fresh profile. "click" is a script click (no hover); "hover" moves the
  real pointer onto the entry, waits 300 ms, then clicks; "keys" selects with arrow
  keys, waits 300 ms, then presses Enter. Times are from the press (pointerdown,
  Enter keydown or click) to `astro:before-preparation`, `astro:after-preparation`
  (HTML in), `astro:page-load` and the first visible entry or heading.
- Photo viewer: `/instagram/2023-04-13-ig-18042014458441146/` loaded directly, then
  three ArrowRight steps. "File px" is the displayed file's pixel width, "needed"
  the image's on-screen width (`getBoundingClientRect`, after the zoom transform)
  times devicePixelRatio. Photo bytes count every photo file fetched (displayed,
  neighbours preloaded, steps).
- First click: real pointer clicks on Projects; pointerdown to
  `astro:before-preparation`, for the first click after load and two later ones.

### Baseline, commit f5083fa (2026-10-09)

| Metric | Unthrottled | Throttled |
| --- | --- | --- |
| Home desktop: total / housing | 2,069 KB / 1,992 KB | same |
| Home desktop: load event | 1,873 ms (528-2,626) | 2,514 ms (2,493-2,766) |
| Home desktop: housing done | 1,872 ms (527-2,626) | 2,513 ms (2,492-2,766) |
| Home desktop: first paint | 368 ms (308-448) | 480 ms (460-544) |
| Home phone: total / housing | 2,055 KB / 1,992 KB | same |
| Home phone: load event | 894 ms (449-2,118) | 2,634 ms (2,496-2,761) |
| Repeat visit desktop: 304s / load | 7 of 8 requests / 368 ms (239-399) | 7 of 8 / 486 ms (483-583) |
| `cache-control` on HTML, `/_astro/*`, `/images/*` | `public, max-age=0, must-revalidate` | |
| Nav click, press to page-load (About/Writing/Projects/Photos) | 203 / 250 / 228 / 194 ms | 310 / 310 / 312 / 330 ms |
| Nav click, press to before-preparation | 121-134 ms | 129-135 ms |
| Nav hover, press to page-load | 327 / 309 / 287 / 342 ms | 387 / 404 / 393 / 395 ms |
| Nav keys, Enter to page-load | 249 / 110 / 106 / 172 ms | 335 / 189 / 189 / 177 ms |
| Nav: HTML fetch after the press | 36-106 ms, full 3-5 KB response | 160 ms |
| Viewer desktop: displayed file / file px / needed | 112 KB / 1,440 / 622 | same |
| Viewer desktop: time to show | 387 ms (159-513) | 769 ms (697-829) |
| Viewer phone: displayed file / file px / needed | 112 KB / 1,440 / 845 | same |
| Viewer: photo bytes, load plus 3 steps | 1,050 KB in 6 files | same |
| Viewer: step latency, first / later | 126 ms (126-134) / 1 ms | 132 ms / 1 ms |
| First click / second / third | 206 ms (202-219) / 2 / 2 | 207 ms (203-213) / 2 / 2 |
| VT323 ready (desktop) | 498 ms (291-651) | 688 ms (610-898) |
| Fallback font drawn first | 4 of 5 runs | 5 of 5 |

Findings: Home also loads IBM Plex Mono (with VT323). Hover and arrow-key selection
already prefetch the entry's HTML (Astro's `ClientRouter` turns on `prefetchAll`),
but the router then fetches it again in full, so the prefetch saves nothing. The
first press after a load, of any kind (click, Enter, arrow key in the viewer), is
delayed about 130 ms before navigation or the step starts; later presses take 1-2 ms.

### Results, commit c5b4572 (2026-10-09)

Same method as the baseline; final run on the branch preview. The VT323 fallback
count is a per-frame check added during the work (before each paint: is the header's
VT323 text visible while VT323 is not loaded?); its baseline was measured with it on
f5083fa's own preview, https://297da516-webshite.elijah-rou.workers.dev. Menu entries
are now found by label. Median (min-max) of 5.

| Metric | Baseline f5083fa | Final c5b4572 |
| --- | --- | --- |
| Home desktop: first-visit bytes / housing | 2,069 KB / 1,992 KB | 239 KB / 158 KB |
| Home phone: first-visit bytes / housing | 2,055 KB / 1,992 KB | 224 KB / 158 KB |
| Home desktop load event | 1,873 ms (528-2,626) | 290 ms (177-428) |
| Home desktop load event, throttled | 2,514 ms (2,493-2,766) | 619 ms (609-757) |
| Home phone load event, throttled | 2,634 ms (2,496-2,761) | 589 ms (589-639) |
| Home desktop housing done, throttled | 2,513 ms (2,492-2,766) | 594 ms (586-737) |
| Repeat visit: 304s | 7 | 0 |
| Repeat visit desktop load | 368 ms (239-399) | 117 ms (78-198) |
| Repeat visit desktop load, throttled | 486 ms (483-583) | 185 ms (177-186) |
| `cache-control` on `/_astro/*` | `public, max-age=0, must-revalidate` | `public, max-age=31536000, immutable` |
| Hover then click, press to page-load (4 pages) | 287-342 ms | 17-22 ms |
| Same, throttled | 387-404 ms | 18-19 ms |
| Arrow keys then Enter, to page-load (4 pages) | 106-249 ms | 17-21 ms |
| Same, throttled | 177-335 ms | 14-20 ms |
| HTML wait after hover or arrow keys, throttled | 161-163 ms | 0-1 ms |
| Script click without hover, press to before-preparation | 121-134 ms | 1 ms |
| First click, pointerdown to before-preparation | 206 ms (202-219) | 4 ms (2-4) |
| Same, throttled | 207 ms (203-213) | 3 ms (3-4) |
| Viewer desktop: displayed photo / file px for 622 needed | 112 KB / 1,440 | 29 KB / 800 |
| Viewer desktop: photo bytes, load plus 3 steps | 1,050 KB | 376 KB (-64%) |
| Viewer desktop: time to show, throttled | 769 ms (697-829) | 499 ms (483-545) |
| Viewer phone 3x: displayed / file px for 845 needed | 112 KB / 1,440 | 45 KB / 960 |
| Viewer phone: photo bytes, load plus 3 steps | 1,050 KB | 473 KB (-55%) |
| Viewer: first step | 126 ms (126-134) | 2 ms (2-3) |
| VT323 fallback frames, desktop / throttled | 4 (4-12) / 13 (12-15) | 0 / 0 |
| VT323 fallback frames, phone / throttled | 4 (3-9) / 12 (11-12) | 0 / 0 |
| Header first visible, desktop throttled | 405 ms (400-595) | 445 ms (433-583) |

Regressions and caveats:
- Throttled, the header appears ~40 ms later (it now waits for VT323 rather than
  showing the fallback first); unthrottled it appears earlier.
- The audio context is built in one ~110 ms idle task; a press landing during it
  waits (seen once in 15 later-click runs: 93 ms, and twice in 40 navigations).
- The baseline's "fallback drawn" flag (first paint before VT323's `loadingdone`)
  still reads 1 on throttled desktop, because that event waits for IBM Plex Mono
  too; the per-frame count above is the reliable measure.
- Phone browsers without `image-set(... type())` (Safari before 17) download the
  WebP for the border image and the AVIF for the hidden `<img>`.
- The 2 MB source PNG is still emitted into `dist/_astro/` by Astro; nothing requests it.
- Only Chromium was measured; Safari and Firefox were not.

Verification on c5b4572: CI `Build` and `Workers Builds` green; gate2, viewer,
logout, footsound, soundbug2, rate and tilecap pass with no page errors; with
autoplay fully allowed nothing sounds before a press; screenshots of Home, About,
Photos and the viewer at 1440×1000, 390×844 @2x and @3x differ from f5083fa by under
0.6 levels per channel on average (the viewer's photo is now a smaller file; the
densest difference is the magnified housing's grain). Every window from 360×740 to
3440×1440 at 1-3x gets a photo file at least on-screen width × DPR (or the 1440 px
source). Two fresh reviews (full diff, then the fixes) left no blocking findings.

## Mobile fixes (owner report from an iPhone, 2026-10-10)

- [x] Safari: sound stopped and [SOUND ON] could not be turned off. Cause (from the
      code; not reproduced on an iPhone): the context is built before any press,
      Safari can report it, or one it paused in the background, as 'interrupted',
      and only 'suspended' was resumed; the sound button treated "on but not
      running" as "not allowed yet" and never toggled. Any stopped state is now
      resumed from a press (waiting at most 250 ms), and the button toggles once a
      press has asked for sound. A Chromium simulation of Safari's states
      ('interrupted', and a resume that never settles) showed both symptoms before
      and neither after. **Owner: recheck on the iPhone.**
- [x] Phones (700px wide or less) show only the screen on every page, home and the
      intro included, as submenus already did; the housing is neither drawn nor
      downloaded. Phone first visit: 66 KB (was 224 KB after the performance work).
- [x] Intro on phones: the log under the dump was meant to show its last 5 lines but
      `flex: 1` overrode the height, so it ran off the screen and hid the match.
      Fixed; the newest lines stay in view, older ones move up out of it, as in the
      game. Checked at 402×760 and 402×680.
- [x] Photo viewer on phones: < and > sit under the photo as wider targets; the photo
      takes the full width (landscape on 390×844: 282 to 338px). Phone sizes bound
      76vw to 90vw (measured up to 87.4vw); no window from 360×740 to 3440×1440 at
      1-3x gets a file narrower than the photo on screen.

Verification on 9733337 (preview): CI and Cloudflare green; gate2, viewer, logout,
footsound, soundbug2, rate and tilecap pass with no page errors (rate's Home check
once read 0 items, a race in the script, which starts recording without waiting;
three reruns passed). A fresh review found nothing blocking. Known: on phones the
step links come before and after the photo in tab order although both sit under
it; a single-photo post keeps the empty arrow row so photos do not shift; one of
three unthrottled phone loads drew 5 frames of the fallback font.

## Header, menu order, volume (owner requests, after the performance work)

- [x] RobCo header lines smaller (0.9em to 0.7em; 0.7em to 0.6em on phones) and no
      longer a link home, on every screen.
- [x] Home menu order: About, Resume, Projects, Writing, Music, Photos.
- [x] Terminal sounds 10% quieter (gain 0.65 to 0.585). Read as the effects only;
      recordings keep volume 0.8.

Checked locally in Chromium: rate (reveal order follows the new menu, 57 ms
average step), gate2, logout, viewer and soundbug2 pass with no errors.

## Deploy on Cloudflare Workers

- [x] Owner chose Workers (static assets) over Pages and Netlify: static requests
      free and unlimited, 3,000 build minutes a month free, 25 MiB per file.
- [x] `wrangler.jsonc` (assets from `dist/`, 404 page) and a terminal 404 page.
- [x] sharp declared (Node on Linux could not load it; Bun hid this locally).
- [x] CI workflow pushed after the owner granted the `workflow` scope; first run
      passed (install, check, build, 18 tests on Ubuntu, Node 22.18).
- [x] Owner created the `webshite` Worker in Cloudflare (2026-10-09).
- [x] Preview build of the PR branch on Cloudflare: builds and deploys after
      adding `previews: {}` (needed by `wrangler preview`) and enabling preview
      URLs. Live at https://agent-fallout-terminal-webshite.elijah-rou.workers.dev.
      Every route, the intro with sound, reveal rate, photo viewer, logout,
      footer sounds, sound start-up and captions pass against it in Chromium.
- [ ] Unknown addresses on the preview return a bare "Not found" instead of the
      404 page (/404 itself serves); `wrangler dev` honours not_found_handling,
      so this looks specific to the beta `wrangler preview`. Check production
      after merging.
- [ ] Owner: replace placeholder content in a follow-up commit, then merge PR #1.

Acceptance: `wrangler dev` (under Node; Bun hangs its proxy) served /, /about/,
/writing/, /resume/, a photo page and audio with 200; /about and /blog redirect to
their slash form; /does-not-exist returns 404 with the terminal page.
`wrangler deploy --dry-run` read 436 files and found no bindings.

## Random password each run

- [x] The intro's password is drawn at random from 15 fourteen-letter words each
      run; the dump shows 8 of them, and two random wrong guesses always come
      before the password (owner request). The dump's characters and word
      positions were already random per run. Tests cover 200 seeds: words spelled
      once, layouts all distinct, nearly every word serving as the password, and
      the guess order fail, fail, pass. Three replays in Chromium gave three
      passwords (ACCOMPLISHMENT, REPRESENTATIVE, CONSIDERATIONS).

## Fix: hack screen flashed before printing

Symptom: after the log-in press, the whole hack screen showed for ~150ms, vanished
and then printed line by line. Cause: the lines were drawn, then hidden only when
their printing was scheduled after the boot pause. Printing is now scheduled in
the same task that draws them. A per-frame check (any intro line visible, then
hidden) reports every line flashing on the old build and none on the new one;
the log-in prompt never flashed.

## Fix: blank pause after the intro

Symptom (reproduced frame by frame): after skipping, or after ACCESS GRANTED, the
header showed but the greeting took 1.44s and the menu longer. Cause: the menu's
reveal ran before the intro's lines were removed, so they took the first 24
steps. The reveal now runs once the intro is gone: header ~20ms, greeting ~136ms,
first entry ~202ms after a skip, at any point in the hack.

## Logout

- [x] [LOGOUT] left of [SOUND ON] goes home and replays the intro from the log-in
      prompt (owner request); reduced motion just goes home. The intro is
      requested before the swap, so the menu never shows first. On phones the
      footer wraps: Back and profile links, then the three buttons.

Acceptance (headless Chromium): logout from Projects, the photo viewer and home
each lands on the prompt with 0 frames of visible menu; a key press plays the
intro to the menu. Footer fits at 390, 360 and 1440 wide. No errors.

## First-visit hack intro

- [x] On a first visit that lands on home, a Fallout 3 hack plays before the menu
      (owner request): header and memory dump print at the 60ms rate, two wrong
      guesses are scored by likeness, the password matches, ACCESS GRANTED, then the
      menu prints. Auto-played; any key or tap skips (the tap's click is
      swallowed so it cannot open a menu entry). Seeded puzzle logic is tested.
- [x] Once per browser: local storage `terminal-intro`, set on the first page
      load anywhere, so a first visit to another page never shows it later.
      `/?intro` replays it. Reduced motion skips it. html[data-intro] is set in
      the head before the first paint, so the menu does not flash.
- [x] Password is a Very Hard (13-15 letter) word, ADMINISTRATION, with 14-letter
      decoys that wrap across rows as in the game (owner request; the game's own
      Very Hard list could not be found to copy from). The cursor rests longer on
      the password, and the entry sound plays again at ACCESS GRANTED.
- [x] Sound in the intro (owner request): browsers allow it only after a key
      press or tap, so the intro opens on ">PRESS ANY KEY OR TAP TO LOG IN"; that
      press unlocks sound and starts the hack. Escape at the prompt skips it.
      Taps are taken on click (the event phones accept for sound) and stopped.
- [x] The match plays Fallout 3's successful-hack sound (ui_hacking_passgood.wav,
      same source as the other sounds), and the pause after it is 750ms (was
      450ms). Checked: the 168ms sound starts at the match; intro 5.4s.
- [x] The dump font fits the screen (measured after VT323 loads); narrow screens
      put the log under the dump.

Acceptance (headless Chromium, fresh profiles): at 1440×1000 the intro runs
about 5.1s (ACCESS GRANTED at 4.4s) after the pauses were shortened (owner request; was 8s) with no overflow, then the menu prints; reload
shows the menu directly. At 390×844 the dump is 15.4px, stacked; a tap where a
menu entry would be skips without navigating. Enter skips without opening About.
A first visit to /about/ then Back to home shows no intro. No errors.
With the prompt (autoplay restricted, every sound start counted): no sound before
the prompt; a key press starts the hack with sound (11 sounds in 1.5s, 25 by the
menu, 5.1s); a real touch tap does the same on a phone and a second tap skips to
the menu without opening an entry; Escape at the prompt goes to the menu.

## About placeholder with portrait

- [x] Placeholder About copy from résumé and projects facts only (owner will
      replace it); personnel record (name, location, role, education, languages,
      instrument).
- [x] Portrait from the public LinkedIn photo (only 200×200 is public; larger
      sizes return 403), dithered to eight phosphor shades at 144px by `scripts/portrait.mjs`,
      framed with corner brackets and scanlines; CRT OFF removes the glow and lines.

## Fuzzy search for Writing, Projects and Music

- [x] `src/scripts/fuzzy.ts` (tested): substring or word-start subsequence per term
      over title, detail, note; exact-only for numeric terms and long body text.
- [x] Search box in `TerminalMenu` (`searchable` on `Nav`): typing starts it, `/`
      focuses it, arrows/Enter act on results, Escape clears then goes back.

Acceptance (headless Chromium, real key events): "zig" 3/8 ranked turso-zig,
hivemind, advent-of-code; ArrowDown moved the selection; Escape cleared, then went
home; "kube" found surfsk8s via its page text and Enter opened it; "2026-10" and
"garbage" found the mock post; "2025" showed "No matches."; no runtime errors.
Not checked on iOS Safari, which may zoom when a small input gains focus.

## Reading mode for opened sections

Iterating on the mock post first, then other sections. Variants compared in
headless Chromium (scratch CSS, not committed): A current VT323 with CRT effects;
B pale green IBM Plex Mono; C system sans on near-black; D Charter serif. C and D
read best; C chosen because system sans renders consistently on every platform,
while Charter ships only on Apple systems.

- [x] Iteration 1 on posts (`data-reading`): ~76 characters per line at 20.5px on
      1440×1000, 17px minimum on a 390px phone, no CRT effects or reveal.
- [x] Iteration 2 ("lean a little more into the style"): dim green screen, pale
      phosphor text with faint glow, faint scanlines, `>` on headings and list
      markers. A stronger step with IBM Plex Mono body text was shown, not applied.
- [x] Iteration 3: owner preferred the stronger step and asked for more width and
      a serif. System serif (Charter on Apple), ~1000px column, 23.3px text and
      ~86 characters per line on 1440×1000; 17px minimum on a 390px phone.
- [x] Iteration 4: use the screen's width (full width beat a margin-headings
      layout, which clipped headings): 1227px column, 25.5px serif, ~96 characters
      on 1440×1000; 18.4px on a phone. Normal CRT effects restored on posts
      (owner request); line reveal stays off.
- [x] Iteration 5: serif candidates compared (Courier Prime, IBM Plex Serif, Zilla
      Slab, Roboto Slab); owner ruled out monospace for body text and chose Zilla
      Slab, bundled as `@fontsource/zilla-slab` 5.3.0.
- [x] Code font: Iosevka Term Slab, subset from the owner's installed Nerd Font
      (Iosevka 34.8.0) to ~17 KB WOFF2 per weight, OFL licence included.
- [x] Applied to every opened screen via `data-reading` on `<main>`: About,
      Writing, Projects and project pages, Resume, Music, Photos. Menu labels keep
      VT323; descriptions use Zilla Slab. Writing entries show the date as the
      detail and the description as the note. Fixed a stale 100ch article limit
      and a 2ch row gap in menu entries. GitHub icon added to the profile links.

## Fix: sound when a visit starts outside the home menu

Symptom (reproduced, headless Chromium with autoplay restricted, fresh profile
starting at /projects/): the button reads [SOUND ON] but hovering is silent, and
clicking it turns sound off; a second click was needed to hear anything. Cause:
browsers allow sound only after a key press or tap, hover never allows it, and
the button toggled regardless. Home hid it, because the intro's log-in press
allows sound.

- [x] The first key press, click or tap anywhere allows sound (Escape does not
      count in browsers), so hovering is heard from then on.
- [x] While sound is on but not yet allowed, the sound button allows it and
      confirms with a sound instead of turning it off.

Acceptance (same reproducer): first press on the button keeps [SOUND ON], plays a
sound, and hovering then plays; or a click on the heading, then hovering plays;
the button then toggles off and on normally. Intro checks unchanged; no errors.

## Photo captions on the grid

- [x] Each Photos tile shows its caption underneath in small Zilla Slab, at most
      two lines (owner request). Hashtags are stripped from every caption read
      from photos.json, so hand edits cannot bring them back.

Acceptance (headless Chromium): 8 captions, none with "#", 20px on 1440×1000 and
14.2px on 390×844, long ones clamped to two lines, no overflow, no errors.

## Submenu entries print line by line

- [x] Menu entries and the search line on opened screens (Writing, Projects,
      Music, project pages) print one by one like the home menu (owner request);
      prose and headings still appear at once.
- [x] Photo grid tiles appear whole, one at a time (owner request: no wipe): each
      waits for its image (up to 500ms) and follows the previous by at least
      60ms. The photo viewer's image still appears at once.
- [x] One rate everywhere (owner request): every line, entry and tile takes a
      60ms step in page order (the 900ms total cap that sped up longer screens is
      gone); entries below the visible screen print with the last visible one.

Acceptance (headless Chromium, opened from the home menu): Projects' 8 entries
carry staggered delays and finish within about a second; Photos' 8 tiles likewise
appear 60ms apart, never part-drawn, each with its image loaded (cold cache and
throttled network, checked every frame); CRT OFF mid-reveal shows them all; the
mock post shows no reveal; no errors. Measured gaps per screen (frame-quantised
50-67ms): Home 57ms average, Projects 55ms, Writing 58ms, Photos 61ms.

## Instagram sync for Photos

- [x] `pnpm photos:sync`: Instagram API with Instagram Login, refreshes the token
      in `.env.local`, downloads new posts into `src/content/photos/`, keeps edits.
- [x] Owner set up a Business app (messaging and content use case, Instagram
      Login setup, Instagram Tester role) and generated a token.
- [x] First real sync: 8 posts, all albums; the cover of each is downloaded.
- [x] Every album image (owner request): each post is a folder; the grid shows a
      tile per post with its image count; /instagram/<post>/<n>/ shows one image
      with a counter, a menu and left/right stepping across posts.
- [x] Photos keep their colour under the CRT effects (owner request).
- [x] `<` and `>` against the sides of an album image replace the Next image and
      Previous image menu entries (owner request); hidden at the album's ends.
- [x] Viewer without page loads (owner request): stepping swaps the image in
      place, so the header, footer and scrollbar stay; a constant frame shows
      "Loading..." until an image arrives; neighbours are fetched ahead. No
      scrolling: the image (thin green border) links to the image on Instagram
      (`img_index`), Previous post and Next post split the row below, greyed out
      at the ends. The address follows with replaceState, so Back leaves the viewer.
- [x] Photos grid without the Instagram profile link (the footer icon remains);
      the grid scrolls when it outgrows the screen. Checked with 40 tiles: PageDown,
      wheel (phone; desktop wheel events do not scroll any page in this headless
      setup) and arrow keys scroll it, and focused tiles stay in view with outline.
- [ ] Owner: revoke the token pasted in chat (it stays valid after a refresh).

Acceptance: four tests pass against a mock Graph API (pagination, video covers,
posts without images, idempotent reruns, preserved caption edits, token-free
errors, env file update). Real run on 2026-10-09: 8 posts, 68 images. Headless
Chromium at 1440×1000 and 390×844: no filter on images, badges 10,9,7,10,4,10,8,10,
right arrow 1/4 to 2/4, 4/4 to the next post, left back, no overflow or errors.
Viewer (same sizes): header and footer are the same elements after clicks and
keys; screen scroll height equals its height; frame and buttons keep their boxes
across posts, captions and a throttled uncached load, which shows "Loading...";
history.back() returns to /instagram/; the newest post greys out Previous post.

## Photos, projects, resume, menu focus

- [x] Photos from `src/content/photos/` (decision: local folder, not the Instagram
      API or scraping), thumbnail grid with arrow keys, per-photo pages, tint.
- [x] Projects as a content collection; summaries condensed from each README;
      each opens a page with the GitHub link first.
- [x] Resume page from the supplied PDF, without phone number or email.
- [x] Remove the home cursor; widen posts to a 100ch column.
- [x] Fix: hover and arrow keys could highlight different menu entries, and
      Enter opened the focused one; hover now moves focus and the bar is the
      only indicator.

Acceptance (headless Chromium, 1440×1000 and 390×844): with sample images
(since removed), the grid, arrow keys, Enter, viewer, tint and CRT OFF worked
with no overflow. Arrow keys to Projects, hover About, ArrowDown, Enter opened
Writing with one highlighted entry at every step. Project and resume pages
render and PageDown scrolls them.

## Reading layout for posts

Done means: a mock post exercises paragraphs, headings, lists, code, a quote and a
link, and reads like the reference blogs: one centred column, roomy lines,
monochrome code, keyboard scrolling.

- [x] Add `src/content/writing/mock-ring-buffer.md` (category MOCK; delete or
      mark `draft: true` before publishing real posts).
- [x] Centre posts in a 66ch column; line-height 1.42; lighter glow on prose;
      monochrome code blocks in the screen font (Shiki highlighting off).
- [x] Focus `<main>` on page load so arrow and Page keys scroll the screen.

Acceptance (headless Chromium): at 1440×1000 the column is 733px wide with 27.8px
text on 39.5px lines; at 390×844, 20px text on 28.4px lines. PageDown scrolled
357px and 384px respectively, where it previously did nothing. IBM Plex Mono was
compared for body text; the terminal font was kept.

## Zoom in on opened screens; remove the guitar jack

Done means: the home menu shows the whole terminal; any opened entry zooms in on
the screen (animated on client navigation, instant on direct load); the jack,
its sounds, tests and docs are gone. Keep changes local.

- [x] Remove the jack component, socket, styles, plug sounds and their tests.
- [x] Zoom: scale the station about the screen centre to fill 94% of the window,
      capped at 30px text; keep zoom and CRT state on `<html>` across Astro swaps.
- [x] Verify in headless Chromium at 1440×1000, 1920×1080 and 390×844.
- [x] Follow-up: zoom until the inner screen fills the window (98% of the limiting
      side) rather than capping the magnification; lay text out at 20–28px
      effective size; keep scanlines at device scale.

Follow-up acceptance: the screen measured 1411×920 at 1440×1000, 1623×1058 at
1920×1080, 1004×654 at 1024×768 and 382×647 at 390×844, with effective text of
27.8, 28, 21.3 and 20px; no overflow or runtime errors; Back zooms out.

Acceptance: Astro checks 28 files with zero diagnostics; both synthesis tests
pass. Home shows the full terminal; Writing and About show the screen centred at
1067×695 (1440×1000 and 1920×1080) and 367×620 on a 390×844 phone, with no
overflow. Back animates out, and CRT OFF survives navigation. No runtime errors.
The first attempt mis-centred phones because offsets started inside the monitor
border, and `offsetParent` changed once the station was transformed; making the
station the positioned parent fixed both.

## Review, Fallout 3 refinement, music and jack

Done means: code reviewed for correctness with blockers fixed; the screen reads
closer to a Fallout 3 terminal; agent-written filler removed; the Music screen
lists the owner's recordings (play in place) and FL Studio, Bitwig and Logic
project files (download) from `public/music/`; a 1/4" guitar cable outside the
screen plugs into a jack on the housing by drag, click or keyboard, with an amp
plug-in sound. Keep changes local.

- [x] Review code; fix invalid ARIA, visible disabled controls without JS, arrow
      keys ignored after the skip link, collapsed date spacing, unused `category`.
- [x] Fallout 3 styling: centered RobCo-style header, phosphor bloom, glowing
      selection bar, rolling scan band, line-by-line reveal with the charscroll
      WAV, terminal font for prose, monitor sized to the viewport height.
- [x] Remove the agent-written "Terminal online" post; redirect `/blog/`.
- [x] Replace the on-screen Les Paul and chord with the music file menu.
- [x] Guitar jack: drag, click and keyboard; side entry on wide screens, bottom
      entry below 1180px; synthesized plug and unplug sounds with tests.
- [x] Verify build, tests, desktop/mid/mobile layouts, playback, keyboard paths.
- [x] Fresh review of the integrated diff; fix blockers; commit locally.

Acceptance: Astro checks 28 files with zero diagnostics and builds seven pages
plus the `/blog/` redirect; three synthesis tests pass. Browser checks at
1440×1000, 1024×768 and 390×844: plug by click, drag in, drag out and Enter;
socket and resting plug placed on load; no horizontal overflow; arrow, Enter and
Escape navigation; jack state kept across client navigation; CRT OFF removes the
glass and the reveal. With temporary fixtures (since deleted), a FLAC played and
stopped from the menu, muting stopped it, projects carried `download`, and a test
post rendered in the terminal font. The review found the jack mount point adding
a second body grid row, which pushed the monitor 31–131px above centre; fixed and
measured centred at 1440×1400. Recordings now stop when leaving the Music screen,
and CRT OFF clears unfinished reveal lines. With no posts, the build warns that
`src/content/writing` has no Markdown files.

## Rebuild

Done means: Solid 2 owns interactive state; the compact, worn CRT and vertical
menu match the supplied Fallout references; visible copy contains only concrete
content; existing routes, Markdown, sound preferences, and guitar controls work
on desktop and mobile. Keep changes local. Stop only for an unsupported integration
that requires a larger architecture change or a missing product decision.

- [x] Confirm and pin Solid 2 dependencies; verify a working client component.
- [x] Replace the wide portfolio layout with a compact CRT and terminal menus.
- [x] Move menu, preferences, and guitar state into Solid; retain static navigation.
- [x] Run a separate unslop pass on visible copy and update maintained docs.
- [x] Check build, audio tests, keyboard/mouse journeys, mobile, and no-JS content.
- [x] Review the integrated result, fix blockers, and commit locally.

Solid 2.0.0-rc.13 uses its own Vite plugin because Astro's official integration
still targets Solid 1. See docs/decisions/002-solid-terminal.md. The generated CRT
housing and its prompt are retained in public/images/; the screen remains HTML.

Rebuild acceptance: frozen pnpm installation passes; Astro checks 26 files with
zero diagnostics and builds all eight routes; both audio tests pass. Production
browser checks at 1440×1000 and 390×844 confirm menu arrows/Home/End/Enter/Escape,
mouse navigation, guitar plug/unplug/strum, the connected cable, persistent mute
and CRT settings, and no horizontal overflow. Terminal WAVs and the chord start
non-silent audio buffers; muting stops active sources and muted strum starts none.
Generated HTML contains navigation and Markdown without JavaScript. Internal
links resolve. The final navigation sequence recorded no runtime errors.

A separate source review caught Enter following hover instead of keyboard focus.
The wrong navigation was reproduced, fixed, and verified in the production
browser. The focused re-review found no remaining blockers. The unslop pass
removed slogans, invented promises, and redundant personal copy.

## Original prototype

Done: local Astro site with a CRT frame, working page navigation, sound controls,
Markdown writing, and a keyboard-accessible Les Paul Special plug-in interaction.
Desktop/mobile journeys and production build must pass. No remote publication.

- [x] Inspect destination and choose the local stack.
- [x] Adopt the user’s existing `elijah-rou/webshite` repository in ~/Projects/webshite.
- [x] Build terminal frame, pages, and guitar illustration.
- [x] Add bounded audio, original terminal WAVs, mute, and effects controls.
- [x] Verify production build, browser journeys, mobile layout, and audio output.
- [x] Inspect and commit the completed local prototype.

Two WAVs from fohtla/Fallout3Terminal are reported by their uploader to originate
in Fallout 3. Source and hashes are retained in public/audio/SOURCES.md. Independent
comparison against the game archive is unavailable. Guitar audio is synthesized;
real recordings and project claims are not invented.

Acceptance evidence: eight static routes build with zero diagnostics; both synthesis
tests pass under Node and Bun; original WAVs decode to non-silent browser buffers;
guitar plug, unplug, strum, and Enter activation work; muted strum starts no source;
CRT OFF removes scanlines; SOUND/CRT preferences survive navigation and reload;
390px mobile rendering has no horizontal overflow. Fast writing-page navigation
was rerun after handling expected native-animation cancellation; no unhandled
errors remained. A focused read-only review found no blockers and rechecked that fix.
