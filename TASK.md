# Personal terminal

## Deploy on Cloudflare Workers

- [x] Owner chose Workers (static assets) over Pages and Netlify: static requests
      free and unlimited, 3,000 build minutes a month free, 25 MiB per file.
- [x] `wrangler.jsonc` (assets from `dist/`, 404 page) and a terminal 404 page.
- [x] sharp declared (Node on Linux could not load it; Bun hid this locally).
- [x] CI workflow pushed after the owner granted the `workflow` scope; first run
      passed (install, check, build, 18 tests on Ubuntu, Node 22.18).
- [x] Owner created the `webshite` Worker in Cloudflare (2026-10-09).
- [ ] Preview build of the PR branch on Cloudflare before merging.
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
