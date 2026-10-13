# Projects search

The Projects screen lists each repository with its language and summary. Typing anywhere starts a fuzzy search, as in a fuzzy finder, and `/` jumps to the search box. The list narrows and a count shows matches out of all. The arrow keys and Enter open a match. A query that matches nothing says "No matches.", and Escape clears the search before a second Escape goes back.

## Sub-features

- `search-open`: Projects opens with a search box.
- `projects-list`: the unfiltered list shows every project.
- `search-type`: typing a letter starts the search, filters the list, and shows the `matches/all` count.
- `search-open-match`: ArrowDown moves the highlight among matches; Enter opens it; Escape returns with the search cleared.
- `search-slash`: `/` focuses the box without typing a slash.
- `search-empty`: a query that matches nothing shows `No matches.`
- `search-escape`: Escape clears the query, then a second Escape returns Home.

## How to get to it (user POV)

- From Home, choose `Projects` (click, or arrows and Enter), or open `/projects/`.
- Type any letter or digit, or press `/`.
- The same search is on Writing (disabled on Home for now), Music (disabled), Talks and Papers. Papers' search is driven in `papers.md`; Writing, Music and Talks' search are not driven.
- Without JavaScript the full list shows and there is no search. Not driven.

## Driving it with verify-webshite

Preconditions:

- Drive target: `.agents/skills/verify-webshite/scripts/verify-webshite projects-search --run RUN_ID`.
- `doctor` passed for this run.
- `src/content/projects/` still has `hivemind`, `turso-zig` and `advent-of-code` (language Zig) and `webshite` (Astro).

- **Open.** On Home, click `Projects`. `/projects/` shows a search box and at least five projects (`01-projects.png`).
- **Type.** Move the pointer off the list, then, with focus on the page, type `zig`. The box holds `zig` and has focus. The list keeps hivemind, turso-zig and advent-of-code, drops webshite, and the count reads `<matches>/<all>` (`02-zig.png`, `02-zig.aria.txt`).
- **Open a match.** ArrowDown highlights the second match; Enter opens its page (`03-project.png`); Escape returns to `/projects/` with an empty search.
- **Slash.** `/` focuses the empty box; its value stays empty.
- **No matches.** Type `qqxvw`. `#menu-results .menu-empty` reads `No matches.` (`04-no-matches.png`).
- **Escape twice.** Escape empties the box and restores the full list on `/projects/`. Escape again returns to `/`.

## Gotchas

- Fuzzy search ranks and narrows; a query can keep more entries than the one you expect. Assert the entries that must be there and one that must not, not an exact list, unless the query is unique.
- The pointer selects the entry it rests on, and a list that re-sorts under a resting pointer changes the highlight. Keep the pointer off the list while typing.
- Returning to Projects from a project page starts with an empty search; the query is not kept.
