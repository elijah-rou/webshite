# Personal terminal

A portfolio and blog styled after Fallout 3's desktop terminals. Astro builds the
pages; Solid 2 controls the menu, sound settings, music playback and screen zoom.

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
excluded from listings and generated routes. `/blog/` redirects to `/writing/`;
the Photos entry stays at `/instagram/`.

Put music files in `public/music/`. The Music screen lists them at build time,
recordings first, using the file name without its extension as the title:

| Suffix | Listed as | Selecting it |
| --- | --- | --- |
| `.flac`, `.mp3` | Recording | Plays or stops it in the terminal |
| `.flp` | FL Studio project | Downloads it |
| `.bwproject` | Bitwig project | Downloads it |
| `.logicx.zip` | Logic Pro project | Downloads it |

Logic projects are folders, so zip them first. Any other file, except dotfiles,
stops the build with a list of supported suffixes. Large audio and project files
are committed and deployed with the site; consider Git LFS before adding many.

## Controls

Use the mouse, Tab, or arrow keys to select an entry. Enter opens the focused entry;
Escape goes back. The Back link stays visible when the screen content scrolls.
Sound begins with a click or keyboard gesture. SOUND and CRT preferences persist
when browser storage is available. Muting stops effects and the playing recording.
CRT OFF removes scanlines, glow and the line-by-line screen reveal. Reduced-motion
preferences also disable the reveal, the cursor, the scan band and the zoom animation.

The home menu shows the whole terminal. Opening any entry zooms in until the screen
fills most of the window, capped so text is at most 30px tall; Back zooms out again.
Without JavaScript every page shows the whole terminal.

Terminal navigation uses two WAVs reported by their uploader to come from Fallout 3,
with synthesized clicks as a fallback. See [audio sources](public/audio/SOURCES.md).

The weathered housing is a generated image; see its prompt and provenance in
[image sources](public/images/SOURCES.md). The screen text remains selectable HTML.
Static content and navigation work without JavaScript; recordings then open in the
browser's own player.

## Solid 2

Solid is pinned to `2.0.0-rc.13`. Astro's official integration currently supports
Solid 1, so this project uses Solid 2's Vite plugin and a browser mount entry.
See [the integration decision](docs/decisions/002-solid-terminal.md) for lifecycle
and compatibility details.
