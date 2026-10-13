# Home menu

A visitor lands on a Fallout-style terminal. On a first visit it opens on a log-in prompt that plays a hacking intro; Escape skips it. The menu then lists eight entries. Writing and Music are dimmed "(in construction)" and cannot be selected or opened. The arrow keys, Home and End move the highlight over the other six. Enter or a click opens an entry, and Escape or the Back link returns.

## Sub-features

- `intro-skip`: a first visit opens the intro; Escape skips to the menu.
- `menu-entries`: the eight entries in order, with Writing and Music as disabled, `aria-disabled` spans.
- `menu-keys`: ArrowDown and ArrowUp skip disabled entries and wrap; End jumps to the last entry.
- `menu-open`: Enter opens the highlighted entry.
- `menu-back`: Escape, and the Back link, return Home.
- `menu-disabled`: clicking a disabled entry goes nowhere.
- `menu-pointer`: clicking an entry opens it.
- `menu-phone`: tapping an entry on a phone-sized screen opens it.

## How to get to it (user POV)

- Open `/`. A first visit, or `/?intro`, plays the intro first.
- Keyboard: arrow keys, Home and End, Enter, Escape.
- Pointer: hover and click an entry, and click `> Back` at the bottom of any opened screen.
- Touch, on a screen 700px wide or less.
- `[LOGOUT]` in the footer replays the intro. Not driven.

## Driving it with verify-webshite

Preconditions:

- Drive target: `.agents/skills/verify-webshite/scripts/verify-webshite home-menu --run RUN_ID`.
- `doctor` passed for this run.

- **First visit.** A new profile with no `terminal-intro` opens `/`. `html[data-intro]` is set and `[data-intro-root]` has text (`01-intro.png`).
- **Skip the intro.** Escape. `data-intro` is removed and the menu shows `> About` highlighted (`02-after-intro.png`).
- **Entries.** A returning visitor opens `/`. The menu reads About, Resume, Projects, Talks, Papers as links, then Writing (in construction) and Music (in construction) as `aria-disabled` spans, then Photos (`03-home.png`, `03-home.aria.txt`).
- **Arrow keys.** ArrowDown five times highlights `> Photos`. ArrowDown once more wraps to `> About`. End highlights `> Photos`, and ArrowUp then `> Papers`.
- **Open and return.** Enter opens `/papers/` (`04-papers-by-enter.png`); Escape returns to `/`.
- **Disabled.** Clicking the Writing entry leaves the address at `/`.
- **Pointer.** Clicking `Talks` opens `/talks/`; clicking `> Back` returns to `/` (`05-home-again.png`).
- **Phone.** At 390×844 with touch, tapping `Projects` opens `/projects/` (`06-phone-home.png`, `07-phone-projects.png`).

## Gotchas

- Home prints its lines one by one, and opening an entry zooms the screen. Click only after `.reveal-line`, `.reveal-pending` and `html[data-zoom-animate]` are gone, or the click lands on the wrong entry or on nothing.
- The intro is shown only when local storage has no `terminal-intro`. Reusing a profile makes "first visit" silently a return visit; the drive creates a new profile for every browser.
- Visitors who prefer reduced motion skip the intro. Headless Chrome reports no preference, so the intro runs.
- Arrow keys act only when focus is on the page, `<main id="content">` or the menu. A focused search box or video takes the keys.
