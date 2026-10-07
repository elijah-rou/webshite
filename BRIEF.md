# Website brief

The agreed direction for Elijah's portfolio and blog, including his corrections
to the first prototype.

## Purpose

Build Elijah Roussos's personal portfolio and blog, with space for programming,
projects, writing, and music. Use the existing
[elijah-rou/webshite](https://github.com/elijah-rou/webshite) repository in
`~/Projects/webshite`.

The initial idea was a website inspired by a favourite game, possibly combined
with Elijah's interest in music and guitar. The chosen direction is the
**Fallout 3 desktop terminal**, with Pip-Boy screens as an additional reference
for menus and the music section.

## Visual direction

The site should feel like operating a Fallout terminal. Elijah's feedback on
the first prototype was that it was too polished and too "put together".
The supplied game screenshots are the main visual reference.

- A large, physical CRT outline with a thick, worn housing, rounded glass,
  visible wear, vents, and an orange hardware button.
- Green phosphor text on a dark screen, with scanlines and restrained glow.
- Small, dense monospace text and simple vertical menus. The selected row uses
  a solid green highlight with dark text.
- Plain headers, prompts, and thin rules. Leave unused screen space where the
  content does not need it.
- Compact inventory-style presentation for the guitar, drawing on the Pip-Boy's
  item lists, monochrome illustrations, and short descriptions.

Remove the first prototype's oversized headings, polished cards, decorative
status labels, slogans, and generic portfolio copy. Writing should remain easy
to read inside the terminal.

## Content and interaction

The portfolio and blog are the main content. Include a music section centred on
Elijah's **Gibson Les Paul Special**. About and Photos are supporting pages;
preserve the repository's existing routes when reorganising the site.

Navigation should respond to mouse and keyboard input, with Fallout 3 terminal
or Pip-Boy sounds as the visitor moves through it. Support arrow-key selection,
Enter to open, and an obvious way back. Provide sound and CRT-effect controls,
and respect reduced-motion preferences. Keep the site usable on a phone.

In the music section, visitors should be able to "plug in" the Les Paul Special.
Show the cable connecting, make the connected state clear, and let the visitor
hear and replay a chord. This is an on-screen interaction; it does not require
the visitor to connect a physical instrument.

The brief called for the game's navigation sounds. Elijah did not have local
extracted files and suggested finding them online. Keep audio provenance with
the assets and distinguish game audio from any synthesized fallback.

## Writing and references

Use direct, personal copy grounded in what Elijah has supplied. Do not invent
biography, project achievements, recordings, opinions, or promises about future
content. Empty sections can say that they are empty. Run an unslop pass on
substantial visible copy.

Elijah supplied these sites as references:

- [matklad](https://matklad.github.io/)
- [bashbunni](https://www.bashbunni.dev/)
- [Avi's blog](https://avi.im/blag/about/)
- [govvi.fun](https://www.govvi.fun)

The game references showed the Fallout 3 hacking terminal, a desktop terminal
with a vertical selection menu, the Pip-Boy SPECIAL screen, and a skills screen.
Use their proportions, density, selection treatment, and worn hardware to guide
the design.

## Agreed stack and prototype choices

Keep **Astro** for pages, routes, and Markdown posts. Use **Solid 2.0** for the
interactive terminal, including menu selection, sound settings, and guitar state.
Elijah explicitly approved Solid 2 after discussing vanilla JavaScript.
Use TypeScript for the client code. See the
[integration decision](docs/decisions/002-solid-terminal.md) for package and
compatibility details.

The generated CRT housing, SVG guitar drawing, and synthesized E major chord
are prototype implementation choices. They are replaceable assets, not additional
requirements from Elijah. The chord should be identified as synthesized rather
than presented as a recording of his guitar. See the
[image notes](public/images/SOURCES.md) and [audio notes](public/audio/SOURCES.md).
