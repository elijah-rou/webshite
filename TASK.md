# Personal terminal

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
- [ ] Owner: revoke the token pasted in chat (it stays valid after a refresh).

Acceptance: four tests pass against a mock Graph API (pagination, video covers,
posts without images, idempotent reruns, preserved caption edits, token-free
errors, env file update). Real run on 2026-10-09: 8 posts, 68 images. Headless
Chromium at 1440×1000 and 390×844: no filter on images, badges 10,9,7,10,4,10,8,10,
right arrow 1/4 to 2/4, 4/4 to the next post, left back, no overflow or errors.

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
