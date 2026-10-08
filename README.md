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
excluded from listings and generated routes. `/blog/` redirects to `/writing/`.
`mock-ring-buffer.md` is a placeholder for checking layout; delete it or set
`draft: true` before publishing.

Projects live in `src/content/projects/`, one Markdown file per repository with
`name`, `repo`, `language`, `summary` and `order` in the frontmatter. The list
shows the summary; each project's page shows the GitHub link first, then the body.
The current summaries are condensed from each repository's README.

Photos come from images placed in `src/content/photos/` (JPEG, PNG, WebP or AVIF).
Name files with a leading date, such as `2026-10-08-harbour.jpg`, to list them
newest first; the rest of the name becomes the caption. An optional
`src/content/photos/photos.json` maps a file name to `caption`, `alt` and its
`instagram` post URL. The Photos screen stays at `/instagram/` and links to
[@eli_takes_photos](https://www.instagram.com/eli_takes_photos/); photos are not
fetched from Instagram. While CRT is on they are tinted phosphor green.

Profile links at the bottom left of the screen are in
`src/components/SocialLinks.astro`, each drawn as a 12×12 pixel glyph. The
Mastodon link carries `rel="me"`, so Mastodon can verify the site.

`src/pages/resume.astro` holds the résumé text; the phone number and email from
the PDF are not published.

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
preferences also disable the reveal, the scan band and the zoom animation.

The home menu shows the whole terminal. Opening any entry zooms in until the screen
glass fills the window; Back zooms out again. While zoomed, the screen's text is laid
out smaller so it reads at 20 to 28px depending on the window size.
Without JavaScript every page shows the whole terminal.

Posts favour legibility over the terminal look: a system sans-serif column of about
75 characters, light grey on near-black, at least 17px on screen, with no glow,
scanlines or line-by-line reveal. Headings, links and code stay phosphor green.
Pages mark themselves for this with `data-reading` on their `.article`.

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
