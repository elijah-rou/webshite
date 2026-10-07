# Personal terminal prototype

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
