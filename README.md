# Personal terminal

A portfolio and blog styled after Fallout 3's desktop terminals. Astro builds the
pages; Solid 2 controls the menu, sound settings and Les Paul Special interaction.

Requires Node.js 22.18 or newer and pnpm 12.10.1:

```sh
pnpm install
pnpm dev
```

Open the address printed by Astro. Run `pnpm build` for type checking and a static
build, `pnpm test` for audio synthesis tests, and `pnpm preview` to serve the build.
The test launcher supports Node.js and a Bun-backed node shim. Dependency lifecycle
scripts are disabled; the installed platform binaries are used directly.

## Content

Add Markdown posts to `src/content/writing/`. Frontmatter contains `title`,
`description`, `date`, optional `category`, and optional `draft: true`. Drafts are
excluded from listings and generated routes. `terminal-online.md` is a site note.
The existing `/about/`, `/blog/` and `/instagram/` routes remain available.

## Controls

Use the mouse, Tab, or arrow keys to select an entry. Enter opens the focused entry;
Escape goes back. The Back link stays visible when the screen content scrolls.
Sound begins with a click or keyboard gesture. SOUND and CRT preferences persist
when browser storage is available. Muting stops active and pending audio.
Reduced-motion preferences disable the cursor and cable animation.

On the Music page, plugging in the guitar plays a synthesized E major chord.
It is not a recording of the owner's instrument. Terminal navigation uses two WAVs
reported by their uploader to come from Fallout 3, with synthesized clicks as a
fallback. See [audio sources](public/audio/SOURCES.md).

The weathered housing is a generated image; see its prompt and provenance in
[image sources](public/images/SOURCES.md). The screen text remains selectable HTML.
Static content and navigation work without JavaScript; the guitar needs JavaScript.

## Solid 2

Solid is pinned to `2.0.0-rc.13`. Astro's official integration currently supports
Solid 1, so this project uses Solid 2's Vite plugin and a browser mount entry.
See [the integration decision](docs/decisions/002-solid-terminal.md) for lifecycle
and compatibility details.
