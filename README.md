# Personal terminal

A local Astro portfolio/blog inspired by Fallout 3 terminals, with a CRT bezel,
scanlines, Fallout terminal navigation audio, and a Les Paul Special plug-in interaction.

Requires Node.js 22.18 or newer and pnpm 12.10.1. From this directory:

```sh
pnpm install
pnpm dev
```

Open the local address printed by Astro. `pnpm check`, `pnpm test`, and
`pnpm build` validate the project. `pnpm preview` serves the production build.
The test launcher supports both Node.js and a Bun-backed node shim.
Dependency lifecycle scripts are disabled in this project; the installed platform
binaries are used directly.

## Content

Posts live in `src/content/writing/` as Markdown. Frontmatter includes `title`,
`description`, `date`, optional `category`, and optional `draft: true` to exclude
a post from both listings and generated routes. `terminal-online.md` is a starter
site note. Projects and recordings are intentionally empty until real content exists.

## Interaction

Navigation works without JavaScript. JavaScript enables page transitions, sound,
and the guitar. Sound begins after a user gesture, never on initial load. The
SOUND and CRT controls remember preferences when browser storage is available.
Reduced-motion preferences disable animation. Muting immediately stops active audio.

The guitar chord is synthesized with a plucked-string model, not recorded from the
owner’s instrument. Navigation uses two WAVs reported to be extracted from Fallout 3;
see `public/audio/SOURCES.md` for provenance. Synthesized clicks are a fallback if
those files cannot be loaded or decoded.

The existing `/about/`, `/blog/`, and `/instagram/` routes remain available. The
Instagram route is a photo archive; no external account or gallery has been invented.

The checkout uses `elijah-rou/webshite`. No changes have been pushed or published.
