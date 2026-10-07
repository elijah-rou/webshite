# Personal terminal

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
